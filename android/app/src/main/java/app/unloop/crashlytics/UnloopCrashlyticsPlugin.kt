package app.unloop.crashlytics

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * UnloopCrashlytics — Capacitor plugin bridging JS to Firebase Crashlytics.
 *
 * JS contract is defined in src/lib/crashlytics.ts. Method names and option
 * shapes MUST stay in sync with that file.
 *
 *  - log(message)
 *  - recordError(name, message, stack?, context?)
 *  - setUserId(userId | null)        — wired to Supabase user id from JS
 *  - setCustomKey(key, value)
 */
@CapacitorPlugin(name = "UnloopCrashlytics")
class UnloopCrashlyticsPlugin : Plugin() {

    private val crashlytics: FirebaseCrashlytics by lazy { FirebaseCrashlytics.getInstance() }

    @PluginMethod
    fun log(call: PluginCall) {
        val message = call.getString("message") ?: return call.reject("message required")
        runCatching { crashlytics.log(message) }
        call.resolve()
    }

    @PluginMethod
    fun recordError(call: PluginCall) {
        val name = call.getString("name") ?: "JSError"
        val message = call.getString("message") ?: "(no message)"
        val stack = call.getString("stack")
        val context = call.getString("context")
        runCatching {
            if (context != null) crashlytics.setCustomKey("js_error_context", context)
            val err = JsBridgedException("$name: $message", stack)
            crashlytics.recordException(err)
        }
        call.resolve()
    }

    @PluginMethod
    fun setUserId(call: PluginCall) {
        val userId = call.getString("userId")
        runCatching { crashlytics.setUserId(userId ?: "") }
        val ret = JSObject().put("ok", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun setCustomKey(call: PluginCall) {
        val key = call.getString("key") ?: return call.reject("key required")
        val value = call.getString("value") ?: ""
        runCatching { crashlytics.setCustomKey(key, value) }
        call.resolve()
    }
}

/**
 * Synthetic exception that preserves the JS stack as the throwable's stack
 * trace, so Crashlytics groups JS errors by their JS origin rather than by
 * this bridge file.
 */
private class JsBridgedException(message: String, jsStack: String?) : RuntimeException(message) {
    init {
        if (!jsStack.isNullOrBlank()) {
            val frames = jsStack.lines()
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .map { StackTraceElement("JS", it, null, -1) }
                .toTypedArray()
            if (frames.isNotEmpty()) stackTrace = frames
        }
    }
}
