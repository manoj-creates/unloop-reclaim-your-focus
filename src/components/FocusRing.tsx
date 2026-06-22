import { useId } from "react";
import { motion } from "motion/react";

interface FocusRingProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  big?: string;
}

export function FocusRing({ value, size = 180, stroke = 14, label, sublabel, big }: FocusRingProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `ring-grad-${uid}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.16 80)" />
            <stop offset="50%" stopColor="oklch(0.74 0.19 50)" />
            <stop offset="100%" stopColor="oklch(0.68 0.22 32)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-muted/60"
          strokeWidth={stroke}
          fill="none"
          opacity={0.25}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {label && <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>}
        <span
          className="font-bold tracking-tight mt-1 leading-none tabular-nums"
          style={{ fontSize: Math.round(size * 0.3) }}
        >
          {big ?? pct}
        </span>
        {sublabel && <span className="text-xs text-muted-foreground mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}
