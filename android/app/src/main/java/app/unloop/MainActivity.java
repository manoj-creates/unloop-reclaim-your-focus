package app.unloop;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import app.unloop.crashlytics.UnloopCrashlyticsPlugin;
import app.unloop.reminders.NotificationChannels;
import app.unloop.reminders.ReminderScheduler;
import app.unloop.reminders.UnloopNotificationsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom Capacitor plugins BEFORE super.onCreate so the
        // bridge picks them up during initialisation.
        registerPlugin(UnloopCrashlyticsPlugin.class);
        registerPlugin(UnloopNotificationsPlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure channels exist and re-arm any reminders the user previously
        // configured — covers app-process death where the user may have
        // updated the OS or wiped WorkManager's database via clear-data.
        NotificationChannels.ensureAll(getApplicationContext());
        ReminderScheduler.rescheduleAll(getApplicationContext());
    }
}
