import { createFileRoute, Link } from "@tanstack/react-router";
import { MissionControl } from "@/components/mission-control";
import { OrchestrationTimeline, ReasoningStream, AutomationStateBar, OpportunityIntelCard, SAMPLE_OPPS } from "@/components/signature";
import { fleetStats } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Aether OS — Your AI Career Agent That Works While You Sleep" },
      {
        name: "description",
        content:
          "An autonomous workforce of specialized AI agents that discover, tailor, apply, and engage opportunities for you — optimized for interviews, not spam.",
      },
      { property: "og:title", content: "Aether OS — Your AI Career Agent" },
      {
        property: "og:description",
        content:
          "Autonomous AI agents that scout, tailor, apply, and engage recruiters on your behalf.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 surface border-b border-border">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative size-7 rounded-md bg-foreground grid place-items-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-transparent" />
              <div className="size-1.5 rounded-full bg-accent animate-pulse-soft relative z-10" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm tracking-[0.2em] uppercase font-extrabold">Aether<span className="text-accent">·</span>OS</span>
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted/70 mt-0.5">mission control</span>
            </div>
          </Link>
          <div className="hidden md:flex gap-1 text-xs font-mono uppercase tracking-widest">
            {["Platform", "Agents", "Pricing"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="px-3 py-1.5 text-muted hover:text-foreground transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-signal/5 border border-signal/20">
            <div className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
            <span className="text-[10px] font-mono font-medium text-signal uppercase tracking-widest">
              fleet · 6 agents online
            </span>
          </div>
          <Link
            to="/onboarding"
            className="px-4 py-1.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest rounded-md hover:glow-accent transition-all"
          >
            Launch terminal
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-16 pb-10 relative">
          <div className="absolute inset-x-0 top-0 h-[600px] signal-grid opacity-50 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_75%)]" />

          <div className="grid grid-cols-12 gap-8 items-center mb-12">
            <div className="col-span-12 lg:col-span-5">
              <div className="animate-float inline-flex items-center gap-2 px-2.5 py-1 rounded-full surface text-[10px] font-mono uppercase tracking-widest mb-6">
                <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
                <span className="text-signal">live</span>
                <span className="text-muted">scanning 220 careers pages · 3,402 listings</span>
              </div>
              <h1 className="animate-float font-display text-5xl md:text-6xl lg:text-[5rem] tracking-[-0.03em] leading-[0.95] font-extrabold mb-6">
                Mission control
                <br />
                <span className="font-serif italic font-bold text-accent text-glow">for career</span>
                <br />
                acquisition.
              </h1>
              <p className="animate-float [animation-delay:150ms] max-w-md text-base text-muted leading-relaxed mb-8">
                A coordinated AI workforce — six specialized agents, an orchestration engine, and a
                queue that never sleeps. Optimized for one metric:{" "}
                <span className="text-foreground">interviews generated</span>.
              </p>
              <div className="animate-float [animation-delay:300ms] flex items-center gap-3">
                <Link
                  to="/onboarding"
                  className="group relative px-5 py-3 bg-accent text-accent-foreground text-sm font-bold uppercase tracking-widest rounded-md glow-accent transition-all"
                >
                  Deploy fleet →
                </Link>
                <Link
                  to="/dashboard"
                  className="px-5 py-3 surface text-sm font-mono uppercase tracking-widest rounded-md hover:border-accent/40 transition-all"
                >
                  Watch it run
                </Link>
              </div>

              {/* Inline metrics */}
              <div className="animate-float [animation-delay:450ms] mt-10 grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
                {[
                  { l: "Ops/hour", v: "1,402", t: "accent" },
                  { l: "Interview rate", v: "12.4%", t: "signal" },
                  { l: "Recruiter reply", v: "14%", t: "default" },
                ].map((s) => (
                  <div key={s.l} className="surface p-3 rounded-none">
                    <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted">{s.l}</p>
                    <p className={`font-display text-2xl font-extrabold mt-1 ${s.t === "accent" ? "text-accent" : s.t === "signal" ? "text-signal" : ""}`}>
                      {s.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-7 animate-float [animation-delay:200ms]">
              <MissionControl />
            </div>
          </div>

          {/* Automation state strip beneath hero */}
          <div className="mb-8 animate-float [animation-delay:550ms]">
            <AutomationStateBar />
          </div>

          {/* Orchestration timeline — signature primitive */}
          <div className="mb-8 animate-float [animation-delay:650ms]">
            <OrchestrationTimeline />
          </div>

          {/* Reasoning + intelligence strip */}
          <div className="grid grid-cols-12 gap-6 mb-8 animate-float [animation-delay:750ms]">
            <div className="col-span-12 lg:col-span-7">
              <ReasoningStream height="h-72" />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <div className="surface rounded-2xl p-4 h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted/85">live intelligence</span>
                  <span className="text-[10px] font-mono uppercase text-accent">P0 stream</span>
                </div>
                <div className="space-y-2">
                  <OpportunityIntelCard o={SAMPLE_OPPS[0]} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 border-y border-border py-8 gap-px bg-border [&>*]:bg-background [&>*]:p-6 mb-24">
          {fleetStats.map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-[9px] font-mono uppercase text-muted tracking-[0.25em]">
                {s.label}
              </p>
              <p className="font-display text-3xl font-extrabold tracking-tight text-foreground">{s.value}</p>
            </div>
          ))}
        </section>

        {/* Agents grid */}
        <section id="agents" className="pb-24">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent mb-3">
              ─ The fleet
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-[-0.02em] font-extrabold mb-4">
              Six specialists.<br />
              <span className="font-serif italic font-bold">One coordinated workforce.</span>
            </h2>
            <p className="text-muted">
              Aether is not one model with a chat box. It is a fleet of agents — orchestrated through a
              durable queue, gated by approvals, observable end-to-end.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
            {[
              { code: "SCOUT", title: "Discovery", desc: "Sweeps boards, careers pages, and hidden listings every 4 minutes.", load: 78 },
              { code: "STRATEGIST", title: "Prioritization", desc: "Ranks every opportunity by interview probability and ROI.", load: 41 },
              { code: "WRITER", title: "Resume tailoring", desc: "Rewrites bullets and keywords per role — ATS-safe.", load: 64 },
              { code: "OUTREACH", title: "Recruiter engagement", desc: "Personalized intros + intelligent follow-up cadence.", load: 22 },
              { code: "ANALYZER", title: "Market intelligence", desc: "Tracks salary, hiring velocity, keyword demand.", load: 55 },
              { code: "INTERVIEWER", title: "Loop preparation", desc: "Generates STAR answers, technical drills, salary playbooks.", load: 12 },
            ].map((a) => (
              <div key={a.code} className="surface p-5 group hover:bg-elevated transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">
                    {a.code}_01
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-signal">
                    <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
                    online
                  </span>
                </div>
                <h3 className="font-display text-lg font-extrabold tracking-tight mb-1.5">{a.title}</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">{a.desc}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-foreground/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${a.load}%`, boxShadow: "0 0 6px var(--color-accent)" }} />
                  </div>
                  <span className="text-[9px] font-mono text-muted w-10 text-right">{a.load}% load</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pb-32">
          <div className="text-center mb-12">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent mb-3">─ Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl tracking-[-0.02em] font-extrabold">
              Pay for <span className="font-serif italic font-bold">interviews</span>, not spam.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border max-w-5xl mx-auto rounded-2xl overflow-hidden">
            {[
              { name: "Scout", price: "$0", desc: "Manual mode + 1 agent.", cta: "Start free" },
              { name: "Operator", price: "$39", desc: "Full fleet, semi-autonomous, 200 applications/mo.", cta: "Hire the fleet", featured: true },
              { name: "Acquirer", price: "$99", desc: "Autonomous mode, unlimited, priority queue.", cta: "Go autonomous" },
            ].map((p) => (
              <div key={p.name} className={`p-8 ${p.featured ? "bg-elevated relative" : "surface"}`}>
                {p.featured && <span className="absolute top-3 right-3 text-[9px] font-mono uppercase tracking-widest text-accent">recommended</span>}
                <p className={`text-[10px] font-mono uppercase tracking-[0.25em] mb-4 ${p.featured ? "text-accent" : "text-muted"}`}>
                  {p.name}
                </p>
                <div className="font-display text-5xl font-extrabold mb-1">{p.price}</div>
                <p className="text-[10px] font-mono uppercase tracking-widest mb-6 text-muted">per month</p>
                <p className="text-sm mb-8 leading-relaxed text-foreground/80">{p.desc}</p>
                <button className={`w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                  p.featured ? "bg-accent text-accent-foreground glow-accent" : "bg-foreground text-background hover:bg-foreground/90"
                }`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-24 text-center relative">
          <div className="absolute inset-0 signal-grid opacity-40 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent mb-4">─ Deploy ─</p>
          <h2 className="font-display text-4xl md:text-6xl tracking-[-0.02em] font-extrabold mb-8 text-balance">
            Stop applying.<br />
            <span className="font-serif italic font-bold text-accent text-glow">Start acquiring.</span>
          </h2>
          <Link
            to="/onboarding"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground text-sm font-bold uppercase tracking-widest rounded-md glow-accent transition-all"
          >
            Deploy your fleet →
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-6 px-6 flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted">
          aether.os · mission control v1.4.0
        </p>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted">
          © 2026 · built for the autonomous era
        </p>
      </footer>
    </div>
  );
}
