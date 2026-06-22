/**
 * Brain personality — Phase D.2.
 *
 * Per-stage motivational message banks + a tiny picker that never repeats
 * the same message twice in a row. Mirrored on the native side in
 * BrainStage.kt; if you add/remove a message here, update there too so
 * the overlay stays in sync with the in-app voice.
 */
import { useEffect, useRef, useState } from "react";
import type { BrainStageId } from "@/lib/brain-stage";

export const BRAIN_MESSAGES: Record<BrainStageId, readonly string[]> = {
  energized: [
    "Great start today!",
    "Your focus is strong.",
    "Fresh mind, big day ahead.",
    "You're in the zone.",
  ],
  focused: [
    "You're staying in control.",
    "Keep the momentum.",
    "Sharp and steady — nice.",
    "Eyes on the prize.",
  ],
  tired: [
    "Maybe take a short break.",
    "Your attention is fading.",
    "A pause would help right now.",
    "Stretch, breathe, reset.",
  ],
  brain_rot: [
    "You've been scrolling for a while.",
    "Your focus is slipping.",
    "Time to come up for air.",
    "The feed is winning right now.",
  ],
  zombie: [
    "Time to step away.",
    "Your brain needs recovery.",
    "Close the app and breathe.",
    "Tomorrow's you will thank you.",
  ],
} as const;

/**
 * Pick a stage message that differs from [last]. Falls back to the only
 * message if the bank is a single entry, or to the first if [last] is null.
 */
export function pickBrainMessage(stage: BrainStageId, last: string | null): string {
  const bank = BRAIN_MESSAGES[stage];
  if (bank.length === 0) return "";
  if (bank.length === 1) return bank[0];
  const pool = last ? bank.filter((m) => m !== last) : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Reactive personality message for a given stage.
 * - Re-picks immediately when the stage changes.
 * - Rotates every [rotateMs] while the stage holds (default 14s).
 * - Never repeats the previous message back-to-back.
 */
export function useBrainMessage(stage: BrainStageId, rotateMs = 14_000): string {
  const lastRef = useRef<string | null>(null);
  const [msg, setMsg] = useState<string>(() => {
    const m = BRAIN_MESSAGES[stage][0] ?? "";
    lastRef.current = m;
    return m;
  });

  useEffect(() => {
    const m = pickBrainMessage(stage, lastRef.current);
    lastRef.current = m;
    setMsg(m);
    const id = window.setInterval(() => {
      const next = pickBrainMessage(stage, lastRef.current);
      lastRef.current = next;
      setMsg(next);
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [stage, rotateMs]);

  return msg;
}
