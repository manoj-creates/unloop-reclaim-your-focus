package app.unloop.accessibility

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.google.firebase.crashlytics.FirebaseCrashlytics


/**
 * UnloopAccessibilityService
 *
 * Minimal, Play-policy-compliant Accessibility Service used by Unloop to
 * detect when a short-form video feed (Reels / Shorts / TikTok / etc.) is
 * displayed on screen. The set of packages we observe, the event types, and
 * the feedback behaviour are all declared in
 * res/xml/accessibility_service_config.xml; the system loads that metadata
 * from the <service> entry in AndroidManifest.xml.
 *
 * Intentionally NOT implemented here:
 *  - text/keystroke capture
 *  - screen content exfiltration
 *  - any network I/O
 *
 * Reel detection logic and the JS bridge live in a future Capacitor plugin;
 * for now this class only logs the event window so the manifest resolves and
 * the service can be enabled by the user via Settings → Accessibility.
 */
class UnloopAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        // Metadata (packageNames, event types, flags) is loaded from
        // @xml/accessibility_service_config by the framework — no programmatic
        // setServiceInfo() needed, which keeps the disclosure honest.
        Log.i(TAG, "UnloopAccessibilityService connected")
        safeCrashlytics { it.log("a11y: onServiceConnected") }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            val ev = event ?: return
            val pkg = ev.packageName?.toString() ?: return
            // Lightweight signal only. No text, no node tree walk, no upload.
            if (BuildLog.VERBOSE) {
                Log.v(TAG, "event type=${ev.eventType} pkg=$pkg")
            }
        } catch (t: Throwable) {
            // A crashing AccessibilityService gets disabled by the system —
            // report and swallow so the user doesn't lose detection silently.
            Log.e(TAG, "onAccessibilityEvent failed", t)
            safeCrashlytics { it.recordException(t) }
        }
    }

    override fun onInterrupt() {
        Log.i(TAG, "UnloopAccessibilityService interrupted")
    }

    private inline fun safeCrashlytics(block: (FirebaseCrashlytics) -> Unit) {
        try { block(FirebaseCrashlytics.getInstance()) } catch (_: Throwable) {}
    }


    private object BuildLog {
        // Flip to true only in local debugging; keep false for release builds.
        const val VERBOSE = false
    }

    companion object {
        private const val TAG = "UnloopA11y"
    }
}
