import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getStrategistRecommendations } from "@/lib/strategist.functions";

export const Route = createFileRoute("/strategist")({
  component: StrategistPage,
  head: () => ({
    meta: [
      { title: "AI Strategist — Aether OS" },
      { name: "description", content: "Weekly AI-generated strategy: which jobs to prioritize, recruiters to contact, resume to use, and when to act." },
    ],
  }),
});

function StrategistPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _run = useServerFn(getStrategistRecommendations);
  const run = useMutation({ mutationFn: async () => _run() });
  const o = run.data?.output as Record<string, unknown> | undefined;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Aether strategist</p>
            <h1 className="font-display text-5xl font-extrabold tracking-tight mb-2">Weekly action plan</h1>
            <p className="text-muted">Synthesizes profile, pipeline, recruiters, and live opportunities into a prioritized plan.</p>
          </div>
          <button onClick={() => run.mutate()} disabled={run.isPending} className="px-5 py-2.5 bg-foreground text-background rounded-md text-sm font-medium disabled:opacity-50">
            {run.isPending ? "Thinking…" : "Generate plan"}
          </button>
        </header>

        {run.error && <p className="text-sm text-red-500">{(run.error as Error).message}</p>}

        {run.data && (
          <div className="space-y-6">
            <section className="border border-border rounded-xl p-5 bg-card">
              <p className="text-[10px] uppercase tracking-widest font-mono text-accent mb-2">Reasoning · confidence {(run.data.confidence * 100).toFixed(0)}%</p>
              <p className="text-sm">{run.data.reasoning}</p>
            </section>

            <Block title="Focus jobs" items={(o?.focus_jobs as Array<Record<string, unknown>>) ?? []} render={(j) => (
              <>
                <p className="font-display font-bold">{String(j.title ?? "—")}</p>
                <p className="text-xs text-muted mt-1">{String(j.reason ?? "")}</p>
              </>
            )} />
            <Block title="Recruiter targets" items={(o?.recruiter_targets as Array<Record<string, unknown>>) ?? []} render={(r) => (
              <>
                <p className="font-display font-bold">{String(r.name ?? "—")} <span className="text-xs text-muted font-sans font-normal">via {String(r.suggested_channel ?? "")}</span></p>
                <p className="text-xs text-muted mt-1">{String(r.why_now ?? "")}</p>
              </>
            )} />

            {o?.resume_strategy && <Card title="Resume strategy">{String(o.resume_strategy)}</Card>}
            {o?.timing && <Card title="Timing">{String(o.timing)}</Card>}
            {Array.isArray(o?.risks) && (o!.risks as unknown[]).length > 0 && (
              <Card title="Risks">
                <ul className="list-disc pl-5 space-y-1">
                  {(o!.risks as string[]).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Block({ title, items, render }: { title: string; items: Array<Record<string, unknown>>; render: (i: Record<string, unknown>) => React.ReactNode }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="font-display font-bold mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((it, i) => <div key={i} className="border border-border rounded-xl p-4 bg-card">{render(it)}</div>)}
      </div>
    </section>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-xl p-5 bg-card">
      <p className="text-[10px] uppercase tracking-widest font-mono text-accent mb-2">{title}</p>
      <div className="text-sm">{children}</div>
    </section>
  );
}
