# Phase D.1 — Premium Brain Overlay

## What shipped
Native (`android/.../native/`)
- `BrainStage.kt` — each stage now carries `color`, `emoji`, `message`, plus
  a shared `WARNINGS` list (50/100/150/200) and `FRESH_START_TEXT`.
- `OverlayService.kt`
  - Per-stage tinted background (90% alpha) with **animated argb crossfade**
    on stage change.
  - **Pulse animation** (scale 1.0 → 1.10 → 1.0, Overshoot) on every count
    increment.
  - **Smart warnings**: subtitle expands for 5s when crossing a threshold,
    fires at most once per threshold per day, ledger auto-resets on midnight.
  - **Fresh Start**: when count goes from >0 → 0, subtitle shows
    `Fresh start ✨` for 6s.
  - `SUPPORTED_PACKAGES` now includes `youtube` so the pill appears over
    YouTube Shorts as well as Instagram Reels.
- `res/layout/overlay_brain_pill.xml` — vertical root with optional
  subtitle row beneath the compact pill, emoji as a `TextView` (color
  font) instead of a vector glyph so the mascot face changes per stage.

Web (`src/`)
- `src/lib/brain-history.ts` — new ledger of stage transitions in
  localStorage (capped to 14 days). Exposes `recordBrainStage`,
  `todayStageDurations`, `subscribeBrainHistory`, `formatStageDuration`.
- `src/lib/reels-store.ts` — calls `recordBrainStage(total)` alongside the
  existing overlay-count push, so analytics tracks transitions automatically.
- `src/routes/analytics.tsx` — Brain Evolution timeline now shows
  **today's time per stage** (live, recomputes every 60s) instead of fake
  static dates.

## Event / state contract
React side is still the single source of truth for `reelsToday`. The
overlay derives stage, color, warnings, and fresh-start state from the
count pushed via `setOverlayCount`. No new Capacitor methods needed.

```
ReactStore.total ──setOverlayCount──> OverlayService.applyCount
                                         ├─ stage tint crossfade
                                         ├─ pulse on increment
                                         ├─ warning subtitle (5s)
                                         └─ fresh-start subtitle (6s)
```

## Stage palette (overlay tint)
| Stage     | Range    | Color       | Emoji | Message              |
|-----------|----------|-------------|-------|----------------------|
| Energized | 0–25     | `#1F7A4D`   | ⚡    | Your brain is fresh. |
| Focused   | 26–50    | `#0E6E8C`   | 🎯    | Stay sharp.          |
| Tired     | 51–100   | `#A86A0E`   | 😴    | Energy dipping.      |
| Brain Rot | 101–150  | `#B0470F`   | 🧠    | Pull yourself out.   |
| Zombie    | 151+     | `#6B0E1F`   | 🧟    | Close the feed.      |

## Real-device polish checklist
1. Scroll past 25 → pill smoothly fades teal-green into deep-teal, emoji
   becomes 🎯. No flicker, no re-attach.
2. Hit 50 → "You've spent a while scrolling." appears for ~5s, then the
   pill collapses back to compact. Reaching 51 doesn't refire it.
3. Hit 100 / 150 / 200 → respective warning shows once. Force-stop YouTube
   and reopen — warnings already shown today do NOT re-fire.
4. Manual reset from Analytics screen → "Fresh start ✨" appears for ~6s
   the next time the pill is visible.
5. Scroll one reel → pill briefly scales up ~10% and settles back.
6. Cross-platform: open Instagram → swipe a few → switch to YouTube
   Shorts → swipe a few. Pill follows; tint reflects total reels across
   both apps.
7. Open Unloop itself → pill detaches (focus is not Instagram/YouTube).

## Analytics surface
On `/analytics`, the Brain Evolution row now reads e.g. `2h 14m`, `38m`
under each stage chip, derived from real transitions. Chip is empty (`—`)
if you haven't entered that stage today.

## Haptics
Spec marks haptics as optional. Skipped for D.1 because:
- The overlay window is `FLAG_NOT_TOUCHABLE` and runs in a separate
  process — it can't reliably grab a `Vibrator` handle without holding
  the VIBRATE permission, which we don't want to declare just for a
  count tick.
- We can add it cheaply when the foreground app is Unloop itself
  (covered in a later phase via the same EventBus).

## Unchanged
- Instagram & YouTube detectors (Phase C / C.2).
- Capacitor plugin surface, event schema, permission flow.
- Reels-store contract (totals, dedupe, midnight reset).
