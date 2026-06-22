/**
 * Brain stage history — Phase D.1.
 *
 * Lightweight ledger of stage transitions. Each entry is the moment the
 * user entered that stage; the duration spent in the stage is derived as
 * `nextEntry.ts - thisEntry.ts` (or `now - lastEntry.ts` for the current
 * stage). Stored in localStorage as a flat array, capped to the last
 * 14 days to keep the payload tiny.
 *
 * Recording is driven by `reels-store`: every time the React-side total
 * changes, it calls [recordBrainStage] which dedupes (only logs on
 * actual stage transitions) and rolls the day automatically.
 */
import { brainStageFor, type BrainStageId } from "@/lib/brain-stage";
import { isPreviewMode } from "@/lib/preview-mode";

const KEY = "unloop.brain.history.v1";
const KEEP_DAYS = 14;

export type BrainTransition = {
  id: BrainStageId;
  /** YYYY-MM-DD of the entry — duplicated to make per-day filtering cheap. */
  date: string;
  /** Unix-ms when the user entered this stage. */
  ts: number;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const read = (): BrainTransition[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as BrainTransition[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const write = (arr: BrainTransition[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* quota */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unloop:brain-history"));
  }
};

const prune = (arr: BrainTransition[]): BrainTransition[] => {
  if (arr.length === 0) return arr;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const trimmed = arr.filter((t) => t.ts >= cutoff);
  // Always keep at least the last entry so the "current stage" anchor survives.
  if (trimmed.length === 0) return [arr[arr.length - 1]];
  return trimmed;
};

/**
 * Record the current count's stage. No-op if we're already in that stage.
 * Auto-rolls when a new day begins so the timeline always has a same-day
 * anchor to measure duration from.
 */
export function recordBrainStage(reelsToday: number): void {
  if (typeof window === "undefined") return;
  const stage = brainStageFor(reelsToday);
  const arr = read();
  const last = arr[arr.length - 1];
  const today = todayKey();
  const now = Date.now();

  if (last && last.id === stage.id && last.date === today) return;

  const next: BrainTransition = { id: stage.id, date: today, ts: now };
  const merged = prune([...arr, next]);
  write(merged);
}

/**
 * Ordered list of today's stage segments (post-midnight, clamped to now).
 * Used as the shared substrate for all per-day stage analytics so the
 * walking logic isn't duplicated across helpers.
 */
export function todaySegments(): { id: BrainStageId; ms: number }[] {
  const arr = read();
  if (arr.length === 0) return [];
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();
  const out: { id: BrainStageId; ms: number }[] = [];
  for (let i = 0; i < arr.length; i++) {
    const cur = arr[i];
    const nxt = arr[i + 1];
    const start = Math.max(cur.ts, dayStart);
    const end = nxt ? nxt.ts : now;
    if (end <= dayStart) continue;
    const ms = Math.max(0, end - start);
    if (ms <= 0) continue;
    out.push({ id: cur.id, ms });
  }
  return out;
}

/**
 * Milliseconds spent in each stage today. Stages with no time today still
 * appear with value 0 so callers can render the full evolution timeline.
 */
export function todayStageDurations(): Record<BrainStageId, number> {
  if (isPreviewMode()) {
    return {
      energized: 2 * 60 * 60 * 1000,
      focused: 4 * 60 * 60 * 1000 + 20 * 60 * 1000,
      tired: 38 * 60 * 1000,
      brain_rot: 12 * 60 * 1000,
      zombie: 0,
    };
  }
  const empty: Record<BrainStageId, number> = {
    energized: 0, focused: 0, tired: 0, brain_rot: 0, zombie: 0,
  };
  for (const seg of todaySegments()) empty[seg.id] += seg.ms;
  return empty;
}

/**
 * Stage the user has spent the most time in today, or null if there's no
 * meaningful data yet (< 1 minute total across all stages).
 */
export function mostCommonStageToday(): BrainStageId | null {
  if (isPreviewMode()) return "focused";
  const durs = todayStageDurations();
  let best: BrainStageId | null = null;
  let bestMs = 0;
  for (const id of Object.keys(durs) as BrainStageId[]) {
    if (durs[id] > bestMs) { bestMs = durs[id]; best = id; }
  }
  return bestMs >= 60_000 ? best : null;
}

/**
 * Longest contiguous focus streak today, in ms. "Focus" = the two healthy
 * stages (Energized + Focused). Any other stage breaks the streak.
 */
export function longestFocusStreakMsToday(): number {
  if (isPreviewMode()) return 3 * 60 * 60 * 1000 + 40 * 60 * 1000;
  const focus: ReadonlySet<BrainStageId> = new Set(["energized", "focused"]);
  let best = 0;
  let cur = 0;
  for (const seg of todaySegments()) {
    if (focus.has(seg.id)) {
      cur += seg.ms;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/** Reactive subscription for components that want live updates. */
export function subscribeBrainHistory(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("unloop:brain-history", h);
  return () => window.removeEventListener("unloop:brain-history", h);
}

export function formatStageDuration(ms: number): string {
  if (ms < 60_000) return "—";
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
