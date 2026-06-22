# Phase QA — Real Device Validation

Comprehensive on-device test plan for the Unloop Android build. Run this
checklist on each tested device before tagging a release. Every row has an
explicit pass/fail criterion — anything else is a fail.

## Test environment

Fill in once per device, attach to every bug report.

| Field | Value |
| --- | --- |
| Tester | |
| Date / time | |
| Build (versionName + versionCode) | |
| Device model | |
| Android version / API level | |
| OEM skin (Stock / MIUI / OneUI / ColorOS / …) | |
| Instagram version | |
| YouTube version | |
| Facebook version | |
| Battery saver state | On / Off |
| Unloop battery optimization | Unrestricted / Optimized |
| Accessibility service | Enabled / Disabled |
| Overlay permission (Display over other apps) | Granted / Denied |

Required apps installed: Instagram, YouTube, Facebook (Lite NOT supported).
Sign in to each before testing.

---

## 1. Instagram Reels

| # | Step | Pass criterion |
| --- | --- | --- |
| 1.1 | Open Instagram → Reels tab | Count increments by exactly 1; overlay appears top-center within ~1s |
| 1.2 | Swipe up 10 times, ~1s between swipes | Count increases by exactly 10 |
| 1.3 | Swipe down (back to previous reel) | Count does NOT increment |
| 1.4 | Double-tap to like, tap heart, tap comment, tap share | Count does NOT increment for any of these |
| 1.5 | Pause and resume same reel 5 times | Count does NOT increment |
| 1.6 | Open a reel from a profile grid, swipe 3 reels | Count increases by 3 (first reel + 2 swipes counted via window-state + scroll) |
| 1.7 | Leave Instagram → return to Reels within 5s | Count increments by 1 on re-entry (new session) |
| 1.8 | Scroll the main Home feed past auto-playing reel previews | Count does NOT increment |

Fail if any row deviates. Off-by-one on row 1.1 caused by the window-state +
first-scroll race is a known issue — log it but do not block release.

## 2. YouTube Shorts

| # | Step | Pass criterion |
| --- | --- | --- |
| 2.1 | Open YouTube → Shorts tab | Count increments by 1; overlay shows |
| 2.2 | Swipe up 10 Shorts | Count increases by exactly 10 |
| 2.3 | Tap like, dislike, comment, share, remix | No increment |
| 2.4 | Pause/resume same Short repeatedly | No increment |
| 2.5 | Open a long-form video from Home | No increment; overlay still visible (YouTube package) but count unchanged |
| 2.6 | Return to Shorts feed from a long-form video | Count increments by 1 |
| 2.7 | Background audio of a Short (lock screen) | No increment while screen off |
| 2.8 | Channel pivot from a Short → back to Shorts | No increment from the pivot itself; +1 when re-entering Shorts |

## 3. Facebook Reels

| # | Step | Pass criterion |
| --- | --- | --- |
| 3.1 | Open Facebook → Reels tab | Count increments by 1; overlay shows |
| 3.2 | Swipe up 10 reels | Count increases by exactly 10 |
| 3.3 | Tap like / reactions / comment / share | No increment |
| 3.4 | Double-tap to like | No increment |
| 3.5 | Pause/resume same reel | No increment |
| 3.6 | Scroll Facebook News Feed past auto-preview reels | No increment |
| 3.7 | Open a reel from a friend's post | Count increments by 1 |
| 3.8 | Switch from FB to Messenger | No increment; overlay hides (Messenger is a different package) |

## 4. Overlay visibility

| # | Step | Pass criterion |
| --- | --- | --- |
| 4.1 | Open Instagram / YouTube / Facebook | Overlay appears top-center within ~1s |
| 4.2 | Open Chrome, Maps, or any non-tracked app | Overlay is hidden |
| 4.3 | Open Unloop itself | Overlay is hidden inside the app |
| 4.4 | Tap directly on the overlay pill area | Taps pass through to the app below (no blocking) |
| 4.5 | Rotate device to landscape inside Instagram | Overlay remains anchored top-center, no duplicates |
| 4.6 | Open a fullscreen reel video | Overlay stays on top, does not flicker |
| 4.7 | Trigger a system dialog (volume, notification shade) | Overlay sits below shade/dialog, returns on dismiss |

## 5. Overlay persistence

| # | Step | Pass criterion |
| --- | --- | --- |
| 5.1 | Foreground notification "Unloop is active" is present | Visible in notification shade while detector running |
| 5.2 | Swipe Unloop from Recents | Detector + overlay survive (foreground service) |
| 5.3 | Lock screen for 5 minutes, unlock, open Instagram | Overlay reappears within ~1s |
| 5.4 | Reboot device → open Instagram WITHOUT opening Unloop | Overlay does NOT appear (accessibility service starts on first Unloop launch; document this) |
| 5.5 | After Unloop relaunch post-reboot → open Instagram | Overlay returns |
| 5.6 | Kill Instagram from Recents while overlay is showing | Overlay hides within ~1s |

## 6. Accessibility permissions

| # | Step | Pass criterion |
| --- | --- | --- |
| 6.1 | Fresh install → open Unloop | Readiness screen shows Accessibility = Not granted |
| 6.2 | Tap "Grant accessibility" CTA | System Accessibility settings opens to the Unloop entry |
| 6.3 | Enable Unloop → return to app | Readiness flips to Granted within ~1s without manual refresh |
| 6.4 | Disable Unloop in Accessibility settings → return | Readiness flips to Not granted; detection stops |
| 6.5 | Re-enable | Detection resumes; opening Instagram counts again |

## 7. Battery optimization / overlay permission

