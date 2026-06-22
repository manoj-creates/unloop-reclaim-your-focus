import { useMemo } from "react";
import { useLiveStats, type LiveStats } from "./live-stats";

export type Milestone = {
  key: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  progress: number;   // 0..1
  goal: number;
  current: number;
  unit: string;
};

export function deriveMilestones(s: LiveStats): Milestone[] {
  const defs: Array<Omit<Milestone, "unlocked" | "progress"> & { test: number }> = [
    { key: "first",       title: "First Step",         desc: "Complete onboarding",        icon: "🏆", goal: 1,    current: 1,                                    unit: "step",     test: 1 },
    { key: "streak3",     title: "3 Day Streak",       desc: "Stay consistent for 3 days", icon: "🔥", goal: 3,    current: Math.min(s.bestStreak, 3),            unit: "days",     test: s.bestStreak >= 3 ? 1 : 0 },
    { key: "streak7",     title: "7 Day Streak",       desc: "A full week of focus",       icon: "🌟", goal: 7,    current: Math.min(s.bestStreak, 7),            unit: "days",     test: s.bestStreak >= 7 ? 1 : 0 },
    { key: "saved600",    title: "Focus Master",       desc: "Save 10 hours in a week",    icon: "🧘", goal: 36000, current: Math.min(s.timeSavedWeekSec, 36000), unit: "sec/week", test: s.timeSavedWeekSec >= 36000 ? 1 : 0 },
    { key: "streak30",    title: "30 Day Streak",      desc: "A full month of focus",      icon: "💎", goal: 30,   current: Math.min(s.bestStreak, 30),           unit: "days",     test: s.bestStreak >= 30 ? 1 : 0 },
    { key: "saved60000",  title: "1000 Minutes Saved", desc: "Reclaim a full day",         icon: "⏰", goal: 60000, current: Math.min(s.timeSavedAllTimeSec, 60000), unit: "sec",   test: s.timeSavedAllTimeSec >= 60000 ? 1 : 0 },
    { key: "avoided1000", title: "Reel Slayer",        desc: "Avoid 1,000 reels",          icon: "🛡️", goal: 1000, current: Math.min(s.reelsAvoidedAllTime, 1000), unit: "reels",  test: s.reelsAvoidedAllTime >= 1000 ? 1 : 0 },
    { key: "focus85",     title: "Sharp Mind",         desc: "Average focus score ≥ 85",   icon: "🧠", goal: 85,   current: Math.min(s.avgFocusScore, 85),         unit: "score",   test: s.avgFocusScore >= 85 ? 1 : 0 },
  ];
  return defs.map(({ test, ...m }) => ({
    ...m,
    unlocked: test === 1,
    progress: Math.min(1, m.current / m.goal),
  }));
}

export function useMilestones(): Milestone[] {
  const stats = useLiveStats();
  return useMemo(() => deriveMilestones(stats), [stats]);
}
