# Phase C.2 — YouTube Shorts detector

## Summary
Adds `YouTubeDetector` to the existing Phase C pipeline. No overlay-UI,
plugin, or React-side changes — the existing `reelDetected` event already
carries `platform: "youtube"`, the `reels-store` already deduplicates by
`platform:reelId`, and the `OverlayService` already listens to
`PlatformFocusChanged` so the brain pill auto-attaches when Shorts come
into focus.

## What changed
- `android/.../native/detectors/YouTubeDetector.kt` — new
- `android/.../native/ReelDetectorService.kt` — registers the YouTube detector
- `android/.../res/xml/accessibility_service_config.xml` — adds
  `com.google.android.youtube` to `packageNames`

## Detection rules
- Counted: first window-state transition into a Shorts activity, and every
  vertical pager swipe whose `toIndex` differs from the previous page.
- NOT counted: likes, dislikes, comments, share, pause, play, replay,
  double-tap, channel pivot, comments-sheet open, rotation.

## Dedupe
- 600 ms rate-limit shared with Instagram (per-detector instance).
- Pager `toIndex` must change before a swipe counts.
- React-side rolling `Set<128>` in `reels-store` provides a second guard.

## Real-device test checklist

Hardware: any Android 12+ device with the official YouTube app installed.

1. Cold start
   - Open Unloop, grant Accessibility + Overlay on Android Readiness.
   - Force-stop YouTube, then open YouTube → Shorts tab.
   - Expect: counter increments by 1, brain pill appears at top center.
2. Swipe stream
   - Swipe through 10 Shorts.
   - Expect: counter increments by exactly 10. No double-counts on settle.
3. Engagement noise (must NOT increment)
   - Like, unlike, double-tap to like, open comments, post a comment,
     share sheet, pause/play, replay (let one Short loop 3×).
   - Expect: counter unchanged across all of the above.
4. Channel pivot
   - Tap the creator avatar → land on channel → back to Shorts.
   - Expect: returning to Shorts counts the next swipe once, not the
     re-entry on top of the same Short.
5. App switch
   - Shorts → home screen → Shorts (within 600 ms and after 5 s).
   - Expect: ≤1 count for the re-entry; subsequent swipes count normally.
6. Cross-platform isolation
   - Open Instagram Reels, swipe 5; switch to YouTube Shorts, swipe 5.
   - Expect: `counts.instagram == 5`, `counts.youtube == 5`. Brain pill
     follows the foreground app.
7. Rotation
   - Rotate device while watching a Short.
   - Expect: no extra count from the configuration change.
8. Background audio
   - Start a Short, swipe to next, lock screen (audio keeps playing).
   - Expect: no counts while the screen is off.

## Known limitations
- In-feed Shorts ads still count (consistent with Instagram).
- If YouTube ships obfuscated view-ids we fall back to activity-name
  matching; rare false negatives on swipe-1 are possible until the next
  app update.
- Picture-in-picture mini-player is not classified as Shorts and does
  not count.

## Unchanged
- Instagram detector, debounce values, and overlay UI.
- Capacitor plugin surface, event schema, React store contract.
