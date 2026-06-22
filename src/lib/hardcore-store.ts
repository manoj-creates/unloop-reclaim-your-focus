import { useCallback, useEffect, useState } from "react";

// Single source of truth for Hardcore Mode state.
const KEY = "unloop.hardcore.v1";

export type HardcoreLevel = "Gentle" | "Balanced" | "Strict" | "Extreme";

export type HardcoreState = {
  enabled: boolean;
  level: HardcoreLevel;
  block: boolean;
  strict: boolean;
  reflect: boolean;
  delay: boolean;
};

export const DEFAULT_HARDCORE: HardcoreState = {
  enabled: false,
  level: "Balanced",
  block: true,
  strict: true,
  reflect: true,
  delay: true,
};

// Legacy keys we migrate from (then delete).
const LEGACY_KEYS = ["unloop.hardcore.enabled"];

function read(): HardcoreState {
  if (typeof window === "undefined") return DEFAULT_HARDCORE;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_HARDCORE, ...JSON.parse(raw) };
    // migrate legacy "enabled" boolean
    const legacy = localStorage.getItem("unloop.hardcore.enabled");
    if (legacy != null) {
      const next = { ...DEFAULT_HARDCORE, enabled: legacy === "true" };
      localStorage.setItem(KEY, JSON.stringify(next));
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      return next;
    }
  } catch {}
  return DEFAULT_HARDCORE;
}

function write(s: HardcoreState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem("unloop.hardcore.enabled", String(s.enabled)); // back-compat
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unloop:hardcore", { detail: s }));
  }
}

export function getHardcore(): HardcoreState {
  return read();
}

export function isHardcoreEnabled(): boolean {
  return read().enabled;
}

export function useHardcore() {
  const [state, setState] = useState<HardcoreState>(DEFAULT_HARDCORE);

  useEffect(() => {
    setState(read());
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<HardcoreState>).detail;
      if (detail) setState(detail);
    };
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setState(read()); };
    window.addEventListener("unloop:hardcore", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("unloop:hardcore", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<HardcoreState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      // any toggle "on" implies enabled; full off keeps user explicit
      write(next);
      return next;
    });
  }, []);

  return { state, update };
}
