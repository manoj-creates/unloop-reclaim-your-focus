import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flame, Sparkles, Lock, LayoutGrid, ChevronRight, TrendingUp, Clock, Heart } from "lucide-react";
import { AppShell, StatusBar } from "@/components/AppShell";
import { FocusRing } from "@/components/FocusRing";
import { UnloopMark } from "@/components/UnloopLogo";
import { BrainStageMessage } from "@/components/BrainEnergyCounter";
import { AnimatedNumber } from "@/components/ReelsCounter";
import { UserAvatar } from "@/components/UserAvatar";
import { useLiveStats, formatDuration } from "@/lib/live-stats";
import { useUserProfile } from "@/lib/user-profile";
import { isOnboarded, isReadinessReviewed } from "@/lib/onboarding-store";
import { hasNativeBridge } from "@/lib/native-bridge";
import { useReelsCounter } from "@/lib/reels-store";
import { isRecoveryAvailable, RECOVERY_TRIGGER_REELS } from "@/lib/recovery-store";


export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Unloop — Break the loop. Reclaim your time." },
      { name: "description", content: "Behavioral transformation platform to break dopamine addiction and reclaim focus." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const stats = useLiveStats();
  const profile = useUserProfile();
  const { total: reelsLive } = useReelsCounter();
  const recoveryAvailable = isRecoveryAvailable(reelsLive);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const isMarketingPreview =
        new URLSearchParams(window.location.search).get("preview") === "1";

    if (isMarketingPreview) {
        setReady(true);
    } else if (!isOnboarded()) {
        navigate({ to: "/onboarding", replace: true });
    } else {
        setReady(true);
    }
}, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center" aria-label="Loading" role="status">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-card border border-border/60 shadow-soft flex items-center justify-center animate-pulse">
            <UnloopMark size={30} />
          </div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Loading</span>
        </div>
      </div>
    );
  }


  return (
    <AppShell>
      <StatusBar />

      {/* Greeting */}
      <header className="px-5 pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-card border border-border/60 shadow-soft flex items-center justify-center">
            <UnloopMark size={28} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{greeting()},</p>
            <h1 className="text-xl font-bold tracking-tight leading-tight">{profile.name}</h1>
          </div>
        </div>
        <UserAvatar src={profile.avatarUrl} name={profile.name} initials={profile.initials} size={44} />
      </header>

      {/* Phase D.3 — Recovery banner (visible once user crosses Brain Rot territory) */}
      {recoveryAvailable && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-5 mb-4"
        >
          <Link
            to="/recovery"
            className="block rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-soft p-4 relative overflow-hidden active:scale-[0.99] transition"
          >
            <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/85">
                  Recovery mode available
                </p>
                <p className="text-sm font-bold mt-0.5 leading-snug">
                  Start Recovery?
                </p>
                <p className="text-[11px] text-white/85 leading-snug">
                  {reelsLive}+ reels today — a 2-minute reset will help.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/90 shrink-0" />
            </div>
          </Link>
        </motion.section>
      )}

      {/* Focus Score Card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-5 rounded-3xl bg-card shadow-card overflow-hidden border border-border/60"
      >
        <div className="p-5 flex items-center gap-5">
          <FocusRing value={stats.focusBuilding ? 0 : stats.focusScore} size={140} stroke={12} label={stats.focusBuilding ? "…" : "Focus"} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Focus Status</p>
            <p className="text-lg font-semibold mt-0.5 tracking-tight">{stats.focusStatus}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {stats.focusBuilding
                ? "Your journey starts today."
                : stats.reelsToday === 0
                  ? "Your journey starts today."
                  : `${stats.reelsAvoidedToday} distractions avoided today`}
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Daily goal</span>
                <span className="text-xs font-semibold tabular-nums">{stats.dailyLimitReels} reels</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Reels today</span>
                <span className="text-xs font-semibold tabular-nums"><AnimatedNumber value={stats.reelsToday} /></span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border/60">
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Time Saved Today</p>
            <p className="text-xl font-bold mt-1">{formatDuration(stats.timeSavedTodaySec)}</p>
          </div>
          <div className="p-4 border-l border-border/60">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">This Week</p>
            <p className="text-xl font-bold mt-1">{formatDuration(stats.timeSavedWeekSec)}</p>
          </div>
        </div>
      </motion.section>

      {/* Daily limit */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5"
      >
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-muted-foreground">You've watched</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{stats.reelsToday} <span className="text-sm font-medium text-muted-foreground">reels</span></p>
            <p className="text-xs text-muted-foreground">of {stats.dailyLimitReels} daily limit</p>
          </div>
          <span className="text-3xl font-bold text-gradient-flame">{stats.usedPercent}%</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.usedPercent}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-gradient-flame rounded-full"
          />
        </div>
      </motion.section>

      {/* Metric chips */}
      <section className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <MetricChip icon={<Flame className="w-4 h-4" />} label="Streak" value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`} />
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-wider">Brain</span>
          </div>
          <BrainStageMessage reels={stats.reelsToday} className="text-sm font-semibold mt-1 leading-snug text-foreground" />
          <p className="text-[11px] text-muted-foreground mt-0.5">Based on today's scrolling</p>
        </div>
      </section>


      {/* AI Insight */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-5 mt-4 rounded-3xl bg-gradient-sunrise border border-amber/30 p-5 relative overflow-hidden text-neutral-900"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/15 blur-2xl" />
        <div className="flex items-start gap-3 relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-flame flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider text-neutral-600">AI Insight</p>
            <p className="text-base font-semibold mt-0.5 text-neutral-900">
              {stats.usedPercent < 60 ? "Great control today!" : stats.usedPercent < 100 ? "You're approaching your limit" : "Daily limit reached"}
            </p>
            <p className="text-sm text-neutral-700 mt-1">
              You saved {formatDuration(stats.timeSavedTodaySec)} today by avoiding {stats.reelsAvoidedToday} reels.
            </p>
          </div>

        </div>
      </motion.section>

      {/* Quick actions */}
      <section className="mx-5 mt-4 space-y-2">
        <QuickAction to="/hardcore" icon={<Lock className="w-4 h-4" />} label="Start Focus Session" desc="Activate Hardcore Mode" />
        <QuickAction to="/widgets" icon={<LayoutGrid className="w-4 h-4" />} label="Open Widget Studio" desc="Design home-screen widgets" />
        <QuickAction to="/insights" icon={<TrendingUp className="w-4 h-4" />} label="See AI Insights" desc="Patterns & coaching" />
      </section>

      {/* System-wide overlay counter is rendered outside Unloop via Android overlay/accessibility services. Not shown in-app. */}
    </AppShell>
  );
}

function MetricChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function QuickAction({ to, icon, label, desc }: { to: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 shadow-soft p-4 active:scale-[0.98] transition-transform">
      <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}
function getFocusStatus(score: number) {
  if (score >= 85) return "Excellent Focus";
  if (score >= 70) return "Good Focus";
  if (score >= 50) return "Average Focus";
  return "Low Focus";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}


