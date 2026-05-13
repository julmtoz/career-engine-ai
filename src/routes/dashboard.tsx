import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { AgentStream } from "@/components/agent-stream";
import { JobCard } from "@/components/job-card";
import { MatchRing } from "@/components/match-ring";
import { getActivation } from "@/lib/activation.functions";
import { MissionControl } from "@/components/mission-control";
import {
  agentFleet,
  dashboardMetrics,
  jobs,
  pipelineStages,
} from "@/lib/mock-data";

function ActivationBanner() {
  const _get = useServerFn(getActivation);
  const q = useQuery({ queryKey: ["activation"], queryFn: () => _get(), refetchInterval: 15000 });
  const d = q.data;
  if (!d || d.score === 100) return null;
  return (
    <Link
      to="/onboarding"
      className="block mb-6 rounded-2xl border border-accent/30 bg-accent/5 p-5 hover:bg-accent/10 transition"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Activation · {d.completed}/{d.total}</p>
          <p className="font-medium">
            {d.next ? <>Next up: <span className="font-serif italic">{d.next.label}</span> — {d.next.description}</> : "Almost there."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${d.score}%` }} />
          </div>
          <span className="text-xs px-3 py-1.5 bg-foreground text-background rounded-md font-medium">Continue →</span>
        </div>
      </div>
    </Link>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Fleet — Aether OS" },
      { name: "description", content: "Live command center for your autonomous career agents." },
    ],
  }),
});

function MetricCard({
  label,
  value,
  delta,
  highlight = false,
}: {
  label: string;
  value: string | number;
  delta: string;
  highlight?: boolean;
}) {
  return (
    <div className={`relative p-4 surface ${highlight ? "bg-elevated" : ""}`}>
      {highlight && <span className="absolute top-2 right-2 size-1.5 rounded-full bg-signal animate-pulse-soft" />}
      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className={`font-display text-2xl font-extrabold tracking-tight ${highlight ? "text-accent text-glow" : ""}`}>{value}</span>
        <span className={`text-[10px] font-mono mb-1 ${highlight ? "text-accent" : "text-signal"}`}>{delta}</span>
      </div>
    </div>
  );
}
function Dashboard() {
  const m = dashboardMetrics;
  const counts = pipelineStages.map((s) => ({
    ...s,
    count: jobs.filter((j) => j.stage === s.id).length,
  }));

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ActivationBanner />
        {/* Header */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent mb-2">
              ─ Command center · live
            </p>
            <h1 className="font-display text-3xl md:text-4xl tracking-[-0.02em] font-extrabold">
              Good evening, <span className="font-serif italic font-bold text-accent">Alex.</span>
            </h1>
            <p className="text-muted text-sm mt-1.5">
              Fleet ran <span className="text-foreground font-mono">1,402</span> ops today ·
              <span className="text-signal"> 4 interviews</span> on the runway.
            </p>
          </div>
          <Link
            to="/jobs"
            className="px-4 py-2 bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest rounded-md glow-accent"
          >
            Re-rank feed →
          </Link>
        </div>

        {/* Mission control viz */}
        <div className="mb-6">
          <MissionControl compact />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden mb-8">
          <MetricCard label="Discovery velocity" value={m.jobsScanned.value.toLocaleString()} delta={m.jobsScanned.delta} />
          <MetricCard label="Match accuracy" value={m.matchAccuracy.value} delta={m.matchAccuracy.delta} />
          <MetricCard label="Outreach flow" value={m.outreachActive.value} delta={m.outreachActive.delta} />
          <MetricCard label="Interview yield" value={m.interviewsBooked.value} delta={m.interviewsBooked.delta} highlight />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: priority opportunities */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <section className="border border-border rounded-2xl bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl font-extrabold tracking-tight">
                    Priority opportunities
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Strategist agent re-ranked these 4 minutes ago
                  </p>
                </div>
                <Link
                  to="/jobs"
                  className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {jobs.slice(0, 3).map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
            </section>

            {/* Pipeline summary */}
            <section className="border border-border rounded-2xl bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-extrabold tracking-tight">
                  Acquisition funnel
                </h2>
                <Link
                  to="/pipeline"
                  className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground"
                >
                  Open pipeline →
                </Link>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {counts.map((s) => (
                  <div key={s.id} className="text-center">
                    <div className="h-24 flex items-end">
                      <div
                        className="w-full bg-accent/15 rounded-t border-t-2 border-accent transition-all"
                        style={{ height: `${Math.max(s.count * 22, 4)}px` }}
                      />
                    </div>
                    <div className="font-display text-lg font-extrabold mt-2">{s.count}</div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: agent stream + fleet */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <AgentStream height="480px" />

            <section className="border border-border rounded-2xl bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted">
                  Active fleet
                </h3>
                <span className="text-[10px] font-mono text-success">
                  {agentFleet.filter((a) => a.status === "active").length} working
                </span>
              </div>
              <ul className="space-y-3">
                {agentFleet.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span
                      className={`size-2 rounded-full mt-1.5 shrink-0 ${
                        a.status === "active"
                          ? "bg-accent animate-pulse-soft"
                          : a.status === "idle"
                            ? "bg-muted/50"
                            : "bg-warning"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-mono uppercase font-medium tracking-wider">
                          {a.codename}
                        </span>
                        <span className="text-[9px] font-mono uppercase text-muted tracking-widest">
                          {a.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-snug mt-0.5">{a.task}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border border-border rounded-2xl bg-card p-6 grid place-items-center">
              <MatchRing value={92} label="Avg match" />
              <p className="text-xs text-muted text-center mt-4">
                Across <span className="font-mono text-foreground">142</span> live opportunities
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
