import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { UnloopMark } from "@/components/UnloopLogo";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { migrateLocalToCloud } from "@/lib/cloud-sync";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Unloop" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use getUser() — re-validates with the Auth server (getSession returns
    // any persisted token without verification, which is unsafe for routing).
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        migrateLocalToCloud(data.user.id).finally(() => navigate({ to: "/profile" }));
      }
    });
  }, [navigate]);

  const signInGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        setError(result.error.message ?? "Sign in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) await migrateLocalToCloud(data.user.id);
      navigate({ to: "/profile" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="w-full max-w-[440px] min-h-dvh relative flex flex-col px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-glow mb-6 p-3">
            <UnloopMark size={72} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Unloop</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Sign in to sync your streaks, goals and brain energy across devices.
          </p>

          {error && (
            <p className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-xl">{error}</p>
          )}

          <button
            onClick={signInGoogle}
            disabled={loading}
            className="mt-10 w-full max-w-sm py-3.5 rounded-2xl bg-white border border-border text-neutral-900 font-semibold flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <GoogleMark />
            {loading ? "Connecting…" : "Continue with Google"}
          </button>

          <Link
            to="/profile"
            className="mt-4 text-sm text-muted-foreground inline-flex items-center gap-1"
          >
            Continue as guest <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          By continuing you agree to our Terms and Privacy Policy. Your data stays yours.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 7 29.2 5 24 5 16.3 5 9.7 9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5.2 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 34 26.7 35 24 35c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 38.9 16.3 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
