import { motion } from "motion/react";
import { Sparkles, Flame, Clock, TrendingDown, Quote, Target } from "lucide-react";
import { FocusRing } from "@/components/FocusRing";
import { useLiveStats, formatDuration, focusLabel } from "@/lib/live-stats";
import type { WidgetConfig, WidgetId, WidgetSize, WidgetTheme } from "@/lib/widget-types";

const SIZE_DIMS: Record<WidgetSize, { w: number; h: number; cols: number }> = {
  Small: { w: 160, h: 160, cols: 1 },
  Medium: { w: 340, h: 160, cols: 2 },
  Large: { w: 340, h: 340, cols: 2 },
};

export function widgetDims(size: WidgetSize) {
  return SIZE_DIMS[size];
}

function themeStyles(theme: WidgetTheme): React.CSSProperties {
  switch (theme) {
    case "Dark":
      return { background: "#0d0d0f", color: "#fafafa" };
    case "Gradient":
      return { background: "var(--gradient-flame)", color: "#fff" };
    case "Light":
    default:
      return { background: "var(--card)", color: "var(--foreground)" };
  }
}

function mutedColor(theme: WidgetTheme) {
  return theme === "Light" ? "var(--muted-foreground)" : "rgba(255,255,255,0.75)";
}

export function WidgetPreview({
  id,
  config,
  scale = 1,
  interactive = false,
}: {
  id: WidgetId;
  config: WidgetConfig;
  scale?: number;
  interactive?: boolean;
}) {
  const { w, h } = SIZE_DIMS[config.size];
  const style: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: config.radius,
    padding: config.compact ? 12 : 18,
    ...themeStyles(config.theme),
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    boxShadow: "0 18px 40px -16px rgba(20,12,8,0.25), 0 2px 6px rgba(20,12,8,0.06)",
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={style}
      className="relative overflow-hidden flex flex-col"
    >
      <WidgetBody id={id} config={config} />
    </motion.div>
  );
}

function WidgetBody({ id, config }: { id: WidgetId; config: WidgetConfig }) {
  const muted = mutedColor(config.theme);
  const isSmall = config.size === "Small";
  const isLarge = config.size === "Large";
  const stats = useLiveStats();

  switch (id) {
    case "focus": {
      const ringSize = isSmall ? 90 : isLarge ? 170 : 110;
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <FocusRing value={stats.focusScore} size={ringSize} stroke={isLarge ? 14 : 9} big={`${stats.focusScore}`} />
          <p className="text-[11px] font-semibold mt-1 uppercase tracking-wider">Focus</p>
          {!isSmall && <p className="text-[11px]" style={{ color: muted }}>{focusLabel(stats.focusScore)}</p>}
        </div>
      );
    }
    case "limit": {
      const used = stats.usedPercent;
      return (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 opacity-80" />
            <p className="text-[11px] uppercase tracking-wider font-semibold">Daily Limit</p>
          </div>
          <div>
            <p className={`font-bold ${isSmall ? "text-xl" : "text-3xl"}`}>{stats.reelsToday}<span className="text-sm font-medium opacity-70"> reels</span></p>
            <p className="text-[11px]" style={{ color: muted }}>of {stats.dailyLimitReels} daily</p>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }}>
              <div className="h-full rounded-full" style={{ width: `${used}%`, background: config.theme === "Light" ? "var(--primary)" : "#fff" }} />
            </div>
          </div>
        </div>
      );
    }
    case "saved":
      return (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 opacity-90" />
            <p className="text-[11px] uppercase tracking-wider font-semibold">Time Saved</p>
          </div>
          <div>
            <p className={`font-bold leading-none ${isSmall ? "text-2xl" : "text-4xl"}`}>{formatDuration(stats.timeSavedTodaySec)}</p>
            <p className="text-[11px] mt-1" style={{ color: muted }}>Today • {formatDuration(stats.timeSavedWeekSec)} this week</p>
          </div>
        </div>
      );
    case "streak":
      return (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            <p className="text-[11px] uppercase tracking-wider font-semibold">Streak</p>
          </div>
          <div>
            <p className={`font-bold leading-none ${isSmall ? "text-3xl" : "text-5xl"}`}>{stats.streak}</p>
            <p className="text-[11px] mt-1" style={{ color: muted }}>days • best {stats.bestStreak}</p>
          </div>
        </div>
      );

    case "insight":
      return (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 opacity-90" />
            <p className="text-[11px] uppercase tracking-wider font-semibold">AI Insight</p>
          </div>
          <div>
            <p className={`font-bold leading-snug ${isSmall ? "text-xs" : isLarge ? "text-lg" : "text-sm"}`}>
              You scroll 3× more on weekends. Try a Sunday focus block.
            </p>
            {!isSmall && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: muted }}>
                <TrendingDown className="w-3 h-3" /> Weekend dip detected
              </div>
            )}
          </div>
        </div>
      );
    case "motivation":
      return (
        <div className="flex-1 flex flex-col justify-between">
          <Quote className="w-4 h-4 opacity-80" />
          <div>
            <p className={`font-bold leading-snug ${isSmall ? "text-sm" : isLarge ? "text-2xl" : "text-base"}`}>
              Discipline today, freedom tomorrow.
            </p>
            {!isSmall && <p className="text-[11px] mt-2" style={{ color: muted }}>— Unloop daily</p>}
          </div>
        </div>
      );
  }
}
