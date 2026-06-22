import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { X, Zap, Clock, AlertTriangle, Brain } from "lucide-react";

export type BrainStage = 1 | 2 | 3 | 4 | 5 | 6;

export function getBrainStage(reels: number): BrainStage {
  if (reels <= 25) return 1;
  if (reels <= 50) return 2;
  if (reels <= 100) return 3;
  if (reels <= 150) return 4;
  if (reels <= 250) return 5;
  return 6;
}

type StageMeta = {
  label: string;
  range: string;
  bodyFrom: string;
  bodyTo: string;
  aura: string;
  energy: number; // 0-100
  bar: string;
  ring: string;
  tilt: number;
  pulse: boolean;
  warn: boolean;
  message: string;
};

export const STAGES: Record<BrainStage, StageMeta> = {
  1: {
    label: "Energized",
    range: "0–25 reels",
    bodyFrom: "#FFD18A",
    bodyTo: "#FF7A1A",
    aura: "rgba(255,150,60,0.55)",
    energy: 100,
    bar: "linear-gradient(90deg,#FFD18A,#FF7A1A)",
    ring: "rgba(255,138,40,0.35)",
    tilt: 0,
    pulse: false,
    warn: false,
    message: "Your mind is fresh and focused.",
  },
  2: {
    label: "Focused",
    range: "26–50 reels",
    bodyFrom: "#FFC79A",
    bodyTo: "#FF933A",
    aura: "rgba(255,160,80,0.4)",
    energy: 80,
    bar: "linear-gradient(90deg,#FFC79A,#FF8A3A)",
    ring: "rgba(255,138,40,0.28)",
    tilt: -2,
    pulse: false,
    warn: false,
    message: "Great control today.",
  },
  3: {
    label: "Tired",
    range: "51–100 reels",
    bodyFrom: "#F0B080",
    bodyTo: "#E07A30",
    aura: "rgba(230,120,40,0.35)",
    energy: 60,
    bar: "linear-gradient(90deg,#F2B280,#E07A30)",
    ring: "rgba(220,110,30,0.25)",
    tilt: -4,
    pulse: false,
    warn: false,
    message: "Maybe take a short break.",
  },
  4: {
    label: "Exhausted",
    range: "101–150 reels",
    bodyFrom: "#E89980",
    bodyTo: "#D85A3A",
    aura: "rgba(220,80,60,0.45)",
    energy: 40,
    bar: "linear-gradient(90deg,#F1A78F,#D9523A)",
    ring: "rgba(220,60,40,0.35)",
    tilt: -6,
    pulse: false,
    warn: true,
    message: "You've been scrolling for a while.",
  },
  5: {
    label: "Brain Rot",
    range: "151–250 reels",
    bodyFrom: "#C8A8B5",
    bodyTo: "#9C6E80",
    aura: "rgba(160,90,90,0.4)",
    energy: 20,
    bar: "linear-gradient(90deg,#D2A0A8,#A0506C)",
    ring: "rgba(160,80,90,0.4)",
    tilt: -8,
    pulse: true,
    warn: true,
    message: "Your attention is fading.",
  },
  6: {
    label: "Zombie Brain",
    range: "250+ reels",
    bodyFrom: "#B8B8B8",
    bodyTo: "#6E6E6E",
    aura: "rgba(120,120,120,0.35)",
    energy: 5,
    bar: "linear-gradient(90deg,#C9C9C9,#6E6E6E)",
    ring: "rgba(100,100,100,0.4)",
    tilt: -10,
    pulse: true,
    warn: true,
    message: "Time to put the phone down.",
  },
};

