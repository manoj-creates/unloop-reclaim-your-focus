import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Film, RotateCcw } from "lucide-react";
import { useReelsCounter, PLATFORMS, type ReelPlatform } from "@/lib/reels-store";
import { BrainStageBadge, BrainStageMessage } from "./BrainEnergyCounter";

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const dur = 450;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prev.current = to;
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display}</span>;
}

export function ReelsCounter() {
  const { state, total, addReel, reset } = useReelsCounter();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const lastTotal = useRef(total);

  useEffect(() => {
    if (total > lastTotal.current) {
      setPulse(true);
      const id = setTimeout(() => setPulse(false), 600);
      lastTotal.current = total;
      return () => clearTimeout(id);
    }
    lastTotal.current = total;
  }, [total]);

  return (
    <>
      {/* Floating premium bubble */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 220, delay: 0.2 }}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.06 }}
        className="fixed z-50 bottom-24 left-4"
        aria-label="Live reels counter"
      >
        {/* Outer glow halo */}
        <motion.span
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.2, 0.55] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-2 rounded-full blur-xl"
          style={{ background: "radial-gradient(circle, #FF7A1A 0%, transparent 70%)" }}
        />

        {/* Rotating conic ring */}
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[2px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg,#FFD66B,#FF7A1A,#E5550B,#FF3D7F,#FFD66B)",
          }}
        />

        <motion.div
          animate={pulse ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 30% 25%,#FFDCB5 0%,#FF8A3A 35%,#E5550B 75%,#A8330A 100%)",
            boxShadow:
              "0 14px 32px -8px rgba(229,85,11,0.55),0 4px 12px -2px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.5),inset 0 -6px 14px rgba(0,0,0,0.2)",
          }}
        >
          {/* Glossy highlight */}
          <span
            className="absolute inset-x-2 top-1 h-5 rounded-full opacity-70"
            style={{
              background:
                "linear-gradient(180deg,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0) 100%)",
              filter: "blur(2px)",
            }}
          />
          {/* Inner soft ring */}
          <span className="absolute inset-1 rounded-full border border-white/25" />

          <motion.div
            animate={pulse ? { rotate: [0, -10, 10, 0] } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <Film className="w-6 h-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
          </motion.div>

          {/* Live dot */}
          <span className="absolute top-1.5 left-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-1 ring-white/70" />
          </span>
        </motion.div>

        {/* Count badge */}
        <motion.span
          animate={pulse ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.45 }}
          className="absolute -top-1.5 -right-1.5 min-w-[26px] h-[26px] px-2 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums"
          style={{
            background: "linear-gradient(135deg,#ffffff 0%,#f1f3f6 100%)",
            color: "#1a1a1a",
            boxShadow:
              "0 4px 10px -2px rgba(0,0,0,0.25),0 0 0 2px rgba(255,255,255,0.95),inset 0 -1px 0 rgba(0,0,0,0.06)",
          }}
        >
          <AnimatedNumber value={total} />
        </motion.span>

        {pulse && (
          <motion.span
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 rounded-full border-2 border-primary"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 280 }}
              className="fixed z-50 inset-x-0 bottom-0 mx-auto w-full max-w-[440px] px-4 pb-6"
            >
              <div className="relative rounded-3xl bg-card border border-border/60 shadow-card overflow-hidden">
                <div
                  className="absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-60"
                  style={{ background: "radial-gradient(circle,#FF8A3A 0%, transparent 70%)" }}
                />
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted/80 border border-border/60 flex items-center justify-center z-10"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="relative p-6 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Live Reels Counter</p>
                    <BrainStageBadge reels={total} size="sm" />
                  </div>
                  <div className="mt-2 flex items-end gap-3">
                    <AnimatedNumber
                      value={total}
                      className="text-6xl font-bold tracking-tight text-gradient-flame leading-none"
                    />
                    <span className="text-sm text-muted-foreground mb-2">reels today</span>
                  </div>
                  <BrainStageMessage reels={total} className="text-sm font-semibold text-foreground mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Resets at midnight · {state.date}</p>
                </div>

                <div className="relative px-5 pb-4 space-y-2">
                  {PLATFORMS.map((p) => (
                    <PlatformRow
                      key={p.id}
                      platform={p.id}
                      name={p.name}
                      color={p.color}
                      icon={p.icon}
                      value={state.counts[p.id]}
                      onAdd={() => addReel(p.id)}
                    />
                  ))}
                </div>

                <div className="relative px-5 pb-5">
                  <button
                    onClick={reset}
                    className="w-full py-3 rounded-2xl bg-muted text-muted-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset today's count
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function PlatformRow({
  platform, name, color, icon, value, onAdd,
}: {
  platform: ReelPlatform; name: string; color: string; icon: string;
  value: number; onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border/60">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
        style={{ background: color }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground capitalize">{platform}</p>
      </div>
      <AnimatedNumber value={value} className="text-lg font-bold tabular-nums w-10 text-right" />
      <button
        onClick={onAdd}
        className="w-9 h-9 rounded-full bg-gradient-flame text-white flex items-center justify-center shadow-glow active:scale-95 transition-transform"
        aria-label={`Add reel for ${name}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export { AnimatedNumber };
