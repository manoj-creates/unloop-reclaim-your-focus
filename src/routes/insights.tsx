import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, TrendingDown, TrendingUp, Sun, Sparkles, Target, Clock, EyeOff } from "lucide-react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { useLiveStats, useHistory, formatDuration, formatCompact } from "@/lib/live-stats";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Insights — Unloop" }, { name: "description", content: "Personalized insights derived from your real activity." }] }),
  component: Insights,
});

const TABS = ["Today", "Patterns", "Coaching"] as const;
type Tab = typeof TABS[number];

function Insights() {
  const [tab, setTab] = useState<Tab>("Today");
  const stats = useLiveStats();
  const history = useHistory();

  const todayCards = useMemo(() => {
    const items: { icon: string; title: string; body: string }[] = [];
    if (stats.reelsToday > 0) {
      items.push({ icon: "📱", title: `${stats.reelsToday} reels watched today`, body: `${stats.usedPercent}% of your ${stats.dailyLimitReels}-reel daily limit.` });
    }
    if (stats.reelsAvoidedToday > 0) {
      items.push({ icon: "⏱️", title: `You saved ${formatDuration(stats.timeSavedTodaySec)}`, body: `${stats.reelsAvoidedToday} distractions avoided.` });
    }
    if (stats.streak > 0) {
      items.push({ icon: "🔥", title: `${stats.streak}-day streak`, body: stats.streak === stats.bestStreak ? "A new personal best." : `Best so far: ${stats.bestStreak} days.` });
    }
    if (stats.focusScore >= 70) {
      items.push({ icon: "🧠", title: `${stats.focusStatus}`, body: `Today's focus score is ${stats.focusScore}.` });
    } else if (stats.focusScore > 0 && !stats.focusBuilding) {
      items.push({ icon: "⚠️", title: stats.focusStatus, body: `Focus score is ${stats.focusScore} — try a recovery session.` });
    }
    return items;
  }, [stats]);

  // Patterns — derived from local history
  const patterns = useMemo(() => {
    if (history.length < 3) return [];
    type WD = { day: string; total: number; count: number };
    const wd: WD[] = [
      { day: "Sun", total: 0, count: 0 }, { day: "Mon", total: 0, count: 0 },
      { day: "Tue", total: 0, count: 0 }, { day: "Wed", total: 0, count: 0 },
      { day: "Thu", total: 0, count: 0 }, { day: "Fri", total: 0, count: 0 },
      { day: "Sat", total: 0, count: 0 },
    ];
    for (const h of history) {
      const d = new Date(h.date + "T00:00:00");
      wd[d.getDay()].total += h.reels;
      wd[d.getDay()].count += 1;
    }
    const avg = (b: WD) => (b.count ? b.total / b.count : 0);
    const weekend = (avg(wd[0]) + avg(wd[6])) / 2;
    const weekday = (avg(wd[1]) + avg(wd[2]) + avg(wd[3]) + avg(wd[4]) + avg(wd[5])) / 5;
    const items: { icon: typeof Sun; title: string; body: string; tag: string }[] = [];
    if (weekday > 0 && weekend > weekday * 1.4) {
      items.push({ icon: TrendingUp, title: "Weekend spikes", body: `Weekend reels run ~${Math.round((weekend / Math.max(1, weekday)) * 10) / 10}× weekday average.`, tag: "Weekly" });
    }
    const focusedDays = history.filter((h) => h.focusScore >= 70).length;
    if (focusedDays >= Math.max(2, Math.floor(history.length * 0.4))) {
      items.push({ icon: Sun, title: "Consistent focused days", body: `${focusedDays} of your last ${history.length} days scored 70+.`, tag: "Energy" });
    }
    if (stats.bestStreak >= 3) {
      items.push({ icon: Flame, title: `Best streak: ${stats.bestStreak} days`, body: "You've proven you can string focused days together.", tag: "Streak" });
    }
    if (history.length >= 7 && stats.reelsAvoidedAllTime > 0) {
      items.push({ icon: TrendingDown, title: "Reels avoided adds up", body: `You've avoided ${formatCompact(stats.reelsAvoidedAllTime)} reels — about ${formatDuration(stats.timeSavedAllTimeSec)}.`, tag: "Lifetime" });
    }
    return items;
  }, [history, stats.bestStreak, stats.reelsAvoidedAllTime, stats.timeSavedAllTimeSec]);

  // Coaching — based on current behaviour
  const coaching = useMemo(() => {
    const items: { icon: typeof Target; title: string; body: string }[] = [];
    if (stats.usedPercent >= 80) {
      items.push({ icon: Target, title: "You're near your daily limit", body: "Lock your phone for the next hour to protect your streak." });
    }
    if (stats.streak === 0) {
      items.push({ icon: Sparkles, title: "Start a streak today", body: "Stay under your daily limit just for today and tomorrow's streak begins." });
    } else if (stats.streak >= 1 && stats.streak < 7) {
      items.push({ icon: Flame, title: `${7 - stats.streak} days to a 7-day streak`, body: "The first week is the hardest. Keep going." });
    }
    if (stats.reelsToday === 0 && history.length === 0) {
      items.push({ icon: Clock, title: "Set your daily limit", body: "Open Profile → Daily focus goal to personalise your cap." });
    }
    if (stats.reelsAvoidedToday >= 50) {
      items.push({ icon: EyeOff, title: "Big day for avoided distractions", body: `${stats.reelsAvoidedToday} reels avoided — give your brain a 5-min break.` });
    }
    return items;
  }, [stats, history.length]);

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Insights" />

      <div className="mx-5 flex gap-2 p-1 rounded-2xl bg-muted">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === t ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          {tab === "Today" && (
            <>
              {todayCards.length === 0 ? (
                <EmptyCard
                  title="No insights for today yet"
                  body="Once you start using your phone, today's insights appear here."
                />
              ) : (
                <section className="mx-5 mt-4 space-y-3">
                  {todayCards.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-xl">{insight.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{insight.title}</p>
                        <p className="text-sm text-muted-foreground">{insight.body}</p>
                      </div>
                    </motion.div>
                  ))}
                </section>
              )}

              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mx-5 mt-5 rounded-3xl bg-gradient-sunrise border border-amber/30 p-5 relative overflow-hidden"
              >
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-primary/15 blur-3xl" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground relative">Reminder</p>
                <div className="flex items-center gap-3 mt-3 relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-flame flex items-center justify-center shadow-glow">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-tight">Discipline today,</p>
                    <p className="text-lg font-bold leading-tight text-gradient-flame">Freedom tomorrow.</p>
                  </div>
                </div>
              </motion.section>
            </>
          )}

          {tab === "Patterns" && (
            patterns.length === 0 ? (
              <EmptyCard
                title="Building your patterns"
                body="We need at least 3 days of activity to surface patterns. Keep using Unloop and check back soon."
              />
            ) : (
              <section className="mx-5 mt-4 space-y-3">
                {patterns.map((p, i) => (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                      <p.icon className="w-5 h-5 text-foreground/80" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{p.title}</p>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{p.body}</p>
                    </div>
                  </motion.div>
                ))}
              </section>
            )
          )}

          {tab === "Coaching" && (
            coaching.length === 0 ? (
              <EmptyCard
                title="You're on track"
                body="No coaching nudges right now. We'll surface tips when your patterns shift."
              />
            ) : (
              <section className="mx-5 mt-4 space-y-3">
                {coaching.map((c, i) => (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="rounded-2xl bg-card border border-border/60 shadow-soft p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-flame flex items-center justify-center shadow-glow">
                        <c.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{c.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{c.body}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </section>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="mx-5 mt-4">
      <div className="rounded-3xl bg-card border border-border/60 shadow-soft p-6 text-center">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
      </div>
    </section>
  );
}
