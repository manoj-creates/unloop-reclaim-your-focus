# Phase QA.1 — Real Device Testing: Release Build + Install Guide

Goal: produce a signed **release-testing** APK of Unloop, sideload it on a
real Android phone, and run the Phase QA checklist
(`docs/android-phase-qa.md`).

> No new features land in this phase. Only bug fixes triggered by failures
> in the checklist.

---

## 0. Prerequisites (one-time, on your dev machine)

- **Node 20+** and **bun** (the project uses bun).
- **JDK 17** (Android Gradle Plugin 8.x requires JDK 17 — JDK 21 also works).
- **Android Studio** with the latest Android SDK + Platform Tools (`adb`).
- Set `ANDROID_HOME` (e.g. `~/Library/Android/sdk` on macOS,
  `%LOCALAPPDATA%\Android\Sdk` on Windows).
- A real Android phone (Android 10+ recommended) with **USB debugging** on.

Verify:

```bash
java -version          # 17.x
adb --version
echo $ANDROID_HOME     # non-empty
```

---

## 1. Build the web bundle

From the project root:

```bash
bun install
bun run build          # outputs to dist/
```

Then sync the bundle into the native Android project:

```bash
bunx cap sync android
```

`cap sync` copies `dist/` into `android/app/src/main/assets/public/` and
refreshes Capacitor plugin wiring. Re-run it after every web change.

---

## 2. Generate a release-testing signing key (one-time)

You need a keystore so the APK installs without "App not installed"
errors. For internal testing, a self-signed key is fine — keep this file
safe; you'll need the **same** key for every future update.

```bash
keytool -genkeypair -v \
  -keystore ~/unloop-testing.jks \
  -alias unloop-testing \
  -keyalg RSA -keysize 2048 -validity 3650 \
  -storepass changeme -keypass changeme \
  -dname "CN=Unloop QA, O=Unloop, C=US"
```

Replace `changeme` with a real password if you're sharing the build.

---

## 3. Wire the signing config into Gradle (one-time)

Edit `android/app/build.gradle` and add a `signingConfigs` block + point
the `release` build type at it:

```gradle
android {
    // ...existing config...

    signingConfigs {
        releaseTesting {
            storeFile file(System.getenv("UNLOOP_KEYSTORE") ?: "${System.properties['user.home']}/unloop-testing.jks")
            storePassword System.getenv("UNLOOP_KEYSTORE_PASSWORD") ?: "changeme"
            keyAlias System.getenv("UNLOOP_KEY_ALIAS") ?: "unloop-testing"
            keyPassword System.getenv("UNLOOP_KEY_PASSWORD") ?: "changeme"
        }
    }

    buildTypes {
        release {
            minifyEnabled false           // keep off until ProGuard rules are vetted for the native plugin
            signingConfig signingConfigs.releaseTesting
        }
    }
}
```

Do **not** commit the keystore or real passwords. Prefer env vars in CI.

---

## 4. Build the release APK

```bash
cd android
./gradlew clean assembleRelease
```

Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

That's the file to install on test devices. Note the `versionName` and
`versionCode` from `android/app/build.gradle` — both go on every bug
report.

> If the build fails with "SDK location not found", create
> `android/local.properties` with `sdk.dir=/path/to/Android/sdk`.

---

## 5. Install on a real device

**Option A — adb (recommended, no warnings):**

```bash
adb devices                                 # confirm phone shows "device"
adb install -r app/build/outputs/apk/release/app-release.apk
```

`-r` replaces an existing install while preserving data.

**Option B — sideload from the phone:**

1. Transfer `app-release.apk` to the phone (USB, Drive, email).
2. On the phone, open the file. Android will prompt to allow installs
   from this source — accept.
3. Tap Install.

If you see "App not installed" after an earlier install: the new APK is
signed with a different key. Uninstall the old version first:
`adb uninstall app.unloop`.

---

## 6. First-run setup on the device

In this exact order so the readiness screen lights up green:

1. Launch **Unloop**.
2. Accept the **notification** permission prompt (Android 13+).
3. From Readiness → **Grant accessibility** → enable "Unloop" in system
   Accessibility settings → back to app.
