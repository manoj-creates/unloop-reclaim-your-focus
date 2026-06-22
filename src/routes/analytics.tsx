import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { BrandIcon } from "@/components/BrandIcon";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Flame,
  Target,
  Clock,
  Film,
  Zap,
  Sun,
  Brain,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { useReelsCounter, PLATFORMS } from "@/lib/reels-store";
import { useLiveStats, formatDuration } from "@/lib/live-stats";
import { AnimatedNumber } from "@/components/ReelsCounter";
import { BrainStageBadge } from "@/components/BrainEnergyCounter";
import { brainStageFor, BRAIN_STAGES, type BrainStageId } from "@/lib/brain-stage";
import {
  todayStageDurations,
  subscribeBrainHistory,
  formatStageDuration,
  mostCommonStageToday,
  longestFocusStreakMsToday,
} from "@/lib/brain-history";
import { useBrainMessage } from "@/lib/brain-personality";
import { useRecoveryStore } from "@/lib/recovery-store";
import { Heart, ChevronRight as ChevronRightIcon } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Unloop" },
      { name: "description", content: "Premium insights: reels trends, focus score, peak hours, and AI insights." },
    ],
  }),
  component: Analytics,
});

// ---------- Derivations from real, persisted history ----------
// All of these were previously seeded mocks. They now come from the local
// history ledger. When there's not enough data yet, each section renders
// a small "Not enough data yet" empty state inside the existing card
// chrome instead of fake numbers.

import { useHistory } from "@/lib/live-stats";

type DayE = { date: string; reels: number; focusScore: number };

function fmtDayLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function last7DaysSeries(history: DayE[], todayReels: number, todayScore: number): { label: string; value: number }[] {
  const map = new Map(history.map((h) => [h.date, h]));
  const tk = todayKeyFn();
  if (!map.has(tk)) map.set(tk, { date: tk, reels: todayReels, focusScore: todayScore });
  const out: { label: string; value: number }[] = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(d); dt.setDate(d.getDate() - i);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push({ label: fmtDayLabel(k), value: map.get(k)?.reels ?? 0 });
  }
  return out;
}

function last4WeeksSeries(history: DayE[], todayReels: number): { label: string; value: number }[] {
  const buckets = [0, 0, 0, 0];
  const map = new Map(history.map((h) => [h.date, h.reels]));
  const tk = todayKeyFn();
  if (!map.has(tk)) map.set(tk, todayReels);
  const today = new Date();
  for (let i = 0; i < 28; i++) {
    const dt = new Date(today); dt.setDate(today.getDate() - i);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const bucket = 3 - Math.floor(i / 7);
    buckets[bucket] += map.get(k) ?? 0;
  }
  return buckets.map((value, i) => ({ label: `W${i + 1}`, value }));
}

function last30FocusSeries(history: DayE[], todayScore: number): { label: string; value: number }[] {
  const map = new Map(history.map((h) => [h.date, h.focusScore]));
  const tk = todayKeyFn();
  if (!map.has(tk)) map.set(tk, todayScore);
  const out: { label: string; value: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(today.getDate() - i);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push({ label: `${dt.getDate()}`, value: map.get(k) ?? 0 });
  }
  return out;
}

function focusByWeekday(history: DayE[]): { day: string; score: number; count: number }[] {
  const buckets = [
    { day: "Mon", total: 0, count: 0 }, { day: "Tue", total: 0, count: 0 },
    { day: "Wed", total: 0, count: 0 }, { day: "Thu", total: 0, count: 0 },
    { day: "Fri", total: 0, count: 0 }, { day: "Sat", total: 0, count: 0 },
    { day: "Sun", total: 0, count: 0 },
  ];
  for (const h of history) {
    const dt = new Date(h.date + "T00:00:00");
    const idx = (dt.getDay() + 6) % 7;
    buckets[idx].total += h.focusScore;
    buckets[idx].count += 1;
  }
  return buckets.map((b) => ({ day: b.day, score: b.count ? Math.round(b.total / b.count) : 0, count: b.count }));
}

