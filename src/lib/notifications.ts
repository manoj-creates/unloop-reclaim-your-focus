/**
 * Notifications — JS-side API.
 *
 * Bridges to the native Android scheduler (WorkManager-backed) when the
 * Capacitor `UnloopNotifications` plugin is registered. On web, every
 * method is a no-op that returns `{ ok: false, reason: "unsupported" }`.
 *
 * Settings persist to localStorage so toggles survive uninstall/reinstall
 * of the JS bundle but are *also* mirrored to the native side on every
 * change so reboots and process death are handled by WorkManager.
 *
 * Native plugin contract (Kotlin TODO — see docs/native-launch-todo.md):
 *   requestPostNotifications()        -> { granted: boolean }
 *   areNotificationsEnabled()         -> { enabled: boolean }
 *   scheduleAll(opts)                 -> { ok: true } | throws
 *   cancelAll()                       -> void
 *   ensureChannels()                  -> void   // creates Android 8+ channels
 */
import { useCallback, useEffect, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

const KEY = "unloop.notifications.v1";

export type NotificationSettings = {
  daily: boolean;          // single daily summary
  morning: boolean;        // intention reminder 8am
  midday: boolean;         // check-in 1pm
  evening: boolean;        // wind-down 9pm
  streak: boolean;         // streak-at-risk warning
  weekly: boolean;         // weekly progress report (Sun 7pm)
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  daily: false,
  morning: false,
  midday: false,
  evening: false,
  streak: false,
  weekly: false,
};

interface NativeNotifPlugin {
  requestPostNotifications(): Promise<{ granted: boolean }>;
  areNotificationsEnabled(): Promise<{ enabled: boolean }>;
  ensureChannels(): Promise<void>;
  scheduleAll(opts: NotificationSettings): Promise<{ ok: true }>;
  cancelAll(): Promise<void>;
}

let pluginRef: NativeNotifPlugin | null = null;
function getPlugin(): NativeNotifPlugin | null {
  if (typeof window === "undefined") return null;
  if (!Capacitor.isPluginAvailable("UnloopNotifications")) return null;
  if (!pluginRef) pluginRef = registerPlugin<NativeNotifPlugin>("UnloopNotifications");
  return pluginRef;
}

export function notificationsBridgeAvailable(): boolean {
  return getPlugin() !== null;
}

function read(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

function write(s: NotificationSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export type NotifResult = { ok: true } | { ok: false; reason: string };

/** Requests POST_NOTIFICATIONS on Android 13+; returns true if (now) granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const p = getPlugin();
  if (!p) return false;
  try {
    const r = await p.requestPostNotifications();
    return !!r.granted;
  } catch {
    return false;
  }
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const p = getPlugin();
  if (!p) return false;
  try { return (await p.areNotificationsEnabled()).enabled; } catch { return false; }
}

/** Apply current settings to the OS scheduler. Idempotent. */
export async function applyNotificationSettings(s: NotificationSettings): Promise<NotifResult> {
  write(s);
  const p = getPlugin();
  if (!p) return { ok: false, reason: "Notifications only work on the installed Android app." };
  try {
    await p.ensureChannels();
    const anyOn = Object.values(s).some(Boolean);
    if (!anyOn) {
      await p.cancelAll();
      return { ok: true };
    }
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return { ok: false, reason: "Notification permission denied. Enable it in system settings." };
    }
    await p.scheduleAll(s);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Failed to schedule notifications." };
  }
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [hasBridge, setHasBridge] = useState(false);
  useEffect(() => {
    setSettings(read());
    setHasBridge(notificationsBridgeAvailable());
  }, []);
  const update = useCallback(async (patch: Partial<NotificationSettings>): Promise<NotifResult> => {
    const next = { ...read(), ...patch };
    setSettings(next);
    return applyNotificationSettings(next);
  }, []);
  return { settings, update, hasBridge };
}
