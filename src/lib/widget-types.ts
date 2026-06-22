import { isPreviewMode } from "@/lib/preview-mode";

export type WidgetSize = "Small" | "Medium" | "Large";
export type WidgetTheme = "Light" | "Dark" | "Gradient";
export type WidgetId =
  | "focus"
  | "limit"
  | "saved"
  | "streak"
  | "insight"
  | "motivation";

export interface WidgetMeta {
  id: WidgetId;
  name: string;
  tagline: string;
  category: "Productivity" | "Motivation";
  defaultTheme: WidgetTheme;
  /** Premium-only widget — surfaces a PRO badge in the gallery. */
  pro?: boolean;
}

export const WIDGETS: WidgetMeta[] = [
  { id: "focus", name: "Focus Score XL", tagline: "Your daily focus rating", category: "Productivity", defaultTheme: "Light", pro: true },
  { id: "limit", name: "Daily Limit", tagline: "Track your screen time cap", category: "Productivity", defaultTheme: "Light" },
  { id: "saved", name: "Time Saved", tagline: "Hours reclaimed today", category: "Productivity", defaultTheme: "Gradient" },
  { id: "streak", name: "Streak", tagline: "Consecutive focused days", category: "Productivity", defaultTheme: "Gradient" },
  { id: "insight", name: "AI Insight Widget", tagline: "Smart daily nudge", category: "Motivation", defaultTheme: "Light", pro: true },
  { id: "motivation", name: "Motivation", tagline: "Quotes that move you", category: "Motivation", defaultTheme: "Dark" },
];

export interface WidgetConfig {
  size: WidgetSize;
  theme: WidgetTheme;
  radius: number; // px
  compact: boolean;
}

export const DEFAULT_CONFIG: WidgetConfig = {
  size: "Medium",
  theme: "Light",
  radius: 28,
  compact: false,
};

const KEY = "unloop:widgets:installed:v1";

export interface InstalledWidget {
  id: WidgetId;
  config: WidgetConfig;
  installedAt: number;
}

export function getInstalled(): InstalledWidget[] {
  if (typeof window === "undefined") return [];
  if (isPreviewMode()) {
    const now = Date.now();
    return WIDGETS.map((w, i) => ({
      id: w.id,
      config: { ...DEFAULT_CONFIG, theme: w.defaultTheme, size: "Small" },
      installedAt: now - i * 86_400_000,
    }));
  }
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function setInstalled(list: InstalledWidget[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function installWidget(id: WidgetId, config: WidgetConfig) {
  const list = getInstalled();
  const idx = list.findIndex((w) => w.id === id);
  const item: InstalledWidget = { id, config, installedAt: Date.now() };
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  setInstalled(list);
}

export function uninstallWidget(id: WidgetId) {
  setInstalled(getInstalled().filter((w) => w.id !== id));
}
