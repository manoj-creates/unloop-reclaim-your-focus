package app.unloop.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * Notification channels for Unloop. Channels are created idempotently on
 * Android 8+ (NotificationManager.createNotificationChannel is a no-op if
 * the channel already exists with the same id). On Android 7 and below
 * channels do not exist — calls here are skipped.
 */
object NotificationChannels {
    const val DAILY = "unloop_daily"
    const val STREAK = "unloop_streak"
    const val WEEKLY = "unloop_weekly"

    @JvmStatic
	fun ensureAll(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(
                DAILY,
                "Daily reminders",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Morning, midday, evening and daily summary nudges."
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(
                STREAK,
                "Streak alerts",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Warnings when your streak is at risk."
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(
                WEEKLY,
                "Weekly progress",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Sunday evening weekly report."
            }
        )
    }
}
