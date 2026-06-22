import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "motion/react";
import {
  Flame, Trophy, Brain, Sparkles, Clock, EyeOff, TrendingUp,
  Calendar, ChevronRight, Zap, Battery, BatteryLow, Skull, Coffee,
  Crown, Lock, Heart,

} from "lucide-react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { useLiveStats, formatDuration, formatCompact } from "@/lib/live-stats";
import { useMilestones } from "@/lib/milestones";
import { useRecoveryStore, RECOVERY_ACTIVITIES, activityById } from "@/lib/recovery-store";


export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Journey — Unloop" },
      { name: "description", content: "Your focus journey: streaks, milestones, brain evolution, and lifetime wins." },
    ],
  }),
  component: Journey,
});

// ============================================================
// Derivations from real history (no seeded fiction)
// ============================================================
import { useHistory } from "@/lib/live-stats";

const BRAIN_STAGES = [
  { key: "energized", label: "Energized", icon: Zap, color: "from-emerald-400 to-green-500", text: "text-emerald-600" },
  { key: "focused",   label: "Focused",   icon: Brain, color: "from-sky-400 to-blue-500",    text: "text-sky-600" },
  { key: "tired",     label: "Tired",     icon: Coffee, color: "from-amber-400 to-orange-500", text: "text-amber-600" },
  { key: "exhausted", label: "Exhausted", icon: BatteryLow, color: "from-orange-500 to-red-500", text: "text-orange-600" },
  { key: "brainrot",  label: "Brain Rot", icon: Battery, color: "from-rose-500 to-pink-600", text: "text-rose-600" },
  { key: "zombie",    label: "Zombie",    icon: Skull, color: "from-zinc-600 to-zinc-800", text: "text-zinc-700" },
] as const;

type CalendarCell = { date: Date; level: 0 | 1 | 2 | 3 | 4; isToday: boolean };

function jKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildRealCalendar(history: { date: string; reels: number; focusScore: number }[]): CalendarCell[] {
  const map = new Map(history.map((h) => [h.date, h]));
  const cells: CalendarCell[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - 83);
  for (let i = 0; i < 84; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const e = map.get(jKey(d));
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (e) {
      const s = e.focusScore;
      if (s >= 85) level = 4;
      else if (s >= 70) level = 3;
      else if (s >= 55) level = 2;
      else if (s >= 40) level = 1;
      else level = 1;
    }
    cells.push({ date: d, level, isToday: i === 83 });
  }
  return cells;
}

// Map a focus score (0-100) to a Brain Evolution stage index.
function stageIndexForScore(score: number): number {
  if (score >= 85) return 0; // Energized
  if (score >= 70) return 1; // Focused
  if (score >= 55) return 2; // Tired
  if (score >= 40) return 3; // Exhausted
  if (score >= 25) return 4; // Brain Rot
  return 5;                  // Zombie
}

