import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getObservability } from "@/lib/observability.functions";

export const Route = createFileRoute("/observability")({
  component: ObservabilityPage,
  head: () => ({
    meta: [
      { title: "Observability — Aether OS" },
      { name: "description", content: "Workflow latency, queue depth, AI cost, source reliability, approval conversion." },
    ],
  }),
});

function ObservabilityPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="pt-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user)
    return (
      <AppShell>
        <div className="max-w-md mx-auto pt-32 px-6 text-center">
          <h1 className="font-serif italic text-3xl tracking-tight">Sign in to view metrics</h1>
          <Link to="/login" className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium">Sign in</Link>
        </div>
      </AppShell>
    );
  return <Authed />;
}

function Authed() {
  const _o = useServerFn(getObservability);
  const q = useQuery({ queryKey: ["observability"], queryFn: () => _o(), refetchInterval: 15000 });
  const d = q.data;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Observability · last 7 days</div>
        <h1 className="mt-2 font-serif italic text-4xl tracking-tight">System telemetry.</h1>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Live signals to validate that workflows are reliable, AI is confident, sources are healthy, and approvals are actually converting.
        </p>

        {!d && <div className="mt-10 text-sm text-muted">Loading metrics…</div>}

        {d && (
          <>
            <Section title="Interview engine">
              <Stat label="Interviews (7d)" value={d.interviews_7d} accent />
              <Stat label="Avg readiness" value={`${d.packages.avg_readiness}/100`} />
              <Stat label="Packages built" value={d.packages.total} />
              <Stat label="Approval conversion" value={`${d.approval.conversion}%`} />
            </Section>

            <Section title="Agent runtime">
              <Stat label="Runs" value={d.runs.total} />
              <Stat label="Failure rate" value={`${d.runs.failure_rate}%`} warn={d.runs.failure_rate > 5} />
              <Stat label="Avg confidence" value={d.runs.avg_confidence} />
              <Stat label="Cost (USD)" value={`$${d.runs.cost_usd}`} />
              <Stat label="p50 latency" value={`${d.runs.latency_p50_ms}ms`} />
              <Stat label="p90 latency" value={`${d.runs.latency_p90_ms}ms`} />
              <Stat label="p99 latency" value={`${d.runs.latency_p99_ms}ms`} warn={d.runs.latency_p99_ms > 15000} />
              <Stat label="Tokens (in/out)" value={`${d.runs.tokens_in}/${d.runs.tokens_out}`} />
            </Section>

            <Section title="Task queue">
              <Stat label="Pending" value={d.queue.pending} />
              <Stat label="Running" value={d.queue.running} />
              <Stat label="Failed" value={d.queue.failed} warn={d.queue.failed > 0} />
              <Stat label="Dead-letter" value={d.queue.dead} warn={d.queue.dead > 0} />
              <Stat label="Succeeded" value={d.queue.done} />
            </Section>

            <Section title="Approvals">
              <Stat label="Pending" value={d.approval.pending} />
              <Stat label="Approved" value={d.approval.approved} />
              <Stat label="Rejected" value={d.approval.rejected} />
              <Stat label="Decisions logged" value={d.decisions.total} />
            </Section>

            <div className="mt-10">
              <h2 className="font-serif italic text-2xl tracking-tight">Source reliability</h2>
              <div className="mt-4 grid gap-2">
                {d.sources.length === 0 && <div className="text-sm text-muted">No sources connected yet.</div>}
                {d.sources.map((s: any) => (
                  <div key={s.identifier} className="p-4 rounded-xl border border-border bg-card grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
                    <div className="col-span-2 min-w-0">
                      <div className="text-sm font-medium truncate">{s.identifier}</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{s.kind} · {s.status}</div>
                    </div>
                    <Mini label="Reliability" value={`${s.reliability}%`} />
                    <Mini label="Imported" value={`${s.jobs_imported}/${s.jobs_seen}`} />
                    <Mini label="Confidence" value={s.confidence.toFixed(2)} />
                    <Mini label="Last sync" value={s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : "—"} />
                    {s.last_error && (
                      <div className="col-span-2 md:col-span-6 text-[11px] text-red-500/90 truncate">{s.last_error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {d.recent_failures.length > 0 && (
              <div className="mt-10">
                <h2 className="font-serif italic text-2xl tracking-tight">Recent failures</h2>
                <div className="mt-4 grid gap-2">
                  {d.recent_failures.map((f: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-card text-xs">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{new Date(f.at).toLocaleString()}</div>
                      <div className="mt-1 text-red-500/90 truncate">{f.error || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="font-serif italic text-2xl tracking-tight">{title}</h2>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: any; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border bg-card ${warn ? "border-red-500/40" : accent ? "border-accent/40" : "border-border"}`}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-serif italic text-2xl tracking-tight ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
