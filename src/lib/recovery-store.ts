/**
 * Recovery store — Phase D.3.
 *
 * Tracks recovery activities the user completes after their brain enters
 * the "Brain Rot" / "Zombie" stages (and offers them at any time as a
 * proactive reset). Each completed activity restores brain "energy"
 * points used by analytics and the Journey screen.
 *
 * Storage: localStorage, keyed by RECOVERY_KEY. Sessions list is capped
 * to the last 60 days to keep the payload bounded.
 */
import { useCallback, useEffect, useState } from "react";
import { isPreviewMode } from "@/lib/preview-mode";

const RECOVERY_KEY = "unloop.recovery.v1";
const KEEP_DAYS = 60;

export type RecoveryActivityId =
  | "breathing"
  | "water"
  | "walk"
  | "read"
  | "focus_timer";

export interface RecoveryActivityDef {
  id: RecoveryActivityId;
  name: string;
  blurb: string;
  emoji: string;
  /** Seconds the timed activity runs for. 0 = instant confirmation. */
  durationSec: number;
  /** Brain energy points restored on successful completion (0–100 scale). */
  energyRestored: number;
  /** Tailwind gradient classes for activity card. */
  gradient: string;
  /** Short instruction line shown during the activity. */
  instruction: string;
}

export const RECOVERY_ACTIVITIES: readonly RecoveryActivityDef[] = [
  {
    id: "breathing",
    name: "Breathing exercise",
    blurb: "2 minutes of box breathing to calm the nervous system.",
    emoji: "🌬️",
    durationSec: 120,
    energyRestored: 25,
    gradient: "from-sky-400 to-blue-500",
    instruction: "Inhale 4 · hold 4 · exhale 4 · hold 4. Repeat.",
  },
  {
    id: "water",
    name: "Drink some water",
    blurb: "A quick hydration reset — confirm when done.",
    emoji: "💧",
    durationSec: 0,
    energyRestored: 10,
    gradient: "from-cyan-400 to-sky-500",
    instruction: "Grab a glass of water and finish it before tapping done.",
  },
  {
    id: "walk",
    name: "Stand up and walk",
    blurb: "Three minutes of light movement to reset posture.",
    emoji: "🚶",
    durationSec: 180,
    energyRestored: 20,
    gradient: "from-emerald-400 to-teal-500",
    instruction: "Walk anywhere — even just around the room.",
  },
  {
    id: "read",
    name: "Read for 5 minutes",
    blurb: "Anything offline — a book, an article, a note.",
    emoji: "📖",
    durationSec: 300,
    energyRestored: 30,
    gradient: "from-amber-400 to-orange-500",
    instruction: "Pick something to read and let the timer run.",
  },
  {
    id: "focus_timer",
    name: "Focus timer",
    blurb: "A 10-minute deep focus block to rebuild attention.",
    emoji: "🎯",
    durationSec: 600,
    energyRestored: 35,
    gradient: "from-violet-500 to-fuchsia-500",
    instruction: "Pick one task, put the phone away, and start.",
  },
] as const;

export function activityById(id: RecoveryActivityId): RecoveryActivityDef {
  return RECOVERY_ACTIVITIES.find((a) => a.id === id) ?? RECOVERY_ACTIVITIES[0];
}

export type RecoverySession = {
  id: string;
  activityId: RecoveryActivityId;
  /** YYYY-MM-DD for cheap per-day filtering. */
  date: string;
  ts: number;
  energyRestored: number;
};

export type RecoveryState = {
  sessions: RecoverySession[];
  streakDays: number;
  bestStreakDays: number;
  lastSessionDate: string | null;
};

const empty = (): RecoveryState => ({
  sessions: [],
  streakDays: 0,
  bestStreakDays: 0,
  lastSessionDate: null,
});

const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const yesterdayKey = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return todayKey(d);
};

const read = (): RecoveryState => {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<RecoveryState>;
    return {
      ...empty(),
      ...parsed,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return empty();
  }
};

const write = (s: RecoveryState) => {
  try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(s)); } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unloop:recovery", { detail: s }));
  }
};

const pruneSessions = (sessions: RecoverySession[]): RecoverySession[] => {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => s.ts >= cutoff);
};

/**
 * Record a completed activity. Updates the daily streak with day-gap logic:
 * - same day as last       → no streak change
 * - yesterday               → streak + 1
 * - older / never           → streak reset to 1
 */
export function completeActivity(id: RecoveryActivityId): RecoverySession {
  const def = activityById(id);
  const cur = read();
  const today = todayKey();
  const session: RecoverySession = {
    id: `${today}-${Date.now()}`,
    activityId: id,
    date: today,
    ts: Date.now(),
    energyRestored: def.energyRestored,
  };
  let streakDays = cur.streakDays;
  if (cur.lastSessionDate === today) {
    // already counted toward today's streak
  } else if (cur.lastSessionDate === yesterdayKey()) {
    streakDays = cur.streakDays + 1;
  } else {
    streakDays = 1;
  }
  const next: RecoveryState = {
    sessions: pruneSessions([...cur.sessions, session]),
    streakDays,
    bestStreakDays: Math.max(cur.bestStreakDays, streakDays),
    lastSessionDate: today,
  };
  write(next);
  return session;
}

/** Sessions completed today. */
export function todaySessions(state: RecoveryState): RecoverySession[] {
  const today = todayKey();
  return state.sessions.filter((s) => s.date === today);
}

/** Total energy restored today (clamped to 0–100). */
export function todayEnergyRestored(state: RecoveryState): number {
  const sum = todaySessions(state).reduce((a, s) => a + s.energyRestored, 0);
  return Math.min(100, sum);
}

/** Total energy restored across all retained sessions. */
export function lifetimeEnergyRestored(state: RecoveryState): number {
  return state.sessions.reduce((a, s) => a + s.energyRestored, 0);
}

export function useRecoveryStore() {
  const [state, setState] = useState<RecoveryState>(empty);
  useEffect(() => {
    if (isPreviewMode()) {
      const today = todayKey();
      const now = Date.now();
      setState({
        sessions: [
          { id: `${today}-breathing`, activityId: "breathing", date: today, ts: now - 7_200_000, energyRestored: 25 },
          { id: `${today}-walk`, activityId: "walk", date: today, ts: now - 3_600_000, energyRestored: 20 },
          { id: `${today}-read`, activityId: "read", date: today, ts: now - 900_000, energyRestored: 33 },
        ],
        streakDays: 14,
        bestStreakDays: 14,
        lastSessionDate: today,
      });
      return;
    }
    setState(read());
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<RecoveryState>).detail;
      if (detail) setState(detail);
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === RECOVERY_KEY) setState(read());
    };
    window.addEventListener("unloop:recovery", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("unloop:recovery", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const complete = useCallback((id: RecoveryActivityId) => {
    const session = completeActivity(id);
    setState(read());
    return session;
  }, []);

  return {
    state,
    complete,
    todaySessions: todaySessions(state),
    todayEnergyRestored: todayEnergyRestored(state),
    lifetimeEnergyRestored: lifetimeEnergyRestored(state),
  };
}

/**
 * Recovery becomes "available" once the user has hit the warning
 * threshold today (>= 150 reels = Brain Rot / Zombie territory).
 */
export const RECOVERY_TRIGGER_REELS = 150;
export function isRecoveryAvailable(reelsToday: number): boolean {
  return reelsToday >= RECOVERY_TRIGGER_REELS;
}
