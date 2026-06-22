import { isPreviewMode, PREVIEW_ONBOARDING } from "@/lib/preview-mode";

const KEY = "unloop.onboarding.v1";

export interface OnboardingData {
  completed: boolean;
  /** User has visited the Android Readiness screen at least once after onboarding. */
  readinessReviewed: boolean;
  apps: string[];
  contentTypes: string[];
  baseline: string;
  goals: string[];
  dailyLimit: number;
  permissions: { usage: boolean; notif: boolean; overlay: boolean; battery: boolean };
  hardcore: boolean;
}

export const defaultData: OnboardingData = {
  completed: false,
  readinessReviewed: false,
  apps: [],
  contentTypes: [],
  baseline: "",
  goals: [],
  dailyLimit: 50,
  permissions: { usage: false, notif: false, overlay: false, battery: false },
  hardcore: false,
};

export function loadOnboarding(): OnboardingData {
  if (typeof window === "undefined") return defaultData;
  if (isPreviewMode()) {
    return {
      ...defaultData,
      completed: true,
      readinessReviewed: true,
      apps: PREVIEW_ONBOARDING.apps,
      dailyLimit: PREVIEW_ONBOARDING.dailyLimit,
    };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData;
    return { ...defaultData, ...JSON.parse(raw) };
  } catch {
    return defaultData;
  }
}

export function saveOnboarding(d: OnboardingData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(d));
}

export function isOnboarded(): boolean {
  return loadOnboarding().completed;
}

export function isReadinessReviewed(): boolean {
  return loadOnboarding().readinessReviewed;
}

export function markReadinessReviewed() {
  if (typeof window === "undefined") return;
  const d = loadOnboarding();
  saveOnboarding({ ...d, readinessReviewed: true });
}

export function resetOnboarding() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
