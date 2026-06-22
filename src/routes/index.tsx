import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Bell, Check, Minus, Plus, ShieldCheck, Smartphone, Star } from "lucide-react";
import { useState } from "react";
import { UnloopWordmark } from "@/components/UnloopLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unloop — Break the Scroll. Reclaim Your Time." },
      {
        name: "description",
        content:
          "Unloop is a premium focus product that helps you break short-form scrolling loops with analytics, journey tracking, widgets, and private on-device insights.",
      },
      { property: "og:title", content: "Unloop — Break the Scroll. Reclaim Your Time." },
      {
        property: "og:description",
        content: "See your scroll loops, reclaim your attention, and build a calmer relationship with your phone.",
      },
    ],
  }),
  component: Landing,
});

type ScreenDef = { title: string; path: string };
const screens = {
  dashboard: { title: "Dashboard", path: "/app" },
  analytics: { title: "Analytics", path: "/analytics" },
  journey: { title: "Journey", path: "/journey" },
  widgets: { title: "Widget Studio", path: "/widgets" },
  profile: { title: "Profile", path: "/profile" },
} as const satisfies Record<string, ScreenDef>;

function Landing() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f7f4ef] text-[#171412] antialiased">
      <Nav />
      <Hero />
      <ProofStrip />
      <ScreenShowcase
        eyebrow="Dashboard"
        title="Your attention, made visible."
        body="The Unloop dashboard is the product: live focus score, reels watched, time saved, streaks, brain state, and the next best action in one calm mobile surface."
        screen={screens.dashboard}
        tone="light"
      />
      <ScreenShowcase
        eyebrow="Analytics"
        title="See exactly where your time leaks."
        body="Analytics turns short-form habits into readable patterns — peak scroll windows, platform breakdowns, focus trends, and time reclaimed."
        screen={screens.analytics}
        tone="dark"
        reverse
      />
      <BeforeAfter />
      <ScreenShowcase
        eyebrow="Journey"
        title="Make progress feel physical."
        body="The Journey screen converts recovery into stages, streaks, lifetime wins, milestones, and a visible transformation path."
        screen={screens.journey}
        tone="light"
      />
      <ScreenShowcase
        eyebrow="Widget Studio"
        title="Put focus back on the home screen."
        body="Create glanceable widgets for streaks, saved time, daily limits, focus score, and motivation — designed to interrupt the loop before it starts."
        screen={screens.widgets}
        tone="orange"
        reverse
      />
      <ScreenShowcase
        eyebrow="Profile"
        title="A private control center for your digital life."
        body="Profile keeps goals, sync, privacy, notifications, account options, and personal progress in one trusted place."
        screen={screens.profile}
        tone="dark"
      />
      <HowItWorks />
      <PlayStore />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#171412]/10 bg-[#f7f4ef]/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center">
          <UnloopWordmark size={22} />
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-[#171412]/60 md:flex">
          <a href="#screens" className="transition-colors hover:text-[#171412]">Screens</a>
          <a href="#before-after" className="transition-colors hover:text-[#171412]">Before / After</a>
          <a href="#how" className="transition-colors hover:text-[#171412]">How it works</a>
          <a href="#faq" className="transition-colors hover:text-[#171412]">FAQ</a>
        </nav>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 rounded-full bg-[#171412] px-4 py-2 text-[13px] font-bold text-[#fffaf6] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Open App <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-24 sm:pt-28">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[62%] bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,53,0.24),transparent_54%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gradient-to-b from-transparent to-[#e8dfd5]" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-rows-[auto_1fr] px-5 sm:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#171412]/10 bg-[#fffaf6]/70 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#171412]/65 shadow-[0_20px_50px_-35px_rgba(23,20,18,0.6)] backdrop-blur-xl"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
            Actual Unloop screens
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-[48px] font-black leading-[0.88] tracking-[-0.045em] text-[#171412] sm:text-[92px] lg:text-[118px]"
          >
            Break the Scroll.
            <br />
            <span className="text-[#FF6B35]">Reclaim Your Time.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-[#171412]/62 sm:text-xl"
          >
            A focus product built around the interface itself — live attention metrics, behavior analytics, journey tracking, widgets, and privacy controls.
          </motion.p>
        </div>

        <div className="relative mt-10 min-h-[58vh] sm:mt-12 lg:min-h-[66vh]">
          <div className="absolute inset-x-[-18vw] bottom-[-26%] top-[8%] rounded-[50%] bg-[#171412] shadow-[inset_0_2px_0_rgba(255,255,255,0.08)]" />
          <div className="absolute inset-x-[-8vw] bottom-[-24%] top-[28%] rounded-[50%] bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,53,0.55),transparent_45%)] blur-2xl" />
          <div className="relative z-10 flex h-full items-end justify-center gap-[-10px] pt-3 sm:gap-4 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 80, rotate: -9 }}
              animate={{ opacity: 1, y: 24, rotate: -7 }}
              transition={{ duration: 0.9, delay: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="hidden origin-bottom md:block"
            >
              <PhoneFrame label="Analytics" size="heroSide">
                <ScreenEmbed screen={screens.analytics} />
              </PhoneFrame>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 90, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.95, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              className="z-20"
            >
              <PhoneFrame label="Dashboard" size="heroCenter">
                <ScreenEmbed screen={screens.dashboard} />
              </PhoneFrame>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 80, rotate: 9 }}
              animate={{ opacity: 1, y: 24, rotate: 7 }}
              transition={{ duration: 0.9, delay: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="hidden origin-bottom md:block"
            >
              <PhoneFrame label="Journey" size="heroSide">
                <ScreenEmbed screen={screens.journey} />
              </PhoneFrame>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneFrame({
  children,
  label,
  size = "feature",
}: {
  children: React.ReactNode;
  label: string;
  size?: "heroCenter" | "heroSide" | "feature" | "small";
}) {
  const sizeClass = {
    heroCenter: "w-[min(76vw,390px)] sm:w-[390px] lg:w-[430px]",
    heroSide: "w-[315px] lg:w-[350px]",
    feature: "w-[min(86vw,410px)] lg:w-[430px]",
    small: "w-[min(72vw,320px)]",
  }[size];

  return (
    <div className={`relative ${sizeClass}`} aria-label={`${label} app screen`}>
      <div className="relative aspect-[390/796] rounded-[54px] bg-[#111] p-[11px] shadow-[0_55px_110px_-45px_rgba(0,0,0,0.9),0_28px_70px_-42px_rgba(255,107,53,0.75)] ring-1 ring-white/10">
        <div className="absolute left-1/2 top-[17px] z-30 h-[25px] w-[112px] -translate-x-1/2 rounded-full bg-[#111] shadow-[0_1px_0_rgba(255,255,255,0.06)]" />
        <div className="absolute left-[12px] top-[108px] h-[78px] w-[3px] rounded-r-full bg-[#262626]" />
        <div className="absolute right-[12px] top-[134px] h-[98px] w-[3px] rounded-l-full bg-[#262626]" />
        <div className="h-full overflow-hidden rounded-[43px] bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

function ScreenEmbed({ screen }: { screen: ScreenDef }) {
  return (
    <iframe
      key={screen.path}
      title={`${screen.title} Unloop app screen`}
      src={`${screen.path}#preview=1`}
      className="h-full w-full border-0 bg-white"
    />
  );
}

function ProofStrip() {
  const stats = [
    ["1.2M+", "reels avoided"],
    ["182K", "minutes reclaimed"],
    ["+38%", "focus score lift"],
    ["47 days", "average best streak"],
  ];
  return (
    <section className="bg-[#171412] px-5 py-12 text-[#fffaf6] sm:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden rounded-[32px] border border-white/10 bg-white/10 lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="bg-[#171412] px-6 py-8 text-center">
            <p className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">{value}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScreenShowcase({
  eyebrow,
  title,
  body,
  screen,
  tone,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  screen: ScreenDef;
  tone: "light" | "dark" | "orange";
  reverse?: boolean;
}) {
  const isDark = tone === "dark";
  const isOrange = tone === "orange";
  return (
    <section
      id={eyebrow === "Dashboard" ? "screens" : undefined}
      className={`relative overflow-hidden ${
        isDark ? "bg-[#171412] text-[#fffaf6]" : isOrange ? "bg-[#FF6B35] text-[#fffaf6]" : "bg-[#f7f4ef] text-[#171412]"
      }`}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute ${reverse ? "left-[-18%]" : "right-[-18%]"} top-[12%] h-[560px] w-[560px] rounded-full blur-[120px] ${
            isDark ? "bg-[#FF6B35]/35" : isOrange ? "bg-white/25" : "bg-[#FF6B35]/20"
          }`}
        />
      </div>
      <div className="relative mx-auto grid min-h-[92vh] max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7 }}
          className={reverse ? "lg:order-2" : ""}
        >
          <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${isDark || isOrange ? "text-white/58" : "text-[#FF6B35]"}`}>
            {eyebrow}
          </p>
          <h2 className="mt-5 max-w-xl text-5xl font-black leading-[0.92] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
            {title}
          </h2>
          <p className={`mt-8 max-w-lg text-lg leading-relaxed ${isDark || isOrange ? "text-white/68" : "text-[#171412]/62"}`}>
            {body}
          </p>
          <Link
            to={screen.path}
            className={`mt-10 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition-transform hover:scale-[1.02] active:scale-[0.98] ${
              isDark || isOrange ? "bg-[#fffaf6] text-[#171412]" : "bg-[#171412] text-[#fffaf6]"
            }`}
          >
            Open {screen.title} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 42 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          className={`flex justify-center ${reverse ? "lg:order-1" : ""}`}
        >
          <div className="relative">
            <div className={`absolute -inset-12 rounded-full blur-3xl ${isDark ? "bg-[#FF6B35]/30" : isOrange ? "bg-white/25" : "bg-[#FF6B35]/20"}`} />
            <div className="relative">
              <PhoneFrame label={screen.title} size="feature">
                <ScreenEmbed screen={screen} />
              </PhoneFrame>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  return (
    <section id="before-after" className="bg-[#fffaf6] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FF6B35]">Before vs After Unloop</p>
          <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.045em] text-[#171412] sm:text-7xl">
            Same phone.
            <br />Different relationship.
          </h2>
        </div>
        <div className="mt-16 grid gap-4 lg:grid-cols-2">
          <ComparisonPanel
            label="Before"
            tone="before"
            items={["Open app without noticing", "Lose the night to short-form loops", "Guess where your attention went", "Restart from guilt every Monday"]}
          />
          <ComparisonPanel
            label="After Unloop"
            tone="after"
            items={["See the loop the moment it starts", "Recover minutes before they disappear", "Track progress through actual app screens", "Build a visible streak you want to protect"]}
          />
        </div>
      </div>
    </section>
  );
}

function ComparisonPanel({ label, items, tone }: { label: string; items: string[]; tone: "before" | "after" }) {
  const after = tone === "after";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      className={`rounded-[36px] p-7 sm:p-10 ${after ? "bg-[#171412] text-[#fffaf6]" : "border border-[#171412]/10 bg-[#f7f4ef] text-[#171412]"}`}
    >
      <p className={`text-[12px] font-black uppercase tracking-[0.2em] ${after ? "text-[#FF8A3D]" : "text-[#171412]/40"}`}>{label}</p>
      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-4">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${after ? "bg-[#FF6B35] text-white" : "bg-[#171412]/8 text-[#171412]/45"}`}>
              {after ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            </span>
            <p className={`text-xl font-bold leading-snug sm:text-2xl ${after ? "text-white" : "text-[#171412]/58"}`}>{item}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function HowItWorks() {
  const steps = ["Notice the loop", "Read the pattern", "Nudge before relapse", "Build a new baseline"];
  return (
    <section id="how" className="bg-[#171412] px-5 py-24 text-[#fffaf6] sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FF8A3D]">How Unloop works</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.045em] sm:text-7xl">A calmer loop for getting your life back.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, i) => (
              <div key={step} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-[11px] font-black text-[#FF8A3D]">0{i + 1}</p>
                <p className="mt-4 text-2xl font-black tracking-[-0.03em]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayStore() {
  return (
    <section className="bg-[#f7f4ef] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 overflow-hidden rounded-[44px] bg-[#FF6B35] px-7 py-14 text-[#fffaf6] sm:px-14 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-bold backdrop-blur-xl">
            <Bell className="h-3.5 w-3.5" /> Coming soon
          </div>
          <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.045em] sm:text-7xl">Launching on Google Play.</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/78">Android first, because Unloop is designed around real on-device behavior signals.</p>
          <form className="mt-9 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
            <input className="min-w-0 flex-1 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-[#171412] outline-none placeholder:text-[#171412]/42" placeholder="you@example.com" type="email" />
            <button className="rounded-full bg-[#171412] px-6 py-3.5 text-sm font-black text-[#fffaf6]" type="submit">Notify me</button>
          </form>
        </div>
        <div className="flex justify-center lg:justify-end">
          <PhoneFrame label="Dashboard" size="small">
            <ScreenEmbed screen={screens.dashboard} />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    ["I stopped counting failures and started seeing progress. The screen itself makes me want to protect my streak.", "Maya R."],
    ["Analytics showed my 11pm pattern instantly. It felt personal without feeling invasive.", "Daniel K."],
    ["It looks and feels like a real product, not another blocker yelling at me.", "Priya S."],
  ];
  return (
    <section className="bg-[#fffaf6] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.045em] text-[#171412] sm:text-7xl">People feel the shift.</h2>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {items.map(([quote, name]) => (
            <div key={name} className="rounded-[32px] border border-[#171412]/10 bg-[#f7f4ef] p-7">
              <div className="mb-5 flex gap-1 text-[#FF6B35]">
                {[0, 1, 2, 3, 4].map((n) => <Star key={n} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-lg font-bold leading-relaxed text-[#171412]">“{quote}”</p>
              <p className="mt-7 text-sm font-black text-[#171412]/48">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  const faqs = [
    ["Are these real app screens?", "Yes. The landing page displays the existing Unloop app routes inside phone mockups with demo values only."],
    ["Does the existing app still work?", "Yes. The dashboard remains at /app and the other app screens remain on their existing routes."],
    ["Is Unloop private?", "Unloop is designed around on-device behavior signals and gives users control over sync and account features."],
  ];
  return (
    <section id="faq" className="bg-[#f7f4ef] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-5xl font-black leading-none tracking-[-0.045em] text-[#171412] sm:text-6xl">FAQ</h2>
        <div className="mt-12 space-y-3">
          {faqs.map(([q, a], i) => (
            <div key={q} className="overflow-hidden rounded-[24px] border border-[#171412]/10 bg-[#fffaf6]">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-black text-[#171412]">
                {q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF6B35]/10 text-[#FF6B35]">
                  {open === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
              {open === i && <p className="px-6 pb-6 text-[15px] leading-relaxed text-[#171412]/62">{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-[#fffaf6] px-5 pb-20 sm:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[44px] bg-[#171412] px-7 py-20 text-center text-[#fffaf6] sm:px-12">
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em] text-white/60">
          <Smartphone className="h-3.5 w-3.5" /> Open the product
        </p>
        <h2 className="mx-auto max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.045em] sm:text-7xl">Your attention deserves a better interface.</h2>
        <Link to="/app" className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#FF6B35] px-7 py-4 text-base font-black text-white shadow-[0_18px_46px_-22px_rgba(255,107,53,0.9)]">
          Open Unloop <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#171412]/10 bg-[#f7f4ef]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-10 sm:flex-row sm:px-8">
        <UnloopWordmark size={20} />
        <div className="flex items-center gap-6 text-xs font-bold text-[#171412]/45">
          <a href="#screens" className="hover:text-[#171412]">Screens</a>
          <a href="#before-after" className="hover:text-[#171412]">Before / After</a>
          <a href="#how" className="hover:text-[#171412]">How it works</a>
          <Link to="/app" className="hover:text-[#171412]">Open App</Link>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#171412]/45">
          <ShieldCheck className="h-3.5 w-3.5 text-[#FF6B35]" /> Private by design
        </div>
      </div>
    </footer>
  );
}