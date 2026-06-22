import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Trophy, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { useMilestones } from "@/lib/milestones";

export const Route = createFileRoute("/milestones")({
  head: () => ({ meta: [{ title: "Milestones — Unloop" }] }),
  component: Milestones,
});

function Milestones() {
  const [filter, setFilter] = useState<"All" | "Locked" | "Unlocked">("All");
  const milestones = useMilestones();
  const filtered = useMemo(
    () => milestones.filter((m) => filter === "All" ? true : filter === "Locked" ? !m.unlocked : m.unlocked),
    [milestones, filter],
  );
  const unlockedCount = milestones.filter((m) => m.unlocked).length;

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Milestones" back="/journey" />

      <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Progress</p>
          <p className="text-3xl font-bold mt-1">{unlockedCount}<span className="text-base text-muted-foreground font-medium"> / {milestones.length}</span></p>
          <p className="text-sm text-muted-foreground">Milestones Unlocked</p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-sunrise flex items-center justify-center">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
      </section>

      <div className="mx-5 mt-4 flex gap-2 p-1 rounded-2xl bg-muted">
        {(["All", "Locked", "Unlocked"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${filter === t ? "bg-card shadow-soft" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="mx-5 mt-4 space-y-3">
        {filtered.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
            className={`rounded-2xl border p-4 flex items-center gap-3 ${m.unlocked ? "bg-card border-border/60 shadow-soft" : "bg-muted/40 border-border/40"}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${m.unlocked ? "bg-gradient-sunrise" : "bg-muted"}`}>
              {m.unlocked ? m.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${m.unlocked ? "" : "text-muted-foreground"}`}>{m.title}</p>
              <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
              {!m.unlocked && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-flame transition-[width]"
                    style={{ width: `${Math.round(m.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
            {m.unlocked && <span className="text-success text-lg">✓</span>}
          </motion.div>
        ))}
      </section>
    </AppShell>
  );
}
