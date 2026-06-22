/**
 * Brain evolution stages — single source of truth shared with the native
 * Android overlay (mirrored in android/.../native/BrainStage.kt). When you
 * change a threshold here, change it there too.
 *
 *   0–25    Energized
 *   26–50   Focused
 *   51–100  Tired
 *   101–150 Brain Rot
 *   151+    Zombie
 */
export type BrainStageId = "energized" | "focused" | "tired" | "brain_rot" | "zombie";

export interface BrainStage {
  id: BrainStageId;
  label: string;
  emoji: string;
  min: number;
  max: number; // inclusive; Infinity for the last bucket
}

export const BRAIN_STAGES: readonly BrainStage[] = [
  { id: "energized", label: "Energized", emoji: "⚡", min: 0,   max: 25 },
  { id: "focused",   label: "Focused",   emoji: "🎯", min: 26,  max: 50 },
  { id: "tired",     label: "Tired",     emoji: "😴", min: 51,  max: 100 },
  { id: "brain_rot", label: "Brain Rot", emoji: "🧠", min: 101, max: 150 },
  { id: "zombie",    label: "Zombie",    emoji: "🧟", min: 151, max: Number.POSITIVE_INFINITY },
] as const;

export function brainStageFor(reelsToday: number): BrainStage {
  const n = Math.max(0, Math.floor(reelsToday));
  for (const s of BRAIN_STAGES) if (n >= s.min && n <= s.max) return s;
  return BRAIN_STAGES[BRAIN_STAGES.length - 1];
}
