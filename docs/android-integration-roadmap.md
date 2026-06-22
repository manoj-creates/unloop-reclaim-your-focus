# Unloop — Android Integration Roadmap

Status: planning only. No native code written yet. This document is the single source of truth for how the React/TanStack web app becomes a real Android app that detects Reels, shows a floating brain overlay, and feeds live data back into the existing stores (`reels-store`, `live-stats`, `milestones`, `journey`).

---

## 0. High-level architecture

```text
 ┌────────────────────────────────────────────────────────────┐
 │                     ANDROID APK (Capacitor)                │
 │                                                            │
 │  ┌──────────────────────────┐   ┌───────────────────────┐  │
 │  │ ReelDetectorService      │   │ OverlayService        │  │
 │  │ (AccessibilityService)   │──▶│ (Foreground + TYPE_   │  │
 │  │  - watches IG / YT /     │   │  APPLICATION_OVERLAY) │  │
 │  │    FB / TikTok           │   │  - floating brain     │  │
 │  │  - emits ReelEvent       │   │  - top-center bubble  │  │
 │  └──────────┬───────────────┘   └──────────┬────────────┘  │
 │             │                              │               │
 │             ▼                              ▼               │
 │  ┌──────────────────────────────────────────────────────┐  │
 │  │ UnloopNativeBridge (Capacitor Plugin, Kotlin)        │  │
 │  │  - getPermissions()                                  │  │
 │  │  - openSettings(id)                                  │  │
 │  │  - addReelListener(cb)                               │  │
 │  │  - addPermissionsListener(cb)                        │  │
 │  │  - setBrainState(state)                              │  │
 │  └──────────────┬───────────────────────────────────────┘  │
 │                 │  WebView JS bridge                       │
 │  ┌──────────────▼───────────────────────────────────────┐  │
 │  │            React app (TanStack Start, SPA build)     │  │
 │  │  window.UnloopNative ─▶ src/lib/native-bridge.ts     │  │
 │  │  reels-store ◀── ReelEvent ── live-stats ── journey  │  │
 │  └──────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────┘
```

Key principle: **the web app stays the source of UI truth**. Native services only emit events and render the tiny overlay. All stats, streaks, milestones, brain evolution thresholds live in the existing TypeScript stores.

---

## 1. Accessibility Service — Reel detection

### 1.1 Service skeleton
- New Kotlin class `ReelDetectorService : AccessibilityService` in `android/app/src/main/java/app/unloop/detector/`.
- Manifest: register service with `BIND_ACCESSIBILITY_SERVICE` permission and an `accessibility_service_config.xml` resource.
- `accessibility_service_config.xml`:
  - `android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged|typeViewScrolled"`
  - `android:accessibilityFeedbackType="feedbackGeneric"`
  - `android:packageNames="com.instagram.android,com.google.android.youtube,com.facebook.katana,com.zhiliaoapp.musically,com.ss.android.ugc.trill"`
  - `android:canRetrieveWindowContent="true"`
  - `android:notificationTimeout="100"`

### 1.2 Per-platform detectors
Each detector returns `ReelEvent { platform, action: "enter"|"scroll"|"exit", at: epochMs }`.

| Platform   | Package(s)                                                       | Detection heuristic                                                                                                                                            |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instagram  | `com.instagram.android`                                          | Activity `…ReelsViewerActivity` OR root node contains `view_id` ending in `clips_viewer_view_pager` / `reel_viewer_root`. Scroll event on that pager = 1 reel. |
| YouTube    | `com.google.android.youtube`                                     | `reel_recycler` view-id OR `Shorts` content-description on root container; vertical RecyclerView scroll = 1 short.                                             |
| Facebook   | `com.facebook.katana`                                            | Activity `…ReelsWatchActivity` OR view-id containing `reels_viewer_fragment`.                                                                                  |
| TikTok     | `com.zhiliaoapp.musically`, `com.ss.android.ugc.trill`           | Main feed `ViewPager2`; every `typeViewScrolled` with `fromIndex != toIndex` counts as 1 video.                                                                |

