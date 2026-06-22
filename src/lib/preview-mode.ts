/**
 * Marketing preview mode.
 *
 * When a route is loaded with `?preview=1`, every data hook in the app
 * returns a curated set of "successful user" demo values so the actual
 * app screens (embedded in the landing page iframes) look populated and
 * persuasive — without ever writing to the real user's localStorage.
 *
 * No mutations. Pure read-time overrides.
 */

export function isPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("preview") === "1") return true;
    if (window.location.hash.includes("preview=1")) return true;
    return false;
  } catch {
    return false;
  }
}

// ---- Reels (today) ----
// Total: 32. Split across the three India-first platforms.
export const PREVIEW_REELS_TODAY = {
  instagram: 20,
  youtube: 8,
  facebook: 4,
  tiktok: 0,
};

// ---- LiveStats hard-coded preview values ----
// Numbers come from the marketing brief. We bypass the derive logic so the
// shown values match exactly what the user expects on the landing page.
import type { LiveStats } from "@/lib/live-stats";

export const PREVIEW_LIVE_STATS: LiveStats = {
  reelsToday: 32,
  dailyLimitReels: 150,
  usedPercent: 21,
  focusScore: 82,
  focusStatus: "Excellent Focus",
  focusBuilding: false,
  reelsAvoidedToday: 118,
  // 2h 14m today
  timeSavedTodaySec: 2 * 3600 + 14 * 60,
  reelsThisWeek: 455,
  // 9h 30m this week
  timeSavedWeekSec: 9 * 3600 + 30 * 60,
  reelsAllTime: 1247,
  reelsAvoidedAllTime: 1247,
  // 47h lifetime
  timeSavedAllTimeSec: 47 * 3600,
  avgFocusScore: 78,
  streak: 14,
  bestStreak: 14,
  activeDays: 47,
};

// ---- User profile ----
export const PREVIEW_PROFILE = {
  name: "Aarav Mehta",
  email: "aarav@unloop.app",
  avatarUrl: undefined as string | undefined,
  initials: "AM",
  // 47 days ago
  joinDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() - 47);
    return d;
  })(),
};

// ---- Onboarding-derived overrides ----
export const PREVIEW_ONBOARDING = {
  apps: [
    "instagram",
    "youtube",
    "facebook",
    "snapchat",
    "x",
    "linkedin",
    "telegram",
  ],
  dailyLimit: 150,
};

// ---- Profile pro flag ----
export const PREVIEW_IS_PRO = true;
