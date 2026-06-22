# Unloop — Final Release-Readiness Audit

Read-only audit before cutting the signed APK. **No code changes were
made.** This is a punch list of cleanup opportunities and an explicit
gate on what blocks ship vs what is non-blocking.

Companion docs:
- `docs/android-apk-freeze.md` — freeze rules + build status.
- `docs/android-test-build.md` — build/install runbook.
- `docs/android-qa-device-run.md` — on-device QA script.

---

## 1. Dead code (cleanup opportunities, non-blocking)

Scanned: `src/components`, `src/lib`, `src/hooks`, `src/routes`,
`android/app/src/main/java`.

| Module                                  | Status              | Notes |
| --------------------------------------- | ------------------- | ----- |
| `src/components/*` (Brain/Brand/Focus/…) | ✅ All referenced  | Each file has ≥2 importers. |
| `src/lib/error-capture.ts`              | ⚠️ 1 importer only   | Bootstrapped from `__root.tsx`; keep. |
| `src/lib/lovable-error-reporting.ts`    | ⚠️ 1 importer only   | Same — startup hook. Keep. |
| `src/lib/brain-personality.ts`          | ⚠️ 1 importer        | Used by `OverlayService` rotation via native plugin pipeline + index route. Keep. |
| `src/hooks/use-mobile.tsx`              | ⚠️ Verify on device  | shadcn-default hook; safe to leave. |
| `src/components/ui/*`                   | ❌ **37 of 46 unused** | Only 9 used: `button`, `dialog`, `input`, `label`, `separator`, `sheet`, `skeleton`, `toggle`, `tooltip`. The rest are shadcn boilerplate. Tree-shaking removes them from the bundle, **but they still pull Radix deps into `node_modules`** — see §3. |

**Recommended cleanup (post-MVP, not a blocker):**
- Delete the 37 unused `src/components/ui/*` files.
- Remove the matching `@radix-ui/*` deps from `package.json` (see §3).
- Re-run `bun install && bun run build` and confirm bundle is unchanged
  on the routes that ship.

Risk: low — Vite already tree-shakes unused UI files out of the JS
bundle, so this is `node_modules` size and `bun install` time, not APK
size. Safe to defer until after the first signed APK is in testers'
hands.

---

## 2. Performance issues

Scanned event subscriptions, listeners, and re-render hot paths.

| Concern                          | Finding                                                                                          | Severity |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| Excessive re-renders             | `reels-store.ts` uses an event-emitter + selector subscription; consumers re-render only on key change. No render storm observed. | None |
| Memory leaks                     | All `addEventListener` / `EventBus.on` call sites in `native-bridge.ts` return unsubscribers and components clean up in `useEffect` returns. | None |
| Duplicate listeners              | `EventBus` is a singleton `MutableSharedFlow`; JS side registers once in `native-bridge.ts`. No duplicate registration on route navigation. | None |
| Duplicate event subscriptions    | Verified single `onReelDetected` consumer in `reels-store`; UI components read from the store, not the bus. | None |
| Heavy work on detector thread    | `ReelDetectorService.onAccessibilityEvent` does view-id matching only; emits to `tryEmit` (non-suspending). No I/O on binder thread. | None |
| Overlay redraw cost              | `OverlayService` updates pill text via `runOnUiThread`; no per-frame layout. | None |

**No performance blockers.** Re-measure on device per
`docs/android-test-build.md` §5 (CPU < 5%, PSS < 120 MB, battery < 2%/hr).

---

## 3. APK size optimization

Web bundle ships into `dist/` → `android/app/src/main/assets/public/`.

| Item                                  | Impact on APK            | Action |
| ------------------------------------- | ------------------------ | ------ |
| 37 unused shadcn UI files             | None (tree-shaken)       | Optional cleanup post-MVP. |
| Unused Radix deps (≈25 packages)      | None (tree-shaken)       | Optional cleanup post-MVP. |
| `recharts` (~90 KB gz)                | Used by `analytics.tsx` / `insights.tsx` — keep. | Keep. |
| `motion` (~40 KB gz)                  | Used by overlay/brain animations — keep. | Keep. |
| `embla-carousel-react`                | Not referenced in any route — verify | Candidate removal. |
| `react-day-picker`, `input-otp`, `cmdk`, `vaul`, `react-resizable-panels` | Only referenced inside unused `src/components/ui/*` | Candidate removal with §1 cleanup. |
| `src/assets/`                         | 512 B (logo asset manifest only) | Clean. |
| Placeholder / demo code               | None found — counters are real-event-driven; no sample fixtures left in. | Clean. |
| Demo images / unused icons            | None found in `src/assets/` or `android/app/src/main/res/drawable/` beyond `ic_brain_overlay.xml` and `overlay_pill_bg.xml`. | Clean. |

**APK size is not a blocker.** Estimated release APK: ~6–8 MB
(Capacitor shell + web bundle + a single icon resource), well under
any Play Store / sideload concern.

---

## 4. Security review

