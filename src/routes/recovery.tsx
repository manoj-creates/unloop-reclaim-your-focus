import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Check, Sparkles, Zap, Flame, Trophy, Play, Pause, X } from "lucide-react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import {
  RECOVERY_ACTIVITIES,
  activityById,
  useRecoveryStore,
  type RecoveryActivityDef,
  type RecoveryActivityId,
} from "@/lib/recovery-store";
import { useReelsCounter } from "@/lib/reels-store";

export const Route = createFileRoute("/recovery")({
  head: () => ({
    meta: [
      { title: "Recovery — Unloop" },
      { name: "description", content: "Break the scrolling loop with guided recovery activities that restore your brain energy." },
    ],
  }),
  component: Recovery,
});

function Recovery() {
  const navigate = useNavigate();
  const { state, complete, todaySessions, todayEnergyRestored, lifetimeEnergyRestored } = useRecoveryStore();
  const { total: reelsToday } = useReelsCounter();
  const [activeId, setActiveId] = useState<RecoveryActivityId | null>(null);
  const [celebrate, setCelebrate] = useState<{ activity: RecoveryActivityDef; energyRestored: number } | null>(null);

  const completedTodayIds = useMemo(
    () => new Set(todaySessions.map((s) => s.activityId)),
    [todaySessions],
  );

  const onFinish = (id: RecoveryActivityId) => {
    const session = complete(id);
    const def = activityById(id);
    setActiveId(null);
    setCelebrate({ activity: def, energyRestored: session.energyRestored });
  };

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Recovery" />

      {/* HERO */}
      <section className="mx-5 mt-2 rounded-3xl p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-soft relative overflow-hidden">
        <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-white/85">
            Recovery Mode
          </p>
          <h1 className="text-2xl font-bold mt-1 leading-tight">
            Reset your brain in a few minutes.
          </h1>
          <p className="text-sm text-white/85 mt-2">
            {state.sessions.length === 0
              ? "Take your first recovery break — it only takes 2 minutes."
              : reelsToday >= 150
                ? "You've been scrolling a while. Pick one activity to restore your energy."
                : "Stay ahead of the loop — even a small reset adds up."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <HeroStat icon={<Zap className="w-3.5 h-3.5" />} label="Restored today" value={`${todayEnergyRestored}%`} />
            <HeroStat icon={<Trophy className="w-3.5 h-3.5" />} label="Sessions" value={`${state.sessions.length}`} />
            <HeroStat icon={<Flame className="w-3.5 h-3.5" />} label="Streak" value={`${state.streakDays}d`} />
          </div>
        </div>
      </section>

      {/* PROGRESS BAR */}
      <section className="mx-5 mt-4 rounded-2xl bg-card border border-border/60 shadow-soft p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's recovery</p>
          <p className="text-xs font-bold tabular-nums text-emerald-600">{todayEnergyRestored} / 100</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${todayEnergyRestored}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {todayEnergyRestored === 0
            ? "Complete an activity to start restoring brain energy."
            : todayEnergyRestored >= 100
              ? "✨ Full reset! Great work today."
              : "Keep going — each activity restores more energy."}
        </p>
      </section>

      {/* ACTIVITIES */}
      <section className="mx-5 mt-4 mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choose an activity</p>
        {RECOVERY_ACTIVITIES.map((a, i) => {
          const done = completedTodayIds.has(a.id);
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveId(a.id)}
              className="w-full text-left rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex items-center gap-3 hover:border-primary/40 active:scale-[0.99] transition"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center text-2xl shrink-0 shadow-soft`}>
                <span aria-hidden>{a.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">{a.name}</p>
                  {done && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                      <Check className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{a.blurb}</p>
                <p className="text-[10px] mt-1 text-muted-foreground">
                  {a.durationSec === 0 ? "Instant" : `${Math.round(a.durationSec / 60)} min`}
                  <span className="mx-1.5">·</span>
                  <span className="text-emerald-600 font-semibold">+{a.energyRestored} energy</span>
                </p>
              </div>
            </motion.button>
          );
        })}
      </section>

      <div className="mx-5 mb-6 text-center">
        <Link to="/journey" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to Journey
        </Link>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Lifetime energy restored: <span className="font-semibold text-foreground">{lifetimeEnergyRestored}</span>
        </p>
      </div>

      {/* Activity runner */}
      <AnimatePresence>
        {activeId && (
          <ActivityRunner
            activity={activityById(activeId)}
            onCancel={() => setActiveId(null)}
            onFinish={() => onFinish(activeId)}
          />
        )}
      </AnimatePresence>

      {/* Celebration */}
      <AnimatePresence>
        {celebrate && (
          <CelebrationOverlay
            activity={celebrate.activity}
            energyRestored={celebrate.energyRestored}
            onClose={() => setCelebrate(null)}
            onAnother={() => setCelebrate(null)}
            onJourney={() => { setCelebrate(null); navigate({ to: "/journey" }); }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-3">
      <div className="flex items-center gap-1 text-white/85">
        {icon}
        <p className="text-[9px] uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-lg font-bold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

/* --------------------- Activity runner --------------------- */

function ActivityRunner({
  activity,
  onCancel,
  onFinish,
}: {
  activity: RecoveryActivityDef;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const isInstant = activity.durationSec === 0;
  const [running, setRunning] = useState(!isInstant);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  useEffect(() => {
    if (isInstant) return;
    const tick = (t: number) => {
      const dt = t - lastTickRef.current;
      lastTickRef.current = t;
      if (running) {
        setElapsed((e) => {
          const next = Math.min(activity.durationSec, e + dt / 1000);
          if (next >= activity.durationSec) {
            // schedule finish after frame
            window.setTimeout(onFinish, 250);
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activity.durationSec, isInstant, onFinish, running]);

  const pct = isInstant ? 0 : Math.min(1, elapsed / activity.durationSec);
  const remaining = Math.max(0, activity.durationSec - elapsed);
  const min = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);

  // Breathing phase (only for breathing activity) — 4s in, 4s hold, 4s out, 4s hold
  const breathPhase = useMemo(() => {
    if (activity.id !== "breathing") return null;
    const cycle = Math.floor(elapsed) % 16;
    if (cycle < 4) return { label: "Inhale", scale: 1.25 };
    if (cycle < 8) return { label: "Hold", scale: 1.25 };
    if (cycle < 12) return { label: "Exhale", scale: 0.85 };
    return { label: "Hold", scale: 0.85 };
  }, [activity.id, elapsed]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        role="dialog"
        aria-label={activity.name}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="fixed z-50 inset-x-0 bottom-0 mx-auto w-full max-w-[440px] px-4 pb-5"
      >
        <div className={`relative rounded-[28px] border border-border/60 shadow-card overflow-hidden bg-gradient-to-br ${activity.gradient} text-white`}>
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/85 font-semibold">
              Recovery activity
            </p>
            <h2 className="mt-1 text-xl font-bold">{activity.name}</h2>
            <p className="mt-1 text-xs text-white/85">{activity.instruction}</p>

            {/* Visual */}
            <div className="mt-6 relative w-44 h-44 flex items-center justify-center">
              {!isInstant && (
                <svg className="absolute inset-0" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.25)" strokeWidth="4" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="46"
                    stroke="white" strokeWidth="4" fill="none"
                    strokeLinecap="round"
                    style={{ rotate: -90, transformOrigin: "50% 50%" }}
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={(1 - pct) * 2 * Math.PI * 46}
                  />
                </svg>
              )}
              <motion.div
                animate={
                  breathPhase
                    ? { scale: breathPhase.scale }
                    : isInstant
                      ? { scale: [1, 1.05, 1] }
                      : { scale: [1, 1.02, 1] }
                }
                transition={
                  breathPhase
                    ? { duration: 4, ease: "easeInOut" }
                    : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                }
                className="text-6xl"
              >
                {activity.emoji}
              </motion.div>
            </div>

            {isInstant ? (
              <p className="mt-4 text-2xl font-bold tabular-nums">Tap done when finished</p>
            ) : (
              <>
                <p className="mt-4 text-4xl font-bold tabular-nums">
                  {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
                </p>
                {breathPhase && (
                  <p className="mt-1 text-sm font-semibold text-white/90">{breathPhase.label}</p>
                )}
              </>
            )}

            <div className="mt-6 w-full flex items-center gap-2">
              {!isInstant && (
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="flex-1 h-12 rounded-2xl bg-white/20 backdrop-blur font-semibold text-white border border-white/30 flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {running ? "Pause" : "Resume"}
                </button>
              )}
              <button
                onClick={onFinish}
                className="flex-1 h-12 rounded-2xl bg-white text-emerald-700 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-soft"
              >
                <Check className="w-4 h-4" />
                {isInstant ? "Done" : "Mark complete"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* --------------------- Celebration --------------------- */

function CelebrationOverlay({
  activity,
  energyRestored,
  onClose,
  onAnother,
  onJourney,
}: {
  activity: RecoveryActivityDef;
  energyRestored: number;
  onClose: () => void;
  onAnother: () => void;
  onJourney: () => void;
}) {
  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="fixed z-50 inset-x-0 bottom-0 mx-auto w-full max-w-[420px] px-4 pb-6"
      >
        <div className="relative rounded-[28px] bg-card border border-border/60 shadow-card overflow-hidden">
          <div className="absolute -top-16 -left-12 w-56 h-56 rounded-full bg-emerald-400/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-12 w-56 h-56 rounded-full bg-teal-400/30 blur-3xl pointer-events-none" />
          <div className="relative px-6 pt-7 pb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center text-4xl shadow-glow`}
            >
              <span aria-hidden>{activity.emoji}</span>
            </motion.div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-emerald-600 font-bold">
              Recovery complete
            </p>
            <h2 className="mt-1 text-2xl font-bold">Nice work — that helps.</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              You restored <span className="font-semibold text-emerald-600">+{energyRestored} brain energy</span>.
              Every small reset compounds.
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              No guilt, just momentum.
            </div>

            <div className="mt-6 w-full space-y-2">
              <button
                onClick={onAnother}
                className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold active:scale-[0.99] transition"
              >
                Stack another activity
              </button>
              <button
                onClick={onJourney}
                className="w-full h-11 rounded-2xl bg-muted text-foreground font-medium active:scale-[0.99] transition"
              >
                See progress on Journey
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
