# Unloop — Android Device QA Run (Accessibility-Only)

Operator script for the real-device QA pass. Pair with:

- `docs/android-test-build.md` — build + install + signing.
- `docs/android-phase-qa.md` — full pass/fail checklist + bug template.

Scope: bug fixes and stability only. No new features, no UI redesign, no
new permissions. **Detection is Accessibility-only — do NOT add
`PACKAGE_USAGE_STATS` (Usage Access) anywhere in the manifest, onboarding,
Readiness screen, or docs.**

---

## 0. Pre-flight (must be true before testing starts)

Grep the repo to confirm Usage Access has not crept in:

```bash
rg -n "PACKAGE_USAGE_STATS|UsageStatsManager|ACTION_USAGE_ACCESS_SETTINGS" android src
```

Expected: **no matches**. Any hit → stop and remove before cutting the APK.

Confirm Accessibility config still scopes to the three supported packages:

```bash
rg -n "packageNames" android/app/src/main/res/xml/accessibility_service_config.xml
```

Expected: `com.instagram.android,com.google.android.youtube,com.facebook.katana`.

---

## 1. Build & install

Follow `docs/android-test-build.md` §1–§3. Verify on the phone:

```bash
adb shell pm list packages | grep app.unloop
adb logcat -c
```

---

## 2. Onboarding & permission flow (must match implementation)

The in-app Readiness screen drives the four permissions exposed by
`PermissionsReader.snapshot()`:

| Order | Permission                  | Source of truth                                | Expected pill |
| ----- | --------------------------- | ---------------------------------------------- | ------------- |
| 1     | Notifications               | `NotificationManagerCompat.areNotificationsEnabled` | Granted |
| 2     | Accessibility               | `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES` contains `ReelDetectorService` | Granted |
| 3     | Display over other apps     | `Settings.canDrawOverlays`                     | Granted |
| 4     | Battery unrestricted        | `PowerManager.isIgnoringBatteryOptimizations`  | Granted |

There is **no Usage Access step**. If onboarding shows one, it is a bug —
file it and remove the step before continuing.

Pass criteria:

- Each pill flips to **Granted** within ~1 s of returning from Settings
  (driven by `PermissionsChanged` on `EventBus`).
- Toggling Accessibility OFF in Settings flips the pill back to **Denied**
  on next foreground without restart.

---

## 3. Detection accuracy (Accessibility-only)

For each platform, scroll exactly 20 reels, then compare the in-app Today
counter and the `analytics` per-platform breakdown.

| Platform  | Package                       | Expected count | Tolerance        |
| --------- | ----------------------------- | -------------- | ---------------- |
| Instagram | com.instagram.android         | 20             | ±1 (first-reel)  |
| YouTube   | com.google.android.youtube    | 20             | ±1               |
| Facebook  | com.facebook.katana           | 20             | ±1               |

Dedupe probes (each must NOT increment the counter):

- Tap-to-pause / tap-to-resume on the same reel.
- Pull-to-refresh at top of feed.
- Background → foreground the same reel.

If counts drift >10% from the scrolled total on a clean session, attach a
`adb logcat -s ReelDetectorService:* OverlayService:*` capture to the bug.

---

## 4. Overlay over Instagram / YouTube / Facebook

For each of the three apps:

1. Foreground the app. Brain pill must appear top-center within ~1 s
   (driven by `PlatformFocusChanged`).
2. Background the app (Home). Pill must hide.
3. Re-foreground. Pill must reappear with the current count.
4. Open a non-supported app (e.g. Settings). Pill must NOT show.

---

## 5. Reflection overlay trigger

Drive `reelsToday` past the 150-reel threshold (use the in-app dev counter
bump if present, otherwise scroll). At 150+:

- Reflection overlay appears with "Start Recovery?" CTA.
- One-tap CTA navigates into `/recovery`.
- After completing one recovery activity, returning to a supported app
  does NOT re-trigger the overlay for the cooldown window.

---

## 6. Persistence matrix (the focus of this run)

| Scenario                             | What must survive                                                        | Verification                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| App restart (swipe-kill + relaunch)  | `reelsToday`, per-platform breakdown, Hardcore level, Recovery streak    | Open app → Home shows same count; Hardcore shows same level; Journey shows same streak.       |
| Device reboot                        | Same as above **+** Accessibility service auto-binds, OverlayService restarts when supported app foregrounds | `adb logcat \| grep -i 'ReelDetectorService connected\|OverlayService'` after reboot + open IG. |
| Battery optimization re-enabled      | None — Readiness must flip the pill to Denied and warn                   | Toggle "Optimize battery" ON for Unloop → Readiness shows Denied within ~1 s.                 |
| Battery unrestricted (held)          | Foreground service stays alive for 30 min idle + 30 min scrolling        | `adb shell dumpsys activity services app.unloop \| grep fg=` shows `fg=true`.                 |
| Daily reset at local midnight        | `reelsToday` resets to 0, yesterday rolls into history                   | Set device clock past midnight → Home shows 0; Journey shows yesterday's total.               |

Reboot procedure:

```bash
adb reboot
# wait for unlock, do NOT open Unloop yet
adb logcat -c
# open Instagram Reels, scroll one swipe
adb logcat | grep -iE 'ReelDetectorService|OverlayService|unloop'
```

Pass: `ReelDetectorService connected` line appears without launching the
Unloop activity (system rebinds Accessibility services), and the brain
pill appears once Instagram is foregrounded.

If the pill does NOT appear after reboot, the OEM killed the foreground
service — re-check the OEM autostart / lock-recents step from
`docs/android-test-build.md` §4 and re-run.

---

## 7. Hardcore Mode enforcement

| Level   | Expected behavior                                                          |
| ------- | -------------------------------------------------------------------------- |
| Easy    | Overlay shows, dismissible immediately                                     |
| Medium  | Overlay shows with short delay before dismiss                              |
| Hard    | Overlay shows with breathing/reflection gate before dismiss                |
| Extreme | No bypass until next local midnight                                        |

Persistence: set level → force-kill Unloop → reboot → open supported app.
Level and gate behavior must match what was set pre-reboot.

---

## 8. Recovery flow

- After 150+ reels, "Start Recovery?" CTA is offered.
- Each of the 5 activities (breathing, water, walk, read, focus timer)
  completes to 100%, restores brain energy, and increments recovery streak.
- Recovery streak survives app restart and reboot (see §6).

---

## 9. Widget functionality

- Pin the widget from launcher long-press.
- Scroll one reel in any supported app.
- Widget count updates within 30 s (the configured refresh window).
- Force-kill Unloop → widget continues to update when foreground service
  is restarted by the system on next supported-app foreground.

---

## 10. Crash testing

Run alongside the matrix:

```bash
adb logcat *:E | grep -iE 'unloop|AndroidRuntime|ANR'
```

Force-kill loop:

```bash
for i in 1 2 3 4 5; do
  adb shell am force-stop app.unloop
  sleep 2
  adb shell monkey -p app.unloop -c android.intent.category.LAUNCHER 1
  sleep 5
done
```

Any `AndroidRuntime: FATAL` or `ANR in app.unloop` → Blocker bug, stop.

---

## 11. Ship gate

- Every row in §2–§9 green for **two consecutive** signed builds.
- No FATAL / ANR log lines during a 30-min scroll session.
- Performance budget from `docs/android-test-build.md` §5 holds.
- `rg PACKAGE_USAGE_STATS` returns no matches.

File bugs with the template in `docs/android-phase-qa.md`. Patch the
smallest surface, bump `versionCode`, rebuild, re-run only the failing
row twice in a row before marking green.
