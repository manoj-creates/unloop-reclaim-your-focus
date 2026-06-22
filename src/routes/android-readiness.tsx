import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, StatusBar, ScreenHeader } from "@/components/AppShell";
import {
  Layers,
  Accessibility,
  Bell,
  BatteryCharging,
  Smartphone,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePermissions, requestNativePermission, canDirectPrompt, setOverlayEnabled, type PermissionId } from "@/lib/native-bridge";
import { useReelsCounter } from "@/lib/reels-store";
import { markReadinessReviewed, isReadinessReviewed } from "@/lib/onboarding-store";
import { useNavigate } from "@tanstack/react-router";
import { AccessibilityDisclosure } from "@/components/AccessibilityDisclosure";

export const Route = createFileRoute("/android-readiness")({
  head: () => ({ meta: [{ title: "Android Readiness — Unloop" }] }),
  component: AndroidReadiness,
});

type CheckMeta = {
  id: PermissionId;
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
  steps: string[];
};

const CHECK_META: CheckMeta[] = [
  {
    id: "overlay",
    icon: <Layers className="w-5 h-5" />,
    title: "Display over other apps",
    description: "Required to show Unloop's focus overlay above Reels.",
    required: true,
    steps: [
      "Open Settings → Apps → Special access",
      'Tap "Display over other apps"',
      "Find Unloop in the list",
      'Toggle "Allow display over other apps" on',
    ],
  },
  {
    id: "accessibility",
    icon: <Accessibility className="w-5 h-5" />,
    title: "Accessibility service",
    description: "Used to detect when you open a Reels or Shorts feed.",
    required: true,
    steps: [
      "Open Settings → Accessibility",
      'Scroll to "Installed apps" and tap Unloop',
      'Toggle "Use Unloop" on',
      'Confirm by tapping "Allow"',
    ],
  },
  {
    id: "notifications",
    icon: <Bell className="w-5 h-5" />,
    title: "Notifications",
    description: "Sends gentle nudges, streak reminders and daily summaries.",
    required: false,
    steps: [
      "Open Settings → Apps → Unloop → Notifications",
      'Toggle "Allow notifications" on',
      "Optionally enable each channel you want",
    ],
  },
  {
    id: "battery",
    icon: <BatteryCharging className="w-5 h-5" />,
    title: "Battery optimization",
    description: "Disable optimization so Unloop can run reliably in the background.",
    required: true,
    steps: [
      "Open Settings → Battery → Battery optimization",
      'Switch the filter to "All apps"',
      "Find Unloop and tap it",
      'Choose "Don\'t optimize" and confirm',
    ],
  },
  {
    id: "compatibility",
    icon: <Smartphone className="w-5 h-5" />,
    title: "Device compatibility",
    description: "Android 10+ with overlay & accessibility APIs supported.",
    required: true,
    steps: [
      "Unloop requires Android 10 (API 29) or newer",
      "We'll verify your device version automatically",
      "No further action needed when supported",
    ],
  },
];