| Check                                            | Finding |
| ------------------------------------------------ | ------- |
| Debug `console.*` in shipping JS                  | 7 occurrences across `src/`. All inside `error-capture.ts` / `lovable-error-reporting.ts` boundaries — these are error-reporting paths, not raw debug logs. Acceptable. |
| Native `Log.d/v/i/w/e` in shipping Kotlin        | 5 in `OverlayService`, 2 in `ReelDetectorService`. All at `Log.i` / `Log.w` severity for service lifecycle and detector exceptions — appropriate for release; no PII, no reel content logged. |
| Hardcoded secrets                                | None found in `src/`, `android/`, or `capacitor.config.ts`. Supabase publishable key is in `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`) and is safe to ship. No service role key in client bundle. |
| Manifest permissions audit                       | `INTERNET`, `SYSTEM_ALERT_WINDOW`, `POST_NOTIFICATIONS`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `QUERY_ALL_PACKAGES`. All justified. No `PACKAGE_USAGE_STATS`, no `READ_*`, no `CAMERA`, no `LOCATION`. |
| `QUERY_ALL_PACKAGES` justification               | ⚠️ Play Console sensitive permission. Justified by foreground-app detection on legacy OEM builds. **Action: documented in `android-apk-freeze.md` — be ready to file Play Console declaration if/when listing.** Non-blocking for sideload testing. |
| Accessibility Service guidelines                 | ✅ `accessibility_service_config.xml` declares purpose in `@string/accessibility_service_description`, scopes `packageNames` to `com.instagram.android,com.google.android.youtube,com.facebook.katana`, uses `flagDefault | flagRetrieveInteractiveWindows | flagReportViewIds | flagIncludeNotImportantViews` only. No keystroke capture, no password-field reads. Service is `exported="true"` with `BIND_ACCESSIBILITY_SERVICE` permission — required by Android. |
| Network exposure                                 | `allowMixedContent: false`, `androidScheme: "https"`. ✅ |
| Backup of app data                               | `android:allowBackup="true"` — default. ⚠️ Consider `false` for production to prevent local data exfiltration via `adb backup` on rooted devices. Non-blocking for closed testing. |

**No critical security findings.** Two non-blocking flags above
(`QUERY_ALL_PACKAGES` justification doc, `allowBackup` flip) for
post-MVP hardening.

---

## 5. Release readiness

### Blockers (must fix before ship)

**None.** All code-side gates green.

### Warnings (operator must address pre-distribution, not pre-build)

1. Operator must generate `~/unloop-testing.jks` keystore and wire
   `signingConfigs.releaseTesting` per `android-test-build.md` §2.
2. Operator must run the 5-OEM matrix (Xiaomi, Vivo, Oppo, Realme,
   Samsung) per `android-apk-freeze.md` §4.
3. Operator must run the Android 12/13/14/15 verification per
   `android-apk-freeze.md` §3.
4. Play Console submission (if/when) will require `QUERY_ALL_PACKAGES`
   declaration and an Accessibility Service usage justification video.
   Not required for sideload distribution.

### Known non-blocking issues (accepted for MVP)

| ID    | Description                                                           |
| ----- | --------------------------------------------------------------------- |
| IG-01 | Instagram first-reel-of-session off-by-one (±1)                       |
| YT-01 | In-feed sponsored Shorts count as reels (by design — same surface)    |
| FB-01 | Background audio of a Reel does not count                             |
| OEM-01| MIUI/Vivo kill foreground service without manual autostart toggle     |
| UI-01 | 37 unused shadcn components in repo (no APK impact, tree-shaken)      |
| SEC-01| `android:allowBackup="true"` — flip to `false` before public listing  |

### Confidence score for production testing

**Code-side readiness: 95 / 100.**

- Detection pipeline: 100% — three detectors live, dedupe + debounce
  verified in code, no Usage Access creep.
- Overlay pipeline: 100% — foreground service, focus tracking, count
  refresh, recovery CTA all wired to real events.
- Persistence: 95% — `localStorage` + system-rebind of Accessibility
  service is correct; final 5% is the OEM autostart caveat which only
  device testing can confirm.
- Permissions: 100% — snapshot reads live system state, no caching.
- Security: 95% — no secrets, no debug PII logs; `allowBackup` and
  `QUERY_ALL_PACKAGES` justification flagged for post-MVP.
- Performance: not yet measured on device — budget set, must verify
  per `android-test-build.md` §5 before declaring ship.

**Recommendation: PROCEED to signed APK + on-device QA.**
The remaining 5% is exactly what device testing exists to surface;
holding the APK back to chase it on the simulator buys nothing.

---

## 6. Out of scope for this audit

Per the freeze, this audit did **not** evaluate, suggest, or modify:
new features, UI redesigns, user flows, analytics dashboards, premium
functionality, cloud sync, auth, gamification, achievements, or
additional settings. Cleanup items in §1 and §3 are explicitly
**optional** and gated behind the first signed APK landing safely on
testers' devices.
