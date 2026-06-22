import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { Lock, ShieldAlert, BrainCircuit, Hourglass, Flame } from "lucide-react";
import { useHardcore, type HardcoreLevel } from "@/lib/hardcore-store";

export const Route = createFileRoute("/hardcore")({
  head: () => ({ meta: [{ title: "Hardcore Mode — Unloop" }] }),
  component: Hardcore,
});

const LEVELS: { id: HardcoreLevel; label: string; desc: string }[] = [
  { id: "Gentle",   label: "Gentle",   desc: "Light nudges. No blocking." },
  { id: "Balanced", label: "Balanced", desc: "Gentle interventions and reminders." },
  { id: "Strict",   label: "Strong",   desc: "Aggressive blocking and reflection screens." },
  { id: "Extreme",  label: "Extreme",  desc: "No bypass until tomorrow." },
];

function Hardcore() {
  const { state, update } = useHardcore();
  const [open, setOpen] = useState(false);
  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader
        title="Hardcore Mode"
        back="/"
        right={
          <button
            onClick={() => update({ enabled: !state.enabled })}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${state.enabled ? "bg-gradient-flame" : "bg-muted"}`}
            aria-label={state.enabled ? "Disable Hardcore Mode" : "Enable Hardcore Mode"}
          >
            <motion.div animate={{ x: state.enabled ? 20 : 0 }} className="w-5 h-5 rounded-full bg-white shadow-soft" />
          </button>
        }
      />

      <section className="mx-5 rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full p-4 flex items-center justify-between active:bg-accent/40 transition-colors"
        >
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="text-base font-bold">{LEVELS.find((l) => l.id === state.level)?.label ?? state.level}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {LEVELS.find((l) => l.id === state.level)?.desc}
            </p>
          </div>
          <span className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
        {open && (
          <div className="border-t border-border/60 divide-y divide-border/60">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  update({ level: l.id });
                  setOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm flex items-start justify-between gap-3 hover:bg-accent/40 transition-colors ${
                  l.id === state.level ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm">{l.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{l.desc}</p>
                </div>
                {l.id === state.level && <span className="text-primary mt-0.5">✓</span>}
              </button>
            ))}
          </div>
        )}
      </section>


      <section className="mx-5 mt-4 space-y-3">
        <ToggleRow icon={<Lock className="w-5 h-5" />} title="App Blocking" desc="Block distracting apps" on={state.block} set={(v) => update({ block: v })} />
        <ToggleRow icon={<ShieldAlert className="w-5 h-5" />} title="Strict Limit Lock" desc="No bypass until tomorrow" on={state.strict} set={(v) => update({ strict: v })} />
        <ToggleRow icon={<BrainCircuit className="w-5 h-5" />} title="Reflection Required" desc="Answer before unlocking" on={state.reflect} set={(v) => update({ reflect: v })} />
        <ToggleRow icon={<Hourglass className="w-5 h-5" />} title="Delay Access" desc="15 min wait to bypass" on={state.delay} set={(v) => update({ delay: v })} />
      </section>


      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-5 rounded-3xl bg-gradient-sunrise border border-amber/30 p-5 flex items-center gap-3 relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="w-12 h-12 rounded-2xl bg-gradient-flame flex items-center justify-center shadow-glow relative">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div className="relative">
          <p className="text-base font-bold">Hard days build</p>
          <p className="text-base font-bold text-gradient-flame">strong minds.</p>
        </div>
      </motion.section>
    </AppShell>
  );
}

function ToggleRow({ icon, title, desc, on, set }: { icon: React.ReactNode; title: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => set(!on)}
        className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? "bg-gradient-flame" : "bg-muted"}`}
      >
        <motion.div animate={{ x: on ? 20 : 0 }} className="w-5 h-5 rounded-full bg-white shadow-soft" />
      </button>
    </div>
  );
}
