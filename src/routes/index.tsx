import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Aether — Your AI career copilot" },
      {
        name: "description",
        content:
          "Aether is the calm, intelligent AI copilot that finds, applies to, and prepares you for the right roles — so you focus on interviews, not search.",
      },
      { property: "og:title", content: "Aether — Your AI career copilot" },
      {
        property: "og:description",
        content:
          "The AI copilot that quietly lands you interviews. Curated opportunities, tailored applications, ready-to-go prep — every morning.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-foreground grid place-items-center">
              <div className="size-1.5 rounded-full bg-accent" />
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight">Aether</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 text-[13px]">
            <a href="#how" className="px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/60 transition">How it works</a>
            <a href="#outcomes" className="px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/60 transition">Outcomes</a>
            <a href="#pricing" className="px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/60 transition">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-[13px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition">Sign in</Link>
            <Link
              to="/onboarding"
              className="px-3.5 py-1.5 bg-foreground text-background text-[13px] font-medium rounded-md hover:opacity-90 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface text-[12px] text-muted-foreground mb-8 animate-float">
            <span className="size-1.5 rounded-full bg-signal" />
            Quietly working in the background
          </div>
          <h1 className="animate-float font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6">
            The calm AI copilot
            <br />
            for your next role.
          </h1>
          <p className="animate-float [animation-delay:120ms] max-w-xl mx-auto text-[17px] text-muted-foreground leading-relaxed mb-10">
            Aether finds the right opportunities, tailors every application, and prepares you for
            every interview — so your job search feels like a single thoughtful conversation.
          </p>
          <div className="animate-float [animation-delay:240ms] flex items-center justify-center gap-3">
            <Link
              to="/onboarding"
              className="px-5 py-3 bg-foreground text-background text-[14px] font-medium rounded-lg hover:opacity-90 transition"
            >
              Start free
            </Link>
            <Link
              to="/login"
              className="px-5 py-3 surface text-[14px] font-medium rounded-lg hover:bg-secondary/60 transition"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-[12px] text-muted-foreground">
            No credit card · 5-minute setup · Cancel anytime
          </p>
        </section>

        {/* Mockup */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="surface-raised rounded-2xl p-6 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[12px] text-muted-foreground mb-1">Wednesday morning</p>
                <h3 className="font-serif text-2xl md:text-3xl tracking-tight">Good morning. Here's what I worked on overnight.</h3>
              </div>
              <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">Briefing</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { k: "12", l: "Roles reviewed", s: "3 strong matches" },
                { k: "4", l: "Applications drafted", s: "Awaiting your review" },
                { k: "1", l: "Recruiter reply", s: "Stripe — interview proposed" },
              ].map((c) => (
                <div key={c.l} className="rounded-xl border border-border bg-background p-5">
                  <div className="font-serif text-4xl tracking-tight">{c.k}</div>
                  <div className="text-[13px] mt-2 font-medium">{c.l}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{c.s}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition">Review applications</button>
              <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg surface hover:bg-secondary/60 transition">Prep for Stripe</button>
              <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg surface hover:bg-secondary/60 transition">See all matches</button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-5xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-14">
            <p className="text-[12px] text-accent font-medium mb-3">How it works</p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">
              Quietly proactive. Always one step ahead.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
            {[
              { n: "1", t: "Tell Aether what you want", d: "A 5-minute conversation. Roles, locations, tradeoffs, dealbreakers — Aether learns your taste." },
              { n: "2", t: "Wake up to a briefing", d: "Every morning, a short note: what was found, what was drafted, what needs you. No noise, just signal." },
              { n: "3", t: "Approve and interview", d: "Review tailored applications in a tap. Aether handles follow-ups and prep — you focus on conversations." },
            ].map((s) => (
              <div key={s.n} className="bg-card p-8">
                <div className="text-[12px] text-muted-foreground mb-3">Step {s.n}</div>
                <h3 className="font-serif text-2xl tracking-tight mb-3">{s.t}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Outcomes */}
        <section id="outcomes" className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
            {[
              { v: "3.4×", l: "More interviews per week" },
              { v: "12 min", l: "Daily time spent" },
              { v: "82%", l: "Application quality score" },
              { v: "9 days", l: "Median time to first reply" },
            ].map((o) => (
              <div key={o.l} className="bg-card p-8 text-center">
                <div className="font-serif text-4xl tracking-tight">{o.v}</div>
                <div className="text-[12px] text-muted-foreground mt-2">{o.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-[12px] text-accent font-medium mb-3">Pricing</p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">
              Pay for interviews, not effort.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Free", price: "$0", desc: "Curated matches and weekly briefings.", cta: "Start free", featured: false },
              { name: "Pro", price: "$39", desc: "Tailored applications, follow-ups, and interview prep.", cta: "Try Pro free", featured: true },
              { name: "Concierge", price: "$99", desc: "Priority queue, deep research, white-glove handoff.", cta: "Talk to us", featured: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-8 ${p.featured ? "bg-foreground text-background" : "surface"}`}
              >
                <div className={`text-[12px] font-medium mb-4 ${p.featured ? "text-background/70" : "text-muted-foreground"}`}>{p.name}</div>
                <div className="font-serif text-5xl tracking-tight mb-1">{p.price}</div>
                <div className={`text-[12px] mb-6 ${p.featured ? "text-background/70" : "text-muted-foreground"}`}>per month</div>
                <p className={`text-[14px] mb-8 leading-relaxed ${p.featured ? "text-background/85" : "text-foreground/85"}`}>{p.desc}</p>
                <Link
                  to="/onboarding"
                  className={`block text-center w-full py-2.5 rounded-lg text-[13px] font-medium transition ${
                    p.featured
                      ? "bg-background text-foreground hover:opacity-90"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-32 text-center">
          <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-8">
            Let Aether handle the search.
            <br />
            You focus on the conversation.
          </h2>
          <Link
            to="/onboarding"
            className="inline-block px-6 py-3 bg-foreground text-background text-[14px] font-medium rounded-lg hover:opacity-90 transition"
          >
            Start free
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Aether · The calm AI career copilot</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
