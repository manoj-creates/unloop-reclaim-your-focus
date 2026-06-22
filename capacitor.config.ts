import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for the Unloop Android shell.
 *
 * TanStack Start (Nitro) emits:
 *   dist/client/   browser assets (JS, CSS, fonts, _build/*)
 *   dist/server/   Worker SSR bundle (NOT used inside the APK)
 *
 * The Android WebView cannot run the SSR Worker, so we ship `dist/client`
 * as a static SPA shell. A minimal `dist/client/index.html` is generated
 * by `scripts/build-capacitor-shell.mjs` after `vite build`.
 *
 * Server functions / Data API calls go to the deployed HTTPS backend
 * (set VITE_PUBLIC_API_BASE_URL at build time if you call them by absolute URL).
 */
const config: CapacitorConfig = {
  appId: "app.unloop",
  appName: "Unloop",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
