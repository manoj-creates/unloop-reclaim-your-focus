# Phase D — System Overlay (Brain Pill)

Status: Instagram-only MVP. Floating top-center pill with brain icon,
current reel count, and current brain stage. Click-through, foreground-
service backed, hidden whenever Instagram is not in the foreground.

## Folder structure (additions)

```
android/app/src/main/
├── java/app/unloop/native/
│   ├── BrainStage.kt              ← shared thresholds (mirror of TS)
│   └── OverlayService.kt          ← foreground service + window owner
└── res/
    ├── drawable/
    │   ├── ic_brain_overlay.xml   ← 20dp white brain glyph
    │   └── overlay_pill_bg.xml    ← rounded black pill background
    └── layout/
        └── overlay_brain_pill.xml ← icon · count · divider · stage

src/lib/
├── brain-stage.ts                 ← shared thresholds (source of truth)
└── native-bridge.ts               ← setOverlayEnabled / setOverlayCount
```

## Native plugin surface (additions)

| Method                                 | Purpose                                       |
| -------------------------------------- | --------------------------------------------- |
| `setOverlayEnabled({enabled, count?})` | Start or stop the foreground OverlayService.  |
| `setOverlayCount({count})`             | Push today's total from React → native pill.  |

## Event flow

```text
Instagram swipe
   ↓
ReelDetectorService (AccessibilityService)
   ↓ EventBus.ReelDetected            ↓ EventBus.PlatformFocusChanged
   ↓                                   ↓
UnloopNativePlugin                    OverlayService
   ↓ notifyListeners("reelDetected")     • toggles attach/detach on focus
   ↓                                     • re-renders on setOverlayCount intent
React reels-store
   ↓ (dedupe + state update)
useEffect(total) → setOverlayCount(total)
   ↓
OverlayService.setCount intent  →  TextView updates
```

React owns the count — the overlay never increments on its own. This
keeps midnight rollover, manual resets, and dedupe in one place and
guarantees the pill matches what the user sees inside Unloop.

## Brain stages

| Reels today | Stage     | Emoji |
| ----------- | --------- | ----- |
| 0–25        | Energized | ⚡    |
| 26–50       | Focused   | 🎯    |
| 51–100      | Tired     | 😴    |
| 101–150     | Brain Rot | 🧠    |
| 151+        | Zombie    | 🧟    |

Thresholds live in `src/lib/brain-stage.ts` and
`android/.../native/BrainStage.kt`. Update both when tuning.

## Window configuration

- Type: `TYPE_APPLICATION_OVERLAY` (API 26+), `TYPE_PHONE` fallback.
- Flags: `NOT_FOCUSABLE | NOT_TOUCHABLE | LAYOUT_IN_SCREEN | LAYOUT_NO_LIMITS`
  → fully click-through; never steals input from Instagram.
- Gravity: `TOP | CENTER_HORIZONTAL`, y-offset 24dp below status bar.
- Foreground service type: `specialUse` (Android 14+ requires a typed
  FGS; pill is a behavioral aid, doesn't fit mediaPlayback/location/etc.).

## Manifest additions

```xml
<service
    android:name=".native.OverlayService"
    android:exported="false"
    android:foregroundServiceType="specialUse">
    <property
        android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
        android:value="Floating focus-counter overlay …" />
</service>
```

Existing `SYSTEM_ALERT_WINDOW`, `POST_NOTIFICATIONS`,
`FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_SPECIAL_USE` permissions
already cover this service — no new uses-permission entries needed.

## Real-device test checklist

Run on a Pixel-class device for stock behavior, plus one OEM build
(Samsung One UI 6 or Xiaomi MIUI 14) for OEM quirks.

- [ ] Grant overlay + accessibility from Android Readiness; pill does
      NOT appear inside Unloop (any of the supported packages must be
      foreground).
- [ ] Open Instagram → Reels tab. Pill appears top-center within 1s.
- [ ] Swipe to next reel. Counter increments by exactly 1 (no double).
- [ ] Pull-to-refresh inside Reels. Counter does NOT increment.
- [ ] Tap underneath the pill. Touch reaches Instagram (pill is
      click-through).
- [ ] Press Home from Instagram. Pill disappears within 1s.
- [ ] Re-open Instagram. Pill reappears with the correct count.
- [ ] Kill Unloop from Recents. Pill survives (foreground service);
      open Instagram again → pill still there, still counting.
- [ ] Rotate the device inside Instagram. Pill stays anchored top-
      center, counter unchanged.
- [ ] Trigger Do Not Disturb / silent mode. Foreground notification
      remains visible at minimum priority but does NOT ping.
- [ ] Wait until local midnight or change device date. Count resets to
      0, pill reflects new total within 30s (midnight-rollover poll).
- [ ] Revoke overlay permission from Settings → return to Unloop.
      Overlay auto-detaches; readiness flips to red.

## Known limitations

- Show/hide hinges on a Reels-aware `PlatformFocusChanged` event from
  the AccessibilityService. Briefly switching to a non-supported app
  (e.g. swiping the notification shade) does NOT hide the pill until
  the next foreground app change.
- The pill is anchored to a fixed 24dp top offset; on devices with
  large camera cutouts the status bar may overlap visually. We accept
  this for MVP; Phase D.1 can read the cutout inset.
- React → native count push uses a debounce of zero (every total
  change fires an intent). Acceptable because intents are cheap and
  totals only change on detection / reset / midnight.

## Next phase

Phase C.2 — YouTube Shorts detector + add `youtube` to
`OverlayService.SUPPORTED_PACKAGES`.
