/**
 * Crashlytics — JS-side facade.
 *
 * Bridges to a Capacitor `UnloopCrashlytics` plugin that wraps the
 * Firebase Crashlytics Android SDK. On web (or when the plugin isn't
 * registered yet) the calls fall back to console logging so the JS layer
 * is safe to call from anywhere.
 *
 * Native plugin contract (Kotlin TODO — see docs/native-launch-todo.md):
 *   log(message)
 *   recordError(name, message, stack?)
 *   setUserId(id | null)
 *   setCustomKey(key, value)
 *   crash()                                    // debug only
 *
 * What we capture:
 *   - JS errors (window.error, unhandledrejection) — wired by initCrashlytics()
 *   - Supabase auth failures              — call reportError(err, "auth.signin")
 *   - Cloud sync failures                 — call reportError(err, "sync.push")
 *   - Notification scheduling failures    — call reportError(err, "notifications.schedule")
 *   - Accessibility service failures      — native side reports directly
 *   - Native crashes                      — Firebase Crashlytics handles automatically
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

interface CrashlyticsPlugin {
  log(opts: { message: string }): Promise<void>;
  recordError(opts: { name: string; message: string; stack?: string; context?: string }): Promise<void>;
  setUserId(opts: { userId: string | null }): Promise<void>;
  setCustomKey(opts: { key: string; value: string }): Promise<void>;
}

let pluginRef: CrashlyticsPlugin | null = null;
function getPlugin(): CrashlyticsPlugin | null {
  if (typeof window === "undefined") return null;
  if (!Capacitor.isPluginAvailable("UnloopCrashlytics")) return null;
  if (!pluginRef) pluginRef = registerPlugin<CrashlyticsPlugin>("UnloopCrashlytics");
  return pluginRef;
}

export function crashlyticsAvailable(): boolean {
  return getPlugin() !== null;
}

export function reportError(err: unknown, context?: string) {
  const e = err instanceof Error ? err : new Error(String(err));
  // Always log to console — dev visibility + browser DevTools.
  console.error(`[crashlytics${context ? `:${context}` : ""}]`, e);
  const p = getPlugin();
  if (!p) return;
  p.recordError({ name: e.name, message: e.message, stack: e.stack, context }).catch(() => {});
}

export function crashlyticsLog(message: string) {
  const p = getPlugin();
  if (p) p.log({ message }).catch(() => {});
}

export function setCrashlyticsUser(userId: string | null) {
  const p = getPlugin();
  if (p) p.setUserId({ userId }).catch(() => {});
}

export function setCrashlyticsKey(key: string, value: string) {
  const p = getPlugin();
  if (p) p.setCustomKey({ key, value }).catch(() => {});
}

/** Call once at app boot. Wires global JS handlers + records app/device context. */
export function initCrashlytics() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __unloopCrashlyticsInit?: boolean }).__unloopCrashlyticsInit) return;
  (window as unknown as { __unloopCrashlyticsInit?: boolean }).__unloopCrashlyticsInit = true;

  window.addEventListener("error", (ev) => {
    reportError(ev.error ?? ev.message, "window.error");
  });
  window.addEventListener("unhandledrejection", (ev) => {
    reportError(ev.reason, "unhandledrejection");
  });

  // Best-effort device context. On native, the Android UnloopApplication
  // already seeds app_version / build_type / device_* from BuildConfig +
  // android.os.Build — don't overwrite those here.
  try {
    setCrashlyticsKey("platform", Capacitor.getPlatform());
    setCrashlyticsKey("user_agent", navigator.userAgent);
    if (!Capacitor.isNativePlatform()) {
      setCrashlyticsKey("app_version", "web");
    }
  } catch {}
}
