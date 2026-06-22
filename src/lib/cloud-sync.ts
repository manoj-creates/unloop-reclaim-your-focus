import { supabase } from "@/integrations/supabase/client";
import { loadOnboarding, saveOnboarding, type OnboardingData } from "@/lib/onboarding-store";
import { reportError } from "@/lib/crashlytics";
import { markSyncError, markSyncOk, markSyncStart } from "@/lib/sync-status";

export interface CloudProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  timezone: string | null;
  language: string | null;
  focus_goal: number | null;
}

export async function fetchProfile(userId: string): Promise<CloudProfile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) reportError(error, "sync.fetchProfile");
  return (data as CloudProfile) ?? null;
}

export async function updateProfile(userId: string, patch: Partial<CloudProfile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) { reportError(error, "sync.updateProfile"); throw error; }
}

export async function pushGoals(userId: string, d: OnboardingData) {
  const { error } = await supabase.from("user_goals").upsert({
    user_id: userId,
    apps: d.apps,
    content_types: d.contentTypes,
    baseline: d.baseline,
    goals: d.goals,
    daily_limit: d.dailyLimit,
    hardcore: d.hardcore,
  });
  if (error) { reportError(error, "sync.pushGoals"); throw error; }
}

export async function pullGoals(userId: string): Promise<{ data: Partial<OnboardingData>; updatedAt: string | null } | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("*, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) { reportError(error, "sync.pullGoals"); return null; }
  if (!data) return null;
  return {
    data: {
      apps: (data.apps as string[]) ?? [],
      contentTypes: (data.content_types as string[]) ?? [],
      baseline: data.baseline ?? "",
      goals: (data.goals as string[]) ?? [],
      dailyLimit: data.daily_limit ?? 50,
      hardcore: !!data.hardcore,
    },
    updatedAt: (data as { updated_at?: string }).updated_at ?? null,
  };
}

export async function pushStreak(userId: string, current: number, longest: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("user_streaks").upsert({
    user_id: userId,
    current_streak: current,
    longest_streak: longest,
    last_active_date: today,
  });
  if (error) { reportError(error, "sync.pushStreak"); throw error; }
}

export async function pushAnalytics(userId: string, counts: { instagram: number; youtube: number; facebook: number; tiktok: number; focusScore?: number; timeSavedMinutes?: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const total = counts.instagram + counts.youtube + counts.facebook + counts.tiktok;
  const { error } = await supabase.from("user_analytics").upsert({
    user_id: userId,
    day: today,
    instagram: counts.instagram,
    youtube: counts.youtube,
    facebook: counts.facebook,
    tiktok: counts.tiktok,
    total,
    focus_score: counts.focusScore ?? null,
    time_saved_minutes: counts.timeSavedMinutes ?? null,
  }, { onConflict: "user_id,day" });
  if (error) { reportError(error, "sync.pushAnalytics"); throw error; }
}

export async function pushWidgets(userId: string, config: unknown) {
  const { error } = await supabase.from("user_widgets").upsert({ user_id: userId, config: config as never });
  if (error) { reportError(error, "sync.pushWidgets"); throw error; }
}

export async function pullWidgets(userId: string) {
  const { data, error } = await supabase.from("user_widgets").select("config").eq("user_id", userId).maybeSingle();
  if (error) { reportError(error, "sync.pullWidgets"); return null; }
  return data?.config ?? null;
}

/**
 * On first sign-in: merge local guest data with cloud safely.
 *
 * Conflict policy:
 *   - No cloud row: push local if non-empty
 *   - Cloud row exists: cloud wins for goals/widgets (server is canonical)
 *   - We never blind-upsert local-over-cloud after the initial merge
 *
 * Serialized via an in-flight Promise so concurrent callers (e.g. auth route
 * + profile mount) cannot race.
 */
let migrateInFlight: Promise<void> | null = null;
export function migrateLocalToCloud(userId: string): Promise<void> {
  if (migrateInFlight) return migrateInFlight;
  migrateInFlight = (async () => {
    markSyncStart();
    try {
      const local = loadOnboarding();
      const cloud = await pullGoals(userId);

      if (!cloud) {
        if (local.apps.length || local.goals.length || local.completed) {
          await pushGoals(userId, local);
        }
      } else {
        // Cloud wins. Merge any local-only fields that aren't tracked in cloud.
        saveOnboarding({ ...local, ...cloud.data, completed: local.completed || true });
      }

      // Widgets: same policy.
      try {
        const localWidgetsRaw = typeof window !== "undefined" ? localStorage.getItem("unloop.widgets.v1") : null;
        const cloudW = await pullWidgets(userId);
        if (!cloudW && localWidgetsRaw) {
          await pushWidgets(userId, JSON.parse(localWidgetsRaw));
        } else if (cloudW && typeof window !== "undefined") {
          localStorage.setItem("unloop.widgets.v1", JSON.stringify(cloudW));
        }
      } catch (e) {
        reportError(e, "sync.widgets.migrate");
      }

      markSyncOk();
    } catch (e) {
      markSyncError(e);
      reportError(e, "sync.migrate");
    } finally {
      migrateInFlight = null;
    }
  })();
  return migrateInFlight;
}

/**
 * Push everything that changes during normal app use (analytics + streak).
 * Throttled by caller — see useReelsCounter.
 */
export async function pushDailyState(userId: string, opts: {
  counts: { instagram: number; youtube: number; facebook: number; tiktok: number; focusScore?: number; timeSavedMinutes?: number };
  streak: { current: number; longest: number };
}) {
  markSyncStart();
  try {
    await Promise.all([
      pushAnalytics(userId, opts.counts),
      pushStreak(userId, opts.streak.current, opts.streak.longest),
    ]);
    markSyncOk();
  } catch (e) {
    markSyncError(e);
    throw e;
  }
}
