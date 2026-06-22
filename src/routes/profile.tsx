import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import {
  Bell, Shield, Download, RotateCcw, Sun, Moon, Monitor,
  Cloud, CloudUpload, LogOut, Trash2, ChevronRight, X, Check, Sparkles,
  Brain, BarChart3, LayoutGrid, Crown, Apple, UserPlus, Target, CloudOff, RefreshCw,
  Flame, Clock, CalendarDays,

} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { loadOnboarding, saveOnboarding, resetOnboarding } from "@/lib/onboarding-store";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { fetchProfile, migrateLocalToCloud, pushGoals, updateProfile, type CloudProfile } from "@/lib/cloud-sync";
import { useUserProfile } from "@/lib/user-profile";
import { useLiveStats, formatDuration } from "@/lib/live-stats";
import { UserAvatar } from "@/components/UserAvatar";
import { isPreviewMode } from "@/lib/preview-mode";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Unloop" }] }),
  component: Profile,
});

type SheetKey =
  | "google" | "apple" | "backup" | "restore" | "logout" | "delete"
  | "notifications" | "theme" | "language" | "privacy" | "export" | "reset"
  | "premium" | "focusGoal" | null;


type Theme = "light" | "dark" | "auto";

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
}

function Profile() {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();
  const displayProfile = useUserProfile();
  const stats = useLiveStats();
  const [open, setOpen] = useState<SheetKey>(null);
  const close = () => setOpen(null);

  const [ios, setIos] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);
  const [preview, setPreview] = useState(false);

  const account = {
    provider: (preview ? "google" : isAuthenticated ? (authUser?.app_metadata?.provider ?? "google") : "guest") as
      | "guest" | "google" | "apple",
    name: cloudProfile?.display_name || displayProfile.name,
    email: cloudProfile?.email || displayProfile.email,
    avatar: cloudProfile?.avatar_url || displayProfile.avatarUrl,
    initials: displayProfile.initials,
  };


  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState("English");
  const [notifs, setNotifs] = useState({ daily: true, insights: true, milestones: true, streak: true });
  const [synced, setSynced] = useState<string | null>(null);
  const [pro, setPro] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setIos(detectIOS());
    // Marketing preview: force a "successful pro user" presentation so the
    // profile screen embedded on the landing page matches the brief.
    try {
      const isPreview = isPreviewMode();
      setPreview(isPreview);
      if (isPreview) { setPro(true); setSynced(new Date().toISOString()); return; }
    } catch {}
    try {
      const raw = localStorage.getItem("unloop.profile.v1");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.theme) setTheme(p.theme);
        if (p.language) setLanguage(p.language);
        if (p.notifs) setNotifs(p.notifs);
        if (p.synced) setSynced(p.synced);
        if (p.pro) setPro(p.pro);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authUser) { setCloudProfile(null); return; }
    fetchProfile(authUser.id).then(setCloudProfile);
    migrateLocalToCloud(authUser.id).catch(() => {});
  }, [authUser]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const h = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", h);
      return () => mq.removeEventListener("change", h);
    }
    apply(theme === "dark");
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("unloop.profile.v1", JSON.stringify({ theme, language, notifs, synced, pro }));
    } catch {}
  }, [theme, language, notifs, synced, pro]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const signIn = async (provider: "google" | "apple") => {
    close();
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        showToast(result.error.message ?? "Sign in failed");
        return;
      }
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await migrateLocalToCloud(data.user.id);
        setCloudProfile(await fetchProfile(data.user.id));
      }
      showToast(`Signed in with ${provider === "google" ? "Google" : "Apple"}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Sign in failed");
    }
  };

  const doBackup = async () => {
    if (!authUser) { close(); showToast("Sign in to back up"); return; }
    try {
      const ob = loadOnboarding();
      await pushGoals(authUser.id, ob);
      await updateProfile(authUser.id, { focus_goal: ob.dailyLimit });
      setSynced(new Date().toISOString());
      setCloudProfile(await fetchProfile(authUser.id));
      close();
      showToast("Backup complete");
    } catch {
      close();
      showToast("Backup failed — try again");
    }
  };

  const doRestore = async () => {
    if (!authUser) { close(); showToast("Sign in to restore"); return; }
    try {
      const cloud = await fetchProfile(authUser.id);
      if (cloud?.focus_goal) {
        const ob = loadOnboarding();
        saveOnboarding({ ...ob, dailyLimit: cloud.focus_goal });
      }
      setCloudProfile(cloud);
      close();
      showToast("Data restored");
    } catch {
      close();
      showToast("Restore failed — try again");
    }
  };

  const exportData = () => {
    const data = { onboarding: loadOnboarding(), account, theme, language, notifs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "unloop-data.json"; a.click();
    URL.revokeObjectURL(url);
    close();
    showToast("Exported");
  };

  const doReset = () => {
    resetOnboarding();
    close();
    showToast("Progress reset");
    setTimeout(() => navigate({ to: "/onboarding" }), 600);
  };

  const doLogout = async () => {
    await supabase.auth.signOut();
    setCloudProfile(null);
    close();
    showToast("Logged out — continuing as Guest");
  };

  const doDelete = async () => {
    if (authUser) {
      await supabase.from("profiles").delete().eq("id", authUser.id);
      await supabase.auth.signOut();
    }
    resetOnboarding();
    try { localStorage.removeItem("unloop.profile.v1"); } catch {}
    close();
    navigate({ to: "/onboarding" });
  };

  const notifyPremium = () => {
    close();
    showToast("Thanks — we'll email you when Pro is live");
  };


  const [onboarding, setOnboarding] = useState<{ apps: number; dailyLimit: number }>({ apps: 4, dailyLimit: 50 });
  useEffect(() => {
    const ob = loadOnboarding();
    setOnboarding({ apps: ob.apps.length || 4, dailyLimit: ob.dailyLimit || 50 });
  }, []);
  const apps = onboarding.apps;
  const dailyLimit = cloudProfile?.focus_goal ?? onboarding.dailyLimit;

  // Stats from live source of truth
  const joinDate = authUser?.created_at ? new Date(authUser.created_at) : displayProfile.joinDate;
  const memberSince = joinDate
    ? joinDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Today";
  const daysSinceJoin = joinDate
    ? Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / 86400000))
    : 1;



  const saveFocusGoal = async (value: number) => {
    const ob = loadOnboarding();
    saveOnboarding({ ...ob, dailyLimit: value });
    if (authUser) {
      await pushGoals(authUser.id, { ...ob, dailyLimit: value });
      await updateProfile(authUser.id, { focus_goal: value });
      setCloudProfile((p) => p ? { ...p, focus_goal: value } : p);
      setSynced(new Date().toISOString());
    }
    close();
    showToast(`Daily focus goal set to ${value} reels`);
  };


  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Profile" />

      {/* Profile card */}
      <section className="mx-5 mt-2 rounded-3xl bg-card border border-border/60 shadow-soft p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar src={account.avatar} name={account.name} initials={account.initials} size={64} />
            {pro && (
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-flame flex items-center justify-center shadow-glow">
                <Crown className="w-3.5 h-3.5 text-white" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">{account.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {account.provider === "guest" ? "Guest account" : account.email}
            </p>
            {account.provider === "guest" && (
              <button
                onClick={() => setOpen("google")}
                className="mt-1 text-xs font-semibold text-primary inline-flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Sign in to sync
              </button>
            )}
          </div>
        </div>

        {/* Sync status */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          {account.provider !== "guest" ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-primary" />
              <span>Synced</span>
              <span className="opacity-60">·</span>
              <span>{synced ? `Last sync ${timeAgo(synced)}` : "Up to date"}</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5" />
              <span>Local only — not synced</span>
            </>
          )}
        </div>

        {/* Account-level config (streak/focus/saved shown in Your Journey below) */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Stat label="Apps monitored" value={String(apps)} />
          <Stat label="Daily limit" value={`${dailyLimit} reels`} />
        </div>
      </section>

      {/* Your Journey — single CTA, full breakdown lives on /journey */}
      <SectionLabel>Your Journey</SectionLabel>
      <Link
        to="/journey"
        className="mx-5 flex items-center gap-3 rounded-3xl p-4 bg-gradient-to-br from-card via-card to-primary/5 border border-border/60 shadow-soft active:scale-[0.99] transition-transform"
      >
        <div className="w-11 h-11 rounded-2xl bg-gradient-flame flex items-center justify-center shadow-glow shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
             {preview ? 47 : stats.streak}-day streak · {formatDuration(stats.timeSavedAllTimeSec)} saved
          </p>
          <p className="text-xs text-muted-foreground">View full journey, milestones & history</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      <div className="mx-5 mt-3 flex items-center justify-between rounded-2xl bg-surface border border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-primary flex items-center justify-center">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Member since</p>
            <p className="text-sm font-semibold">{memberSince}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{daysSinceJoin} days</p>
      </div>

      {/* Guest sync card */}
      {account.provider === "guest" && (

        <section className="mx-5 mt-4 rounded-3xl p-5 bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-flame flex items-center justify-center shadow-glow shrink-0">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-base">Sign in to sync your progress</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Back up streaks, goals & brain energy across devices. Unlock premium features.
              </p>
              <button
                onClick={() => setOpen("google")}
                className="mt-3 w-full py-3 rounded-2xl bg-white border border-border text-neutral-900 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <GoogleMark /> Continue with Google
              </button>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                You can keep using Unloop without an account.
              </p>
            </div>
          </div>
        </section>
      )}


      {/* Premium */}
      <SectionLabel>Premium</SectionLabel>
      <section className="mx-5 rounded-3xl bg-gradient-flame text-white shadow-glow p-5 overflow-hidden relative">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" />
          <p className="text-xs uppercase tracking-[0.18em] font-semibold opacity-90">
            {pro ? "Unloop Pro — Active" : "Unloop Pro"}
          </p>
        </div>
        <p className="text-xl font-bold leading-tight">{pro ? "You're all set." : "Unlock your full focus potential."}</p>
        <ul className="mt-3 space-y-1.5 text-sm opacity-95">
          <li className="flex items-center gap-2"><Brain className="w-4 h-4" /> AI Coach</li>
          <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Advanced Analytics</li>
          <li className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Unlimited Widgets</li>
          <li className="flex items-center gap-2"><Cloud className="w-4 h-4" /> Cloud Sync</li>
        </ul>
        <button
          onClick={() => setOpen("premium")}
          className="mt-4 w-full py-3 rounded-2xl bg-white text-neutral-900 font-semibold active:scale-[0.98] transition-transform"
        >
          {pro ? "Manage Subscription" : "Get notified when Pro launches"}
        </button>
      </section>

      {/* Sync — combined Sign in + Backup + Restore */}
      <SectionLabel>Sync Across Devices</SectionLabel>
      <Group>
        {account.provider === "guest" ? (
          <Row icon={<GoogleMark />} label="Sign in with Google" value="Sync · Backup · Restore" onClick={() => setOpen("google")} />
        ) : (
          <>
            <Row icon={<CloudUpload className="w-4 h-4" />} label="Back up now" value={synced ? "Synced" : "Off"} onClick={() => setOpen("backup")} />
            <Row icon={<Cloud className="w-4 h-4" />} label="Restore data" onClick={() => setOpen("restore")} />
          </>
        )}
        {ios && account.provider !== "apple" && (
          <Row icon={<Apple className="w-4 h-4" />} label="Sign in with Apple" onClick={() => setOpen("apple")} />
        )}
        {account.provider !== "guest" && (
          <Row icon={<LogOut className="w-4 h-4" />} label="Logout" onClick={() => setOpen("logout")} danger />
        )}
        <Row icon={<Trash2 className="w-4 h-4" />} label="Delete Account" onClick={() => setOpen("delete")} danger />
      </Group>

      {/* Settings */}
      <SectionLabel>Settings</SectionLabel>
      <Group>
        <Row icon={<Bell className="w-4 h-4" />} label="Notifications" onClick={() => setOpen("notifications")} />
        <Row icon={<Target className="w-4 h-4" />} label="Daily focus goal" value={`${dailyLimit} reels`} onClick={() => setOpen("focusGoal")} />
        <Row icon={themeIcon(theme)} label="Theme" value={cap(theme)} onClick={() => setOpen("theme")} />

        
        <Row icon={<Shield className="w-4 h-4" />} label="Privacy" onClick={() => setOpen("privacy")} />
        <Row icon={<Download className="w-4 h-4" />} label="Export Data" onClick={() => setOpen("export")} />
        <Row icon={<RotateCcw className="w-4 h-4" />} label="Reset Progress" onClick={() => setOpen("reset")} danger />
      </Group>

      <div className="h-6" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-card"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-card rounded-t-3xl z-50 p-6 pb-10 shadow-card max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold">{titleFor(open)}</h2>
                <button onClick={close} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(open === "google" || open === "apple") && (
                <SignInSheet provider={open} onSignIn={() => signIn(open)} />
              )}

              {open === "backup" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {account.provider === "guest"
                      ? "Sign in first to back up your focus history to the cloud."
                      : "Securely back up your streaks, stats and preferences."}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Last sync: <span className="font-medium text-foreground">{synced ? new Date(synced).toLocaleString() : "Never"}</span>
                  </p>
                  <button
                    onClick={doBackup}
                    disabled={account.provider === "guest"}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame disabled:opacity-50"
                  >
                    Back Up Now
                  </button>
                </div>
              )}

              {open === "restore" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Restore your data from your last cloud backup.</p>
                  <button onClick={doRestore} className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Restore</button>
                </div>
              )}

              {open === "logout" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-5">You'll continue as Guest. Local progress stays on this device.</p>
                  <button onClick={doLogout} className="w-full py-3.5 rounded-2xl font-semibold text-white bg-destructive">Log Out</button>
                  <button onClick={close} className="mt-2 w-full py-3.5 rounded-2xl font-semibold bg-muted">Cancel</button>
                </div>
              )}

              {open === "delete" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-5">This permanently deletes your account and local data. This cannot be undone.</p>
                  <button onClick={doDelete} className="w-full py-3.5 rounded-2xl font-semibold text-white bg-destructive">Delete Account</button>
                  <button onClick={close} className="mt-2 w-full py-3.5 rounded-2xl font-semibold bg-muted">Cancel</button>
                </div>
              )}

              {open === "notifications" && (
                <div className="space-y-1">
                  <ToggleRow label="Daily reminders" on={notifs.daily} onChange={(v) => setNotifs({ ...notifs, daily: v })} />
                  <ToggleRow label="AI insights" on={notifs.insights} onChange={(v) => setNotifs({ ...notifs, insights: v })} />
                  <ToggleRow label="Milestone alerts" on={notifs.milestones} onChange={(v) => setNotifs({ ...notifs, milestones: v })} />
                  <ToggleRow label="Streak warnings" on={notifs.streak} onChange={(v) => setNotifs({ ...notifs, streak: v })} />
                  <button onClick={close} className="mt-5 w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Done</button>
                </div>
              )}

              {open === "theme" && (
                <div className="space-y-2">
                  {(["light","dark","auto"] as Theme[]).map((t) => (
                    <button key={t} onClick={() => { setTheme(t); close(); }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/50">
                      {themeIcon(t)}
                      <span className="flex-1 text-left text-sm font-medium">{cap(t)}</span>
                      {theme === t && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {open === "language" && (
                <div className="space-y-2">
                  {["English","हिन्दी (Hindi)","తెలుగు (Telugu)","ଓଡ଼ିଆ (Odia)","தமிழ் (Tamil)"].map((l) => (
                    <button key={l} onClick={() => { setLanguage(l); close(); }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/50">
                      <span className="flex-1 text-left text-sm font-medium">{l}</span>
                      {language === l && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {open === "privacy" && (
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Your behavioral data is stored on this device. We never sell it. You can export or delete it anytime.
                  </p>
                  <Link to="/hardcore" onClick={close} className="block w-full py-3 rounded-2xl bg-accent text-primary text-sm font-semibold text-center">
                    Manage Hardcore Mode
                  </Link>
                </div>
              )}

              {open === "export" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Download all your data as a JSON file.</p>
                  <button onClick={exportData} className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Download</button>
                </div>
              )}

              {open === "reset" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-5">Reset all progress, streaks and onboarding. You'll start fresh.</p>
                  <button onClick={doReset} className="w-full py-3.5 rounded-2xl font-semibold text-white bg-destructive">Reset Everything</button>
                  <button onClick={close} className="mt-2 w-full py-3.5 rounded-2xl font-semibold bg-muted">Cancel</button>
                </div>
              )}

              {open === "premium" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Pricing coming soon — locked features unlock during the open beta.</p>
                  <ul className="space-y-2 mb-5 text-sm">
                    <Feature icon={<Brain className="w-4 h-4" />} text="AI Coach with personalised nudges" />
                    <Feature icon={<BarChart3 className="w-4 h-4" />} text="Advanced analytics & exports" />
                    <Feature icon={<LayoutGrid className="w-4 h-4" />} text="Unlimited home-screen widgets" />
                    <Feature icon={<Cloud className="w-4 h-4" />} text="Cross-device cloud sync" />
                  </ul>
                  <button onClick={notifyPremium} className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Notify Me When Live</button>
                </div>
              )}

              {open === "focusGoal" && (
                <FocusGoalSheet initial={dailyLimit} onSave={saveFocusGoal} />
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function titleFor(k: Exclude<SheetKey, null>) {
  const map: Record<Exclude<SheetKey, null>, string> = {
    google: "Sign in with Google", apple: "Sign in with Apple",
    backup: "Backup & Sync", restore: "Restore Data",
    logout: "Log Out?", delete: "Delete Account?",
    notifications: "Notifications", theme: "Theme", language: "Language",
    privacy: "Privacy", export: "Export Data", reset: "Reset Progress?",
    premium: "Unloop Pro", focusGoal: "Daily Focus Goal",
  };
  return map[k];
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function FocusGoalSheet({ initial, onSave }: { initial: number; onSave: (v: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Set your daily reel limit. Your brain energy resets each day based on this goal.
      </p>
      <div className="text-center mb-4">
        <p className="text-5xl font-bold bg-gradient-flame bg-clip-text text-transparent">{value}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">reels per day</p>
      </div>
      <input
        type="range" min={10} max={300} step={5} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1 mb-5">
        <span>10</span><span>150</span><span>300</span>
      </div>
      <button onClick={() => onSave(value)} className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame inline-flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4" /> Save Goal
      </button>
    </div>
  );
}


function cap(s: string) { return s[0].toUpperCase() + s.slice(1); }
function themeIcon(t: Theme) {
  if (t === "light") return <Sun className="w-4 h-4" />;
  if (t === "dark") return <Moon className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-border/60 p-3 text-center">
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-6 pt-6 pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{children}</p>;
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-5 rounded-3xl bg-card border border-border/60 shadow-soft divide-y divide-border/60 overflow-hidden">
      {children}
    </section>
  );
}

function Row({ icon, label, value, onClick, danger }: { icon: React.ReactNode; label: string; value?: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="block w-full">
      <div className="flex items-center gap-3 p-4 w-full text-left active:bg-muted/50 transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? "bg-destructive/10 text-destructive" : "bg-accent text-primary"}`}>{icon}</div>
        <span className={`flex-1 text-sm font-medium ${danger ? "text-destructive" : ""}`}>{label}</span>
        {value && <span className="text-sm text-muted-foreground">{value}</span>}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="w-full flex items-center justify-between py-3 border-b border-border/40 last:border-0 text-left">
      <span className="text-sm">{label}</span>
      <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`block w-5 h-5 rounded-full bg-background shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-accent text-primary flex items-center justify-center">{icon}</span>
      <span>{text}</span>
    </li>
  );
}

function SignInSheet({ provider, onSignIn }: { provider: "google" | "apple"; onSignIn: () => void }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-5">
        Continue with {provider === "google" ? "Google" : "Apple"} to sync your focus journey across devices. We never post on your behalf.
      </p>
      <button
        onClick={onSignIn}
        className={`w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 ${provider === "apple" ? "bg-foreground text-background" : "bg-white border border-border text-neutral-900"}`}
      >
        {provider === "apple" ? <Apple className="w-4 h-4" /> : <GoogleMark />}
        Continue with {provider === "google" ? "Google" : "Apple"}
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 7 29.2 5 24 5 16.3 5 9.7 9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5.2 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 34 26.7 35 24 35c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 38.9 16.3 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