| # | Step | Pass criterion |
| --- | --- | --- |
| 7.1 | Readiness shows "Display over other apps" status correctly | Reflects current system setting |
| 7.2 | Grant overlay permission → return | Status flips to Granted |
| 7.3 | Readiness shows "Battery optimization" status | Unrestricted shown when user disables optimization for Unloop |
| 7.4 | Enable battery saver, lock screen 30 min, open Instagram | Detector still fires; overlay still appears (may have ~2s delay) |
| 7.5 | OEM aggressive kill (MIUI/OneUI: lock app in Recents) | Detector survives 1h of background; counts accurate after unlock |
| 7.6 | Doze mode (adb: `adb shell dumpsys deviceidle force-idle`) | Detection resumes when device exits doze |

## 8. Recovery mode

| # | Step | Pass criterion |
| --- | --- | --- |
| 8.1 | Reach 150 reels (or use dev override to set count) | Overlay notification swaps to "Start Recovery?" CTA |
| 8.2 | Tap recovery notification | Unloop opens on /recovery |
| 8.3 | Home screen shows recovery banner at >=150 reels | Banner visible; tap navigates to /recovery |
| 8.4 | Run 2-minute breathing exercise to completion | Celebration overlay shows; recovery session logged; brain energy increases |
| 8.5 | Cancel an activity mid-way | No session logged; no energy gained |
| 8.6 | Complete one activity per type (5 total) | Streak counter shows 1; energy reflects all sessions |
| 8.7 | Journey screen shows Recovery Progress section | Energy and streak match recovery store |
| 8.8 | Analytics shows lifetime sessions + energy restored | Numbers match completed sessions |

## 9. Brain stage changes

Thresholds: Energized 0-25, Focused 26-50, Tired 51-100, Brain Rot 101-150, Zombie 151+.

| # | Step | Pass criterion |
| --- | --- | --- |
| 9.1 | Count = 0 | Stage = Energized; overlay color matches Energized token |
| 9.2 | Cross 26 reels | Stage transitions to Focused with smooth color crossfade (~300ms) |
| 9.3 | Cross 51 reels | Stage = Tired; overlay subtitle shows a Tired personality message |
| 9.4 | Cross 101 reels | Stage = Brain Rot; warning subtitle "You've been scrolling…" appears once |
| 9.5 | Cross 151 reels | Stage = Zombie; recovery CTA active |
| 9.6 | Each new reel within a stage | Pill scales up briefly (~1.10x) then settles |
| 9.7 | Personality messages | Rotate every ~14s; no two consecutive duplicates within a stage |
| 9.8 | Warnings at 50/100/150/200 | Each fires exactly once per day |

## 10. Daily reset

| # | Step | Pass criterion |
| --- | --- | --- |
| 10.1 | Set device clock forward past local midnight (or wait) | Count resets to 0 within ~1 minute of midnight |
| 10.2 | Reset transition while overlay visible | Subtitle shows "Fresh start ✨" for ~6s |
| 10.3 | Brain stage after reset | Returns to Energized |
| 10.4 | Recovery streak preserved across midnight (if today completed) | Streak survives; today's energy starts at baseline |
| 10.5 | Yesterday's totals visible in Analytics history | Previous day persisted, not overwritten |
| 10.6 | Per-threshold warning latches reset | Warnings re-fire on the new day |

## 11. Analytics accuracy

| # | Step | Pass criterion |
| --- | --- | --- |
| 11.1 | Cross-check overlay count vs Analytics "Reels today" | Match exactly at all times |
| 11.2 | Per-platform chips (IG / YT / FB / TikTok) | Sum equals total reels today |
| 11.3 | Most distracting platform | Matches the platform with the highest count |
| 11.4 | Brain stage card matches overlay stage | Same stage label on both surfaces |
| 11.5 | Time-in-stage durations | Increase monotonically; sum ≈ time since first reel today |
| 11.6 | Most common stage today / longest focus streak | Recompute by hand from history — match within 1 minute |
| 11.7 | Background → foreground Unloop | No double-counting on resume |
| 11.8 | Cloud sync (if signed in) | Today's totals appear in backend within ~30s |

---

## Bug report template

Copy this template for every issue found. One bug per report. Attach a
screen recording when behavior is visual or timing-sensitive.

```
Title: [Area] One-line summary

Severity: Blocker / Critical / Major / Minor / Cosmetic
Area: Instagram | YouTube | Facebook | Overlay | Permissions |
      Battery | Recovery | Brain stage | Daily reset | Analytics
Checklist row: e.g. 2.4
Build: versionName (versionCode)
Device: Model / Android version / OEM skin
Apps: Instagram x.y.z / YouTube a.b.c / Facebook m.n.o
Permissions: Accessibility=on/off, Overlay=on/off, BatteryOpt=unrestricted/optimized
Reproducibility: Always | Sometimes (N of M) | Once

Preconditions
- e.g. Count = 49, stage = Focused, overlay visible

Steps to reproduce
1.
2.
3.

Expected
-

Actual
-

Logs / evidence
- adb logcat snippet (filter: ReelDetectorService, OverlayService, UnloopNativePlugin)
- Screen recording: <link>
- Screenshot: <link>

Notes / hypothesis
-
```

### Severity guide

- **Blocker** — detection broken on a supported platform, app crash, data loss, permission flow stuck.
- **Critical** — overlay missing, recovery CTA not firing at threshold, daily reset failure, analytics off by >10%.
- **Major** — wrong count by 1-2 per session, stage transition delayed, warning fires twice.
- **Minor** — animation jank, copy typo, transient flicker.
- **Cosmetic** — color drift, spacing, non-blocking visual polish.

### Logcat quick filter

```
adb logcat -v time \
  ReelDetectorService:V OverlayService:V UnloopNativePlugin:V \
  AndroidRuntime:E *:S
```