export function BrainStageBadge({
  reels,
  size = "md",
  className = "",
}: {
  reels: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const stage = getBrainStage(reels);
  const meta = STAGES[stage];
  const isSm = size === "sm";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-white/50 shadow-soft backdrop-blur-md ${
        isSm ? "px-2.5 py-1" : "px-3 py-1.5"
      } ${className}`}
      style={{
        background: `linear-gradient(135deg, ${meta.bodyFrom}, ${meta.bodyTo})`,
      }}
    >
      <span
        className={`relative rounded-full bg-white/90 ${isSm ? "w-4 h-4" : "w-5 h-5"} flex items-center justify-center`}
        aria-hidden
      >
        <span
          className="absolute inset-0.5 rounded-full"
          style={{ background: `radial-gradient(circle at 30% 25%, ${meta.bodyFrom}, ${meta.bodyTo})` }}
        />
      </span>
      <span className={`font-bold text-white drop-shadow-sm ${isSm ? "text-[11px]" : "text-xs"}`}>
        {meta.label}
      </span>
      <span className={`text-white/85 font-semibold tabular-nums ${isSm ? "text-[10px]" : "text-[11px]"}`}>
        {meta.energy}%
      </span>
    </div>
  );
}

export function BrainStageMessage({ reels, className = "" }: { reels: number; className?: string }) {
  const meta = STAGES[getBrainStage(reels)];
  return <p className={className}>{meta.message}</p>;
}


export function BrainEnergyCounter({
  reels,
  minutesLost,
  onTakeBreak,
}: {
  reels: number;
  minutesLost: number; // total minutes lost today
  onTakeBreak?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const stage = useMemo(() => getBrainStage(reels), [reels]);
  const meta = STAGES[stage];

  const timeLabel = useMemo(() => {
    const h = Math.floor(minutesLost / 60);
    const m = minutesLost % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [minutesLost]);

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        layout
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        whileTap={{ scale: 0.96 }}
        className="fixed z-50 bottom-24 right-4 left-auto"
        style={{ maxWidth: "calc(50vw - 12px)" }}
        aria-label="Open Brain Energy Counter"
      >
        <motion.div
          animate={meta.pulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 1.6, repeat: meta.pulse ? Infinity : 0, ease: "easeInOut" }}
          className="relative"
        >
          {/* Aura glow */}
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-[28px] blur-2xl"
            style={{ background: meta.aura }}
            animate={{ opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="relative flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-[22px] border border-white/40 shadow-card backdrop-blur-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.65))",
            }}
          >
            <BrainMascot stage={stage} size={42} />
            <div className="text-left leading-tight">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Brain Energy
              </p>
              <p className="text-[13px] font-bold text-foreground tabular-nums">
                {reels} <span className="text-muted-foreground font-medium">reels</span>
              </p>
              {/* Mini energy bar */}
              <div className="mt-1 w-[78px] h-1 rounded-full bg-black/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${meta.energy}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: meta.bar }}
                />
              </div>
            </div>
            {meta.warn && (
              <motion.span
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-soft"
              >
                <AlertTriangle className="w-3 h-3" />
              </motion.span>
            )}
          </div>
        </motion.div>
      </motion.button>

      {/* Expanded sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="fixed z-50 inset-x-0 bottom-0 mx-auto w-full max-w-[420px] px-4 pb-6"
            >
              <div
                className="relative rounded-[32px] border border-white/50 shadow-card backdrop-blur-2xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.95), rgba(255,247,238,0.85))",
                }}
              >
                {/* Decorative aura */}
                <div
                  className="absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl pointer-events-none"
                  style={{ background: meta.aura }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 border border-border/60 flex items-center justify-center text-foreground shadow-soft hover:bg-white active:scale-95 transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="relative px-6 pt-6 pb-5 flex flex-col items-center text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    Brain Energy
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Stage {stage} · {meta.label}
                  </p>
                  <div className="mt-3">
                    <BrainMascot stage={stage} size={144} />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight">
                    {reels} <span className="text-muted-foreground font-semibold">reels today</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{meta.message}</p>

                  {/* Energy bar */}
                  <div className="mt-5 w-full">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Energy
                      </span>
                      <span className="tabular-nums">{meta.energy}%</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-black/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${meta.energy}%` }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: meta.bar }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="relative grid grid-cols-2 border-t border-border/60 bg-white/40">
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Brain className="w-3.5 h-3.5" />
                      <p className="text-[10px] uppercase tracking-wider font-semibold">Reels</p>
                    </div>
                    <p className="text-xl font-bold mt-1 tabular-nums">{reels}</p>
                  </div>
                  <div className="p-4 border-l border-border/60">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <p className="text-[10px] uppercase tracking-wider font-semibold">
                        Lost Today
                      </p>
                    </div>
                    <p className="text-xl font-bold mt-1 tabular-nums">{timeLabel}</p>
                  </div>
                </div>

                {/* Stage map */}
                <div className="relative px-5 pt-3 pb-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Mental energy across the day
                  </p>
                  <div className="flex items-end gap-1.5">
                    {([1, 2, 3, 4, 5, 6] as BrainStage[]).map((s) => {
                      const active = s === stage;
                      const passed = s < stage;
                      const m = STAGES[s];
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-md transition-all ${
                              active ? "h-7" : "h-5"
                            }`}
                            style={{
                              background: passed || active ? m.bar : "rgba(0,0,0,0.06)",
                              opacity: passed && !active ? 0.55 : 1,
                              boxShadow: active
                                ? `0 6px 16px -6px ${m.ring}`
                                : "none",
                            }}
                          />
                          <span
                            className={`text-[9px] font-semibold tabular-nums ${
                              active ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {s}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                <div className="relative px-5 pb-5">
                  <motion.button
                    onClick={() => {
                      setOpen(false);
                      onTakeBreak?.();
                    }}
                    whileTap={{ scale: 0.98 }}
                    animate={
                      meta.warn
                        ? { boxShadow: [
                            "0 8px 24px -12px rgba(0,0,0,0.25)",
                            "0 16px 36px -10px rgba(0,0,0,0.4)",
                            "0 8px 24px -12px rgba(0,0,0,0.25)",
                          ] }
                        : {}
                    }
                    transition={{ duration: 2.2, repeat: meta.warn ? Infinity : 0 }}
                    className="w-full h-13 py-3.5 rounded-2xl bg-foreground text-background font-semibold"
                  >
                    {meta.warn ? "Recharge — Take a Break" : "Keep the energy up"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------------- Mascot ---------------- */
/* "Spark" — a cute round blob character with big sparkly eyes, blush cheeks,
   a little antenna with a glowing dot. Evolves through 6 stages. */

function BrainMascot({ stage, size = 64 }: { stage: BrainStage; size?: number }) {
  const meta = STAGES[stage];
  const uid = `spark-${stage}`;

  // Antenna dot color dims as energy drops
  const sparkColor =
    stage <= 2 ? "#FFD66B" : stage === 3 ? "#FFB347" : stage === 4 ? "#FF7A3A" : "#9C8A8A";

  // Subtle bob; heavier slump at high stages
  const bob = stage >= 5 ? [0, 1.5, 0] : [0, -1.6, 0];
  const bobDur = stage >= 5 ? 2.6 : 2.8;

  return (
    <motion.div
      style={{ width: size, height: size }}
      animate={{ rotate: meta.tilt, y: bob }}
      transition={{
        rotate: { duration: 0.6, ease: "easeOut" },
        y: { duration: bobDur, repeat: Infinity, ease: "easeInOut" },
      }}
      className="relative"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <radialGradient id={`${uid}-body`} cx="35%" cy="28%" r="85%">
            <stop offset="0%" stopColor={meta.bodyFrom} />
            <stop offset="100%" stopColor={meta.bodyTo} />
          </radialGradient>
          <radialGradient id={`${uid}-shine`} cx="32%" cy="22%" r="38%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={`${uid}-spark`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="60%" stopColor={sparkColor} />
            <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft shadow under feet */}
        <ellipse cx="50" cy="92" rx="20" ry="3" fill="rgba(0,0,0,0.12)" />

        {/* Antenna line + glowing spark */}
        <motion.g
          style={{ transformOrigin: "50px 22px" }}
          animate={{ rotate: stage <= 2 ? [-6, 6, -6] : stage >= 5 ? [-2, 2, -2] : [-3, 3, -3] }}
          transition={{ duration: stage <= 2 ? 2 : 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M50 28 V14"
            stroke={meta.bodyTo}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="50" cy="11" r="7" fill={`url(#${uid}-spark)`} />
          <circle cx="50" cy="11" r="3" fill={sparkColor} />
          {stage <= 2 && (
            <motion.circle
              cx="50"
              cy="11"
              r="3"
              fill="#FFF1B0"
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "50px 11px" }}
            />
          )}
        </motion.g>

        {/* Body — rounded squircle blob */}
        <motion.path
          d="M50 26
             c16 0 28 11 28 28
             c0 13 -8 22 -18 26
             c-4 1.6 -6 2 -10 2
             s -6 -0.4 -10 -2
             c-10 -4 -18 -13 -18 -26
             c0 -17 12 -28 28 -28 z"
          fill={`url(#${uid}-body)`}
          animate={{
            scale: stage >= 5 ? [1, 0.985, 1] : [1, 1.015, 1],
          }}
          transition={{ duration: stage >= 5 ? 3.2 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "50px 56px" }}
        />

        {/* Top highlight */}
        <ellipse cx="40" cy="40" rx="14" ry="7" fill={`url(#${uid}-shine)`} />

        {/* Blush cheeks (stages 1-3) */}
        {stage <= 3 && (
          <>
            <ellipse cx="30" cy="62" rx="5" ry="3" fill="rgba(255,90,90,0.35)" />
            <ellipse cx="70" cy="62" rx="5" ry="3" fill="rgba(255,90,90,0.35)" />
          </>
        )}

        {/* Dark circles (stage 3+) */}
        {stage >= 3 && (
          <>
            <path
              d="M34 60 q5 3 10 0"
              stroke="rgba(70,30,30,0.28)"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M56 60 q5 3 10 0"
              stroke="rgba(70,30,30,0.28)"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Eyes */}
        <Eyes stage={stage} />

        {/* Mouth */}
        <Mouth stage={stage} />

        {/* Tiny arms */}
        <path
          d={
            stage <= 2
              ? "M22 62 q-4 -2 -5 -7 M78 62 q4 -2 5 -7"
              : stage <= 4
                ? "M22 64 q-4 2 -5 6 M78 64 q4 2 5 6"
                : "M22 66 q-4 4 -3 8 M78 66 q4 4 3 8"
          }
          stroke={meta.bodyTo}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Sleep Zs (stage 6) */}
        {stage === 6 && (
          <motion.g
            animate={{ y: [0, -8, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity }}
          >
            <text x="78" y="28" fontSize="11" fontWeight="800" fill="rgba(90,90,90,0.85)">
              z
            </text>
            <text x="84" y="20" fontSize="8" fontWeight="800" fill="rgba(90,90,90,0.7)">
              z
            </text>
          </motion.g>
        )}

        {/* Sparkles around (stage 1) */}
        {stage === 1 && (
          <>
            <motion.g
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
              style={{ transformOrigin: "18px 38px" }}
            >
              <path d="M18 36 l1.6 2 2 1.6 -2 1.6 -1.6 2 -1.6 -2 -2 -1.6 2 -1.6z" fill="#FFD66B" />
            </motion.g>
            <motion.g
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
              style={{ transformOrigin: "84px 44px" }}
            >
              <path d="M84 42 l1.4 1.8 1.8 1.4 -1.8 1.4 -1.4 1.8 -1.4 -1.8 -1.8 -1.4 1.8 -1.4z" fill="#FFD66B" />
            </motion.g>
          </>
        )}
      </svg>
    </motion.div>
  );
}

function Eyes({ stage }: { stage: BrainStage }) {
  // Stage 1 — big sparkly happy eyes
  if (stage === 1) {
    return (
      <g>
        <ellipse cx="38" cy="54" rx="5" ry="5.6" fill="#1F1B16" />
        <ellipse cx="62" cy="54" rx="5" ry="5.6" fill="#1F1B16" />
        <circle cx="39.8" cy="52" r="1.8" fill="white" />
        <circle cx="63.8" cy="52" r="1.8" fill="white" />
        <circle cx="36.5" cy="56.5" r="0.9" fill="white" />
        <circle cx="60.5" cy="56.5" r="0.9" fill="white" />
      </g>
    );
  }
  // Stage 2 — content, slightly relaxed
  if (stage === 2) {
    return (
      <g>
        <ellipse cx="38" cy="55" rx="4" ry="4.4" fill="#1F1B16" />
        <ellipse cx="62" cy="55" rx="4" ry="4.4" fill="#1F1B16" />
        <circle cx="39.4" cy="53.4" r="1.3" fill="white" />
        <circle cx="63.4" cy="53.4" r="1.3" fill="white" />
      </g>
    );
  }
  // Stage 3 — tired, lids lowering
  if (stage === 3) {
    return (
      <g>
        <path d="M33 56 q5 -3 10 0 v3 q-5 3 -10 0z" fill="#1F1B16" />
        <path d="M57 56 q5 -3 10 0 v3 q-5 3 -10 0z" fill="#1F1B16" />
      </g>
    );
  }
  // Stage 4 — half closed, weary
  if (stage === 4) {
    return (
      <g>
        <path
          d="M32 58 q6 -2 12 0"
          stroke="#1F1B16"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M56 58 q6 -2 12 0"
          stroke="#1F1B16"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }
  // Stage 5 — dizzy spirals
  if (stage === 5) {
    return (
      <g>
        <motion.g
          style={{ transformOrigin: "38px 56px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          <path
            d="M38 51 a5 5 0 1 1 -4 8 a3 3 0 1 1 4 -5 a1.5 1.5 0 1 1 -2 2"
            stroke="#3A1F1F"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </motion.g>
        <motion.g
          style={{ transformOrigin: "62px 56px" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          <path
            d="M62 51 a5 5 0 1 1 -4 8 a3 3 0 1 1 4 -5 a1.5 1.5 0 1 1 -2 2"
            stroke="#3A1F1F"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </motion.g>
      </g>
    );
  }
  // Stage 6 — sleeping
  return (
    <g>
      <path
        d="M32 58 q6 4 12 0"
        stroke="#2A2A2A"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M56 58 q6 4 12 0"
        stroke="#2A2A2A"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Mouth({ stage }: { stage: BrainStage }) {
  if (stage === 1) {
    return (
      <g>
        <path
          d="M40 68 q10 10 20 0"
          stroke="#2A1A14"
          strokeWidth="2.8"
          fill="#3A1A14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M44 72 q6 4 12 0" fill="#FF6E8E" />
      </g>
    );
  }
  if (stage === 2) {
    return (
      <path
        d="M42 69 q8 6 16 0"
        stroke="#2A1A14"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (stage === 3) {
    return (
      <path
        d="M43 71 h14"
        stroke="#2A1A14"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (stage === 4) {
    return (
      <path
        d="M42 73 q8 -4 16 0"
        stroke="#2A1A14"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (stage === 5) {
    return (
      <motion.path
        d="M40 73 q4 -3 8 0 t8 0"
        stroke="#2A1A14"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        animate={{
          d: [
            "M40 73 q4 -3 8 0 t8 0",
            "M40 73 q4 3 8 0 t8 0",
            "M40 73 q4 -3 8 0 t8 0",
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
    );
  }
  return (
    <path
      d="M44 74 h12"
      stroke="#2A2A2A"
      strokeWidth="2.2"
      fill="none"
      strokeLinecap="round"
    />
  );
}
