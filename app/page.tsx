"use client";

import { useRouter } from "next/navigation";

const featureCards = [
  {
    icon: "📧",
    title: "Passwordless Login",
    description:
      "Email-based OTP authentication removes password friction and reduces risk.",
  },
  {
    icon: "🎯",
    title: "Single Session",
    description:
      "One active session per user keeps access predictable and secure.",
  },
  {
    icon: "🔄",
    title: "OAuth-like Flow",
    description:
      "A familiar authorization flow for apps that need simple SSO integration.",
  },
  {
    icon: "📊",
    title: "Google Sheets DB",
    description:
      "Transparent storage backed by Google Sheets for easy inspection and control.",
  },
  {
    icon: "⚙️",
    title: "Admin Dashboard",
    description:
      "Manage services, users, and access from a clean admin interface.",
  },
  {
    icon: "🎟️",
    title: "Free Tier Support",
    description:
      "Let approved services grant access automatically when free tier is enabled.",
  },
];

const steps = [
  {
    number: "01",
    title: "Register your app",
    description:
      "Add your application to SSO and receive a unique service identity.",
  },
  {
    number: "02",
    title: "Connect the login flow",
    description:
      "Send users through the shared auth route and let SSO handle verification.",
  },
  {
    number: "03",
    title: "Launch securely",
    description:
      "Return verified users to your app with a consistent, centralized session.",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--theme-background)] text-[var(--theme-text)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-black/[0.04] blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-black/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-black/[0.025] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 md:px-12">
        <header className="flex flex-col gap-4 border-b border-[var(--theme-border)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/woxin-logo.svg" alt="Woxin Logo" width={52} height={52} className="h-12 w-12 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 shadow-sm" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--theme-muted)]">
                Secure Single Sign-On
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--theme-text)]">
                Woxin SSO
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push("/dashboard")} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-text)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md">
              Dashboard
            </button>
            <button onClick={() => router.push("/login")} className="rounded-xl bg-[var(--theme-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-accent-foreground)] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--theme-accent-hover)] hover:shadow-md">
              Get Started
            </button>
          </div>
        </header>

        <main className="flex-1">
          <section className="grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--theme-muted)] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[var(--theme-accent)] opacity-70" />
                Clean, passwordless authentication for every app
              </div>

              <h2 className="max-w-xl text-5xl font-semibold tracking-tight text-[var(--theme-text)] md:text-7xl">
                One login, one session, one place to manage access.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--theme-muted)] md:text-xl">
                Woxin gives your applications a consistent authentication layer with OTP login,
                centralized session control, and a transparent Google Sheets-backed storage model.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button onClick={() => router.push("/login")} className="rounded-xl bg-[var(--theme-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--theme-accent-foreground)] shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--theme-accent-hover)]">
                  Start signing in
                </button>
                <button onClick={() => router.push("/dashboard")} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-3.5 text-sm font-semibold text-[var(--theme-text)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md">
                  Open dashboard
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-[var(--theme-muted)]">
                {[
                  "Passwordless OTP",
                  "Single-session enforcement",
                  "Google Sheets storage",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 shadow-sm"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-[var(--theme-shadow)] md:p-8">
                <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-5">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--theme-muted)]">
                      Flow overview
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">
                      Designed for simple integration
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--theme-text)]">
                    SSO
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {steps.map((step) => (
                    <div key={step.number} className="flex gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-sm font-semibold text-[var(--theme-text)] shadow-sm">
                        {step.number}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-[var(--theme-text)]">
                          {step.title}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-[var(--theme-muted)]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--theme-muted)]">
                    Access model
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">
                    One session per user
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--theme-muted)]">
                    New logins replace old sessions so access stays predictable.
                  </p>
                </div>

                <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--theme-muted)]">
                    Storage
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">
                    Google Sheets-backed
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--theme-muted)]">
                    Transparent records make operational state easy to inspect and maintain.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* <section className="pb-16 md:pb-24">
            <div className="flex items-end justify-between gap-6 pb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--theme-muted)]">
                  Key capabilities
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--theme-text)] md:text-4xl">
                  Everything on the page now follows the same light system.
                </h3>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-black/20 hover:shadow-md"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-3xl shadow-sm transition-transform group-hover:scale-[1.03]">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight text-[var(--theme-text)]">
                    {feature.title}
                  </h4>
                  <p className="mt-3 text-sm leading-6 text-[var(--theme-muted)]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </section> */}
        </main>

        <footer className="border-t border-[var(--theme-border)] py-6 text-center">
          <p className="text-sm text-[var(--theme-muted)]">
            © 2026 Woxin. The beginning of Future.
          </p>
        </footer>
      </div>
    </div>
  );
}
