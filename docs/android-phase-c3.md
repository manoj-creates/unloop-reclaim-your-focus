# Phase C.3 — Facebook Reels Detection

Adds `FacebookDetector` for `com.facebook.katana`. Reuses the existing
`reelDetected` pipeline, `EventBus`, and `OverlayService` — Instagram and
YouTube detectors are untouched.

## What changed
- **New:** `android/app/src/main/java/app/unloop/native/detectors/FacebookDetector.kt`
- **Edited:** `ReelDetectorService.kt` — registers Facebook detector alongside IG / YT.
- **Edited:** `res/xml/accessibility_service_config.xml` — adds `com.facebook.katana` to `packageNames`.
- **Edited:** `OverlayService.kt` — adds `facebook` to overlay allow-list so the brain pill renders over the FB app.

## Detection rules
Counts ONE reel when either:
1. Window state changes to a Reels viewer activity (`ReelsViewerActivity`, `ReelsWatchActivity`, `ReelsFeedFragment`, `ReelsViewerFragment`, `FullScreenVideoPlayer`) — first reel of the session.
2. A vertical scroll inside the reels pager (`reels_viewer_view_pager`, `reels_video_player_container`, `reels_root_view`, `video_player_root`) changes `toIndex`.

Debounced at 600 ms + page-index change + per-key dedupe.

## Explicitly ignored
- Likes / reactions / comments / share buttons.
- Pause / play / replay taps.
- Double-tap to like.
- In-feed reel auto-preview in the main feed (scroll source is the feed recycler, not the reels pager).
- Facebook Lite, Messenger, Stories (different packages — out of scope).

## Real-device test checklist
Device: Android 10+ with Facebook ≥ v450 installed, Unloop accessibility service enabled.

1. **First reel counted**
   Open FB → tap Reels tab. Expected: count increments by 1, brain overlay appears top-center.
2. **Swipe counted once per reel**
   Swipe up 5 times. Expected: count increases by exactly 5.
3. **Like does not count**
   On a single reel, double-tap to like, tap heart icon. Expected: no increment.
4. **Comments / share do not count**
   Open comments sheet, send a share. Expected: no increment.
5. **Pause / replay do not count**
   Tap to pause and resume several times. Expected: no increment.
6. **Re-entering viewer counts new session**
   Leave Reels (back to feed), wait 1 s, reopen Reels tab. Expected: +1.
7. **In-feed auto-preview does not count**
   Scroll the main news feed past auto-playing reel previews. Expected: no increment.
8. **Overlay visibility**
   Overlay shows while in FB, hides on home screen and inside Unloop app.
9. **Other apps unaffected**
   Switch to Instagram and YouTube Shorts — those detectors still count as before. Switch to Chrome — no overlay, no counts.
10. **Analytics**
    Analytics screen "Live Reels Today" shows Facebook chip incrementing alongside IG / YT totals; brain stage updates from the combined total.

## Limitations
- Sponsored reels count (same trade-off as IG).
- View-id obfuscation can mask scroll events; the activity-name guard keeps first-reel detection working until view-ids are refreshed.