Each detector debounces: minimum 600 ms between counted reels on the same platform to avoid double-counting bounce/over-scroll.

### 1.3 Lifecycle hooks
- `enter(platform)` → start overlay if not already running, set `currentPlatform`.
- `scroll(platform)` → `reelCounter.increment(platform)` and broadcast `ReelEvent`.
- `exit()` (window switches to non-reel surface) → debounce 5 s, then stop overlay if still outside reels.

### 1.4 Resilience
- Wrap every `onAccessibilityEvent` in try/catch — never crash the service.
- App-update resilience: detection rules live in a small JSON in assets so heuristics can be tuned without an APK update later (read-only for v1, OTA later).

---

## 2. System overlay — Floating brain counter

### 2.1 Service
- `OverlayService : Service` (foreground, low-importance notification channel `unloop_overlay`).
- Permission: `SYSTEM_ALERT_WINDOW`; on Android 13+ also `POST_NOTIFICATIONS` for the foreground notification.
- Window: `WindowManager.LayoutParams` with
  - `type = TYPE_APPLICATION_OVERLAY`
  - `flags = FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL | FLAG_LAYOUT_IN_SCREEN`
  - `gravity = TOP|CENTER_HORIZONTAL`
  - `y = statusBarHeight + 8dp`
  - `width = WRAP_CONTENT`, `height = WRAP_CONTENT`

### 2.2 View
- Single `FrameLayout` (`overlay_brain.xml`) containing
  - 28dp circular background (translucent, blurred via `RenderEffect` on API 31+, solid card fallback below)
  - emoji/SVG brain (state-driven)
  - small badge "N" reels-today, tabular-nums

Targets: <2 KB memory delta, 56×28 dp footprint, no shadows that bleed outside bounds, `importantForAccessibility=no`.

### 2.3 Lifecycle
- Started by `ReelDetectorService` on first `enter`.
- Stopped after 5 s of no reel events AND active window is not a known reel surface.
- Hides itself (alpha 0) while user is in `Unloop` itself.
- Touch behaviour v1: non-interactive (FLAG_NOT_TOUCHABLE on the badge area only — outer chip still allows long-press in v1.1 to dismiss for 1 hour).

---

## 3. Brain Evolution integration

### 3.1 Single source of truth (web)
Add `src/lib/brain-state.ts` (web) deriving state from `useLiveStats()`:

| State        | Threshold (reels today vs daily limit L) | Emoji |
| ------------ | ---------------------------------------- | ----- |
| Healthy      | reels ≤ 0.25·L                           | 🧠    |
| Focused      | 0.25·L < reels ≤ 0.6·L                   | 🎯    |
| Tired        | 0.6·L  < reels ≤ 1.0·L                   | 😴    |
| Brain Rot    | 1.0·L  < reels ≤ 2.0·L                   | 🥴    |
| Zombie Brain | reels > 2.0·L                            | 🧟    |

The same thresholds are mirrored in `OverlayService` (Kotlin enum + constants pulled from a shared JSON in `android/app/src/main/assets/brain-thresholds.json` generated from the TS file at build time — single source, two consumers).

### 3.2 Live updates
- Native → web: every `ReelEvent` triggers `reels-store.addReel(platform)` which already updates `live-stats` and consequently brain state.
- Web → native overlay: `UnloopNative.setBrainState(state, countToday)` called from a `useEffect` in `AppShell` whenever derived state changes. Overlay re-renders the emoji + badge.

### 3.3 Journey impact
- `live-stats.ts` already writes daily history → `milestones.ts` already derives unlocks. No new logic needed; just ensure events from native are persisted before unmount by calling `cloud-sync.pushAnalytics` on each `exit` event.

---

## 4. Capacitor bridge

### 4.1 Project setup
- `bun add @capacitor/core @capacitor/android @capacitor/cli`
- `npx cap init unloop app.unloop --web-dir=dist`
- Build SPA: ensure TanStack Start build produces a static `dist/` (set prerender + spa fallback in `vite.config.ts`).
- `npx cap add android`.

### 4.2 Custom plugin: `UnloopNativePlugin`
Kotlin class registered via `@CapacitorPlugin(name = "UnloopNative")` with methods:

