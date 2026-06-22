/**
 * Single source of truth for cloud-sync status.
 *
 * Tracks last-successful-sync timestamp + the most recent error message
 * so the UI can show users whether their cloud data is current.
 */
import { useEffect, useState } from "react";

const KEY = "unloop.sync.status.v1";
const EVT = "unloop:sync-status";

export type SyncStatus = {
  lastSyncAt: string | null;
  lastError: string | null;
  inFlight: boolean;
};

const empty = (): SyncStatus => ({ lastSyncAt: null, lastError: null, inFlight: false });

function read(): SyncStatus {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw), inFlight: false };
  } catch { return empty(); }
}

function write(s: SyncStatus) {
  try { localStorage.setItem(KEY, JSON.stringify({ lastSyncAt: s.lastSyncAt, lastError: s.lastError })); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail: s }));
}

let current: SyncStatus = empty();
if (typeof window !== "undefined") current = read();

export function markSyncStart() {
  current = { ...current, inFlight: true };
  write(current);
}
export function markSyncOk() {
  current = { lastSyncAt: new Date().toISOString(), lastError: null, inFlight: false };
  write(current);
}
export function markSyncError(err: unknown) {
  current = {
    ...current,
    inFlight: false,
    lastError: err instanceof Error ? err.message : String(err),
  };
  write(current);
}

export function getSyncStatus(): SyncStatus { return current; }

export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState<SyncStatus>(current);
  useEffect(() => {
    setS(read());
    const h = (e: Event) => setS((e as CustomEvent<SyncStatus>).detail);
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  return s;
}
