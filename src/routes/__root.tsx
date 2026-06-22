import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card border border-border/60 shadow-card p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Lost the loop</p>
        <h1 className="mt-2 text-6xl font-bold text-gradient-flame">404</h1>
        <h2 className="mt-3 text-lg font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-flame px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div role="alert" className="w-full max-w-sm rounded-3xl bg-card border border-border/60 shadow-card p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-destructive font-semibold">Something broke</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing, or head back home.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-flame px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Unloop — Break the loop. Reclaim your time." },
      { name: "description", content: "Unloop is a behavioral transformation platform that helps you break dopamine addiction, build streaks, and reclaim focus." },
      { name: "theme-color", content: "#FF5A3D" },
      { name: "author", content: "Unloop" },
      { property: "og:title", content: "Unloop — Break the loop. Reclaim your time." },
      { property: "og:description", content: "Unloop is a behavioral transformation platform that helps you break dopamine addiction, build streaks, and reclaim focus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Unloop — Break the loop. Reclaim your time." },
      { name: "twitter:description", content: "Unloop is a behavioral transformation platform that helps you break dopamine addiction, build streaks, and reclaim focus." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/631b6f45-8743-4574-a087-50ec00cb492f/id-preview-6ed95b72--b152584a-d333-47d9-963b-7b6942a5bdd3.lovable.app-1781247438352.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/631b6f45-8743-4574-a087-50ec00cb492f/id-preview-6ed95b72--b152584a-d333-47d9-963b-7b6942a5bdd3.lovable.app-1781247438352.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: "/__l5e/assets-v1/36451531-1a1a-4560-92a1-e8e0f8893de4/unloop-mark.jpg" },
      { rel: "shortcut icon", href: "/__l5e/assets-v1/36451531-1a1a-4560-92a1-e8e0f8893de4/unloop-mark.jpg" },
      { rel: "apple-touch-icon", href: "/__l5e/assets-v1/36451531-1a1a-4560-92a1-e8e0f8893de4/unloop-mark.jpg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Crashlytics: bind global handlers + capture device context.
    import("@/lib/crashlytics").then(({ initCrashlytics, setCrashlyticsUser }) => {
      initCrashlytics();
      // Mirror auth changes into Crashlytics user context + invalidate cache.
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.auth.getUser().then(({ data }) => setCrashlyticsUser(data.user?.id ?? null));
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
            setCrashlyticsUser(session?.user?.id ?? null);
            queryClient.invalidateQueries();
            if (event === "SIGNED_IN" && session?.user) {
              // Run migrate + initial cloud push.
              import("@/lib/cloud-sync").then(({ migrateLocalToCloud }) => {
                migrateLocalToCloud(session.user.id);
              });
            }
          }
        });
      });
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