| JS method                    | Kotlin handler          | Returns / emits                                       |
| ---------------------------- | ----------------------- | ----------------------------------------------------- |
| `getPermissions()`           | reads OS state          | `{ overlay, accessibility, notifications, battery, compatibility }` |
| `openSettings({ id })`       | launches intent         | `void`                                                |
| `setBrainState({ state,n })` | message to OverlayService | `void`                                              |
| `reelEvent` (listener)       | service → plugin        | `{ platform, action, at }`                            |
| `permissionsChanged` (listener) | OS callbacks         | full PermissionState                                  |

### 4.3 Web shim
`src/lib/native-bridge.ts` already defines `window.UnloopNative`. Replace its TODO with:

```ts
import { Capacitor, registerPlugin } from "@capacitor/core";
const Plugin = registerPlugin<UnloopNativePluginShape>("UnloopNative");
if (Capacitor.isNativePlatform()) {
  window.UnloopNative = {
    getPermissions: () => Plugin.getPermissionsSync(),  // cached, refreshed on resume
    openSettings: ({ id }) => Plugin.openSettings({ id }),
    addPermissionsListener: (cb) => { const h = Plugin.addListener("permissionsChanged", cb); return () => h.remove(); },
    addReelListener: (cb) => { const h = Plugin.addListener("reelEvent", cb); return () => h.remove(); },
    setBrainState: (s, n) => Plugin.setBrainState({ state: s, n }),
  };
}
```

Wire `addReelListener` once in `AppShell` mount → calls `reels-store.addReel(platform)`.

### 4.4 IPC between services and plugin
- `ReelDetectorService` and `OverlayService` run in the same process as the WebView.
- Use a singleton `EventBus` (simple `MutableSharedFlow<ReelEvent>`) injected into the plugin; plugin collects in `pluginScope` and `notifyListeners("reelEvent", json)`.

---

## 5. Permissions flow

The existing `/android-readiness` screen already drives this. Wiring per permission:

| Check          | Intent / API                                                                                   | Live status source                                                              |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Overlay        | `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` with `package:` URI                                | `Settings.canDrawOverlays(context)`                                             |
| Accessibility  | `Settings.ACTION_ACCESSIBILITY_SETTINGS` + on-screen guide (no programmatic grant on stock OS) | `AccessibilityManager.getEnabledAccessibilityServiceList(...)` contains our service |
| Battery        | `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`                                         | `PowerManager.isIgnoringBatteryOptimizations(pkg)`                              |
| Notifications  | `ActivityCompat.requestPermissions(POST_NOTIFICATIONS)` on API 33+, else auto-true             | `NotificationManagerCompat.areNotificationsEnabled()`                           |
| Compatibility  | `Build.VERSION.SDK_INT >= 29`                                                                  | constant                                                                        |

State refresh strategy:
- On `Activity.onResume` and `WindowFocusChanged(true)`: re-query all five, emit `permissionsChanged`.
- Plugin also exposes synchronous getter used by `usePermissions()` on mount.

OEM caveats (document in the readiness screen later):
- Xiaomi/MIUI: extra "Display pop-up windows while running in background" toggle in Other permissions.
- Oppo/Vivo: "Auto-start" toggle.
- Samsung One UI: "Put unused apps to sleep" must exclude Unloop.

---

## 6. Implementation plan (ordered)

### Phase A — Capacitor shell (1–2 days)
1. Configure SPA build output (`dist/`) and verify TanStack routes work offline in a WebView.
2. `cap add android`, app id `app.unloop`, icon + splash from existing logo assets.
3. Stub `UnloopNativePlugin` with hardcoded `getPermissions()` returning all false. Confirm `window.UnloopNative` works in the running APK and the existing readiness screen reflects it.

### Phase B — Permissions (1 day)
4. Implement real permission reads and `openSettings` intents.
5. Wire `onResume` refresh → `permissionsChanged` emit.
6. Manual QA on Pixel + one MIUI device.

