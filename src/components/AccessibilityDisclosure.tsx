import { useState } from "react";
import { Accessibility, ShieldCheck, EyeOff, Server, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";

/**
 * Google Play Accessibility Service prominent-disclosure screen.
 *
 * Play policy requires that, BEFORE we send the user to Settings to enable
 * the Accessibility Service, we show an in-app screen that explains:
 *   - which feature relies on the service
 *   - exactly what data the service accesses
 *   - that the data does not leave the device beyond aggregated counts
 *   - how to revoke
 * The user must take an affirmative action to proceed.
 *
 * Render this as a modal/sheet before calling
 * `requestNativePermission("accessibility")`.
 */
export function AccessibilityDisclosure({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="acc-disclosure-title"
        >
          <motion.div
            className="w-full sm:max-w-md bg-card text-foreground rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border/60 max-h-[92vh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-accent text-primary flex items-center justify-center">
                  <Accessibility className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="acc-disclosure-title"
                    className="font-bold text-base leading-tight"
                  >
                    Use Accessibility Service
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Required disclosure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 space-y-4 text-sm leading-relaxed">
              <p>
                Unloop uses Android&apos;s Accessibility Service to detect
                when a short-video feed (Instagram Reels, YouTube Shorts,
                Facebook Reels, TikTok, Snapchat Spotlight) appears on
                screen, so we can show the focus overlay and count the
                session.
              </p>

              <ul className="space-y-3">
                <Bullet
                  icon={<EyeOff className="w-4 h-4" />}
                  title="What we read"
                  body="Only window and view-identifier signals from a fixed allow-list of short-video apps — enough to recognize a Reels/Shorts feed."
                />
                <Bullet
                  icon={<ShieldCheck className="w-4 h-4" />}
                  title="What we never read"
                  body="No messages, posts, captions, comments, passwords, form fields, or any text content on screen."
                />
                <Bullet
                  icon={<Server className="w-4 h-4" />}
                  title="What leaves your device"
                  body="Only aggregated session counts and the app package name, sent to your own Unloop account. Never sold or used for advertising."
                />
              </ul>

              <p className="text-xs text-muted-foreground">
                You can turn this off any time in Android Settings →
                Accessibility → Unloop. Full details in our{" "}
                <Link
                  to="/privacy"
                  className="underline text-foreground"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </p>

              <label className="flex items-start gap-3 rounded-2xl border border-border/60 p-3 bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary"
                />
                <span className="text-xs">
                  I understand Unloop will use the Accessibility Service only
                  to detect short-video feeds, and that no screen text is
                  collected.
                </span>
              </label>
            </div>

            <div className="p-5 pt-4 space-y-2">
              <button
                type="button"
                disabled={!confirmed}
                onClick={onAccept}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-white bg-gradient-flame shadow-glow disabled:opacity-40 disabled:shadow-none"
              >
                Continue to Settings
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 rounded-2xl font-medium text-sm text-muted-foreground"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Bullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 w-7 h-7 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span>
        <span className="font-semibold block">{title}</span>
        <span className="text-muted-foreground text-xs">{body}</span>
      </span>
    </li>
  );
}
