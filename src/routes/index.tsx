import { createFileRoute, Link } from "@tanstack/react-router";
import { MissionControl } from "@/components/mission-control";
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-6 rounded-sm bg-foreground grid place-items-center">
              <div className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
            </div>
            <span className="font-display text-base tracking-tight uppercase font-extrabold">
              Aether OS
            </span>
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted">
            <a href="#features" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#agents" className="hover:text-foreground transition-colors">Agents</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/15">
            <div className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
            <span className="text-[10px] font-mono font-medium text-accent uppercase tracking-widest">
              4 agents active
            </span>
          </div>
          <Link
            to="/dashboard"
            className="px-4 py-1.5 bg-foreground text-background text-sm font-semibold rounded-md hover:bg-foreground/90 transition-all"
          >
            Launch terminal
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-24 pb-16 text-center relative">
          <div className="absolute inset-x-0 top-0 h-[420px] grid-bg opacity-60 -z-10 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
          <div className="animate-float inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium mb-8">
            <span className="size-1.5 rounded-full bg-success animate-pulse-soft" />
            <span className="text-foreground/80">Now scanning 220+ careers pages in real time</span>
          </div>
          <h1 className="animate-float font-display text-5xl md:text-7xl lg:text-[6.5rem] tracking-tight leading-[0.9] text-balance mb-8">
            Your career,
            <br />
            <span className="font-serif italic font-bold text-accent">autonomous</span>
          </h1>
          <p className="animate-float [animation-delay:150ms] max-w-xl mx-auto text-lg text-muted text-pretty mb-10">
            A distributed workforce of specialized AI agents — scouting, tailoring, applying, and
            engaging recruiters on your behalf. While you sleep. While you interview. While you live.
          </p>
          <div className="animate-float [animation-delay:300ms] flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-foreground text-background text-sm font-semibold rounded-md hover:bg-foreground/90 transition-all"
            >
              Launch your AI career agent
            </Link>
            <a
              href="#features"
              className="px-6 py-3 border border-border text-sm font-semibold rounded-md hover:bg-card transition-all"
            >
              See it run live
            </a>
          </div>
        </section>

        {/* Live Dashboard Preview */}
        <section
          id="features"
          className="animate-float [animation-delay:450ms] grid grid-cols-12 gap-6 pb-24"
        >
          <div className="col-span-12 lg:col-span-3">
            <AgentStream />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="border border-border rounded-2xl bg-card p-6 h-full">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h3 className="font-display text-2xl tracking-tight font-extrabold">
                    Priority opportunities
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    Re-ranked 4 minutes ago by the Strategist agent
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted px-2 py-1 border border-border rounded">
                  142 active
                </span>
              </div>
              <div className="space-y-3">
                {jobs.slice(0, 3).map((j) => (
                  <JobCard key={j.id} job={j} dense />
                ))}
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
                Match intelligence
              </p>
              <div className="relative aspect-square grid place-items-center">
                <div className="absolute inset-0 border-[12px] border-accent/10 rounded-full" />
                <div className="absolute inset-0 border-[12px] border-accent border-t-transparent border-r-transparent -rotate-45 rounded-full" />
                <div className="text-center">
                  <span className="font-display text-4xl font-extrabold leading-none">92</span>
                  <p className="text-[10px] uppercase font-mono text-muted tracking-widest mt-1">
                    avg score
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2.5">
                <li className="flex justify-between text-xs">
                  <span className="text-muted">ATS success</span>
                  <span className="font-mono">88%</span>
                </li>
                <li className="flex justify-between text-xs">
                  <span className="text-muted">Recruiter reply</span>
                  <span className="font-mono">14%</span>
                </li>
                <li className="flex justify-between text-xs">
                  <span className="text-muted">Interview rate</span>
                  <span className="font-mono text-success">12.4%</span>
                </li>
              </ul>
            </div>
            <div className="p-6 bg-foreground text-background rounded-2xl">
              <p className="text-[10px] font-mono uppercase tracking-widest text-background/50 mb-3">
                AI reasoning
              </p>
              <p className="text-sm leading-relaxed font-serif italic text-background/95">
                "Prioritizing Stripe based on your past 3 successful interviews with fintech
                series-D companies. Vector alignment shows your payment-orchestration skill is a
                1:1 match for their Q2 headcount expansion."
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 border-t border-border pt-12 pb-24 gap-8">
          {fleetStats.map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-[10px] font-mono uppercase text-muted tracking-widest">
                {s.label}
              </p>
              <p className="font-display text-3xl font-extrabold tracking-tight">{s.value}</p>
            </div>
          ))}
        </section>

        {/* Agents grid */}
        <section id="agents" className="pb-24">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-3">
              The fleet
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold mb-4">
              Six specialists.
              <br />
              <span className="font-serif italic font-bold">One coordinated workforce.</span>
            </h2>
            <p className="text-lg text-muted">
              Aether is not one model with a chat box. It is a fleet of agents, each tuned for a
              single job in your acquisition pipeline — orchestrated as one.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { code: "SCOUT", title: "Discovery", desc: "Sweeps boards, careers pages, and hidden listings every 4 minutes." },
              { code: "STRATEGIST", title: "Prioritization", desc: "Ranks every opportunity by interview probability and ROI." },
              { code: "WRITER", title: "Resume tailoring", desc: "Rewrites bullets and keywords per role — ATS-safe." },
              { code: "OUTREACH", title: "Recruiter engagement", desc: "Personalized intros + intelligent follow-up cadence." },
              { code: "ANALYZER", title: "Market intelligence", desc: "Tracks salary, hiring velocity, keyword demand." },
              { code: "INTERVIEWER", title: "Loop preparation", desc: "Generates STAR answers, technical drills, and salary playbooks." },
            ].map((a) => (
              <div
                key={a.code}
                className="p-6 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
                    {a.code}
                  </span>
                  <span className="size-1.5 rounded-full bg-success animate-pulse-soft" />
                </div>
                <h3 className="font-display text-xl font-extrabold tracking-tight mb-2">
                  {a.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pb-32">
          <div className="text-center mb-12">
            <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-3">
              Pricing
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold">
              Pay for <span className="font-serif italic font-bold">interviews</span>, not spam.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { name: "Scout", price: "$0", desc: "Manual mode + 1 agent.", cta: "Start free" },
              { name: "Operator", price: "$39", desc: "Full fleet, semi-autonomous, 200 applications/mo.", cta: "Hire the fleet", featured: true },
              { name: "Acquirer", price: "$99", desc: "Autonomous mode, unlimited, priority queue.", cta: "Go autonomous" },
            ].map((p) => (
              <div
                key={p.name}
                className={`p-8 rounded-2xl border ${
                  p.featured
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card"
                }`}
              >
                <p
                  className={`text-[10px] font-mono uppercase tracking-widest mb-4 ${
                    p.featured ? "text-accent" : "text-muted"
                  }`}
                >
                  {p.name}
                </p>
                <div className="font-display text-5xl font-extrabold mb-1">{p.price}</div>
                <p
                  className={`text-xs font-mono uppercase tracking-widest mb-6 ${
                    p.featured ? "text-background/50" : "text-muted"
                  }`}
                >
                  per month
                </p>
                <p
                  className={`text-sm mb-8 leading-relaxed ${
                    p.featured ? "text-background/85" : "text-foreground/85"
                  }`}
                >
                  {p.desc}
                </p>
                <button
                  className={`w-full py-2.5 rounded-md text-sm font-semibold transition-colors ${
                    p.featured
                      ? "bg-accent text-white hover:bg-accent/90"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-24 text-center">
          <h2 className="font-display text-4xl md:text-6xl tracking-tight font-extrabold mb-6 text-balance">
            Stop applying.
            <br />
            <span className="font-serif italic font-bold text-accent">Start acquiring.</span>
          </h2>
          <Link
            to="/dashboard"
            className="inline-block px-8 py-4 bg-foreground text-background text-base font-semibold rounded-md hover:bg-foreground/90 transition-all"
          >
            Launch your AI career agent
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-muted">
          Aether OS · Built for the autonomous era
        </p>
      </footer>
    </div>
  );
}
