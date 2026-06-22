package app.unloop.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics


/**
 * BootCompletedReceiver
 *
 * Receives ACTION_BOOT_COMPLETED and ACTION_MY_PACKAGE_REPLACED so Unloop can
 * re-arm any reminders / scheduled work the user had configured before the
 * device rebooted or the app was updated.
 *
 * Notification scheduling (WorkManager / AlarmManager) is not yet wired in
 * native code — the JS bridge in src/lib/notifications.ts is currently a
 * facade. Until the scheduler exists, this receiver must NOT crash: it logs
 * the intent and returns. Any failure inside onReceive on a boot broadcast
 * would otherwise be reported by Play Vitals as an ANR/crash on first boot.
 */
class BootCompletedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            return
        }

        val ctx = context ?: return
        try {
            ReminderScheduler.rescheduleAll(ctx)
            Log.i(TAG, "Boot/replace received ($action); reminders re-armed.")
        } catch (t: Throwable) {
            // Never crash the boot broadcast. Play Vitals tracks these as
            // user-perceived crashes even though the user never opened the app.
            Log.w(TAG, "Failed to handle $action", t)
            try { FirebaseCrashlytics.getInstance().recordException(t) } catch (_: Throwable) {}
        }
    }

    companion object {
        private const val TAG = "UnloopBootRcv"
    }
}
