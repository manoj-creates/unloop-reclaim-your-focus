import { useEffect, useMemo, useState } from "react";
import { useReelsCounter } from "@/lib/reels-store";
import { loadOnboarding } from "@/lib/onboarding-store";
import { isPreviewMode, PREVIEW_LIVE_STATS } from "@/lib/preview-mode";

// Persisted daily history (one entry per day). Native Android service will
// append entries; until then we just have today's live count from reels-store.
const HISTORY_KEY = "unloop.history.v1";

export type DayEntry = {
  date: string;        // YYYY-MM-DD
  reels: number;
  focusScore: number;  // 0-100
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readHistory(): DayEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function useHistory(): DayEntry[] {
  const [hist, setHist] = useState<DayEntry[]>([]);
  useEffect(() => {
    setHist(readHistory());
    const onStorage = (e: StorageEvent) => { if (e.key === HISTORY_KEY) setHist(readHistory()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return hist;
}

// Focus score model: 100 when reels=0, drops as reels approach (and exceed) the
// daily limit. Smooth: score = clamp(100 - (reels / limit) * 60, 10, 100).
export function deriveFocusScore(reels: number, dailyLimit: number): number {
  const lim = Math.max(1, dailyLimit);
  return Math.round(Math.max(10, Math.min(100, 100 - (reels / lim) * 60)));
}

export function focusLabel(score: number): string {
  if (score >= 85) return "Excellent Focus";
  if (score >= 70) return "Good Focus";
  if (score >= 50) return "Average Focus";
  return "Low Focus";
}

// ~21 seconds per reel saved when you don't watch it.
const SECONDS_PER_REEL = 21;

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatCompact(n: number): string {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  if (v < 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v < 1_000_000) return `${Math.round(v / 1000)}k`;
  return `${(v / 1_000_000).toFixed(1)}M`;
}

export type LiveStats = {
  // today
  reelsToday: number;
  dailyLimitReels: number;
  usedPercent: number;
  focusScore: number;
  focusStatus: string;
  /** True while we don't yet have enough data to trust the focus score. */
  focusBuilding: boolean;
  reelsAvoidedToday: number;
  timeSavedTodaySec: number;
  // aggregates
  reelsThisWeek: number;
  timeSavedWeekSec: number;
  reelsAllTime: number;
  reelsAvoidedAllTime: number;
  timeSavedAllTimeSec: number;
  avgFocusScore: number;
  // streak
  streak: number;
  bestStreak: number;
  activeDays: number;
};

function computeStreaks(entries: DayEntry[], dailyLimit: number) {
  // streak = consecutive most-recent days where reels <= dailyLimit.
  const map = new Map(entries.map((e) => [e.date, e]));
  let streak = 0;
  const d = new Date();
  while (true) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const e = map.get(k);
    if (!e) break;
    if (e.reels > dailyLimit) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  // best streak across history
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0, run = 0;
  let prev: Date | null = null;
  for (const e of sorted) {
    const day = new Date(e.date);
    const inLim = e.reels <= dailyLimit;
    if (inLim) {
      if (prev && (day.getTime() - prev.getTime()) === 86400000) run++;
      else run = 1;
      best = Math.max(best, run);
      prev = day;
    } else {
      run = 0;
      prev = day;
    }
  }
  return { streak, bestStreak: Math.max(best, streak) };
}

export function useLiveStats(): LiveStats {
  const { total: reelsToday } = useReelsCounter();
  const history = useHistory();
  // SSR/first paint uses default 50 to match server output; client-only
  // effect swaps in the persisted onboarding value. Prevents hydration
  // mismatches when the user has set a non-default daily limit.
  const [dailyLimitReels, setDailyLimitReels] = useState(50);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setDailyLimitReels(loadOnboarding().dailyLimit || 50);
    setPreview(isPreviewMode());
  }, []);
  const liveStats = useMemo(() => {
    const tk = todayKey();
    const past = history.filter((h) => h.date !== tk);
    // While the user has no past history and hasn't watched anything yet, we
    // can't honestly compute a focus score — show a believable baseline (65)
    // and flag it as "building" so the UI can soften the copy.
    const focusBuilding = past.length === 0 && reelsToday === 0;
    const todayScore = focusBuilding ? 65 : deriveFocusScore(reelsToday, dailyLimitReels);
    const today: DayEntry = { date: tk, reels: reelsToday, focusScore: todayScore };
    const all = [...past, today];

    const focusScore = today.focusScore;
    const usedPercent = Math.min(100, Math.round((reelsToday / Math.max(1, dailyLimitReels)) * 100));
    const reelsAvoidedToday = Math.max(0, dailyLimitReels - reelsToday);
    const timeSavedTodaySec = reelsAvoidedToday * SECONDS_PER_REEL;

    // week = last 7 days including today
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const weekEntries = all.filter((e) => e.date >= weekStartKey);
    const reelsThisWeek = weekEntries.reduce((sum, e) => sum + e.reels, 0);
    const weekAvoided = weekEntries.reduce((sum, e) => sum + Math.max(0, dailyLimitReels - e.reels), 0);
    const timeSavedWeekSec = weekAvoided * SECONDS_PER_REEL;

    const reelsAllTime = all.reduce((sum, e) => sum + e.reels, 0);
    const reelsAvoidedAllTime = all.reduce((sum, e) => sum + Math.max(0, dailyLimitReels - e.reels), 0);
    const timeSavedAllTimeSec = reelsAvoidedAllTime * SECONDS_PER_REEL;
    const avgFocusScore = all.length
      ? Math.round(all.reduce((s, e) => s + e.focusScore, 0) / all.length)
      : focusScore;

    const { streak, bestStreak } = computeStreaks(all, dailyLimitReels);

    return {
      reelsToday,
      dailyLimitReels,
      usedPercent,
      focusScore,
      focusStatus: focusBuilding ? "Building your focus profile" : focusLabel(focusScore),
      focusBuilding,
      reelsAvoidedToday,
      timeSavedTodaySec,
      reelsThisWeek,
      timeSavedWeekSec,
      reelsAllTime,
      reelsAvoidedAllTime,
      timeSavedAllTimeSec,
      avgFocusScore,
      streak,
      bestStreak,
      activeDays: all.length,
    };
  }, [reelsToday, history, dailyLimitReels]);

  return preview ? PREVIEW_LIVE_STATS : liveStats;
}
