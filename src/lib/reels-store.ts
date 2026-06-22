import { useEffect, useState, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { onReelDetected, setOverlayCount, type ReelPlatform as NativeReelPlatform } from "@/lib/native-bridge";
import { recordBrainStage } from "@/lib/brain-history";
import { isPreviewMode, PREVIEW_REELS_TODAY } from "@/lib/preview-mode";
import { supabase } from "@/integrations/supabase/client";
import { pushAnalytics } from "@/lib/cloud-sync";

export type ReelPlatform = NativeReelPlatform;

// India-first lineup. TikTok is banned in India so it never appears in the
// UI; the underlying ReelPlatform type still includes "tiktok" so any legacy
// counters stay readable without crashing.
export const PLATFORMS: { id: ReelPlatform; name: string; color: string; icon: string }[] = [
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "📷" },
  { id: "youtube", name: "YouTube Shorts", color: "#FF0000", icon: "▶" },
  { id: "facebook", name: "Facebook Reels", color: "#1877F2", icon: "f" },
];

const KEY = "unloop.reels.v1";

export type ReelsState = {
  date: string; // YYYY-MM-DD
  counts: Record<ReelPlatform, number>;
  lastUpdated: number;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyCounts = (): Record<ReelPlatform, number> => ({
  instagram: 0, youtube: 0, facebook: 0, tiktok: 0,
});

const fresh = (): ReelsState => ({
  date: todayKey(),
  counts: emptyCounts(),
  lastUpdated: Date.now(),
});

const read = (): ReelsState => {
  if (typeof window === "undefined") return fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as ReelsState;
    if (parsed.date !== todayKey()) return fresh();
    return { ...fresh(), ...parsed, counts: { ...emptyCounts(), ...parsed.counts } };
  } catch {
    return fresh();
  }
};

const write = (s: ReelsState) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unloop:reels", { detail: s }));
  }
};

export const totalCount = (s: ReelsState) =>
  s.counts.instagram + s.counts.youtube + s.counts.facebook + s.counts.tiktok;

function applyIncrement(
  setState: Dispatch<SetStateAction<ReelsState>>,
  platform: ReelPlatform,
  n: number,
) {
  setState((prev) => {
    const base = prev.date === todayKey() ? prev : fresh();
    const next: ReelsState = {
      ...base,
      counts: { ...base.counts, [platform]: base.counts[platform] + n },
      lastUpdated: Date.now(),
    };
    write(next);
    return next;
  });
}

export function useReelsCounter() {
  const [state, setState] = useState<ReelsState>(fresh);
  const [preview, setPreview] = useState(false);
  const lastPushedTotal = useRef<number>(-1);

  useEffect(() => {
    if (isPreviewMode()) {
      setPreview(true);
      setState({ date: todayKey(), counts: { ...PREVIEW_REELS_TODAY }, lastUpdated: Date.now() });
      return;
    }
    setState(read());
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<ReelsState>).detail;
      if (detail) setState(detail);
    };
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setState(read()); };
    window.addEventListener("unloop:reels", onUpdate);
    window.addEventListener("storage", onStorage);

    // midnight reset poll
    const id = window.setInterval(() => {
      setState((s) => (s.date !== todayKey() ? fresh() : s));
    }, 30_000);

    // Native bridge: increment counter on every reelDetected event.
    // Dedupe via a rolling set of (reelId || ts) keys to defend against
    // duplicate emissions if the native detector misfires across rotations
    // or rapid event-tree churn.
    const seen = new Set<string>();
    let unsub: (() => void) | null = null;
    onReelDetected((e) => {
      const key = `${e.platform}:${(e as { reelId?: string }).reelId ?? e.ts}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (seen.size > 128) {
        // Trim oldest entries — Set preserves insertion order.
        const it = seen.values();
        for (let i = 0; i < 32; i++) { const v = it.next().value; if (v) seen.delete(v); }
      }
      applyIncrement(setState, e.platform as ReelPlatform, 1);
    }).then((u) => { unsub = u; });

    return () => {
      window.removeEventListener("unloop:reels", onUpdate);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
      unsub?.();
    };
  }, []);

  // Phase D — keep the native brain-pill overlay in lockstep with the
  // React-side total. React is the single source of truth; the overlay
  // never increments on its own, so manual resets and midnight rollover
  // propagate automatically. We only push on actual changes.
  const total = totalCount(state);
  const lastCloudPush = useRef<number>(0);
  useEffect(() => {
    if (preview) return;
    if (lastPushedTotal.current === total) return;
    lastPushedTotal.current = total;
    setOverlayCount(total);
    // Phase D.1 — log brain-stage transitions for analytics. The ledger
    // dedupes internally, so calling on every count tick is safe.
    recordBrainStage(total);

    // Cloud sync: throttle to once per 15s + only when signed in.
    const now = Date.now();
    if (now - lastCloudPush.current < 15_000) return;
    lastCloudPush.current = now;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      pushAnalytics(data.user.id, { ...state.counts }).catch(() => { /* surfaced via sync-status */ });
    });
  }, [total, preview, state.counts]);


  const addReel = useCallback((platform: ReelPlatform, n = 1) => {
    setState((prev) => {
      const base = prev.date === todayKey() ? prev : fresh();
      const next: ReelsState = {
        ...base,
        counts: { ...base.counts, [platform]: base.counts[platform] + n },
        lastUpdated: Date.now(),
      };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = fresh();
    write(next);
    setState(next);
  }, []);

  return { state, total, addReel, reset };
}
