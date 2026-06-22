package app.unloop.reminders

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import app.unloop.MainActivity
import app.unloop.R
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Posts a single notification. Re-runs on its PeriodicWorkRequest cadence.
 * Honours the Android 13+ POST_NOTIFICATIONS runtime permission — if the
 * user revoked it after scheduling, we silently skip posting (returning
 * success so the periodic work stays scheduled and resumes once permission
 * is re-granted).
 */
class ReminderWorker(
    appContext: Context,
    params: WorkerParameters,
) : Worker(appContext, params) {

    override fun doWork(): Result {
        return try {
            val ctx = applicationContext
            val channel = inputData.getString(K_CHANNEL) ?: NotificationChannels.DAILY
            val title = inputData.getString(K_TITLE) ?: "Unloop"
            val body = inputData.getString(K_BODY) ?: ""
            val notifId = inputData.getInt(K_NOTIF_ID, channel.hashCode())

            if (!hasPostPermission(ctx)) return Result.success()

            NotificationChannels.ensureAll(ctx)

            val launch = Intent(ctx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val contentIntent = PendingIntent.getActivity(ctx, notifId, launch, piFlags)

            val n = NotificationCompat.Builder(ctx, channel)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                .build()

            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(notifId, n)
            Result.success()
        } catch (t: Throwable) {
            try { FirebaseCrashlytics.getInstance().recordException(t) } catch (_: Throwable) {}
            // Don't retry — next periodic run will fire on schedule anyway.
            Result.success()
        }
    }

    private fun hasPostPermission(ctx: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            ctx, android.Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    companion object {
        const val K_CHANNEL = "channel"
        const val K_TITLE = "title"
        const val K_BODY = "body"
        const val K_NOTIF_ID = "notifId"
    }
}