function AndroidReadiness() {
  const { perms, hasBridge } = usePermissions();
  const navigate = useNavigate();
  const [reviewed, setReviewed] = useState(isReadinessReviewed());

  const checks = useMemo(
    () => CHECK_META.map((c) => ({ ...c, granted: !!perms[c.id] })),
    [perms]
  );

  const [expanded, setExpanded] = useState<PermissionId | null>(null);
  const [discloseOpen, setDiscloseOpen] = useState(false);

  const handleRequest = (id: PermissionId) => {
    if (id === "accessibility") {
      setDiscloseOpen(true);
      return;
    }
    requestNativePermission(id);
  };

  const required = checks.filter((c) => c.required);
  const grantedRequired = required.filter((c) => c.granted).length;
  const totalRequired = required.length;
  const allReady = grantedRequired === totalRequired;
  const progress = Math.round((grantedRequired / Math.max(1, totalRequired)) * 100);

  // Phase D — auto-start the brain-pill overlay once the two required
  // native surfaces are live (overlay-window permission + accessibility
  // service). Idempotent on the native side; stops if either flips off.
  const { total: reelsTotal } = useReelsCounter();
  const overlayReady = !!perms.overlay && !!perms.accessibility;
  useEffect(() => {
    if (!hasBridge) return;
    setOverlayEnabled(overlayReady, reelsTotal);
  }, [hasBridge, overlayReady, reelsTotal]);

  return (
    <AppShell>
      <StatusBar />
      <ScreenHeader title="Android Readiness" back="/settings" />

      <div className="px-5">
        <p className="text-sm text-muted-foreground">
          Permissions Unloop needs to detect Reels and show the focus overlay.

        </p>
      </div>

      <section
        className={`mx-5 mt-4 rounded-3xl border shadow-soft p-5 ${
          allReady
            ? "bg-success/10 border-success/30"
            : "bg-card border-border/60"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              allReady ? "bg-success text-white" : "bg-accent text-primary"
            }`}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold">
              {allReady ? "You're all set" : "Setup in progress"}
            </p>
            <p className="text-xs text-muted-foreground">
              {grantedRequired} of {totalRequired} required permissions granted
            </p>
          </div>
          <span className="text-2xl font-bold tabular-nums">{progress}%</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              allReady ? "bg-success" : "bg-gradient-flame"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="mx-5 mt-4 space-y-3">
        {checks.map((c) => {
          const open = expanded === c.id;
          return (
            <div
              key={c.id}
              className="rounded-3xl bg-card border border-border/60 shadow-soft overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : c.id)}
                className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/40 transition-colors"
                aria-expanded={open}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    c.granted
                      ? "bg-success/15 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{c.title}</p>
                    {!c.required && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border/60 rounded-full px-1.5 py-0.5">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.description}
                  </p>
                </div>
                <StatusPill granted={c.granted} />
                {open ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-border/40">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-3">
                        Setup steps
                      </p>
                      <ol className="space-y-2">
                        {c.steps.map((s, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-primary text-[11px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-foreground/90 leading-snug">
                              {s}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {!c.granted && c.id !== "compatibility" && (
                        <button
                          type="button"
                          onClick={() => handleRequest(c.id)}
                          disabled={!hasBridge}
                          className="mt-4 w-full py-3 rounded-2xl font-semibold text-white shadow-glow bg-gradient-flame text-sm disabled:opacity-50 disabled:shadow-none"
                        >
                          {!hasBridge
                            ? "Install Unloop Android to grant"
                            : canDirectPrompt(c.id)
                            ? "Allow now"
                            : "Open system settings"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>

      {!hasBridge && (
        <div className="mx-5 mt-4 rounded-2xl bg-muted/50 border border-border/60 px-4 py-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Native bridge not detected. Install the Unloop Android app to grant
            permissions and enable live status. The web preview shows the
            checklist with all permissions ungranted.
          </p>
        </div>
      )}

      {!reviewed && (
        <div className="mx-5 mt-5 mb-2">
          <button
            type="button"
            onClick={() => {
              markReadinessReviewed();
              setReviewed(true);
              navigate({ to: "/app" });
            }}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm shadow-glow ${
              allReady
                ? "bg-success text-white"
                : "bg-gradient-flame text-white"
            }`}
          >
            {allReady ? "Continue to Unloop" : "I'll finish setup later"}
          </button>
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            You can revisit this screen anytime from Settings.
          </p>
        </div>
      )}

      <AccessibilityDisclosure
        open={discloseOpen}
        onCancel={() => setDiscloseOpen(false)}
        onAccept={() => {
          setDiscloseOpen(false);
          requestNativePermission("accessibility");
        }}
      />
    </AppShell>
  );
}


function StatusPill({ granted }: { granted: boolean }) {
  return granted ? (
    <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-1">
      <CheckCircle2 className="w-3.5 h-3.5" /> Granted
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-2 py-1">
      <XCircle className="w-3.5 h-3.5" /> Action needed
    </span>
  );
}
