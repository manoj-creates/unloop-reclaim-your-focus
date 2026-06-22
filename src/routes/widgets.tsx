import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { WidgetPreview } from "@/components/WidgetPreview";
import {
  WIDGETS,
  DEFAULT_CONFIG,
  getInstalled,
  type InstalledWidget,
  type WidgetId,
} from "@/lib/widget-types";
import { Check, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/widgets")({
  head: () => ({ meta: [{ title: "Widget Studio — Unloop" }] }),
  component: Widgets,
});

type Cat = "All" | "Productivity" | "Motivation" | "Installed";

function Widgets() {
  const [cat, setCat] = useState<Cat>("All");
  const [installed, setInstalled] = useState<InstalledWidget[]>([]);

  useEffect(() => {
    setInstalled(getInstalled());
    const onStorage = () => setInstalled(getInstalled());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const installedIds = useMemo(() => new Set(installed.map((w) => w.id)), [installed]);

  const list = useMemo(() => {
    if (cat === "Installed") return WIDGETS.filter((w) => installedIds.has(w.id));
    if (cat === "All") return WIDGETS;
    return WIDGETS.filter((w) => w.category === cat);
  }, [cat, installedIds]);

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader
        title="Widget Studio"
        right={
          <Link to="/widgets" className="text-primary text-sm font-semibold">
            {installed.length}/{WIDGETS.length}
          </Link>
        }
      />

      {/* Hero */}
      <section className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 text-white shadow-glow relative overflow-hidden"
          style={{ background: "var(--gradient-flame)" }}
        >
          <div className="flex items-center gap-2 text-white/90 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Widget Studio
          </div>
          <h2 className="text-2xl font-bold mt-2 leading-tight">Design your focus on your Home Screen.</h2>
          <p className="text-white/85 text-sm mt-2 max-w-[80%]">
            Six premium widgets, three sizes, fully themable. Tap any widget to customize and install.
          </p>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        </motion.div>
      </section>

      {/* Tabs */}
      <div className="mx-5 mt-4 flex gap-1 p-1 rounded-2xl bg-muted">
        {(["All", "Productivity", "Motivation", "Installed"] as Cat[]).map((t) => (
          <button
            key={t}
            onClick={() => setCat(t)}
            className={`flex-1 py-2 text-[12px] font-semibold rounded-xl transition ${
              cat === t ? "bg-card shadow-soft" : "text-muted-foreground"
            }`}
          >
            {t}
            {t === "Installed" && installed.length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">{installed.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Gallery */}
      <section className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {list.map((w, i) => {
            const inst = installed.find((x) => x.id === w.id);
            const cfg = inst?.config ?? { ...DEFAULT_CONFIG, theme: w.defaultTheme, size: "Small" };
            return (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.32, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to="/widget-customize"
                  search={{ id: w.id }}
                  className="block rounded-3xl bg-card border border-border/60 shadow-soft p-3 hover:shadow-card transition-shadow"
                >
                  <div className="rounded-2xl bg-surface/60 flex items-center justify-center relative" style={{ height: 170 }}>
                    {w.pro && (
                      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-gradient-flame text-white shadow-soft">
                        ★ PRO
                      </span>
                    )}
                    <div style={{ transform: "scale(0.92)" }}>
                      <WidgetPreview id={w.id} config={{ ...cfg, size: "Small" }} />
                    </div>
                  </div>
                  <div className="mt-3 px-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{w.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{w.tagline}</p>
                    </div>
                    {installedIds.has(w.id) ? (
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </section>

      {list.length === 0 && (
        <div className="mx-5 mt-8 text-center text-sm text-muted-foreground">
          No widgets installed yet. Tap any widget to customize.
        </div>
      )}

      <div className="h-6" />
    </AppShell>
  );
}
