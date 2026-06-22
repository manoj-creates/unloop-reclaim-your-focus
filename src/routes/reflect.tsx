import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Film,
  Sparkles,
  Wind,
  Heart,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Flame,
  TrendingUp,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { isHardcoreEnabled } from "@/lib/hardcore-store";
import { useLiveStats, formatDuration } from "@/lib/live-stats";

type Search = {
  app?: string;
  hardcore?: boolean;
};

export const Route = createFileRoute("/reflect")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    app: typeof s.app === "string" ? s.app : undefined,
    hardcore: s.hardcore === true || s.hardcore === "true",
  }),
  head: () => ({
    meta: [
      { title: "Pause & Reflect — Unloop" },
      { name: "description", content: "A premium reflection moment before opening monitored apps." },
    ],
  }),
  component: ReflectFlow,
});

type Step =
  | "limit"
  | "breathe"
  | "why"
  | "want"
  | "ai"
  | "delay"
  | "success"
  | "hardcoreType"
  | "blocked";

const STATS_KEY = "unloop.reflect.stats";
const UNLOCK_KEY = "unloop.reflect.unlocks";

type Stats = {
  shown: number;
  completed: number;
  turnedBack: number;
  minutesSaved: number;
  lastReasons: string[];
};

function loadStats(): Stats {
  if (typeof window === "undefined") return { shown: 0, completed: 0, turnedBack: 0, minutesSaved: 0, lastReasons: [] };
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "") || { shown: 0, completed: 0, turnedBack: 0, minutesSaved: 0, lastReasons: [] };
  } catch {
    return { shown: 0, completed: 0, turnedBack: 0, minutesSaved: 0, lastReasons: [] };
  }
}
function saveStats(s: Stats) {
  if (typeof window !== "undefined") localStorage.setItem(STATS_KEY, JSON.stringify(s));
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function getUnlocksToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem(UNLOCK_KEY) || "{}");
    return raw[todayKey()] || 0;
  } catch {
    return 0;
  }
}
function addUnlock() {
  if (typeof window === "undefined") return;
  const raw = (() => {
    try {
      return JSON.parse(localStorage.getItem(UNLOCK_KEY) || "{}");
    } catch {
      return {};
    }
  })();
  raw[todayKey()] = (raw[todayKey()] || 0) + 1;
  localStorage.setItem(UNLOCK_KEY, JSON.stringify(raw));
}

const WHY_OPTIONS = ["I'm bored", "Habit", "Looking for something", "Need to message someone", "Work related", "Other"];
const WANT_OPTIONS = ["Entertainment", "Relaxation", "Connection", "Information", "Inspiration"];
const MOTIVATIONS = [
  "Your future self will thank you.",
  "Small pauses create big changes.",
  "Attention is your greatest asset.",
];