function todayKeyFn() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Official Brain Evolution stage swatches (mirrors src/lib/brain-stage.ts).
const BRAIN_STAGE_COLORS: Record<string, string> = {
  energized: "oklch(0.78 0.16 140)",
  focused:   "oklch(0.72 0.18 180)",
  tired:     "oklch(0.78 0.15 80)",
  brain_rot: "oklch(0.70 0.18 50)",
  zombie:    "oklch(0.62 0.20 25)",
};

type ReelsRange = "Daily" | "Weekly";
type SavedRange = "This Week" | "This Month" | "Lifetime";
type AvoidedRange = "This Week" | "This Month" | "Lifetime";

function Analytics() {
  const [reelsRange, setReelsRange] = useState<ReelsRange>("Daily");
  const [savedRange, setSavedRange] = useState<SavedRange>("This Week");
  const [avoidedRange, setAvoidedRange] = useState<AvoidedRange>("This Week");
  const [showMore, setShowMore] = useState(false);
  const { state: reelsState, total: reelsToday } = useReelsCounter();
  const currentBrainStage = brainStageFor(reelsToday);
  const history = useHistory();
  const liveStats = useLiveStats();

  // Phase D.1 / D.2 — live durations + derived personality analytics.
  const [stageDurations, setStageDurations] = useState<Record<string, number>>(
    () => ({ energized: 0, focused: 0, tired: 0, brain_rot: 0, zombie: 0 }),
  );
  const [topStage, setTopStage] = useState<BrainStageId | null>(null);
  const [focusStreakMs, setFocusStreakMs] = useState<number>(0);
  useEffect(() => {
    const refresh = () => {
      setStageDurations(todayStageDurations());
      setTopStage(mostCommonStageToday());
      setFocusStreakMs(longestFocusStreakMsToday());
    };
    refresh();
    const unsub = subscribeBrainHistory(refresh);
    const id = window.setInterval(refresh, 60_000);
    return () => { unsub(); window.clearInterval(id); };
  }, [reelsToday]);

  const mostDistractingPlatform = useMemo(() => {
    const ranked = PLATFORMS
      .map((p) => ({ ...p, count: reelsState.counts[p.id] }))
      .sort((a, b) => b.count - a.count);
    return ranked[0];
  }, [reelsState]);

  // Real derivations
  const reelsDaily7 = useMemo(() => last7DaysSeries(history, reelsToday, liveStats.focusScore), [history, reelsToday, liveStats.focusScore]);
  const reelsWeekly = useMemo(() => last4WeeksSeries(history, reelsToday), [history, reelsToday]);
  const focusMonthly = useMemo(() => last30FocusSeries(history, liveStats.focusScore), [history, liveStats.focusScore]);
  const dayFocus = useMemo(() => focusByWeekday(history), [history]);

  const reelsData = reelsRange === "Daily" ? reelsDaily7 : reelsWeekly;
  const reelsTotal = reelsData.reduce((s, d) => s + d.value, 0);
  const reelsDelta = reelsData[reelsData.length - 1].value - reelsData[0].value;
  const hasReelsData = reelsTotal > 0;

  const focusEntries = focusMonthly.filter((d) => d.value > 0);
  const focusAvg = focusEntries.length ? Math.round(focusEntries.reduce((s, d) => s + d.value, 0) / focusEntries.length) : 0;
  const focusDelta = focusEntries.length >= 2 ? focusEntries[focusEntries.length - 1].value - focusEntries[0].value : 0;
  const hasFocusData = focusEntries.length >= 2;

  const dayFocusWithData = dayFocus.filter((d) => d.count > 0);
  const bestDay = dayFocusWithData.length
    ? dayFocusWithData.reduce((a, b) => (b.score > a.score ? b : a))
    : null;

  // App breakdown today — derived from real platform counters.
  const apps = useMemo(() => {
    const totalC = reelsToday;
    if (totalC === 0) return [] as { name: string; minutes: number; pct: number }[];
    return PLATFORMS
      .map((p) => {
        const count = reelsState.counts[p.id];
        const minutes = Math.round((count * 21) / 60); // ~21s per reel
        return { name: p.name, minutes, count };
      })
      .filter((a) => a.count > 0)
      .map((a) => ({ name: a.name, minutes: Math.max(a.minutes, 1), pct: Math.round((a.count / totalC) * 100) }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [reelsState, reelsToday]);
  const totalMins = apps.reduce((s, a) => s + a.minutes, 0);
  const mostDistracting = apps[0] ?? null;

  // Time saved / avoided ranges — from real lifetime stats.
  const monthSavedSec = useMemo(() => {
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 29);
    const cutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-${String(cutoffDate.getDate()).padStart(2, "0")}`;
    const avoided = history.filter((h) => h.date >= cutoff)
      .reduce((s, h) => s + Math.max(0, liveStats.dailyLimitReels - h.reels), 0);
    return avoided * 21;
  }, [history, liveStats.dailyLimitReels]);
  const monthAvoided = useMemo(() => {
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 29);
    const cutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-${String(cutoffDate.getDate()).padStart(2, "0")}`;
    return history.filter((h) => h.date >= cutoff)
      .reduce((s, h) => s + Math.max(0, liveStats.dailyLimitReels - h.reels), 0);
  }, [history, liveStats.dailyLimitReels]);

  const timeSaved: Record<SavedRange, { value: string; delta: string }> = {
    "This Week":  { value: formatDuration(liveStats.timeSavedWeekSec), delta: history.length >= 7 ? "Last 7 days" : "Building…" },
    "This Month": { value: formatDuration(monthSavedSec), delta: history.length >= 14 ? "Last 30 days" : "Building…" },
    "Lifetime":   { value: formatDuration(liveStats.timeSavedAllTimeSec), delta: "Since you joined" },
  };
  const reelsAvoided: Record<AvoidedRange, { value: number; delta: string }> = {
    "This Week":  { value: Math.max(0, (liveStats.dailyLimitReels * 7) - liveStats.reelsThisWeek), delta: history.length >= 7 ? "Last 7 days" : "Building…" },
    "This Month": { value: monthAvoided, delta: history.length >= 14 ? "Last 30 days" : "Building…" },
    "Lifetime":   { value: liveStats.reelsAvoidedAllTime, delta: "Since you joined" },
  };

  const saved = timeSaved[savedRange];
  const avoided = reelsAvoided[avoidedRange];

  // AI insights — small set derived from real data; otherwise empty.
  const aiInsights = useMemo(() => {
    const items: { icon: typeof Sparkles; tone: "warning" | "primary" | "success"; title: string; body: string }[] = [];
    if (mostDistracting) {
      items.push({ icon: AlertTriangle, tone: "warning", title: `${mostDistracting.name} is your top distractor today`, body: `${mostDistracting.pct}% of today's reels (~${mostDistracting.minutes} min).` });
    }
    if (bestDay) {
      items.push({ icon: Sun, tone: "success", title: `${bestDay.day}s are your sharpest`, body: `Average focus score ${bestDay.score} on ${bestDay.day}s.` });
    }
    if (history.length >= 7 && focusDelta > 0) {
      items.push({ icon: TrendingUp, tone: "success", title: "Focus trending up", body: `+${focusDelta} pts vs ${focusEntries.length} days ago.` });
    }
    if (liveStats.streak >= 3) {
      items.push({ icon: Flame, tone: "primary", title: `${liveStats.streak}-day streak`, body: `Keep going — best is ${liveStats.bestStreak} days.` });
    }
    return items;
  }, [mostDistracting, bestDay, history.length, focusDelta, focusEntries.length, liveStats.streak, liveStats.bestStreak]);


  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Analytics" />

      <LiveReelsCard
        state={reelsState}
        total={reelsToday}
        topPlatform={mostDistractingPlatform}
      />


      {/* Highlights row */}
      <section className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <HighlightTile
          icon={AlertTriangle}
          label="Most distracting"
          value={mostDistracting ? mostDistracting.name : "—"}
          sub={mostDistracting ? `${mostDistracting.minutes}m today` : "No reels today"}
          accent="destructive"
        />
        <HighlightTile
          icon={Sun}
          label="Best focus day"
          value={bestDay ? bestDay.day : "—"}
          sub={bestDay ? `Score ${bestDay.score}` : "Not enough data yet"}
          accent="success"
        />
        <HighlightTile
          icon={Flame}
          label="Current streak"
          value={liveStats.streak > 0 ? `${liveStats.streak}d` : "—"}
          sub={liveStats.bestStreak > 0 ? `Best ${liveStats.bestStreak}d` : "Start today"}
          accent="flame"
        />
        <HighlightTile
          icon={Brain}
          label="Brain stage"
          value={`${currentBrainStage.emoji} ${currentBrainStage.label}`}
          sub={`${reelsToday} reels today`}
          accent="primary"
        />
      </section>


      {/* Reels trend (daily / weekly) */}
      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Reels Count Trend</p>
            <p className="text-3xl font-bold mt-1">
              {reelsTotal.toLocaleString()}
              <span className="text-sm font-medium text-muted-foreground ml-2">
                {reelsRange === "Daily" ? "this week" : "last 4 weeks"}
              </span>
            </p>
            {hasReelsData ? (
              <p className={`text-xs mt-1 ${reelsDelta <= 0 ? "text-success" : "text-destructive"}`}>
                {reelsDelta <= 0 ? "" : "+"}
                {reelsDelta} vs start
              </p>
            ) : (
              <p className="text-xs mt-1 text-muted-foreground">Building your trend…</p>
            )}
          </div>
          <SegmentedSm
            options={["Daily", "Weekly"] as const}
            value={reelsRange}
            onChange={(v) => setReelsRange(v)}
          />
        </div>
        {hasReelsData ? (
          <BarChart data={reelsData} />
        ) : (
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center">
            <p className="text-sm font-semibold">Not enough data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Trends appear after your first day of activity.</p>
          </div>
        )}
      </section>


      {/* "View more analytics" gate — keeps the fold focused on Today / Time Saved / Reels trend / Distractions Avoided. */}
      <section className="mx-5 mt-4">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="w-full py-3 rounded-2xl bg-card border border-border/60 shadow-soft text-sm font-semibold active:scale-[0.99] transition"
        >
          {showMore ? "Hide extra analytics ▴" : "View more analytics ▾"}
        </button>
      </section>

      {showMore && (<>
      {/* Monthly focus score */}
      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Monthly Focus Score</p>
            <p className="text-3xl font-bold mt-1">{hasFocusData ? focusAvg : "—"}</p>
            {hasFocusData ? (
              <p className={`text-xs mt-1 ${focusDelta >= 0 ? "text-success" : "text-destructive"}`}>
                {focusDelta >= 0 ? "+" : ""}
                {focusDelta} pts vs first day
              </p>
            ) : (
              <p className="text-xs mt-1 text-muted-foreground">Building your trend — needs 2+ days.</p>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
            30 days
          </span>
        </div>
        {hasFocusData ? (
          <LineChart data={focusMonthly} />
        ) : (
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center">
            <p className="text-sm font-semibold">Not enough data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your focus chart fills in as you use Unloop.</p>
          </div>
        )}
      </section>


      {/* Peak scrolling hours — requires hourly tracking that isn't wired yet */}
      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Peak Scrolling Hours</p>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
            Coming soon
          </span>
        </div>
        <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center">
          <Zap className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold">Hour-by-hour insights are on the way</p>
          <p className="text-xs text-muted-foreground mt-1">We'll surface peak windows once the on-device tracker has enough data.</p>
        </div>
      </section>

      {/* App breakdown — Most distracting (real, derived from today's counters) */}
      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">App Breakdown</p>
          <span className="text-xs text-muted-foreground">{totalMins > 0 ? `${totalMins} min today` : "Today"}</span>
        </div>
        {apps.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center">
            <p className="text-sm font-semibold">No reels logged today</p>
            <p className="text-xs text-muted-foreground mt-1">Once you start scrolling, we'll break it down by app.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((a, i) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <BrandIcon name={a.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {a.name}
                        {i === 0 && apps.length > 1 && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-destructive font-bold">
                            Top offender
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {a.minutes}m · {a.pct}%
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${a.pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-flame"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>


      {/* Time Saved */}
      <section className="mx-5 mt-4 rounded-3xl bg-gradient-flame text-neutral-900 shadow-soft p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-neutral-800" />
            <p className="text-xs uppercase tracking-wider text-neutral-800">Time Saved</p>
          </div>
          <SegmentedSm
            options={["This Week", "This Month", "Lifetime"] as const}
            value={savedRange}
            onChange={(v) => setSavedRange(v)}
            light
          />
        </div>
        <p className="text-4xl font-bold text-neutral-900">{saved.value}</p>
        <p className="text-xs text-neutral-700 mt-1">{saved.delta}</p>
      </section>

      {/* Reels Avoided */}
      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5 overflow-hidden relative">
        <div
          className="absolute -bottom-12 -left-10 w-44 h-44 rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle,#FF8A3A 0%, transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Distractions Avoided</p>
          </div>
          <SegmentedSm
            options={["This Week", "This Month", "Lifetime"] as const}
            value={avoidedRange}
            onChange={(v) => setAvoidedRange(v)}
          />
        </div>
        <p className="relative text-4xl font-bold text-gradient-flame tabular-nums">
          <AnimatedNumber value={avoided.value} />
        </p>
        <p className="relative text-xs text-muted-foreground mt-1">{avoided.delta}</p>
      </section>

      {/* Phase D.3 — Recovery stats */}
      <RecoveryStatsSection />



      {/* Brain Evolution — today's time spent in each stage */}
      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Brain Evolution</p>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg">
            Today
          </span>
        </div>
        <div className="relative">
          <div className="absolute left-0 right-0 top-3 h-px bg-border" />
          <div className="relative flex justify-between">
            {BRAIN_STAGES.map((b, i) => {
              const isCurrent = b.id === currentBrainStage.id;
              const color = BRAIN_STAGE_COLORS[b.id];
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center gap-2 w-14"
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-card ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                    style={{ background: color }}
                  />
                  <p className={`text-[10px] font-semibold text-center ${isCurrent ? "text-primary" : "text-foreground"}`}>
                    {b.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground tabular-nums">
                    {formatStageDuration(stageDurations[b.id] ?? 0)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Phase D.2 — personality-derived stats */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat
            label="Most common today"
            value={
              topStage
                ? `${BRAIN_STAGES.find((s) => s.id === topStage)?.emoji ?? ""} ${BRAIN_STAGES.find((s) => s.id === topStage)?.label ?? "—"}`
                : "—"
            }
            sub={topStage ? formatStageDuration(stageDurations[topStage] ?? 0) : "Not enough data"}
            dotColor={topStage ? BRAIN_STAGE_COLORS[topStage] : undefined}
          />
          <MiniStat
            label="Longest focus streak"
            value={focusStreakMs >= 60_000 ? formatStageDuration(focusStreakMs) : "—"}
            sub="Energized + Focused"
            dotColor={BRAIN_STAGE_COLORS.focused}
          />
        </div>
      </section>

      {/* AI Insights */}
      <section className="mx-5 mt-4 mb-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Insights</p>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg">
            Personalized
          </span>
        </div>
        {aiInsights.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center">
            <p className="text-sm font-semibold">No insights yet</p>
            <p className="text-xs text-muted-foreground mt-1">Insights appear once we've seen a few days of your activity.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aiInsights.map((it, i) => {
              const Icon = it.icon;
              const toneBg =
                it.tone === "success"
                  ? "bg-success/15 text-success"
                  : it.tone === "warning"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/15 text-primary";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 rounded-2xl bg-muted/30 border border-border/60 p-3"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{it.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{it.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
      </>)}
    </AppShell>
  );
}


function HighlightTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: "destructive" | "success" | "flame" | "primary";
}) {
  const bar =
    accent === "destructive"
      ? "bg-destructive"
      : accent === "success"
        ? "bg-success"
        : accent === "flame"
          ? "bg-gradient-flame"
          : "bg-primary";
  const iconTone =
    accent === "destructive"
      ? "bg-destructive/15 text-destructive"
      : accent === "success"
        ? "bg-success/15 text-success"
        : accent === "flame"
          ? "bg-gradient-flame text-neutral-900"
          : "bg-primary/15 text-primary";
  return (
    <div className="relative rounded-2xl bg-card border border-border/60 shadow-soft p-3 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${bar}`} />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconTone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">{label}</p>
      <p className="text-base font-bold truncate">{value}</p>
      <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

function SegmentedSm<T extends string>({
  options,
  value,
  onChange,
  light,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  light?: boolean;
}) {
  return (
    <div className={`inline-flex gap-1 p-1 rounded-xl ${light ? "bg-white/40" : "bg-muted"}`}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
            value === o
              ? light
                ? "bg-white text-neutral-900 shadow-soft"
                : "bg-card text-foreground shadow-soft"
              : light
                ? "text-neutral-800"
                : "text-muted-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function BarChart({
  data,
  selected,
  onSelect,
}: {
  data: { label: string; value: number }[];
  selected?: number | null;
  onSelect?: (i: number | null) => void;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const CHART_H = 140;
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: CHART_H + 20 }}>
      {data.map((d, i) => {
        const h = Math.max(6, (d.value / max) * CHART_H);
        const isSel = selected === i;
        const dim = selected !== null && selected !== undefined && !isSel;
        return (
          <button
            type="button"
            key={i}
            onClick={() => onSelect?.(isSel ? null : i)}
            className="flex-1 flex flex-col items-center gap-2 h-full justify-end group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: h, opacity: dim ? 0.35 : 1 }}
              transition={{ duration: 0.7, delay: i * 0.04, ease: "easeOut" }}
              className={`w-full rounded-t-xl bg-gradient-flame transition-shadow ${isSel ? "ring-2 ring-primary ring-offset-2 ring-offset-card shadow-soft" : "group-hover:opacity-90"}`}
            />
            <span className={`text-[10px] transition-colors ${isSel ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const w = 320;
  const h = 140;
  const pad = 8;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = Math.max(1, max - min);
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (d.value - min) / range);
    return [x, y] as const;
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        <defs>
          <linearGradient id="ln-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.74 0.19 50)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.74 0.19 50)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ln-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.85 0.16 80)" />
            <stop offset="100%" stopColor="oklch(0.68 0.22 32)" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#ln-area)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="url(#ln-stroke)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        {pts.map(([x, y], i) =>
          i === pts.length - 1 ? (
            <circle key={i} cx={x} cy={y} r={4} fill="oklch(0.68 0.22 32)" />
          ) : null,
        )}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{data[0].label}</span>
        <span>{data[Math.floor(data.length / 2)].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

function LiveReelsCard({
  state,
  total,
  topPlatform,
}: {
  state: ReturnType<typeof useReelsCounter>["state"];
  total: number;
  topPlatform: { id: string; name: string; color: string; icon: string; count: number };
}) {
  const ranked = [...PLATFORMS]
    .map((p) => ({ ...p, count: state.counts[p.id] }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ranked[0]?.count ?? 0);
  return (
    <section className="mx-5 mt-2 rounded-3xl bg-card border border-border/60 shadow-soft p-5 overflow-hidden relative">
      <div
        className="absolute -top-12 -right-10 w-44 h-44 rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle,#FF8A3A 0%, transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-primary" /> Today's Consumption
          </p>
          <div className="mt-1.5 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-gradient-flame leading-none tabular-nums">
              <AnimatedNumber value={total} />
            </span>
            <span className="text-xs text-muted-foreground mb-1.5">reels</span>
          </div>
          <LiveBrainMessage stageId={brainStageFor(total).id} className="text-[12px] text-foreground/80 mt-1 font-medium min-h-[16px]" />
          {total > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Most distracting:{" "}
              <span className="font-semibold text-foreground">{topPlatform.name}</span>
              <span className="text-muted-foreground"> · {topPlatform.count}</span>
            </p>
          )}
        </div>
        <BrainStageBadge reels={total} />
      </div>

      {/* Compact platform breakdown — ranked progress bars */}
      <div className="relative mt-4 space-y-2">
        {ranked.map((p) => {
          const pct = total > 0 ? Math.round((p.count / max) * 100) : 0;
          return (
            <div key={p.id} className="flex items-center gap-2.5">
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: p.color }}
                aria-hidden
              >
                {p.icon}
              </span>
              <span className="text-[11px] font-medium text-foreground/90 w-16 truncate">
                {p.name.replace(" Shorts", "").replace(" Reels", "")}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: p.color }}
                />
              </div>
              <span className="text-[11px] font-bold tabular-nums w-7 text-right">{p.count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Phase D.2 — rotating personality message, no-repeat back-to-back. */
function LiveBrainMessage({ stageId, className = "" }: { stageId: BrainStageId; className?: string }) {
  const msg = useBrainMessage(stageId);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={msg}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className={className}
      >
        {msg}
      </motion.p>
    </AnimatePresence>
  );
}

function MiniStat({
  label,
  value,
  sub,
  dotColor,
}: {
  label: string;
  value: string;
  sub: string;
  dotColor?: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 border border-border/60 p-3">
      <div className="flex items-center gap-1.5">
        {dotColor && (
          <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} aria-hidden />
        )}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
      </div>
      <p className="text-base font-bold mt-1 truncate">{value}</p>
      <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

/* Phase D.3 — Recovery stats: sessions, streak, energy restored. */
function RecoveryStatsSection() {
  const { state, todaySessions, todayEnergyRestored, lifetimeEnergyRestored } = useRecoveryStore();
  return (
    <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5 relative overflow-hidden">
      <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.45) 0%, transparent 70%)" }} />
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-semibold">Recovery</p>
        </div>
        <Link to="/recovery" className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-0.5">
          Start session <ChevronRightIcon className="w-3 h-3" />
        </Link>
      </div>
      <div className="relative grid grid-cols-3 gap-3">
        <MiniStat
          label="Sessions"
          value={`${state.sessions.length}`}
          sub={`${todaySessions.length} today`}
          dotColor="#10B981"
        />
        <MiniStat
          label="Recovery streak"
          value={state.streakDays > 0 ? `${state.streakDays}d` : "—"}
          sub={`Best ${state.bestStreakDays}d`}
          dotColor="#F59E0B"
        />
        <MiniStat
          label="Energy restored"
          value={`+${lifetimeEnergyRestored}`}
          sub={`+${todayEnergyRestored} today`}
          dotColor="#06B6D4"
        />
      </div>
      <p className="relative mt-4 text-[11px] text-muted-foreground">
        ✨ Every recovery is a win — no guilt, just momentum.
      </p>
    </section>
  );
}



