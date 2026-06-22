package app.unloop.reminders

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Capacitor bridge exposing notification scheduling to the JS layer.
 * Mirrors the contract documented in src/lib/notifications.ts.
 */
@CapacitorPlugin(
    name = "UnloopNotifications",
    permissions = [
        Permission(
            alias = "notifications",
            strings = [Manifest.permission.POST_NOTIFICATIONS]
        )
    ]
)
class UnloopNotificationsPlugin : Plugin() {

    @PluginMethod
    fun requestPostNotifications(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            val r = JSObject().put("granted", true)
            call.resolve(r); return
        }
        if (granted()) { call.resolve(JSObject().put("granted", true)); return }
        requestPermissionForAlias("notifications", call, "permissionCallback")
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val state = getPermissionState("notifications")
        call.resolve(JSObject().put("granted", state == PermissionState.GRANTED))
    }

    @PluginMethod
    fun areNotificationsEnabled(call: PluginCall) {
        val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled() && granted()
        call.resolve(JSObject().put("enabled", enabled))
    }

    @PluginMethod
    fun ensureChannels(call: PluginCall) {
        NotificationChannels.ensureAll(context)
        call.resolve()
    }

    @PluginMethod
    fun scheduleAll(call: PluginCall) {
        val s = ReminderSettings(
            daily = call.getBoolean("daily", false) ?: false,
            morning = call.getBoolean("morning", false) ?: false,
            midday = call.getBoolean("midday", false) ?: false,
            evening = call.getBoolean("evening", false) ?: false,
            streak = call.getBoolean("streak", false) ?: false,
            weekly = call.getBoolean("weekly", false) ?: false,
        )
        ReminderScheduler.apply(context, s)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun cancelAll(call: PluginCall) {
        ReminderScheduler.cancelAll(context)
        call.resolve()
    }

    private fun granted(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }
}