### Phase C — Accessibility detection (3–4 days)
7. Implement `ReelDetectorService` skeleton, register in manifest, verify it shows up under Settings → Accessibility.
8. Add detectors one platform at a time in this order: Instagram → YouTube → TikTok → Facebook. Tune debounce per platform.
9. Forward events through `EventBus` → plugin listener → `reels-store.addReel`.
10. Add an internal "Detector Inspector" debug screen (web, gated by `__DEV__`) showing the last 50 raw events.

### Phase D — Overlay (2 days)
11. Implement `OverlayService` with static brain icon and badge bound to a `StateFlow<Int>`.
12. Animate badge tick on increment (200 ms scale 1→1.15→1).
13. Hook brain-state changes from web (`setBrainState`) into emoji swap.
14. Auto show/hide based on enter/exit events.

### Phase E — Brain Evolution sync (0.5 day)
15. Add `src/lib/brain-state.ts` and generated `brain-thresholds.json`.
16. `AppShell` effect: call `setBrainState` whenever derived state changes.

### Phase F — Hardening (2 days)
17. Add foreground notification copy + low-importance channel.
18. Battery-optimisation prompt on first launch after permissions screen completion.
19. Crash reporting (existing `lovable-error-reporting` extended with native breadcrumbs).
20. Telemetry: count detections per platform per day, store locally, surface in `/insights` (no new UI, reuses existing screen).

### Phase G — Store readiness (1–2 days)
21. Play Console listing, screenshots from emulator, data-safety form (no PII leaves device in v1).
22. **Accessibility-service disclosure**: Play requires a clear in-app explanation + Play Console declaration explaining we use AccessibilityService solely to detect reel-feed surfaces and count scrolls — no content read, no input captured. Add a dedicated consent screen before the accessibility step in the readiness flow.
23. Closed testing track → internal testers → production.

Total estimate: ~10 working days for a single engineer.

---

## 7. Risks & mitigations

| Risk                                                              | Mitigation                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Instagram/TikTok renaming view-ids in an app update               | Heuristic JSON in assets; remote-tunable in v1.1; fall back to activity/class-name detection.           |
| Play Store rejection for AccessibilityService misuse              | Strict scope, in-app disclosure screen, privacy-policy clause, Play declaration form filled carefully.  |
| OEM background restrictions killing services                      | Foreground notification + battery-opt exemption + per-OEM guide screens.                                |
| Overlay flicker on rotation / multi-window                        | Re-attach window on `onConfigurationChanged`; hide in split-screen.                                     |
| Double counting on bounce-scroll                                  | 600 ms per-platform debounce + last-index comparison.                                                   |
| Web ↔ native state drift if APK is killed mid-session             | Native batches events into a local SQLite (`detector.db`) and flushes on plugin attach.                 |

---

## 8. Out of scope for v1

- iOS (no equivalent of AccessibilityService for third-party feeds).
- Blocking / hiding reels (we count only — matches current product positioning).
- Cloud sync of raw events (only daily aggregates via existing `cloud-sync`).
- Overlay interactivity beyond display (no tap-to-open-app in v1).

---

## 9. File/module checklist (when we start coding)

Web (TypeScript):
- `src/lib/brain-state.ts` (new)
- `src/lib/native-bridge.ts` (extend with `addReelListener`, `setBrainState`)
- `src/components/AppShell.tsx` (mount reel listener + brain-state sync)
- `vite.config.ts` (SPA fallback for Capacitor build)
- `capacitor.config.ts` (new)

Android (Kotlin) under `android/app/src/main/`:
- `java/app/unloop/UnloopNativePlugin.kt`
- `java/app/unloop/detector/ReelDetectorService.kt`
- `java/app/unloop/detector/platforms/{Instagram,YouTube,Facebook,TikTok}Detector.kt`
- `java/app/unloop/overlay/OverlayService.kt`
- `java/app/unloop/permissions/PermissionsReader.kt`
- `java/app/unloop/bus/EventBus.kt`
- `res/xml/accessibility_service_config.xml`
- `res/layout/overlay_brain.xml`
- `assets/brain-thresholds.json` (generated)
- `AndroidManifest.xml` updates (service, permission, queries for target packages)

---

Ready to start Phase A on approval.
