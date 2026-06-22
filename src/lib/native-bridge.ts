import { useEffect, useState } from "react";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * Bridge to the native Android Unloop service.
 *
 * Phase A wires the React app to the Capacitor plugin `UnloopNative`
 * (see android/app/src/main/java/app/unloop/native/UnloopNativePlugin.kt).
 *
 * On the web (or before the APK is installed) the bridge is null and
 * `usePermissions` returns all checks ungranted.
 *
 * Event schema:
 *   permissionsChanged -> PermissionState
 *   reelDetected       -> { platform: ReelPlatform, ts: number }   (Phase C)
 */
export type PermissionId =
  | "overlay"
  | "accessibility"
  | "notifications"
  | "battery"
  | "compatibility";

export type PermissionState = Record<PermissionId, boolean>;

export type ReelPlatform = "instagram" | "youtube" | "facebook" | "tiktok";

export type ReelDetectedEvent = { platform: ReelPlatform; reelId?: string; ts: number };

export const EMPTY_PERMISSIONS: PermissionState = {
  overlay: false,
  accessibility: false,
  notifications: false,
  battery: false,
  compatibility: false,
};

interface UnloopNativePlugin {
  getPermissions(): Promise<PermissionState>;
  requestPermission(opts: { check: PermissionId }): Promise<PermissionState>;
  openSettings(opts: { check: PermissionId }): Promise<void>;
  setOverlayEnabled(opts: { enabled: boolean; count?: number }): Promise<void>;
  setOverlayCount(opts: { count: number }): Promise<void>;
  addListener(
    event: "permissionsChanged",
    cb: (s: PermissionState) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "reelDetected",
    cb: (e: ReelDetectedEvent) => void,
  ): Promise<PluginListenerHandle>;
}

/** Permissions with a direct system prompt — others fall back to settings. */
const DIRECT_PROMPT: ReadonlySet<PermissionId> = new Set(["battery", "notifications"]);
export function canDirectPrompt(check: PermissionId): boolean {
  return DIRECT_PROMPT.has(check);
}

// Lazy-registered Capacitor plugin handle.
let pluginRef: UnloopNativePlugin | null = null;
function getPlugin(): UnloopNativePlugin | null {
  if (typeof window === "undefined") return null;
  if (!Capacitor.isPluginAvailable("UnloopNative")) return null;
  if (!pluginRef) {
    pluginRef = registerPlugin<UnloopNativePlugin>("UnloopNative");
  }
  return pluginRef;
}

export function isNativeAndroid(): boolean {
  return typeof window !== "undefined" && Capacitor.getPlatform() === "android";
}

export function hasNativeBridge(): boolean {
  return getPlugin() !== null;
}

export async function openSystemSettings(check: PermissionId) {
  const p = getPlugin();
  if (!p) return;
  try { await p.openSettings({ check }); } catch { /* swallow — surfaced via state */ }
}

/**
 * Prefer a direct OS prompt when one exists (battery exemption,
 * Android 13+ notifications). Falls back to Settings deep-link otherwise.
 * The post-prompt PermissionState arrives via the `permissionsChanged`
 * event listener — no polling.
 */
export async function requestNativePermission(check: PermissionId) {
  const p = getPlugin();
  if (!p) return;
  try {
    if (DIRECT_PROMPT.has(check)) {
      await p.requestPermission({ check });
    } else {
      await p.openSettings({ check });
    }
  } catch { /* swallow — surfaced via state */ }
}

/**
 * Phase D — control the native brain-pill overlay. The native side keeps
 * a foreground service alive; these helpers are idempotent and safe to
 * call repeatedly. No-op on web or pre-overlay-permission devices.
 */
export async function setOverlayEnabled(enabled: boolean, count = 0) {
  const p = getPlugin();
  if (!p) return;
  try { await p.setOverlayEnabled({ enabled, count }); } catch { /* surfaced via state */ }
}

export async function setOverlayCount(count: number) {
  const p = getPlugin();
  if (!p) return;
  try { await p.setOverlayCount({ count }); } catch { /* swallow */ }
}

export function usePermissions() {
  const [perms, setPerms] = useState<PermissionState>(EMPTY_PERMISSIONS);
  const [hasBridge, setHasBridge] = useState(false);

  useEffect(() => {
    const p = getPlugin();
    if (!p) {
      setHasBridge(false);
      setPerms(EMPTY_PERMISSIONS);
      return;
    }
    setHasBridge(true);

    let cancelled = false;
    let handle: PluginListenerHandle | null = null;

    const refresh = async () => {
      try {
        const s = await p.getPermissions();
        if (!cancelled) setPerms(s);
      } catch {
        if (!cancelled) setPerms(EMPTY_PERMISSIONS);
      }
    };

    refresh();
    p.addListener("permissionsChanged", (s) => { if (!cancelled) setPerms(s); })
      .then((h) => { handle = h; });

    const onFocus = () => { refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      handle?.remove();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return { perms, hasBridge };
}

/** Subscribe to reel-detected events. Used by reels-store in Phase C. */
export async function onReelDetected(
  cb: (e: ReelDetectedEvent) => void,
): Promise<() => void> {
  const p = getPlugin();
  if (!p) return () => {};
  const handle = await p.addListener("reelDetected", cb);
  return () => handle.remove();
}
