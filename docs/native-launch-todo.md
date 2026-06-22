# Native Android launch checklist

These tasks **cannot be completed from the web sandbox**. The JS side has been
fully wired (`src/lib/notifications.ts`, `src/lib/crashlytics.ts`) and falls
back gracefully when the native plugins are not yet present.

## 1. Firebase Crashlytics

1. In Firebase console: register the Android app (package `app.unloop`).
2. Download `google-services.json` → `android/app/google-services.json`.
3. Edit `android/build.gradle` (project) — add to `dependencies`:
   ```
   classpath 'com.google.gms:google-services:4.4.2'
   classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.2'
   ```
4. Edit `android/app/build.gradle` — at top:
   ```
   apply plugin: 'com.google.gms.google-services'
   apply plugin: 'com.google.firebase.crashlytics'
   ```
   In `dependencies`:
   ```
   implementation platform('com.google.firebase:firebase-bom:33.5.1')
   implementation 'com.google.firebase:firebase-crashlytics'
   implementation 'com.google.firebase:firebase-analytics'
   ```
5. Create Capacitor plugin `UnloopCrashlytics` (Kotlin) implementing the
   contract documented at the top of `src/lib/crashlytics.ts`:
   - `log({ message })` → `FirebaseCrashlytics.getInstance().log(...)`
   - `recordError({ name, message, stack, context })` →
     `recordException(Throwable(message).apply { ... })` + `setCustomKey("context", ...)`
   - `setUserId({ userId })` → `setUserId(...)`
   - `setCustomKey({ key, value })` → `setCustomKey(...)`
6. In `MainActivity.onCreate`, set device context:
   ```kotlin
   val c = FirebaseCrashlytics.getInstance()
   c.setCustomKey("manufacturer", Build.MANUFACTURER)
   c.setCustomKey("android_version", Build.VERSION.RELEASE)
   c.setCustomKey("app_version", BuildConfig.VERSION_NAME)
   ```
7. Verify on a release build (`./gradlew assembleRelease`) — Crashlytics
   only uploads symbols on release builds by default.

## 2. WorkManager-based notifications

1. Add WorkManager dep to `android/app/build.gradle`:
   ```
   implementation "androidx.work:work-runtime-ktx:2.9.1"
   ```
2. Add to AndroidManifest.xml:
   ```xml
   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
   <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

   <receiver
     android:name=".native.BootReceiver"
     android:enabled="true"
     android:exported="true">
     <intent-filter>
       <action android:name="android.intent.action.BOOT_COMPLETED" />
     </intent-filter>
   </receiver>
   ```
3. Create Capacitor plugin `UnloopNotifications` (Kotlin) matching the
   contract at top of `src/lib/notifications.ts`:
   - `ensureChannels()` — create channels `daily`, `morning`, `midday`,
     `evening`, `streak`, `weekly` (Android 8+).
   - `requestPostNotifications()` — call `ActivityCompat.requestPermissions`
     for `POST_NOTIFICATIONS` on Android 13+.
   - `areNotificationsEnabled()` — `NotificationManagerCompat.from(ctx).areNotificationsEnabled()`.
   - `scheduleAll(opts)` — for each enabled toggle, schedule a daily
     `PeriodicWorkRequest` via WorkManager with `setInitialDelay` to the
     next occurrence of the target hour.
   - `cancelAll()` — `WorkManager.getInstance(ctx).cancelAllWorkByTag("unloop-notif")`.
4. `BootReceiver.onReceive` should re-run `scheduleAll` using the persisted
   settings (read from SharedPreferences populated by `scheduleAll`).

## 3. Account deletion verification

`deleteMyAccount` server fn already cascades through every user_id-keyed
table and calls `auth.admin.deleteUser`. After the response, the JS side
signs the user out and redirects to onboarding. **No further native work
required** — verify on a physical device that:

- The Account row disappears (Auth dashboard)
- `user_backups`, `user_widgets`, `user_analytics`, `user_streaks`,
  `user_goals`, `profiles` rows are gone
- Re-sign-in creates a fresh row set via `handle_new_user` trigger

## 4. Google Sign-In on physical Android

- `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" })`
  uses the system browser. Add an intent-filter on `MainActivity` for the
  custom scheme if you switch to a native client.
- Verify deep-link return: tap the email link or OAuth callback while the
  APK is installed; the app should regain focus and complete the session.

## 5. Release build checklist

- [ ] `android/app/build.gradle`: `minifyEnabled true`, `shrinkResources true`
- [ ] Signing config wired (`signingConfigs.release` + `buildTypes.release.signingConfig`)
- [ ] `android:debuggable="false"` (default on release)
- [ ] `network_security_config.xml` (no cleartext)
- [ ] Run `./gradlew bundleRelease` → AAB at `android/app/build/outputs/bundle/release/`
- [ ] Test internal track on a real device before promoting

## 6. OEM autostart (Xiaomi/Vivo/Oppo/Realme)

Add a "Help my service stay alive" screen that deep-links into each OEM's
autostart manager. Open intents:

```kotlin
"com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity" // Xiaomi
"com.coloros.safecenter/.permission.startup.StartupAppListActivity"                  // Oppo
"com.iqoo.secure/.ui.phoneoptimize.AddWhiteListActivity"                              // Vivo
"com.coloros.safecenter/.startupapp.StartupAppListActivity"                           // Realme
```

Wrap each in a try/catch — not every OEM exposes every activity.
