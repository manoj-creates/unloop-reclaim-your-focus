/**
 * Backup & Restore — complete snapshot of all local stores.
 *
 * Covers everything not already in Supabase tables, plus a copy of the
 * cloud-tracked stuff so a backup blob is self-sufficient.
 *
 * Schema versioned. Restores prompt for confirmation and surface a
 * preview summary so the user knows exactly what will overwrite local
 * state.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/crashlytics";

export const BACKUP_SCHEMA_VERSION = 1;
const LAST_BACKUP_KEY = "unloop.lastBackupAt";
const LAST_RESTORE_KEY = "unloop.lastRestoreAt";

/** All localStorage keys we treat as user data. */
const STORES = [
  "unloop.onboarding.v1",
  "unloop.reels.v1",
  "unloop.recovery.v1",
  "unloop.brain.history.v1",
  "unloop.hardcore.v1",
  "unloop.widgets.v1",
  "unloop.profile.v1",
  "unloop.notifications.v1",
  "unloop.focus.history.v1",
] as const;

export type BackupBlob = {
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  stores: Record<string, unknown>;
};

export type BackupSummary = {
  createdAt: string;
  schemaVersion: number;
  goals: number;
  apps: number;
  reelsToday: number;
  recoverySessions: number;
  brainTransitions: number;
  widgetsConfigured: boolean;
  notificationsConfigured: boolean;
};

function readAllStores(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof window === "undefined") return out;
  for (const k of STORES) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try { out[k] = JSON.parse(raw); } catch { out[k] = raw; }
  }
  return out;
}

export function buildLocalBackup(): BackupBlob {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: "web",
    stores: readAllStores(),
  };
}

export function summarizeBackup(blob: BackupBlob): BackupSummary {
  const s = blob.stores as Record<string, Record<string, unknown> | undefined>;
  const ob = s["unloop.onboarding.v1"] as { apps?: string[]; goals?: string[] } | undefined;
  const reels = s["unloop.reels.v1"] as { counts?: Record<string, number> } | undefined;
  const rec = s["unloop.recovery.v1"] as { sessions?: unknown[] } | undefined;
  const brain = s["unloop.brain.history.v1"] as unknown[] | undefined;
  const widgets = s["unloop.widgets.v1"];
  const notifs = s["unloop.notifications.v1"];
  const totalReels = reels?.counts ? Object.values(reels.counts).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  return {
    createdAt: blob.createdAt,
    schemaVersion: blob.schemaVersion,
    apps: ob?.apps?.length ?? 0,
    goals: ob?.goals?.length ?? 0,
    reelsToday: totalReels,
    recoverySessions: Array.isArray(rec?.sessions) ? rec!.sessions!.length : 0,
    brainTransitions: Array.isArray(brain) ? brain.length : 0,
    widgetsConfigured: !!widgets,
    notificationsConfigured: !!notifs,
  };
}

/** Apply a backup over the current local state. Overwrites listed stores. */
export function applyBackup(blob: BackupBlob) {
  if (typeof window === "undefined") return;
  if (blob.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error(`Backup is from a newer app version (schema ${blob.schemaVersion}). Update Unloop and try again.`);
  }
  for (const [k, v] of Object.entries(blob.stores)) {
    if (!STORES.includes(k as typeof STORES[number])) continue;
    try {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    } catch (e) {
      reportError(e, `backup.restore.${k}`);
    }
  }
  localStorage.setItem(LAST_RESTORE_KEY, new Date().toISOString());
  // Notify the rest of the app to re-read.
  window.dispatchEvent(new CustomEvent("unloop:backup-restored"));
}

/** Cloud-backed backup (per-user, single row). */
export async function pushBackupToCloud(userId: string): Promise<BackupBlob> {
  const blob = buildLocalBackup();
  const { error } = await supabase.from("user_backups").upsert({
    user_id: userId,
    schema_version: blob.schemaVersion,
    payload: blob as never,
  });
  if (error) { reportError(error, "backup.push"); throw error; }
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_BACKUP_KEY, blob.createdAt);
  }
  return blob;
}

export async function fetchCloudBackup(userId: string): Promise<BackupBlob | null> {
  const { data, error } = await supabase
    .from("user_backups")
    .select("payload, schema_version, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) { reportError(error, "backup.fetch"); return null; }
  if (!data) return null;
  return data.payload as unknown as BackupBlob;
}

export function lastBackupAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_BACKUP_KEY);
}
export function lastRestoreAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_RESTORE_KEY);
}

export function downloadBackup(blob: BackupBlob) {
  const json = JSON.stringify(blob, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `unloop-backup-${blob.createdAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<BackupBlob> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || typeof parsed.schemaVersion !== "number" || !parsed.stores) {
    throw new Error("This file isn't a valid Unloop backup.");
  }
  return parsed as BackupBlob;
}
