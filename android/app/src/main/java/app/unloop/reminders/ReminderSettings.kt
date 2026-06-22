package app.unloop.reminders

import android.content.Context

/**
 * Persistent mirror of the user's notification toggles. WorkManager itself
 * remembers scheduled work across reboots, but we re-read this on
 * BOOT_COMPLETED / MY_PACKAGE_REPLACED to guarantee a deterministic
 * re-arm in case WorkManager's own database was cleared (e.g. clear-data).
 */
data class ReminderSettings(
    val daily: Boolean = false,
    val morning: Boolean = false,
    val midday: Boolean = false,
    val evening: Boolean = false,
    val streak: Boolean = false,
    val weekly: Boolean = false,
) {
    fun anyEnabled(): Boolean =
        daily || morning || midday || evening || streak || weekly

    companion object {
        private const val PREFS = "unloop_reminders"
        private const val K_DAILY = "daily"
        private const val K_MORNING = "morning"
        private const val K_MIDDAY = "midday"
        private const val K_EVENING = "evening"
        private const val K_STREAK = "streak"
        private const val K_WEEKLY = "weekly"

        fun load(context: Context): ReminderSettings {
            val p = context.applicationContext
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            return ReminderSettings(
                daily = p.getBoolean(K_DAILY, false),
                morning = p.getBoolean(K_MORNING, false),
                midday = p.getBoolean(K_MIDDAY, false),
                evening = p.getBoolean(K_EVENING, false),
                streak = p.getBoolean(K_STREAK, false),
                weekly = p.getBoolean(K_WEEKLY, false),
            )
        }

        fun save(context: Context, s: ReminderSettings) {
            context.applicationContext
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(K_DAILY, s.daily)
                .putBoolean(K_MORNING, s.morning)
                .putBoolean(K_MIDDAY, s.midday)
                .putBoolean(K_EVENING, s.evening)
                .putBoolean(K_STREAK, s.streak)
                .putBoolean(K_WEEKLY, s.weekly)
                .apply()
        }
    }
}
