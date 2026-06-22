# Unloop — Android Test Build & Device Validation

This is the operator runbook for cutting a release-testing APK and running it
through the QA matrix on a real phone. Pair it with:

- `docs/android-phase-qa.md` — full pass/fail checklist + bug template.
- `docs/android-phase-qa1-release-testing.md` — build/signing reference.

No new features land in this phase. Only bugs surfaced on-device get patched.

---

## 0. Prerequisites (one-time)

On your build machine:

- Node 20+, Bun, JDK 17, Android Studio (with SDK 34 + build-tools 34).
- `adb` on PATH (`adb devices` should list your phone).
- A real Android phone (Android 10+ recommended), USB cable, USB debugging on.

On the phone:

- Settings → About → tap Build number 7× to unlock Developer options.
- Developer options → enable USB debugging + Install via USB.
- Disable MIUI/ColorOS/OneUI "USB install verification" if your OEM has it.

---

## 1. Generate the Android project (first run only)

The repo ships the Capacitor Android source under `android/app/src/`, but the
gradle wrapper is generated on demand. From the repo root:

```bash
bun install
bun run build
bunx cap add android         # only if android/gradlew is missing
bunx cap sync android
```

`cap sync` copies `dist/` into `android/app/src/main/assets/public/` and wires
the Capacitor plugins. Re-run it after every web build.

---

## 2. Cut a signed release-testing APK

One-time keystore (keep it out of git):

```bash
keytool -genkey -v -keystore ~/unloop-testing.jks \
  -keyalg RSA -keysize 2048 -validity 3650 -alias unloop
```

Add a signing config to `android/app/build.gradle` (see
`android-phase-qa1-release-testing.md` for the exact block) and point the
`release` build type at it.

Build:

```bash
cd android
./gradlew clean :app:assembleRelease
```

Output APK: `android/app/build/outputs/apk/release/app-release.apk`.

Verify it's signed:

```bash
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
```

---

## 3. Install on the phone

USB-attached:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Or sideload: copy the APK to the phone, tap it, allow "Install unknown apps"
for your file manager.

Smoke check after install:

```bash
adb shell pm list packages | grep app.unloop
adb logcat -c && adb logcat | grep -i unloop
```

---

## 4. First-run permission flow (in order)

Drive these from the in-app Readiness screen. Each maps to a row in
`android-phase-qa.md` §6–§7.

1. **Notifications** (Android 13+) — direct prompt, pill "Granted".
2. **Accessibility** — opens Settings → Accessibility → Installed services →
   Unloop. Toggle on; pill flips without reopening the app.
3. **Display over other apps** (overlay) — Settings deep-link; toggle on;
   brain pill appears top-center within ~1 s.
4. **Battery unrestricted** — direct prompt; choose Allow.
5. **OEM autostart / background activity** (MIUI, OneUI, ColorOS, Realme,
   Vivo, Honor) — long-press the app card in Recents → Lock; enable
   Autostart from the OEM settings panel. Without this the foreground
   service is killed within minutes.

Unloop has no "Usage Access" permission (PACKAGE_USAGE_STATS). Detection
relies entirely on the Accessibility service; "Usage Access" requests are
out of scope and should NOT be added during this phase.

---

## 5. On-device validation matrix

Run every row in `android-phase-qa.md`. Minimum gate to ship:

| Area                          | Must pass                                                |
| ----------------------------- | -------------------------------------------------------- |
| Instagram Reels detection     | §1 rows 1.2–1.8 (1.1 off-by-one known, non-blocking)     |
| YouTube Shorts detection      | §2 all rows                                              |
| Facebook Reels detection      | §3 all rows                                              |
| Overlay visibility            | §4 all rows                                              |
| Overlay persistence           | §5 all rows incl. lock-screen + app-kill                 |
| Permission flows              | §6, §7 all rows                                          |
| Recovery mode (≥150 reels)    | §8 all rows incl. breathing timer + analytics write-back |
| Brain stages 0/26/51/101/151  | §9 all rows incl. personality message rotation           |
| Reflection overlay triggers   | §8 rows triggered by 150-reel threshold                  |
| Daily reset at midnight       | §10 all rows                                             |
| Analytics accuracy            | §11 all rows                                             |
| Hardcore mode enforcement     | Confirm Easy/Medium/Hard/Extreme behave per level        |
| Widgets                       | Confirm pinned widget reflects live count within 30 s    |
| Recovery activity completion  | Complete each of the 5 activities, energy restored ≥ def |

For each failed row file a bug using the template in `android-phase-qa.md`.

Performance probes (run for 30 min while scrolling Reels):

```bash
adb shell dumpsys cpuinfo | grep unloop      # < 5%
adb shell dumpsys meminfo app.unloop | head  # < 120 MB TOTAL PSS
adb shell dumpsys batterystats --charged app.unloop | head -40
adb shell dumpsys activity services app.unloop | grep -E "fg=|OverlayService"
```

`fg=true` must stay set across app switches, screen-off, and lock-screen.

---

## 6. Crash & stability probes

Force-kill loop:

```bash
for i in 1 2 3 4 5; do
  adb shell am force-stop app.unloop
  sleep 2
  adb shell monkey -p app.unloop -c android.intent.category.LAUNCHER 1
  sleep 5
done
```

Overlay service must auto-restart and the pill must reappear after each kill
(once Instagram/YouTube/Facebook is foregrounded).

Reboot:

```bash
adb reboot
# wait for boot, unlock, open Instagram Reels
adb logcat | grep -i 'OverlayService\|ReelDetector'
```

ANR / native crash watch (run alongside testing):

```bash
adb logcat *:E | grep -iE 'unloop|AndroidRuntime|ANR'
```

Any `AndroidRuntime: FATAL` or `ANR in app.unloop` → file a Blocker bug and
stop testing until patched.

---

## 7. Bug-fix loop

1. Reproduce locally (replay the failing checklist row).
2. Patch the smallest possible surface — no scope creep, no UI redesign.
3. Bump `versionCode` in `android/app/build.gradle`.
4. `bun run build && bunx cap sync android && cd android && ./gradlew assembleRelease`.
5. `adb install -r app-release.apk`.
6. Re-run the failing row twice in a row before marking it green.

Ship criteria: every Critical/Blocker row green for two consecutive builds,
30-minute scroll session under the performance budget, no FATAL log lines.

---

## 8. What is explicitly NOT in this phase

- No new platforms (TikTok / Snapchat / Moj / Josh detectors stay deferred).
- No new UI screens or restyling.
- No Lovable Cloud schema changes.
- No widget redesigns — only fix widgets that fail to update.
- No marketing or store-listing work — this APK is for QA, not Play Store.