4. From Readiness → **Display over other apps** → toggle Unloop on → back.
5. System Settings → Apps → Unloop → **Battery → Unrestricted**.
6. On OEM skins that aggressively kill background apps (MIUI, OneUI,
   ColorOS, HyperOS): open Recents, long-press Unloop, **Lock**.

Readiness should now show every row green. The foreground notification
"Unloop is active" should be visible in the shade.

---

## 7. Run the checklist

Execute `docs/android-phase-qa.md` end to end. The 11 sections map
exactly to the 15 focus areas in this phase:

| Phase QA.1 focus | Checklist section |
| --- | --- |
| 1. Instagram counting accuracy | §1 |
| 2. YouTube Shorts counting accuracy | §2 |
| 3. Facebook Reels counting accuracy | §3 |
| 4. Floating brain counter visibility | §4 (4.1–4.3) |
| 5. Overlay position top-center | §4 (4.5) |
| 6. Overlay persistence on app switch | §4 + §5 |
| 7. Accessibility permission flow | §6 |
| 8. Overlay permission flow | §7 (7.1–7.2) |
| 9. Notification permission flow | §5 (5.1) + first-run step 2 above |
| 10. Battery optimization handling | §7 (7.3–7.6) |
| 11. Brain stage progression | §9 |
| 12. Recovery mode trigger | §8 |
| 13. Analytics accuracy | §11 |
| 14. Daily reset at midnight | §10 |
| 15. App performance + battery | see §QA.1 performance probes below |

### Performance + battery probes (focus area 15)

Run these alongside the functional checklist:

```bash
# CPU + memory while scrolling Reels for 5 minutes
adb shell top -n 1 | grep app.unloop
adb shell dumpsys meminfo app.unloop | head -40

# Battery attribution since unplug
adb shell dumpsys batterystats --reset
# ...scroll Reels for 10 minutes, then:
adb shell dumpsys batterystats | grep -A2 app.unloop

# Verify foreground service is alive
adb shell dumpsys activity services app.unloop | grep -E "Service|fg="
```

Pass criteria:

- CPU < 5% average while idle on a Reels feed.
- Memory (PSS) < 120 MB sustained.
- Battery attribution < 2% per hour of active scrolling.
- Foreground service flag `fg=true` stays set across app switches.

### Logcat filter

Keep this running in another terminal while testing:

```bash
adb logcat -v time \
  ReelDetectorService:V OverlayService:V UnloopNativePlugin:V \
  AndroidRuntime:E *:S
```

---

## 8. Filing bugs

Use the **Bug report template** at the bottom of
`docs/android-phase-qa.md`. One bug per report. Required fields:

- Build (`versionName` + `versionCode`).
- Device model + Android version + OEM skin.
- App versions for IG / YouTube / Facebook.
- Permission state snapshot.
- Logcat excerpt from the filter above.
- Screen recording for anything visual or timing-sensitive
  (`adb shell screenrecord /sdcard/bug.mp4`, then
  `adb pull /sdcard/bug.mp4`).

---

## 9. Bug-fix loop

For every failure:

1. Reproduce locally with the same APK build.
2. Patch the smallest possible surface (detector heuristic, overlay
   timing, permission copy, etc.).
3. Bump `versionCode` in `android/app/build.gradle` so QA can tell builds
   apart.
4. `bun run build && bunx cap sync android && cd android && ./gradlew
   assembleRelease`.
5. Reinstall via `adb install -r`.
6. Re-run the affected checklist rows; close the bug only after the row
   passes twice in a row.

No new features during this phase — if a missing capability surfaces, log
it as a follow-up and keep the fix scope minimal.

---

## 10. Known caveats to communicate to testers

- First boot after a reboot: the accessibility service binds only after
  Unloop is launched once. Document, don't fix.
- In-feed sponsored reels count on IG and FB. Documented trade-off.
- Facebook Lite, Messenger, and Stories are **out of scope** for Phase C.3.
- Background audio of a YouTube Short does not count by design (no scroll
  events while the screen is off).