function ReflectFlow() {
  const { app = "Instagram", hardcore: hcQuery } = useSearch({ from: "/reflect" });
  const navigate = useNavigate();

  const hardcore = useMemo(() => {
    if (hcQuery) return true;
    return isHardcoreEnabled();
  }, [hcQuery]);

  const stats = useLiveStats();

  const [step, setStep] = useState<Step>("limit");
  const [why, setWhy] = useState<string | null>(null);
  const [want, setWant] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [unlocksLeft, setUnlocksLeft] = useState(3);

  useEffect(() => {
    const s = loadStats();
    s.shown += 1;
    saveStats(s);
    setUnlocksLeft(Math.max(0, 3 - getUnlocksToday()));
  }, []);

  function go(next: Step) {
    setStep(next);
  }
  function complete() {
    const s = loadStats();
    s.completed += 1;
    s.turnedBack += 1;
    s.minutesSaved += 12;
    s.lastReasons = [why || "—", ...s.lastReasons].slice(0, 20);
    saveStats(s);
    go("success");
  }
  function openApp() {
    addUnlock();
    navigate({ to: "/app" });
  }
  function continueAnyway() {
    if (hardcore) {
      if (unlocksLeft <= 0) {
        go("blocked");
        return;
      }
      go("hardcoreType");
    } else {
      openApp();
    }
  }

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="w-full max-w-[440px] min-h-dvh bg-surface relative pb-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-6 pb-3">
          <button
            onClick={() => (step === "limit" ? navigate({ to: "/app" }) : go("limit"))}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground"
            aria-label="Close"
          >
            ‹
          </button>
          <div className="flex items-center gap-1.5">
            {hardcore && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" /> Hardcore
              </span>
            )}
            <span className="px-2 py-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {app}
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <ProgressDots step={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="px-5"
          >
            {step === "limit" && (
              <LimitScreen
                app={app}
                reels={stats.reelsToday}
                dailyLimit={stats.dailyLimitReels}
                timeSpent={formatDuration(stats.reelsToday * 21)}
                timeSaved={formatDuration(stats.timeSavedTodaySec)}
                onBreak={() => go("breathe")}
                onContinue={continueAnyway}
              />
            )}
            {step === "breathe" && <BreatheScreen onNext={() => go("why")} />}
            {step === "why" && (
              <ChoiceScreen
                title="Why do you want to open this app?"
                options={WHY_OPTIONS}
                value={why}
                onChange={setWhy}
                onNext={() => go("want")}
              />
            )}
            {step === "want" && (
              <ChoiceScreen
                title="What are you hoping to get?"
                options={WANT_OPTIONS}
                value={want}
                onChange={setWant}
                onNext={() => go("ai")}
              />
            )}
            {step === "ai" && (
              <AIScreen
                why={why}
                want={want}
                focusScore={stats.focusScore}
                timeSaved={formatDuration(stats.timeSavedTodaySec)}
                streak={stats.streak}
                onBack={complete}
                onContinue={continueAnyway}
              />
            )}
            {step === "delay" && <DelayScreen seconds={hardcore ? 15 : 10} onOpen={openApp} onCancel={complete} />}
            {step === "hardcoreType" && (
              <HardcoreTypeScreen
                reason={reason}
                setReason={setReason}
                unlocksLeft={unlocksLeft}
                onContinue={() => go("delay")}
                onCancel={complete}
              />
            )}
            {step === "blocked" && <BlockedScreen onCancel={complete} />}
            {step === "success" && <SuccessScreen onHome={() => navigate({ to: "/app" })} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProgressDots({ step }: { step: Step }) {
  const order: Step[] = ["limit", "breathe", "why", "want", "ai", "delay"];
  const idx = order.indexOf(step);
  if (idx === -1) return <div className="h-3" />;
  return (
    <div className="flex items-center justify-center gap-1.5 mb-3">
      {order.map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all ${i <= idx ? "w-6 bg-primary" : "w-2 bg-muted"}`}
        />
      ))}
    </div>
  );
}

/* ---------- Screen 1 ---------- */
function LimitScreen({
  app, reels, dailyLimit, timeSpent, timeSaved, onBreak, onContinue,
}: {
  app: string; reels: number; dailyLimit: number; timeSpent: string; timeSaved: string;
  onBreak: () => void; onContinue: () => void;
}) {
  const overLimit = reels >= dailyLimit;
  return (
    <div className="pt-4">
      <div className="rounded-3xl bg-gradient-flame text-neutral-900 shadow-soft px-5 py-4">
        <div className="flex items-center gap-2 text-neutral-800 text-[11px] uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5" /> {overLimit ? "Daily limit reached" : "Pause & reflect"}
        </div>
        <h1 className="mt-1.5 text-2xl font-bold leading-tight">
          {overLimit ? "You've reached today's limit." : "About to open " + app + "?"}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-800">
          You've watched {reels} of {dailyLimit} reels on {app} today.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat icon={Clock} label="Time Spent" value={timeSpent} />
        <Stat icon={Film} label="Reels" value={String(reels)} />
        <Stat icon={Sparkles} label="Saved" value={timeSaved} tone="success" />
      </div>


      <div className="mt-6 space-y-3">
        <motion.button
          onClick={onBreak}
          animate={{
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 8px 24px -12px rgba(0,0,0,0.25)",
              "0 16px 36px -10px rgba(0,0,0,0.35)",
              "0 8px 24px -12px rgba(0,0,0,0.25)",
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold"
        >
          Take a Break
        </motion.button>
        <button
          onClick={onContinue}
          className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: "success" }) {
  const success = tone === "success";
  return (
    <div
      className={`rounded-2xl border shadow-soft p-3.5 transition hover:-translate-y-0.5 ${
        success ? "bg-success/10 border-success/30" : "bg-card border-border/60"
      }`}
    >
      <Icon className={`w-4 h-4 ${success ? "text-success" : "text-muted-foreground"}`} />
      <p className={`text-[10px] uppercase tracking-wider mt-2 ${success ? "text-success/80" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`text-lg font-bold mt-0.5 ${success ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

/* ---------- Screen 2 ---------- */
function BreatheScreen({ onNext }: { onNext: () => void }) {
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    if (count <= 0) return;
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    const p = setInterval(() => setPhase((x) => (x === "in" ? "out" : "in")), 2500);
    return () => {
      clearTimeout(t);
      clearInterval(p);
    };
  }, [count]);

  return (
    <div className="pt-2 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Before you continue…</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
        Most people open social apps automatically. Let's pause for a moment.
      </p>

      <div className="relative h-64 flex items-center justify-center mt-6">
        <motion.div
          animate={{ scale: phase === "in" ? 1.15 : 0.85, opacity: phase === "in" ? 0.5 : 0.25 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="absolute w-56 h-56 rounded-full bg-gradient-flame blur-2xl"
        />
        <motion.div
          animate={{ scale: phase === "in" ? 1.1 : 0.9 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="relative w-40 h-40 rounded-full bg-card border border-border shadow-soft flex flex-col items-center justify-center"
        >
          <Wind className="w-5 h-5 text-primary" />
          <p className="text-3xl font-bold mt-1">{count}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
            Breathe {phase === "in" ? "in" : "out"}
          </p>
        </motion.div>
      </div>

      <button
        onClick={onNext}
        disabled={count > 0}
        className="mt-6 w-full h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft disabled:opacity-50 active:scale-[0.99] transition"
      >
        I'm Still Here
      </button>
    </div>
  );
}

/* ---------- Screens 3 & 4 ---------- */
function ChoiceScreen({
  title,
  options,
  value,
  onChange,
  onNext,
}: {
  title: string;
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="pt-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-5 space-y-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={`w-full px-4 py-4 rounded-2xl border text-left text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card border-border/60 text-foreground hover:bg-accent/40"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <button
        onClick={onNext}
        disabled={!value}
        className="mt-6 w-full h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft disabled:opacity-40 active:scale-[0.99] transition flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ---------- Screen 5 ---------- */
function AIScreen({
  why,
  want,
  focusScore,
  timeSaved,
  streak,
  onBack,
  onContinue,
}: {
  why: string | null;
  want: string | null;
  focusScore: number;
  timeSaved: string;
  streak: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const reflections = [
    `When you've felt ${(why || "bored").toLowerCase()} before, scrolling rarely fixed it.`,
    `You've already saved ${timeSaved} today.`,
    `Your focus score is ${focusScore} — keep the momentum.`,
    want ? `You're hoping for ${want.toLowerCase()} — a 10-min walk usually delivers more.` : "Try a 10-min walk instead.",
  ];
  return (
    <div className="pt-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Reflection</p>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mt-2">Here's what we noticed.</h1>

      <div className="mt-4 space-y-2">
        {reflections.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 text-sm"
          >
            {r}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={TrendingUp} label="Focus" value={String(focusScore)} />
        <Stat icon={Clock} label="Saved" value={timeSaved} />
        <Stat icon={Flame} label="Streak" value={`${streak}d`} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onBack}
          className="h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft active:scale-[0.99] transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <button
          onClick={onContinue}
          className="h-14 rounded-2xl bg-card border border-border text-foreground font-medium"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );
}

/* ---------- Screen 6 ---------- */
function DelayScreen({ seconds, onOpen, onCancel }: { seconds: number; onOpen: () => void; onCancel: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [msgIdx, setMsgIdx] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
  }, []);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => {
    const i = setInterval(() => setMsgIdx((m) => (m + 1) % MOTIVATIONS.length), 2500);
    return () => clearInterval(i);
  }, []);

  const pct = ((seconds - left) / seconds) * 100;

  return (
    <div className="pt-2 text-center">
      <h1 className="text-2xl font-bold tracking-tight">One last pause.</h1>
      <p className="text-sm text-muted-foreground mt-2">A short delay before the app opens.</p>

      <div className="relative w-48 h-48 mx-auto mt-8">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="44" stroke="currentColor" className="text-muted" strokeWidth="6" fill="none" />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#delay-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={2 * Math.PI * 44}
            animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100) }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="delay-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.85 0.16 80)" />
              <stop offset="100%" stopColor="oklch(0.68 0.22 32)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold">{left}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">seconds</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-6 text-sm font-medium text-foreground"
        >
          {MOTIVATIONS[msgIdx]}
        </motion.p>
      </AnimatePresence>

      <div className="mt-8 space-y-3">
        <button
          onClick={onOpen}
          disabled={left > 0}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft disabled:opacity-40 active:scale-[0.99] transition"
        >
          Open App
        </button>
        <button onClick={onCancel} className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium">
          Actually, take a break
        </button>
      </div>
    </div>
  );
}

/* ---------- Hardcore type-reason ---------- */
function HardcoreTypeScreen({
  reason,
  setReason,
  unlocksLeft,
  onContinue,
  onCancel,
}: {
  reason: string;
  setReason: (v: string) => void;
  unlocksLeft: number;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="pt-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-destructive" />
        <p className="text-xs uppercase tracking-wider text-destructive">Hardcore Mode</p>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mt-2">Type your reason to unlock.</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {unlocksLeft} emergency {unlocksLeft === 1 ? "unlock" : "unlocks"} left today.
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={5}
        placeholder="Be honest with yourself…"
        className="mt-4 w-full p-4 rounded-2xl bg-card border border-border/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="mt-6 space-y-3">
        <button
          onClick={onContinue}
          disabled={reason.trim().length < 12}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft disabled:opacity-40 active:scale-[0.99] transition"
        >
          Continue
        </button>
        <button onClick={onCancel} className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium">
          Cancel & Take a Break
        </button>
      </div>
    </div>
  );
}

function BlockedScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="pt-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-destructive/10 flex items-center justify-center">
        <Lock className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">No unlocks left today.</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-[300px] mx-auto">
        Hardcore mode allows 3 emergency unlocks per day. Resets at midnight.
      </p>
      <button
        onClick={onCancel}
        className="mt-8 w-full h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft"
      >
        Take a Break
      </button>
    </div>
  );
}

/* ---------- Screen 7 ---------- */
function SuccessScreen({ onHome }: { onHome: () => void }) {
  return (
    <div className="pt-8 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="w-24 h-24 mx-auto rounded-full bg-success/15 flex items-center justify-center"
      >
        <CheckCircle2 className="w-12 h-12 text-success" />
      </motion.div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Great choice.</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-[300px] mx-auto">
        You just avoided another scrolling session.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 px-1">
        <div className="rounded-2xl bg-gradient-flame text-neutral-900 shadow-soft p-4 text-left">
          <Clock className="w-4 h-4 text-neutral-800" />
          <p className="text-[10px] uppercase tracking-wider text-neutral-800 mt-2">Time saved</p>
          <p className="text-xl font-bold mt-0.5">+12 min</p>
        </div>
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 text-left">
          <Heart className="w-4 h-4 text-primary" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Focus</p>
          <p className="text-xl font-bold mt-0.5">+1 point</p>
        </div>
      </div>

      <button
        onClick={onHome}
        className="mt-8 w-full h-14 rounded-2xl bg-foreground text-background font-semibold shadow-soft active:scale-[0.99] transition"
      >
        Return Home
      </button>
    </div>
  );
}