function buildMonthlySeries(history: { date: string; reels: number; focusScore: number }[]): { m: string; v: number }[] {
  // Up to last 6 calendar months; average focus per month; empty months excluded.
  const now = new Date();
  const out: { m: string; v: number; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ m: d.toLocaleString("en-US", { month: "short" }), v: 0, key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` });
  }
  const bucket: Record<string, { total: number; count: number }> = {};
  for (const h of history) {
    const k = h.date.slice(0, 7);
    if (!bucket[k]) bucket[k] = { total: 0, count: 0 };
    bucket[k].total += h.focusScore;
    bucket[k].count += 1;
  }
  return out.map((o) => ({ m: o.m, v: bucket[o.key]?.count ? Math.round(bucket[o.key].total / bucket[o.key].count) : 0 }));
}


function Journey() {
  const stats = useLiveStats();
  const milestones = useMilestones();
  const recovery = useRecoveryStore();
  const history = useHistory();
  const calendar = useMemo(() => buildRealCalendar(history), [history]);
  const monthly = useMemo(() => buildMonthlySeries(history), [history]);
  const monthsWithData = monthly.filter((m) => m.v > 0);
  const focusGrowthPct = monthsWithData.length >= 2
    ? Math.round(((monthsWithData[monthsWithData.length - 1].v - monthsWithData[0].v) / Math.max(1, monthsWithData[0].v)) * 100)
    : 0;
  const currentStageIndex = stageIndexForScore(stats.focusScore);
  const currentStage = BRAIN_STAGES[currentStageIndex];
  const unlocked = milestones.filter((m) => m.unlocked).length;
  const nextLocked = milestones.find((m) => !m.unlocked);
  const today = new Date();

  // Real timeline derived from unlocked milestones (most recent first).
  const timeline = useMemo(() => {
    const items: { date: string; title: string; body: string; icon: typeof Flame; accent: string }[] = [];
    if (stats.streak >= 1) {
      items.push({ date: "Today", title: `${stats.streak}-day streak active`, body: stats.streak === 1 ? "Day one — your journey begins." : "Keep the streak alive.", icon: Flame, accent: "bg-gradient-flame" });
    }
    for (const m of milestones.filter((x) => x.unlocked).slice(0, 4)) {
      items.push({ date: "Unlocked", title: m.title, body: m.desc, icon: Trophy, accent: "bg-gradient-to-br from-amber-400 to-orange-500" });
    }
    if (items.length === 0) {
      items.push({ date: "Today", title: "Your journey starts now", body: "Open Unloop tomorrow to build your first streak.", icon: Sparkles, accent: "bg-gradient-flame" });
    }
    return items;
  }, [milestones, stats.streak]);

  const weeklyWins = useMemo(() => ([
    { icon: Flame, label: "Current streak", value: stats.streak > 0 ? `${stats.streak}d` : "—", tint: "from-orange-500/15 to-red-500/10", text: "text-orange-600" },
    { icon: Clock, label: "Time saved", value: stats.timeSavedWeekSec > 0 ? formatDuration(stats.timeSavedWeekSec) : "—", tint: "from-emerald-500/15 to-teal-500/10", text: "text-emerald-600" },
    { icon: EyeOff, label: "Reels avoided", value: stats.reelsAvoidedAllTime > 0 ? formatCompact(stats.reelsAvoidedAllTime) : "—", tint: "from-sky-500/15 to-blue-500/10", text: "text-sky-600" },
    { icon: TrendingUp, label: "Avg focus", value: history.length > 0 ? `${stats.avgFocusScore}` : "—", tint: "from-violet-500/15 to-fuchsia-500/10", text: "text-violet-600" },
  ]), [stats.streak, stats.timeSavedWeekSec, stats.reelsAvoidedAllTime, stats.avgFocusScore, history.length]);


  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Journey" />

      {/* HERO — Streak */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-5 rounded-[28px] p-7 relative overflow-hidden text-neutral-900 bg-gradient-sunrise border border-amber/40"
      >
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative flex items-center gap-5">
          <motion.div
            animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 rounded-3xl bg-gradient-flame flex items-center justify-center shadow-glow shrink-0"
          >
            <Flame className="w-12 h-12 text-white" strokeWidth={2.2} />
          </motion.div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-700 font-semibold">Current Streak</p>
            <p className="text-6xl font-bold tracking-tight leading-none mt-1">{stats.streak}</p>
            <p className="text-sm text-neutral-700 mt-1">days · best {stats.bestStreak}</p>
          </div>
        </div>

        {/* Weekly checkmarks */}
        <div className="relative mt-6 grid grid-cols-7 gap-2">
          {["M","T","W","T","F","S","S"].map((d, i) => {
            const done = i < stats.streak;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 260 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold ${
                  done
                    ? "bg-gradient-flame text-white shadow-glow"
                    : "bg-white/70 border border-neutral-300 text-neutral-500"
                }`}>
                  {done ? "✓" : ""}
                </div>
                <span className="text-[10px] text-neutral-700 font-semibold">{d}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* LIFETIME STATS */}
      <SectionLabel>Lifetime</SectionLabel>
      <section className="mx-5 grid grid-cols-2 gap-3">
        <LifetimeCard
          icon={<Clock className="w-5 h-5" />}
          label="Time saved"
          value={formatDuration(stats.timeSavedAllTimeSec)}
          sub={`${Math.max(1, Math.round(stats.timeSavedAllTimeSec / 86400))} full days`}
          accent="from-emerald-500 to-teal-500"
        />
        <LifetimeCard
          icon={<EyeOff className="w-5 h-5" />}
          label="Reels avoided"
          value={formatCompact(stats.reelsAvoidedAllTime)}
          sub="all time"
          accent="from-sky-500 to-blue-600"
        />
      </section>

      {/* BRAIN EVOLUTION */}
      <SectionLabel>Brain Evolution</SectionLabel>
      <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Today's state</p>
            <p className={`text-2xl font-bold truncate ${currentStage.text}`}>{currentStage.label}</p>
          </div>
          <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${currentStage.color} flex items-center justify-center shadow-soft`}>
            <currentStage.icon className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Stage progression rail — horizontally scrollable on narrow screens */}
        <div className="-mx-5 overflow-x-auto no-scrollbar">
          <div className="relative px-5 min-w-[320px]">
            <div className="absolute left-5 right-5 top-5 h-0.5 bg-border" />
            <div
              className="absolute left-5 top-5 h-0.5 bg-gradient-flame transition-[width]"
              style={{ width: `calc((100% - 2.5rem) * ${currentStageIndex / (BRAIN_STAGES.length - 1)})` }}
            />
            <div className="relative flex justify-between gap-2">
              {BRAIN_STAGES.map((s, i) => {
                const reached = i <= currentStageIndex;
                const isCurrent = i === currentStageIndex;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex flex-col items-center gap-1.5 w-12 shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isCurrent
                        ? `bg-gradient-to-br ${s.color} border-white shadow-glow scale-110`
                        : reached
                          ? `bg-gradient-to-br ${s.color} border-white`
                          : "bg-muted border-border"
                    }`}>
                      <Icon className={`w-4 h-4 ${reached ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider text-center leading-tight ${
                      isCurrent ? s.text : "text-muted-foreground"
                    }`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* RECOVERY PROGRESS — Phase D.3 */}
      <SectionLabel>Recovery</SectionLabel>
      <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.45) 0%, transparent 70%)" }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold">Recovery progress</p>
            </div>
            <p className="text-3xl font-bold mt-1 tabular-nums">
              {recovery.todayEnergyRestored}
              <span className="text-sm font-medium text-muted-foreground ml-1">/ 100 energy today</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {recovery.state.streakDays > 0
                ? `🔥 ${recovery.state.streakDays}-day recovery streak · best ${recovery.state.bestStreakDays}d`
                : "Start your first recovery streak today."}
            </p>
          </div>
          <Link
            to="/recovery"
            className="shrink-0 inline-flex items-center gap-1 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold px-3 py-2 shadow-soft hover:opacity-95 active:scale-95 transition"
          >
            Start <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="relative mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${recovery.todayEnergyRestored}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
          />
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-3">
          <RecoveryMini label="Sessions" value={`${recovery.state.sessions.length}`} />
          <RecoveryMini label="Today" value={`${recovery.todaySessions.length}`} />
          <RecoveryMini label="Lifetime" value={`+${recovery.lifetimeEnergyRestored}`} sub="energy" />
        </div>

        {recovery.todaySessions.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {recovery.todaySessions.slice(-6).map((s) => {
              const a = activityById(s.activityId);
              return (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                >
                  <span aria-hidden>{a.emoji}</span>
                  {a.name.split(" ")[0]}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* WEEKLY WINS */}
      <SectionLabel>This Week's Wins</SectionLabel>
      <section className="mx-5 grid grid-cols-2 gap-3">
        {weeklyWins.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl p-4 border border-border/60 bg-gradient-to-br ${w.tint}`}
          >
            <w.icon className={`w-5 h-5 ${w.text} mb-2`} />
            <p className="text-xl font-bold tracking-tight">{w.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{w.label}</p>
          </motion.div>
        ))}
      </section>

      {/* STREAK CALENDAR */}
      <SectionLabel>Streak Calendar · 12 weeks</SectionLabel>
      <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Activity</p>
          </div>
          <p className="text-xs text-muted-foreground">{today.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-flow-col grid-rows-7 gap-1 sm:gap-1.5"
        >
          {calendar.map((cell, i) => (
            <div
              key={i}
              title={cell.date.toLocaleDateString("en-US")}
              className={`aspect-square rounded-[4px] ${heatClass(cell.level)} ${
                cell.isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
              }`}
            />
          ))}
        </motion.div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0,1,2,3,4].map((l) => <span key={l} className={`w-3 h-3 rounded-[3px] ${heatClass(l as 0|1|2|3|4)}`} />)}
          <span>More</span>
        </div>
      </section>

      {/* MONTHLY PROGRESS */}
      <SectionLabel>Focus Score · 6 months</SectionLabel>
      <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {monthsWithData.length >= 2 ? (focusGrowthPct >= 0 ? "Trending up" : "Trending down") : "Building your trend"}
            </p>
            <p className="text-2xl font-bold">
              {monthsWithData.length >= 2 ? `${focusGrowthPct >= 0 ? "+" : ""}${focusGrowthPct}%` : "—"}
            </p>
          </div>
          {monthsWithData.length >= 2 && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${focusGrowthPct >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              <TrendingUp className="w-3.5 h-3.5" /> {monthsWithData.length} months
            </div>
          )}
        </div>
        {monthsWithData.length >= 2 ? (
          <MonthlyChart data={monthly} />
        ) : (
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center">
            <p className="text-sm font-semibold">Not enough data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Come back next month to see your focus trend.</p>
          </div>
        )}
      </section>

      {/* FOCUS JOURNEY TIMELINE */}
      <SectionLabel>Your Timeline</SectionLabel>
      <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="relative pl-4">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-border to-transparent" />
          {timeline.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              <div className={`w-9 h-9 rounded-2xl ${t.accent} flex items-center justify-center shadow-soft shrink-0 -ml-1`}>
                <t.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t.date}</p>
                <p className="text-sm font-bold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MILESTONES */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Milestones · {unlocked}/{milestones.length}
        </p>
        <Link to="/milestones" className="text-xs text-primary font-semibold inline-flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <section className="mx-5 grid grid-cols-3 gap-3">
        {milestones.slice(0, 6).map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className={`rounded-2xl p-3 text-center border ${
              m.unlocked
                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber/40 shadow-soft"
                : "bg-muted/40 border-border/60"
            }`}
          >
            <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-1.5 ${
              m.unlocked ? "bg-gradient-flame shadow-glow" : "bg-muted"
            }`}>
              {m.unlocked ? <span>{m.icon}</span> : <Lock className="w-4 h-4 text-muted-foreground" />}
            </div>
            <p className={`text-[11px] font-bold leading-tight ${m.unlocked ? "" : "text-muted-foreground"}`}>
              {m.title}
            </p>
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      {nextLocked && (
        <Link
          to="/milestones"
          className="mx-5 mt-5 flex items-center gap-3 rounded-3xl bg-gradient-flame text-white p-5 shadow-glow active:scale-[0.99] transition-transform"
        >
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Crown className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Next up: {nextLocked.title}</p>
            <p className="text-xs opacity-90">{nextLocked.desc}</p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </Link>
      )}


      <div className="h-6" />
    </AppShell>
  );
}

// ============================================================
// Sub-components
// ============================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 pt-6 pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {children}
    </p>
  );
}

function LifetimeCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="relative rounded-3xl bg-card border border-border/60 shadow-soft p-5 overflow-hidden">
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl`} />
      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow-soft mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function heatClass(level: 0 | 1 | 2 | 3 | 4) {
  switch (level) {
    case 0: return "bg-muted";
    case 1: return "bg-amber-200";
    case 2: return "bg-amber-400";
    case 3: return "bg-orange-500";
    case 4: return "bg-gradient-flame shadow-glow";
  }
}

function MonthlyChart({ data }: { data: { m: string; v: number }[] }) {
  const w = 320, h = 120, pad = 8;
  const max = 100;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.v / max) * (h - pad * 2);
    return { x, y, ...d };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.68 0.22 32)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.68 0.22 32)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="jLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="oklch(0.74 0.19 50)" />
            <stop offset="100%" stopColor="oklch(0.68 0.22 32)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#jArea)" />
        <path d={path} fill="none" stroke="url(#jLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3} fill="white" stroke="oklch(0.68 0.22 32)" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold mt-1 px-1">
        {data.map((d) => <span key={d.m}>{d.m}</span>)}
      </div>
    </div>
  );
}

function RecoveryMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-lg font-bold mt-0.5 tabular-nums">
        {value}
        {sub && <span className="text-[10px] font-medium text-muted-foreground ml-1">{sub}</span>}
      </p>
    </div>
  );
}

