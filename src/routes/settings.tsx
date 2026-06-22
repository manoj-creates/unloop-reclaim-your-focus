import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import { Clock, Lock, Bell, Layout, Shield, HelpCircle, LogOut, ChevronRight, X, Check, Smartphone, CloudUpload, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useUserProfile } from "@/lib/user-profile";
import { useHardcore } from "@/lib/hardcore-store";
import { motion, AnimatePresence } from "motion/react";
import { loadOnboarding, saveOnboarding, resetOnboarding } from "@/lib/onboarding-store";
import { useNotificationSettings, type NotificationSettings } from "@/lib/notifications";
import { buildLocalBackup, downloadBackup, readBackupFile, applyBackup, summarizeBackup, pushBackupToCloud, fetchCloudBackup, lastBackupAt, lastRestoreAt, type BackupBlob, type BackupSummary } from "@/lib/backup-restore";
import { useSyncStatus } from "@/lib/sync-status";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { reportError } from "@/lib/crashlytics";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Unloop" }] }),
  component: Settings,
});

type SheetKey =
  | "daily-limit"
  | "focus-reminders"
  | "notifications"
  | "privacy"
  | "backup"
  | "help"
  | "logout"
  | "delete-account"
  | null;

function Settings() {
  const navigate = useNavigate();
  const profile = useUserProfile();
  const { state: hardcore } = useHardcore();
  const [open, setOpen] = useState<SheetKey>(null);
  const close = () => setOpen(null);

  const stored = typeof window !== "undefined" ? loadOnboarding() : null;

  // Daily limit
  const [dailyLimit, setDailyLimit] = useState<number>(stored?.dailyLimit ?? 50);

  // Notifications (real, via native bridge)
  const { settings: notifs, update: updateNotifs, hasBridge: notifsBridge } = useNotificationSettings();
  const [notifError, setNotifError] = useState<string | null>(null);

  // Focus reminders share the notification system (subset).
  const focus = { morning: notifs.morning, midday: notifs.midday, evening: notifs.evening, streakWarn: notifs.streak };
  const setFocus = async (patch: Partial<typeof focus>) => {
    setNotifError(null);
    const next: Partial<NotificationSettings> = {};
    if ("morning" in patch) next.morning = patch.morning;
    if ("midday" in patch) next.midday = patch.midday;
    if ("evening" in patch) next.evening = patch.evening;
    if ("streakWarn" in patch) next.streak = patch.streakWarn;
    const r = await updateNotifs(next);
    if (!r.ok) setNotifError(r.reason);
  };
  const setNotif = async (patch: Partial<NotificationSettings>) => {
    setNotifError(null);
    const r = await updateNotifs(patch);
    if (!r.ok) setNotifError(r.reason);
  };

  // Backup state
  const sync = useSyncStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ blob: BackupBlob; summary: BackupSummary } | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastRestore, setLastRestore] = useState<string | null>(null);
  useEffect(() => { setLastBackup(lastBackupAt()); setLastRestore(lastRestoreAt()); }, [backupMsg]);

  // Privacy
  const [exported, setExported] = useState(false);

  // Delete account
  const deleteAccountFn = useServerFn(deleteMyAccount);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const saveLimit = () => {
    const d = loadOnboarding();
    saveOnboarding({ ...d, dailyLimit });
    close();
  };

  const exportData = () => {
    const blob = buildLocalBackup();
    downloadBackup(blob);
    setExported(true);
    setTimeout(() => setExported(false), 1800);
  };

  const doBackupNow = async () => {
    setBackupBusy(true); setBackupMsg(null);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        // Local-only — just download.
        downloadBackup(buildLocalBackup());
        setBackupMsg("Backup downloaded. Sign in to back up to the cloud.");
      } else {
        const blob = await pushBackupToCloud(data.user.id);
        setBackupMsg(`Backed up ${Object.keys(blob.stores).length} stores to the cloud.`);
      }
    } catch (e) {
      reportError(e, "backup.now");
      setBackupMsg(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBackupBusy(false);
    }
  };

  const onPickRestoreFile = async (file: File) => {
    setBackupMsg(null);
    try {
      const blob = await readBackupFile(file);
      setPendingRestore({ blob, summary: summarizeBackup(blob) });
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : "Invalid backup file.");
    }
  };

  const restoreFromCloud = async () => {
    setBackupBusy(true); setBackupMsg(null);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setBackupMsg("Sign in to restore from the cloud."); return; }
      const blob = await fetchCloudBackup(data.user.id);
      if (!blob) { setBackupMsg("No cloud backup found yet."); return; }
      setPendingRestore({ blob, summary: summarizeBackup(blob) });
    } catch (e) {
      reportError(e, "backup.restoreFromCloud");
      setBackupMsg(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setBackupBusy(false);
    }
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    try {
      applyBackup(pendingRestore.blob);
      setBackupMsg("Restore complete. Reloading…");
      setPendingRestore(null);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      reportError(e, "backup.applyRestore");
      setBackupMsg(e instanceof Error ? e.message : "Restore failed.");
    }
  };

  const doLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    close();
    navigate({ to: "/onboarding" });
  };

  const doDeleteAccount = async () => {
    setDeleteError(null);
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccountFn();
      try { await supabase.auth.signOut(); } catch {}
      // Wipe every local store.
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k?.startsWith("unloop.")) localStorage.removeItem(k);
        }
      } catch {}
      resetOnboarding();
      navigate({ to: "/onboarding" });
    } catch (e) {
      reportError(e, "account.delete");
      setDeleteError(e instanceof Error ? e.message : "Could not delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Settings" />

      <div className="px-5"><p className="text-sm text-muted-foreground">Customize your experience.</p></div>

      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft p-5 flex items-center gap-4">
        <UserAvatar src={profile.avatarUrl} name={profile.name} initials={profile.initials} size={56} />
        <div className="min-w-0">
          <p className="font-bold truncate">{profile.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {profile.isAuthenticated ? (profile.email ?? "Signed in") : "Guest account"}
          </p>
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-3xl bg-card border border-border/60 shadow-soft divide-y divide-border/60 overflow-hidden">
        <Row icon={<Clock className="w-4 h-4" />} label="Daily Limit" value={`${dailyLimit} Reels`} onClick={() => setOpen("daily-limit")} />
        <Row icon={<Lock className="w-4 h-4" />} label="Hardcore Mode" value={hardcore.enabled ? "On" : "Off"} to="/hardcore" />
        <Row icon={<Bell className="w-4 h-4" />} label="Focus Reminders" value={Object.values(focus).filter(Boolean).length > 0 ? "On" : "Off"} onClick={() => setOpen("focus-reminders")} />
        <Row icon={<Layout className="w-4 h-4" />} label="Widget Settings" to="/widgets" />
        <Row icon={<Bell className="w-4 h-4" />} label="Notifications" onClick={() => setOpen("notifications")} />
        <Row icon={<CloudUpload className="w-4 h-4" />} label="Backup & Restore" onClick={() => setOpen("backup")} />
        <Row icon={<Shield className="w-4 h-4" />} label="Data & Privacy" onClick={() => setOpen("privacy")} />
        <Row icon={<Smartphone className="w-4 h-4" />} label="Android Readiness" to="/android-readiness" />
        <Row icon={<HelpCircle className="w-4 h-4" />} label="Help & Support" onClick={() => setOpen("help")} />
      </section>

      {/* Sync status */}
      <div className="mx-5 mt-3 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>
          {sync.inFlight ? "Syncing…" : sync.lastSyncAt ? `Last synced ${formatRelative(sync.lastSyncAt)}` : "Not synced yet"}
        </span>
        {sync.lastError && <span className="text-destructive">Sync error</span>}
      </div>

      <button
        onClick={() => setOpen("logout")}
        className="mx-5 mt-5 w-[calc(100%-2.5rem)] py-3.5 rounded-2xl bg-card border border-border/60 text-destructive font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      {profile.isAuthenticated && (
        <button
          onClick={() => { setDeleteConfirm(""); setDeleteError(null); setOpen("delete-account"); }}
          className="mx-5 mt-2 mb-4 w-[calc(100%-2.5rem)] py-3.5 rounded-2xl bg-card border border-destructive/40 text-destructive font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-card rounded-t-3xl z-50 p-6 pb-10 shadow-card max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold">{titleFor(open)}</h2>
                <button onClick={close} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {open === "daily-limit" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Set a healthy daily reel cap. You'll be nudged when approaching it.</p>
                  <div className="text-center mb-4">
                    <span className="text-5xl font-bold">{dailyLimit}</span>
                    <span className="text-sm text-muted-foreground ml-2">reels / day</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={5}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>10</span><span>200</span>
                  </div>
                  <button onClick={saveLimit} className="mt-5 w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Save Limit</button>
                </div>
              )}

              {open === "focus-reminders" && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-3">Pick when you'd like gentle nudges.</p>
                  {!notifsBridge && <BridgeNotice />}
                  <ToggleRow label="Morning intention (8am)" on={focus.morning} onChange={(v) => setFocus({ morning: v })} />
                  <ToggleRow label="Midday check-in (1pm)" on={focus.midday} onChange={(v) => setFocus({ midday: v })} />
                  <ToggleRow label="Evening wind-down (9pm)" on={focus.evening} onChange={(v) => setFocus({ evening: v })} />
                  <ToggleRow label="Streak warning" on={focus.streakWarn} onChange={(v) => setFocus({ streakWarn: v })} />
                  {notifError && <p className="mt-2 text-xs text-destructive">{notifError}</p>}
                  <button onClick={close} className="mt-5 w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Done</button>
                </div>
              )}

              {open === "notifications" && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-3">Manage which alerts reach you.</p>
                  {!notifsBridge && <BridgeNotice />}
                  <ToggleRow label="Daily summary" on={notifs.daily} onChange={(v) => setNotif({ daily: v })} />
                  <ToggleRow label="Streak warnings" on={notifs.streak} onChange={(v) => setNotif({ streak: v })} />
                  <ToggleRow label="Weekly progress report" on={notifs.weekly} onChange={(v) => setNotif({ weekly: v })} />
                  {notifError && <p className="mt-2 text-xs text-destructive">{notifError}</p>}
                  <button onClick={close} className="mt-5 w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame">Done</button>
                </div>
              )}

              {open === "backup" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    A backup includes goals, streaks, recovery sessions, brain history, milestones, widgets, focus history and preferences.
                  </p>
                  <div className="rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground mb-4 space-y-1">
                    <div>Last backup: <span className="text-foreground">{lastBackup ? formatRelative(lastBackup) : "Never"}</span></div>
                    <div>Last restore: <span className="text-foreground">{lastRestore ? formatRelative(lastRestore) : "Never"}</span></div>
                  </div>
                  <button onClick={doBackupNow} disabled={backupBusy} className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame mb-2 flex items-center justify-center gap-2 disabled:opacity-60">
                    {backupBusy && <Loader2 className="w-4 h-4 animate-spin" />} Back up now
                  </button>
                  <button onClick={restoreFromCloud} disabled={backupBusy} className="w-full py-3 rounded-2xl font-semibold bg-accent text-primary mb-2 disabled:opacity-60">
                    Restore from cloud
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 rounded-2xl font-semibold bg-muted">
                    Restore from file…
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickRestoreFile(f); e.target.value = ""; }}
                  />
                  {backupMsg && <p className="mt-3 text-xs text-muted-foreground">{backupMsg}</p>}

                  {pendingRestore && (
                    <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-destructive">Confirm restore</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This will overwrite your current local data. From {new Date(pendingRestore.summary.createdAt).toLocaleString()}:
                          </p>
                        </div>
                      </div>
                      <ul className="text-xs space-y-1 mt-2 mb-3 text-muted-foreground">
                        <li>{pendingRestore.summary.goals} goals · {pendingRestore.summary.apps} apps tracked</li>
                        <li>{pendingRestore.summary.recoverySessions} recovery sessions</li>
                        <li>{pendingRestore.summary.brainTransitions} brain transitions</li>
                        <li>Widgets: {pendingRestore.summary.widgetsConfigured ? "yes" : "no"} · Notifications: {pendingRestore.summary.notificationsConfigured ? "yes" : "no"}</li>
                      </ul>
                      <div className="flex gap-2">
                        <button onClick={confirmRestore} className="flex-1 py-3 rounded-xl font-semibold text-white bg-destructive">Overwrite</button>
                        <button onClick={() => setPendingRestore(null)} className="flex-1 py-3 rounded-xl font-semibold bg-muted">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {open === "privacy" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Export a full backup or wipe local data. Cloud backups are managed under Backup & Restore.</p>
                  <button onClick={exportData} className="w-full py-3.5 rounded-2xl font-semibold bg-accent text-primary mb-2 flex items-center justify-center gap-2">
                    {exported ? (<><Check className="w-4 h-4" /> Exported</>) : "Export My Data"}
                  </button>
                  <Link to="/privacy" onClick={close} className="block text-center w-full py-3.5 rounded-2xl font-semibold bg-muted mb-2">Privacy Policy</Link>
                  <button
                    onClick={() => {
                      try {
                        for (let i = localStorage.length - 1; i >= 0; i--) {
                          const k = localStorage.key(i);
                          if (k?.startsWith("unloop.")) localStorage.removeItem(k);
                        }
                      } catch {}
                      resetOnboarding(); close(); navigate({ to: "/onboarding" });
                    }}
                    className="w-full py-3.5 rounded-2xl font-semibold border border-destructive/40 text-destructive"
                  >
                    Delete Local Data
                  </button>
                </div>
              )}

              {open === "help" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reach our team directly — we read every message and reply within 24 hours.
                  </p>
                  <a
                    href="mailto:hello@unloop.app?subject=Unloop%20support"
                    onClick={close}
                    className="block w-full text-center py-3.5 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame"
                  >
                    Email hello@unloop.app
                  </a>
                  <p className="text-[11px] text-muted-foreground mt-3 text-center">
                    Or include your device + a short description of the issue.
                  </p>
                </div>
              )}

              {open === "logout" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-5">Your streak and progress stay safe. You can log back in anytime.</p>
                  <button onClick={doLogout} className="w-full py-3.5 rounded-2xl font-semibold text-white bg-destructive">Yes, Log Out</button>
                  <button onClick={close} className="mt-2 w-full py-3.5 rounded-2xl font-semibold bg-muted">Cancel</button>
                </div>
              )}

              {open === "delete-account" && (
                <div>
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 mb-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-destructive">This is permanent.</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Your account, profile, streaks, analytics, goals, widgets, recovery sessions, milestones and cloud backup will be deleted. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <label className="block text-xs font-medium mb-2">Type <span className="font-mono text-destructive">DELETE</span> to confirm</label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    disabled={deleting}
                    className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-mono uppercase tracking-wider mb-3"
                    placeholder="DELETE"
                  />
                  {deleteError && <p className="text-xs text-destructive mb-3">{deleteError}</p>}
                  <button
                    onClick={doDeleteAccount}
                    disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white bg-destructive flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {deleting ? "Deleting…" : "Permanently delete my account"}
                  </button>
                  <button onClick={close} disabled={deleting} className="mt-2 w-full py-3.5 rounded-2xl font-semibold bg-muted disabled:opacity-50">Cancel</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function BridgeNotice() {
  return (
    <p className="text-[11px] text-muted-foreground bg-muted/60 rounded-xl px-3 py-2 mb-2">
      Notifications run on the installed Android app. They won't fire in the browser preview.
    </p>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function titleFor(k: Exclude<SheetKey, null>) {
  switch (k) {
    case "daily-limit": return "Daily Limit";
    case "focus-reminders": return "Focus Reminders";
    case "notifications": return "Notifications";
    case "backup": return "Backup & Restore";
    case "privacy": return "Data & Privacy";
    case "help": return "Help & Support";
    case "logout": return "Log Out?";
    case "delete-account": return "Delete Account";
  }
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between py-3 border-b border-border/40 last:border-0 text-left"
    >
      <span className="text-sm">{label}</span>
      <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`block w-5 h-5 rounded-full bg-background shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function Row({ icon, label, value, to, onClick }: { icon: React.ReactNode; label: string; value?: string; to?: string; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3 p-4 w-full text-left active:bg-muted/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-accent text-primary flex items-center justify-center">{icon}</div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
  if (to) return <Link to={to} className="block">{inner}</Link>;
  return <button type="button" onClick={onClick} className="block w-full">{inner}</button>;
}
