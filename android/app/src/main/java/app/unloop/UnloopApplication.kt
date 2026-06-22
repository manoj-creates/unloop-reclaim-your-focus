package app.unloop

import app.unloop.BuildConfig
import android.app.Application
import android.os.Build
import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics
/**
 * UnloopApplication
 *
 * Process-wide bootstrap. Initialises Firebase Crashlytics and seeds the
 * custom keys we want attached to every crash (app version, build type,
 * Android version, device manufacturer / model). Collection is force-disabled
 * for debug builds so local development noise never reaches the Firebase
 * console.
 *
 * Native crashes from MainActivity, the Accessibility service, the boot
 * receiver, and any future Capacitor plugin are captured automatically by
 * Crashlytics' uncaught-exception handler installed during getInstance().
 */
class UnloopApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        try {
            val crashlytics = FirebaseCrashlytics.getInstance()
            // Disable in debug, enable in release. Honours user opt-out flows
            // that may flip this later via setCrashlyticsCollectionEnabled().
            crashlytics.setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)

            crashlytics.setCustomKey("app_version", BuildConfig.VERSION_NAME ?: "unknown")
            crashlytics.setCustomKey("version_code", BuildConfig.VERSION_CODE)
            crashlytics.setCustomKey("build_type", BuildConfig.BUILD_TYPE)
            crashlytics.setCustomKey("android_version", Build.VERSION.RELEASE ?: "unknown")
            crashlytics.setCustomKey("android_sdk", Build.VERSION.SDK_INT)
            crashlytics.setCustomKey("device_manufacturer", Build.MANUFACTURER ?: "unknown")
            crashlytics.setCustomKey("device_model", Build.MODEL ?: "unknown")
        } catch (t: Throwable) {
            // Never let crash reporting bring down the app process.
            Log.w(TAG, "Crashlytics init failed (google-services.json missing?)", t)
        }
    }

    companion object {
        private const val TAG = "UnloopApp"
    }
}
