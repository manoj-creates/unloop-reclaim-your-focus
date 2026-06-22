import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Check, Sparkles, Eye, Brain, Heart, Flame, Lock, Bell,
  Layers, Battery, ChevronLeft, Plus, Minus, Zap, Target, Moon, TrendingUp, Smile, Sunrise, ShieldCheck,
} from "lucide-react";
import { defaultData, loadOnboarding, saveOnboarding, type OnboardingData } from "@/lib/onboarding-store";
import { BrandIcon } from "@/components/BrandIcon";
import { UnloopMark, UnloopWordmark } from "@/components/UnloopLogo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Unloop" }] }),
  component: Onboarding,
});

const TOTAL = 15;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);

  useEffect(() => {
    setData(loadOnboarding());
  }, []);

  const update = (patch: Partial<OnboardingData>) => {
    setData((d) => {
      const next = { ...d, ...patch };
      saveOnboarding(next);
      return next;
    });
  };

  const next = () => setStep((s) => Math.min(TOTAL, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const finish = () => {
    update({ completed: true });
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="w-full max-w-[440px] min-h-dvh bg-surface relative flex flex-col">
        {/* Top bar */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          {step > 1 && step < TOTAL ? (
            <button onClick={back} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : <div className="w-9" />}
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-flame"
              animate={{ width: `${(step / TOTAL) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {step < TOTAL && step > 1 ? (
            <button onClick={finish} className="text-xs text-muted-foreground font-medium">Skip</button>
          ) : <div className="w-8" />}
        </div>

        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              {step === 1 && <Welcome onNext={next} onSkip={finish} />}
              {step === 2 && <HowItWorks onNext={next} />}
              {step === 3 && <MultiPicker
                title="Which apps steal your attention?"
                subtitle="We'll keep an eye on these for you."
                options={["Instagram", "YouTube", "Facebook", "X", "Snapchat", "Reddit", "LinkedIn", "Telegram", "Moj", "Josh", "Pinterest", "Threads"]}
                value={data.apps}
                onChange={(v) => update({ apps: v })}
                onNext={next}
              />}
              {step === 4 && <MultiPicker
                title="What do you want to reduce?"
                subtitle="Pick the content traps you fall into."
                options={["Reels", "Shorts", "Stories", "Feed", "Explore Page", "Suggested Content"]}
                value={data.contentTypes}
                onChange={(v) => update({ contentTypes: v })}
                onNext={next}
              />}
              {step === 5 && <SinglePicker
                title="Your honest baseline."
                subtitle="On an average day, how many short videos do you watch?"
                options={["Under 50", "50 – 150", "150 – 300", "300 – 500", "500+"]}
                value={data.baseline}
                onChange={(v) => update({ baseline: v, dailyLimit: recommendLimit(v) })}
                onNext={next}
              />}
              {step === 6 && <GoalPicker value={data.goals} onChange={(v) => update({ goals: v })} onNext={next} />}
              {step === 7 && <LimitPicker value={data.dailyLimit} baseline={data.baseline} onChange={(v) => update({ dailyLimit: v })} onNext={next} />}
              {step === 8 && <PermissionIntro onNext={next} />}
              {step === 9 && <PermissionStep
                icon={<Eye className="w-7 h-7 text-white" />}
                title="Usage Access"
                body="Needed to measure how much time you spend in each app. Your data never leaves your device."
                granted={data.permissions.usage}
                onGrant={() => update({ permissions: { ...data.permissions, usage: true } })}
                onNext={next}
              />}
              {step === 10 && <PermissionStep
                icon={<Bell className="w-7 h-7 text-white" />}
                title="Notifications"
                body="So we can send AI reminders, streak alerts, milestone celebrations, and focus coaching."
                granted={data.permissions.notif}
                onGrant={() => update({ permissions: { ...data.permissions, notif: true } })}
                onNext={next}
              />}
              {step === 11 && <PermissionStep
                icon={<Layers className="w-7 h-7 text-white" />}
                title="Overlay Permission"
                body="Lets Unloop display reflection screens when you exceed your limits — your soft pause before the scroll."
                granted={data.permissions.overlay}
                onGrant={() => update({ permissions: { ...data.permissions, overlay: true } })}
                onNext={next}
              />}
              {step === 12 && <WidgetIntro onNext={next} />}
              {step === 13 && <HardcoreIntro
                enabled={data.hardcore}
                onEnable={() => { update({ hardcore: true }); next(); }}
                onSkip={next}
              />}
              {step === 14 && <PersonalPlan data={data} onNext={next} />}
              {step === 15 && <Success data={data} onFinish={finish} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function recommendLimit(baseline: string): number {
  switch (baseline) {
    case "Under 50": return 25;
    case "50 – 150": return 50;
    case "150 – 300": return 100;
    case "300 – 500": return 150;
    case "500+": return 200;
    default: return 50;
  }
}

/* ---------- Reusable primitives ---------- */

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl bg-gradient-flame text-white font-semibold shadow-glow active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
    >
      {children}
    </button>
  );
}

function StepShell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col px-6 pb-8">
      <div className="flex-1">{children}</div>
      <div className="pt-4">{footer}</div>
    </div>
  );
}

function StepHeader({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="mt-2 mb-6">
      {kicker && <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">{kicker}</p>}
      <h1 className="text-3xl font-bold tracking-tight mt-2 leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ---------- Screens ---------- */

function Welcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const features = [
    { icon: <Target className="w-4 h-4" />, label: "Focus Score" },
    { icon: <Sparkles className="w-4 h-4" />, label: "AI Insights" },
    { icon: <Layers className="w-4 h-4" />, label: "Widget Studio" },
    { icon: <Lock className="w-4 h-4" />, label: "Hardcore Mode" },
  ];
  const orbitApps = ["Instagram", "YouTube", "Facebook", "X", "Snapchat", "Telegram"];
  return (
    <StepShell
      footer={
        <div className="space-y-2">
          <button
            onClick={onNext}
            className="w-full py-5 rounded-2xl bg-gradient-flame text-white font-semibold text-base shadow-glow active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            Start Your Journey <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span className="font-medium tracking-wide">100% Private · On Device</span>
          </div>
          <button onClick={onSkip} className="w-full py-2 text-xs text-muted-foreground">Skip for now</button>
        </div>
      }
    >
      {/* Hero illustration */}
      <div className="relative pt-8 pb-6 h-[260px] flex items-center justify-center">
        {/* soft background washes */}
        <div className="absolute inset-x-0 top-0 h-full">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-gradient-sunrise blur-2xl opacity-80" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full bg-primary/15 blur-3xl" />
        </div>

        {/* orbiting app chips */}
        {orbitApps.map((app, i) => {
          const angle = (i / orbitApps.length) * Math.PI * 2 - Math.PI / 2;
          const r = 110;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          return (
            <motion.div
              key={app}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1, x, y }}
              transition={{ delay: 0.3 + i * 0.08, type: "spring", damping: 14 }}
              className="absolute"
              style={{ left: "50%", top: "50%", marginLeft: -18, marginTop: -18 }}
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
              >
                <BrandIcon name={app} size={36} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* central brand mark */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="relative w-32 h-32 rounded-[32px] bg-card flex items-center justify-center shadow-glow border border-border/60"
        >
          <UnloopMark size={84} />
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.6, repeat: Infinity }}
            className="absolute inset-0 rounded-[32px] bg-primary/25"
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
            className="absolute inset-0 rounded-[32px] bg-primary/15"
          />
        </motion.div>
      </div>

      {/* Wordmark */}
      <div className="flex items-center justify-center -mt-2 mb-1">
        <UnloopWordmark size={28} />
      </div>

      <div className="text-center mt-2 mb-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[32px] font-bold tracking-tight leading-[1.1]"
        >
          Break the Scroll.<br />
          <span className="text-gradient-flame">Reclaim Your Time.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground mt-3 leading-relaxed px-2"
        >
          Unloop helps you reduce mindless scrolling, improve focus, and build healthier digital habits.
        </motion.p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.06 }}
            whileHover={{ y: -2 }}
            className="flex items-center gap-2 rounded-2xl bg-card border border-border/60 p-3 shadow-card"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-sunrise text-primary flex items-center justify-center shadow-soft">{f.icon}</div>
            <span className="text-sm font-semibold">{f.label}</span>
          </motion.div>
        ))}
      </div>
    </StepShell>
  );
}

function HowItWorks({ onNext }: { onNext: () => void }) {
  const cards = [
    { icon: <Eye className="w-6 h-6" />, title: "Track", body: "Track your habits. We watch the apps, you stay aware." },
    { icon: <Brain className="w-6 h-6" />, title: "Understand", body: "Understand your triggers. Patterns become visible." },
    { icon: <Heart className="w-6 h-6" />, title: "Transform", body: "Transform your attention. One intentional choice at a time." },
  ];
  return (
    <StepShell footer={<PrimaryButton onClick={onNext}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader kicker="How Unloop Works" title="A loop you can finally break." subtitle="Three steps. One transformation." />
      <div className="space-y-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="rounded-3xl bg-card border border-border/60 shadow-soft p-5 flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-flame text-white flex items-center justify-center shadow-glow shrink-0">
              {c.icon}
            </div>
            <div>
              <p className="text-lg font-bold">{c.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{c.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </StepShell>
  );
}

const APP_META: Record<string, { icon: string; color: string }> = {
  Instagram: { icon: "📷", color: "#E1306C" },
  YouTube: { icon: "▶", color: "#FF0000" },
  Facebook: { icon: "f", color: "#1877F2" },
  X: { icon: "𝕏", color: "#000000" },
  Snapchat: { icon: "👻", color: "#FFD400" },
  Reddit: { icon: "🤖", color: "#FF4500" },
  LinkedIn: { icon: "in", color: "#0A66C2" },
  Telegram: { icon: "✈", color: "#229ED9" },
  Moj: { icon: "M", color: "#F50057" },
  Josh: { icon: "J", color: "#E11D48" },
  Pinterest: { icon: "P", color: "#E60023" },
  Threads: { icon: "@", color: "#000000" },
};

function MultiPicker({ title, subtitle, options, value, onChange, onNext }: {
  title: string; subtitle: string; options: string[]; value: string[]; onChange: (v: string[]) => void; onNext: () => void;
}) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((o) => o !== opt) : [...value, opt]);
  };
  return (
    <StepShell footer={<PrimaryButton onClick={onNext} disabled={value.length === 0}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader title={title} subtitle={subtitle} />
      <div className="space-y-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          const hasBrand = opt in APP_META || ["Instagram","YouTube","Facebook","X","Snapchat","Reddit","LinkedIn","Telegram","Moj","Josh","Pinterest","Threads"].includes(opt);
          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
              onClick={() => toggle(opt)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${active ? "bg-card border-primary shadow-glow" : "bg-card border-border/60 shadow-card"}`}
            >
              {hasBrand ? (
                <BrandIcon name={opt} size={38} />
              ) : (
                <div className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <span className="flex-1 text-left font-semibold text-sm">{opt}</span>
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {active && <Check className="w-4 h-4" />}
              </span>
            </motion.button>
          );
        })}
      </div>
    </StepShell>
  );
}

function SinglePicker({ title, subtitle, options, value, onChange, onNext }: {
  title: string; subtitle: string; options: string[]; value: string; onChange: (v: string) => void; onNext: () => void;
}) {
  return (
    <StepShell footer={<PrimaryButton onClick={onNext} disabled={!value}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader title={title} subtitle={subtitle} />
      <div className="space-y-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${active ? "bg-card border-primary shadow-glow" : "bg-card border-border/60 shadow-soft"}`}
            >
              <span className="flex-1 text-left font-semibold text-sm">{opt}</span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-primary" : "border-border"}`}>
                {active && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

function GoalPicker({ value, onChange, onNext }: { value: string[]; onChange: (v: string[]) => void; onNext: () => void }) {
  const goals = [
    { label: "Reduce Scrolling",  desc: "Spend less time on distracting content.", icon: <Zap className="w-4 h-4" /> },
    { label: "Deep Focus",        desc: "Improve concentration and productivity.", icon: <Target className="w-4 h-4" /> },
    { label: "Better Sleep",      desc: "Reduce late-night scrolling.",            icon: <Moon className="w-4 h-4" /> },
    { label: "Less Anxiety",      desc: "Reduce digital overwhelm.",                icon: <Smile className="w-4 h-4" /> },
    { label: "Productivity",      desc: "Reclaim hours for real work.",             icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Self Improvement",  desc: "Build intentional habits.",                icon: <Sunrise className="w-4 h-4" /> },
  ];
  const toggle = (g: string) => {
    onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  };
  return (
    <StepShell footer={<PrimaryButton onClick={onNext} disabled={value.length === 0}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader title="Why are you breaking the loop?" subtitle="Choose what matters most. You can pick more than one." />
      <div className="space-y-2.5">
        {goals.map((g) => {
          const active = value.includes(g.label);
          return (
            <button
              key={g.label}
              onClick={() => toggle(g.label)}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl border transition-all text-left ${active ? "bg-card border-primary shadow-glow" : "bg-card border-border/60 shadow-soft"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-gradient-flame text-white" : "bg-accent text-primary"}`}>
                {g.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{g.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{g.desc}</p>
              </div>
              <span className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {active && <Check className="w-3 h-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

function LimitPicker({ value, baseline, onChange, onNext }: { value: number; baseline: string; onChange: (v: number) => void; onNext: () => void }) {
  const dailySaved = useMemo(() => {
    const baselineCount = baseline === "500+" ? 500 : baseline === "300 – 500" ? 400 : baseline === "150 – 300" ? 220 : baseline === "50 – 150" ? 100 : 40;
    const savedReels = Math.max(0, baselineCount - value);
    const minutes = Math.round(savedReels * 0.5); // ~30s per reel
    return { daily: minutes, weekly: minutes * 7, monthly: minutes * 30 };
  }, [baseline, value]);

  const fmt = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

  return (
    <StepShell footer={<PrimaryButton onClick={onNext}>Set My Limit <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader kicker="Personalized for you" title="Your daily reel limit." subtitle="We recommend this based on your baseline. Adjust to your comfort." />

      <div className="rounded-3xl bg-card border border-border/60 shadow-soft p-6 flex flex-col items-center">
        <div className="flex items-center gap-5">
          <button onClick={() => onChange(Math.max(5, value - 5))} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
            <Minus className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-6xl font-bold tracking-tight text-gradient-flame">{value}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Reels / day</p>
          </div>
          <button onClick={() => onChange(value + 5)} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-5">
          {[25, 50, 100].map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${value === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-gradient-sunrise border border-amber/30 p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimated time you'll reclaim</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Reclaim label="Daily" value={fmt(dailySaved.daily)} />
          <Reclaim label="Weekly" value={fmt(dailySaved.weekly)} />
          <Reclaim label="Monthly" value={fmt(dailySaved.monthly)} />
        </div>
      </div>
    </StepShell>
  );
}

function Reclaim({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-bold text-gradient-flame">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function PermissionIntro({ onNext }: { onNext: () => void }) {
  const perms = [
    { icon: <Eye className="w-4 h-4" />, title: "Usage Access", body: "Measure app usage." },
    { icon: <Bell className="w-4 h-4" />, title: "Notifications", body: "Smart interventions & coaching." },
    { icon: <Layers className="w-4 h-4" />, title: "Overlay", body: "Show reflection screens." },
    { icon: <Battery className="w-4 h-4" />, title: "Battery Exemption", body: "Stay active in background." },
  ];
  return (
    <StepShell footer={<PrimaryButton onClick={onNext}>Grant Permissions <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader kicker="A few things first" title="To protect your attention, Unloop needs a few permissions." subtitle="We explain why before we ask. You're always in control." />
      <div className="space-y-2.5">
        {perms.map((p) => (
          <div key={p.title} className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 shadow-soft p-4">
            <div className="w-9 h-9 rounded-xl bg-accent text-primary flex items-center justify-center">{p.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.body}</p>
            </div>
            <Check className="w-4 h-4 text-success" />
          </div>
        ))}
      </div>
    </StepShell>
  );
}

function PermissionStep({ icon, title, body, granted, onGrant, onNext }: {
  icon: React.ReactNode; title: string; body: string; granted: boolean; onGrant: () => void; onNext: () => void;
}) {
  return (
    <StepShell
      footer={
        <div className="space-y-2">
          {!granted ? (
            <PrimaryButton onClick={onGrant}>Open Settings</PrimaryButton>
          ) : (
            <PrimaryButton onClick={onNext}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
          )}
          <button onClick={onNext} className="w-full py-3 text-sm text-muted-foreground">Skip this step</button>
        </div>
      }
    >
      <div className="pt-6 pb-6 flex justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-3xl bg-gradient-flame flex items-center justify-center shadow-glow"
        >
          {icon}
        </motion.div>
      </div>
      <StepHeader title={title} subtitle={body} />

      {/* Visual guide */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-7 h-7 rounded-full bg-accent text-primary flex items-center justify-center text-xs font-bold">1</div>
          <span>Tap "Open Settings"</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-7 h-7 rounded-full bg-accent text-primary flex items-center justify-center text-xs font-bold">2</div>
          <span>Find <span className="font-semibold">Unloop</span> in the list</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-7 h-7 rounded-full bg-accent text-primary flex items-center justify-center text-xs font-bold">3</div>
          <span>Toggle permission on</span>
        </div>
      </div>

      {granted && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-4 rounded-2xl bg-success/10 border border-success/30 p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-success flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold">Permission granted. Nice.</span>
        </motion.div>
      )}
    </StepShell>
  );
}

function WidgetIntro({ onNext }: { onNext: () => void }) {
  return (
    <StepShell footer={<PrimaryButton onClick={onNext}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader kicker="Widget Studio" title="Your focus lives on your home screen." subtitle="Glance, stay aware, stay free." />
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Focus Score", value: "78" },
          { label: "AI Insight", value: "🔥" },
          { label: "Streak", value: "7d" },
          { label: "Time Saved", value: "1h 25m" },
          { label: "Hardcore", value: "🔒" },
          { label: "Motivation", value: "✨" },
        ].map((w) => (
          <div key={w.label} className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 h-28 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-gradient-flame">{w.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">{w.label}</p>
          </div>
        ))}
      </div>
    </StepShell>
  );
}

function HardcoreIntro({ onEnable, onSkip }: { enabled: boolean; onEnable: () => void; onSkip: () => void }) {
  return (
    <StepShell
      footer={
        <div className="space-y-2">
          <PrimaryButton onClick={onEnable}>Enable Hardcore Mode</PrimaryButton>
          <button onClick={onSkip} className="w-full py-3 text-sm text-muted-foreground">Maybe later</button>
        </div>
      }
    >
      <div className="pt-6 pb-6 flex justify-center">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-28 h-28 rounded-full bg-gradient-flame flex items-center justify-center shadow-glow"
        >
          <Lock className="w-12 h-12 text-white" />
        </motion.div>
      </div>
      <StepHeader title="Need stronger boundaries?" subtitle="Hardcore Mode is for the days you mean it." />
      <div className="space-y-2">
        {[
          "App Blocking",
          "Reflection Requirement",
          "Delay Access",
          "Emergency Unlock",
        ].map((x) => (
          <div key={x} className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 shadow-soft p-4">
            <div className="w-8 h-8 rounded-lg bg-accent text-primary flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold">{x}</span>
          </div>
        ))}
      </div>
    </StepShell>
  );
}

function PersonalPlan({ data, onNext }: { data: OnboardingData; onNext: () => void }) {
  const baselineNum = data.baseline === "500+" ? 500 : data.baseline === "300 – 500" ? 400 : data.baseline === "150 – 300" ? 220 : data.baseline === "50 – 150" ? 100 : 40;
  const yearlyMin = Math.max(0, baselineNum - data.dailyLimit) * 0.5 * 365;
  const yearlyHours = Math.round(yearlyMin / 60);

  const rows = [
    { label: "Apps Selected", value: data.apps.length ? `${data.apps.length} apps` : "—" },
    { label: "Goal", value: data.goals[0] ?? "Reduce Scrolling" },
    { label: "Baseline Usage", value: data.baseline || "Not set" },
    { label: "Daily Limit", value: `${data.dailyLimit} reels` },
  ];

  return (
    <StepShell footer={<PrimaryButton onClick={onNext}>Create My Plan <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <StepHeader kicker="Your personalized plan" title="You can reclaim" />
      <div className="text-center -mt-4">
        <p className="text-7xl font-bold text-gradient-flame">{yearlyHours}h</p>
        <p className="text-sm text-muted-foreground mt-1">this year.</p>
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border/60 shadow-soft divide-y divide-border/60">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
    </StepShell>
  );
}

function Success({ data, onFinish }: { data: OnboardingData; onFinish: () => void }) {
  return (
    <StepShell footer={<PrimaryButton onClick={onFinish}>Enter Dashboard <ArrowRight className="w-4 h-4" /></PrimaryButton>}>
      <div className="pt-8 pb-4 flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="w-28 h-28 rounded-[28px] bg-card border border-border/60 flex items-center justify-center shadow-glow"
        >
          <UnloopMark size={72} />
        </motion.div>
        <UnloopWordmark size={24} />
      </div>
      <StepHeader title="You're all set." subtitle="You are no longer fighting attention traps blindly. Today your journey begins." />


      <div className="grid grid-cols-2 gap-3">
        <Tile label="Apps Monitored" value={`${data.apps.length || 0}`} />
        <Tile label="Focus Goal" value={data.goals[0] ?? "Focus"} />
        <Tile label="Daily Limit" value={`${data.dailyLimit} reels`} />
        <Tile label="Widgets" value="Ready" />
      </div>
    </StepShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-bold mt-1 truncate">{value}</p>
    </div>
  );
}
