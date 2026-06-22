package app.unloop.reminders

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.google.firebase.crashlytics.FirebaseCrashlytics
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Schedules Unloop reminders via WorkManager.
 *
 * Each enabled reminder becomes a unique PeriodicWorkRequest (24h or 7d
 * interval) anchored to its target wall-clock time via an initialDelay.
 * WorkManager persists requests across reboots; BootCompletedReceiver
 * additionally re-applies the persisted ReminderSettings as a belt-and-
 * braces guarantee.
 *
 * KEEP policy is used so toggling unrelated reminders doesn't reset the
 * scheduling anchor of those that are already running. cancel() uses the
 * same unique names so a disabled toggle reliably removes the work.
 */
object ReminderScheduler {

    private const val DAILY = "unloop.reminder.daily"
    private const val MORNING = "unloop.reminder.morning"
    private const val MIDDAY = "unloop.reminder.midday"
    private const val EVENING = "unloop.reminder.evening"
    private const val STREAK = "unloop.reminder.streak"
    private const val WEEKLY = "unloop.reminder.weekly"

    private val ALL_NAMES = listOf(DAILY, MORNING, MIDDAY, EVENING, STREAK, WEEKLY)

    /** Persist + apply. Called from the Capacitor plugin. */
    fun apply(context: Context, settings: ReminderSettings) {
        ReminderSettings.save(context, settings)
        NotificationChannels.ensureAll(context)
        val wm = WorkManager.getInstance(context.applicationContext)

        schedule(wm, DAILY, settings.daily, hour = 20, minute = 0,
            channel = NotificationChannels.DAILY,
            title = "Daily check-in", body = "Tap to log today and keep your streak alive.")
        schedule(wm, MORNING, settings.morning, hour = 8, minute = 0,
            channel = NotificationChannels.DAILY,
            title = "Set your intention", body = "What does a good day look like?")
        schedule(wm, MIDDAY, settings.midday, hour = 13, minute = 0,
            channel = NotificationChannels.DAILY,
            title = "Midday check-in", body = "How is the day going so far?")
        schedule(wm, EVENING, settings.evening, hour = 21, minute = 0,
            channel = NotificationChannels.DAILY,
            title = "Wind down", body = "Time to put the phone away.")
        schedule(wm, STREAK, settings.streak, hour = 20, minute = 30,
            channel = NotificationChannels.STREAK,
            title = "Your streak is at risk", body = "Don't lose your progress — open Unloop.")
        scheduleWeekly(wm, WEEKLY, settings.weekly,
            dayOfWeek = Calendar.SUNDAY, hour = 19, minute = 0,
            channel = NotificationChannels.WEEKLY,
            title = "Your week in Unloop", body = "Tap to see your weekly progress.")
    }

    /** Cancel everything. */
    fun cancelAll(context: Context) {
        val wm = WorkManager.getInstance(context.applicationContext)
        ALL_NAMES.forEach { wm.cancelUniqueWork(it) }
        ReminderSettings.save(context, ReminderSettings())
    }

    /** Called from BootCompletedReceiver — re-apply the last saved settings. */
    @JvmStatic
	fun rescheduleAll(context: Context) {
        try {
            val s = ReminderSettings.load(context)
            if (s.anyEnabled()) apply(context, s)
        } catch (t: Throwable) {
            try { FirebaseCrashlytics.getInstance().recordException(t) } catch (_: Throwable) {}
        }
    }

    private fun schedule(
        wm: WorkManager, name: String, enabled: Boolean,
        hour: Int, minute: Int,
        channel: String, title: String, body: String,
    ) {
        if (!enabled) { wm.cancelUniqueWork(name); return }
        val delay = msUntilNext(hour, minute, dayOfWeek = null)
        val req = PeriodicWorkRequestBuilder<ReminderWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .setInputData(workDataOf(
                ReminderWorker.K_CHANNEL to channel,
                ReminderWorker.K_TITLE to title,
                ReminderWorker.K_BODY to body,
                ReminderWorker.K_NOTIF_ID to name.hashCode(),
            ))
            .addTag("unloop-reminder")
            .build()
        wm.enqueueUniquePeriodicWork(name, ExistingPeriodicWorkPolicy.UPDATE, req)
    }

    private fun scheduleWeekly(
        wm: WorkManager, name: String, enabled: Boolean,
        dayOfWeek: Int, hour: Int, minute: Int,
        channel: String, title: String, body: String,
    ) {
        if (!enabled) { wm.cancelUniqueWork(name); return }
        val delay = msUntilNext(hour, minute, dayOfWeek)
        val req = PeriodicWorkRequestBuilder<ReminderWorker>(7, TimeUnit.DAYS)
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .setInputData(workDataOf(
                ReminderWorker.K_CHANNEL to channel,
                ReminderWorker.K_TITLE to title,
                ReminderWorker.K_BODY to body,
                ReminderWorker.K_NOTIF_ID to name.hashCode(),
            ))
            .addTag("unloop-reminder")
            .build()
        wm.enqueueUniquePeriodicWork(name, ExistingPeriodicWorkPolicy.UPDATE, req)
    }

    private fun msUntilNext(hour: Int, minute: Int, dayOfWeek: Int?): Long {
        val now = Calendar.getInstance()
        val target = (now.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (dayOfWeek != null) {
            // Advance to the next requested weekday (today included if still in the future).
            while (target.get(Calendar.DAY_OF_WEEK) != dayOfWeek || !target.after(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }
        } else if (!target.after(now)) {
            target.add(Calendar.DAY_OF_YEAR, 1)
        }
        return (target.timeInMillis - now.timeInMillis).coerceAtLeast(1_000L)
    }
}
