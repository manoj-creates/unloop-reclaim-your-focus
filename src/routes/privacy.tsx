import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Unloop" },
      {
        name: "description",
        content:
          "How Unloop collects, uses, stores, and protects your data — including Accessibility Service usage, on-device detection, and cloud sync.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPolicy,
});

const UPDATED = "June 15, 2026";
const CONTACT = "hello@unloop.app";

function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {UPDATED}
        </p>

        <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">1. Who we are</h2>
            <p>
              Unloop ("we", "us") builds an Android app that helps people
              reduce time spent in short-video feeds (Reels, Shorts, TikTok,
              and similar). This policy explains what data the Unloop app and
              website collect, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              2. Data we collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data</strong> — when you sign in (e.g. with
                Google), we receive your email address and a stable user
                identifier. We do not receive your password.
              </li>
              <li>
                <strong>App settings &amp; goals</strong> — daily limit,
                hardcore level, notification preferences, focus goal.
              </li>
              <li>
                <strong>Usage events</strong> — counts of detected short-video
                sessions, timestamps, the originating app package, and
                aggregate streak / time-saved figures. These events are
                generated on your device.
              </li>
              <li>
                <strong>Diagnostics</strong> — anonymous crash and error
                signals to keep the app stable. No screen contents.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> collect: photos, contacts, SMS,
              call logs, microphone, precise location, passwords, browsing
              history, financial information, health data, or the textual
              content of any screen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              3. Accessibility Service — important disclosure
            </h2>
            <p>
              Unloop uses Android&apos;s Accessibility Service{" "}
              <em>solely</em> to detect when a short-video feed (such as
              Instagram Reels or YouTube Shorts) becomes visible on screen,
              so the app can show a focus overlay and count the session.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The service inspects window and view-id signals from a fixed
                allow-list of short-video apps (Instagram, YouTube, Facebook,
                TikTok, Snapchat and their Lite variants).
              </li>
              <li>
                It does <strong>not</strong> read, store, or transmit the
                text of any messages, posts, captions, comments, passwords,
                or form fields.
              </li>
              <li>
                Detection runs entirely on your device. The only data that
                ever leaves the device are aggregated session counts and the
                originating app&apos;s package name, sent to your own Unloop
                cloud account.
              </li>
              <li>
                The service is never used for advertising, analytics
                profiling, or sale to third parties.
              </li>
              <li>
                You can revoke the Accessibility permission at any time in
                Android Settings → Accessibility → Unloop.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              4. How we use your data
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide the core feature: detecting and counting feeds.</li>
              <li>To sync your settings, streaks, and goals across devices when you sign in.</li>
              <li>To fix bugs and improve stability via anonymous diagnostics.</li>
            </ul>
            <p>
              We do not sell personal information, share it with data brokers,
              or use it for cross-app behavioral advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Storage &amp; security</h2>
            <p>
              Cloud data is stored with our backend provider (Lovable Cloud,
              built on Supabase) in encrypted form in transit (TLS) and at
              rest. Access is protected by row-level security tied to your
              authenticated user id. We disable Android Auto Backup so app
              data is not copied into your personal Google Drive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data retention &amp; deletion</h2>
            <p>
              You can delete your account and all associated cloud data from
              within the app (Profile → Reset Progress / Delete account) or
              by emailing{" "}
              <a className="underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              . We will delete account-linked data within 30 days of
              request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Children</h2>
            <p>
              Unloop is not directed at children under 13. We do not
              knowingly collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Your rights</h2>
            <p>
              Depending on your jurisdiction (e.g. GDPR, CCPA) you may have
              rights to access, correct, export, or delete your personal
              data. Contact{" "}
              <a className="underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>{" "}
              to exercise any of these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Changes</h2>
            <p>
              We will update this page when the policy changes and revise
              the &quot;Last updated&quot; date above. Material changes will
              be announced inside the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p>
              Questions? Email{" "}
              <a className="underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
