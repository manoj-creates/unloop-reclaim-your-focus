# Unloop — APK Testing Freeze & Release-Readiness Report

Feature development is **FROZEN**. From this point forward only bug fixes,
crash patches, permission/Accessibility startup repairs, and signing /
packaging work are permitted. No new UI, no new screens, no analytics
dashboards, no premium features, no cloud sync, no auth, no gamification,
no achievements, no additional settings.

Pair with:
- `docs/android-test-build.md` — build + install + signing runbook.
- `docs/android-qa-device-run.md` — on-device QA script.
- `docs/android-phase-qa.md` — pass/fail checklist + bug template.

---

## 1. APK build status

| Item                                  | Status     | Notes                                                              |
| ------------------------------------- | ---------- | ------------------------------------------------------------------ |
| Capacitor shell (`capacitor.config`)  | ✅ Ready   | `app.unloop`, `dist/` webDir, `androidScheme: https`.              |
| Web bundle (`bun run build`)          | ✅ Ready   | Builds clean; UI polish pass approved, no further redesigns.       |
| Native plugin (`UnloopNativePlugin`)  | ✅ Ready   | Wired to `EventBus` → JS `reelDetected`, `permissionsChanged`.     |
| Accessibility service                 | ✅ Ready   | `ReelDetectorService` + 3 detectors registered, scoped packages.   |
| Overlay foreground service            | ✅ Ready   | `OverlayService` (`specialUse`), driven by `PlatformFocusChanged`. |
| Permissions snapshot                  | ✅ Ready   | Overlay / Accessibility / Notifications / Battery — no Usage Access. |
| Signing config                        | ⚠️ Operator | Keystore `~/unloop-testing.jks` generated locally per runbook §2.  |
| Signed release APK                    | ⏳ Pending | Cut via `./gradlew :app:assembleRelease` once keystore is in place. |

**Build command (operator):**

```bash
bun install
bun run build
bunx cap sync android
cd android && ./gradlew clean :app:assembleRelease
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`.

---

## 2. Remaining blockers

None code-side. Outstanding work is operator/device-side only:

| Blocker                                    | Owner    | Resolution                                                  |
| ------------------------------------------ | -------- | ----------------------------------------------------------- |
| Signing keystore not yet generated         | Operator | `keytool -genkey` per `android-test-build.md` §2.           |
| Real Android 12 / 13 / 14 / 15 hardware    | Operator | Run §3 matrix on each API level before ship.                |
| OEM autostart settings (MIUI/Vivo/Oppo/…)  | Operator | Manual toggle per OEM, documented §4.                       |

---

## 3. Android version compatibility (target / verify matrix)

`minSdk` is set to allow Android 10+; the four shipping targets to verify:

| Android | API | Key surface to verify                                              |
| ------- | --- | ------------------------------------------------------------------ |
| 12      | 31  | Foreground service start from background (manifest declares type). |
| 13      | 33  | `POST_NOTIFICATIONS` runtime prompt, themed app icon.              |
| 14      | 34  | `foregroundServiceType="specialUse"` on `OverlayService`.          |
| 15      | 35  | Edge-to-edge default, `BIND_ACCESSIBILITY_SERVICE` unchanged.      |

Gate: a 5-minute scroll session on each must produce non-zero detection
counts and a visible top-center pill, with no FATAL log lines.

---

## 4. OEM compatibility checklist

For each device, after installing the APK:

1. Long-press app card in Recents → **Lock**.
2. Enable **Autostart** in the OEM settings panel for `app.unloop`.
3. Set battery to **No restrictions / Don't optimize**.
4. Reboot, foreground Instagram Reels, confirm pill reappears within ~2 s.

| OEM       | Settings path                                                                  | Pass criterion                                     |
| --------- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| Xiaomi    | Security → Permissions → Autostart → Unloop ON; Battery saver → No restrictions | Pill survives 30 min idle + reboot.                |
| Vivo      | Battery → Background power consumption → Allow; Auto-start → ON                | Pill survives reboot.                              |
| Oppo      | Battery → App battery management → Allow background; Startup manager → ON       | Pill survives reboot.                              |
| Realme    | Same as Oppo (ColorOS).                                                        | Pill survives reboot.                              |
| Samsung   | Apps → Unloop → Battery → Unrestricted; Sleeping apps → exclude Unloop          | Pill survives reboot.                              |

