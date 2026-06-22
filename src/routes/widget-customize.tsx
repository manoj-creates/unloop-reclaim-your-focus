import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { WidgetPreview } from "@/components/WidgetPreview";
import {
  DEFAULT_CONFIG,
  WIDGETS,
  getInstalled,
  installWidget,
  uninstallWidget,
  type WidgetConfig,
  type WidgetId,
  type WidgetSize,
  type WidgetTheme,
} from "@/lib/widget-types";
import { Check, Trash2 } from "lucide-react";
import { z } from "zod";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/widget-customize")({
  head: () => ({ meta: [{ title: "Customize Widget — Unloop" }] }),
  validateSearch: search,
  component: Customize,
});

function Customize() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const widget = WIDGETS.find((w) => w.id === (id as WidgetId)) ?? WIDGETS[0];
  const existing = useMemo(() => getInstalled().find((w) => w.id === widget.id), [widget.id]);

  const [config, setConfig] = useState<WidgetConfig>(
    existing?.config ?? { ...DEFAULT_CONFIG, theme: widget.defaultTheme }
  );

  const installed = !!existing;

  const update = <K extends keyof WidgetConfig>(k: K, v: WidgetConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title={widget.name} back="/widgets" />

      <div className="px-5">
        <p className="text-sm text-muted-foreground">{widget.tagline}</p>
      </div>

      {/* Live preview canvas */}
      <section className="mx-5 mt-4 rounded-3xl bg-gradient-sunrise border border-border/60 shadow-soft overflow-hidden">
        <div
          className="relative flex items-center justify-center"
          style={{ minHeight: config.size === "Large" ? 380 : 240, padding: 24 }}
        >
          <motion.div
            key={`${config.size}-${config.theme}-${config.radius}-${config.compact}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <WidgetPreview id={widget.id} config={config} />
          </motion.div>
        </div>
        <div className="px-5 py-3 border-t border-border/60 text-[11px] text-muted-foreground uppercase tracking-wider text-center">
          Home Screen preview
        </div>
      </section>

      {/* Size */}
      <Section title="Size">
        <div className="flex gap-2 p-1 rounded-2xl bg-muted">
          {(["Small", "Medium", "Large"] as WidgetSize[]).map((s) => (
            <button
              key={s}
              onClick={() => update("size", s)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
                config.size === s ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {(["Light", "Dark", "Gradient"] as WidgetTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => update("theme", t)}
              className={`rounded-2xl p-3 border-2 transition ${
                config.theme === t ? "border-primary shadow-soft" : "border-border bg-card"
              }`}
            >
              <div
                className="h-12 w-full rounded-xl mb-2"
                style={{
                  background:
                    t === "Light" ? "#fafafa" : t === "Dark" ? "#0d0d0f" : "var(--gradient-flame)",
                  border: t === "Light" ? "1px solid var(--border)" : undefined,
                }}
              />
              <p className="text-xs font-semibold text-center">{t}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* Rounded corners */}
      <Section title="Corner radius" trailing={`${config.radius}px`}>
        <input
          type="range"
          min={8}
          max={44}
          value={config.radius}
          onChange={(e) => update("radius", +e.target.value)}
          className="w-full accent-primary"
        />
      </Section>

      {/* Compact */}
      <Section title="Compact mode" trailing="">
        <button
          onClick={() => update("compact", !config.compact)}
          className="w-full flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 py-3"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Reduce padding</p>
            <p className="text-[11px] text-muted-foreground">Tighter layout, more data visible</p>
          </div>
          <span
            className={`relative w-11 h-6 rounded-full transition ${
              config.compact ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                config.compact ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </Section>

      {/* Actions */}
      <div className="mx-5 mt-6 flex gap-3">
        {installed && (
          <button
            onClick={() => {
              uninstallWidget(widget.id);
              navigate({ to: "/widgets" });
            }}
            className="h-14 px-4 rounded-2xl bg-card border border-border text-destructive flex items-center justify-center"
            aria-label="Remove widget"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => {
            installWidget(widget.id, config);
            navigate({ to: "/widgets" });
          }}
          className="flex-1 h-14 rounded-2xl bg-gradient-flame text-white font-semibold shadow-glow flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          {installed ? "Update Widget" : "Add to Home Screen"}
        </button>
      </div>

      <div className="h-6" />
    </AppShell>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-5 mt-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
        {trailing && <p className="text-[11px] text-muted-foreground">{trailing}</p>}
      </div>
      {children}
    </section>
  );
}