If pill fails to reappear after reboot on a given OEM, file a bug with
`adb logcat -d | grep -iE 'OverlayService|ReelDetectorService|unloop'`
attached. Do NOT add new code paths — fix only via service restart hints.

---

## 5. Known bugs (non-blocking)

| ID    | Area      | Behavior                                                                 | Severity | Plan |
| ----- | --------- | ------------------------------------------------------------------------ | -------- | ---- |
| IG-01 | Instagram | First reel of a session occasionally off-by-one (±1)                     | Low      | Accept for MVP; tolerance documented in QA script §3. |
| YT-01 | YouTube   | In-feed sponsored Shorts count as reels (same dopamine surface)          | By design | Documented behavior. |
| FB-01 | Facebook  | Background audio of a Reel does not count                                | Low      | Documented; not in scope. |
| OEM-01| MIUI/Vivo | Foreground service killed when autostart disabled                        | OEM      | Mitigated via §4 manual toggle. |

No Critical or Blocker bugs open at freeze.

---

## 6. Validation status (code-side)

| Area                          | Status | Source                                                       |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| Instagram detector            | ✅     | `detectors/InstagramDetector.kt` — debounce + dedupe live.   |
| YouTube detector              | ✅     | `detectors/YouTubeDetector.kt` — Shorts gating + dedupe.     |
| Facebook detector             | ✅     | `detectors/FacebookDetector.kt` — Reels viewer gating.       |
| Debounce / dedupe             | ✅     | 600 ms + `platform:reelId` key in `reels-store.ts`.          |
| Overlay visibility            | ✅     | `OverlayService` driven by `PlatformFocusChanged`.           |
| Overlay dismissal             | ✅     | Hides on background of supported app.                        |
| Real-time count updates       | ✅     | `EventBus` → JS `reelDetected` → store → overlay refresh.    |
| Recovery CTA at 150+          | ✅     | Reflection overlay wired to `reelsToday` threshold.          |
| App restart persistence       | ✅     | `localStorage` + `todayKey()` rollover.                      |
| Device reboot rebind          | ✅     | OS rebinds Accessibility services automatically.             |
| Midnight reset                | ✅     | `todayKey()` flips on local midnight.                        |
| No Usage Access leak          | ✅     | `rg PACKAGE_USAGE_STATS` = 0 hits.                           |

---

## 7. APK installation instructions (testers)

1. Receive `app-release.apk` from the build operator (drive / email / direct).
2. On the test phone, enable **Settings → Apps → Special access → Install
   unknown apps** for your file manager (or Chrome if downloading via link).
3. Tap the APK → **Install** → **Open**.
4. Walk the in-app Readiness screen in this order:
   1. Allow **Notifications** (Android 13+).
   2. Enable **Accessibility → Installed services → Unloop**.
   3. Enable **Display over other apps**.
   4. Allow **Unrestricted battery usage**.
   5. On Xiaomi / Vivo / Oppo / Realme / Samsung — follow §4 OEM step.
5. Open Instagram and scroll a Reel. The top-center brain pill must appear
   within ~1 s and the Today counter on Unloop must increment.
6. If anything fails, file a bug using the template in
   `docs/android-phase-qa.md` and include:
   - Device model + Android version + OEM skin version.
   - `adb logcat -d | grep -iE 'unloop|ReelDetector|Overlay|AndroidRuntime|ANR'`
   - Reproduction steps and expected vs actual.

---

## 8. Freeze rules (binding)

- **No new features.** Period.
- **No UI redesigns** unless a bug renders a screen unusable on a real device.
- **No new permissions.** Detection stays Accessibility-only.
- **No new dependencies** unless required to patch a crash.
- Bump `versionCode` on every rebuild; keep `versionName` semver patch-only.
- Every patch must re-run the failing QA row twice in a row before green.
- Ship only when every Critical/Blocker row is green for **two consecutive**
  signed builds and a 30-min scroll holds the performance budget.
