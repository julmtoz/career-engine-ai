import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  getDebugSnapshot,
  retryTask,
  seedDemoData,
  wipeDemoData,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Debug Console — Aether OS" },
      {
        name: "description",
        content:
          "Internal observability: agent runs, queue health, AI decisions, source sync, and approval state for your workspace.",
      },
    ],
  }),
});

function AdminPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><Center msg="Loading…" /></AppShell>;
  if (!user)
    return (
      <AppShell>
        <Center msg="Sign in to view the debug console.">
          <Link to="/login" className="mt-4 inline-flex px-4 py-2 rounded-md bg-foreground text-background text-sm">
            Sign in
          </Link>
        </Center>
      </AppShell>
    );
  return <Authed />;
}

function Authed() {
  const qc = useQueryClient();
  const _snap = useServerFn(getDebugSnapshot);
  const _retry = useServerFn(retryTask);
  const _seed = useServerFn(seedDemoData);
  const _wipe = useServerFn(wipeDemoData);

  const snap = useQuery({ queryKey: ["debug-snap"], queryFn: () => _snap(), refetchInterval: 6000 });
  const retry = useMutation({
    mutationFn: (id: string) => _retry({ data: { taskId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debug-snap"] }),
  });
  const seed = useMutation({
    mutationFn: () => _seed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debug-snap"] }),
  });
  const wipe = useMutation({
    mutationFn: () => _wipe(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debug-snap"] }),
  });

  const d = snap.data;
  const c = d?.counts;

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
              Operator console
            </div>
            <h1 className="mt-2 font-serif italic text-4xl tracking-tight">System diagnostics.</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Live snapshot of your workspace — agents, queue, decisions. Scoped to you via RLS.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => seed.mutate()}
              disabled={seed.isPending}
              className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {seed.isPending ? "Seeding…" : "Load demo data"}
            </button>
            <button
              onClick={() => wipe.mutate()}
              disabled={wipe.isPending}
              className="px-4 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary"
            >
              Clear demo data
            </button>
          </div>
        </div>

        {seed.data?.summary && (
          <div className="mt-4 text-xs font-mono text-muted">
            seeded: {Object.entries(seed.data.summary).map(([k, v]) => `${k}=${v}`).join(" · ")}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Agents" v={c?.agents ?? 0} />
          <Stat label="Workflows" v={c?.workflows ?? 0} />
          <Stat label="Runs" v={c?.runs ?? 0} />
          <Stat label="Failed runs" v={c?.failedRuns ?? 0} danger={!!c && c.failedRuns > 0} />
          <Stat label="Queued tasks" v={c?.tasks ?? 0} />
          <Stat label="Failed tasks" v={c?.failedTasks ?? 0} danger={!!c && c.failedTasks > 0} />
          <Stat label="Sources" v={c?.sources ?? 0} />
          <Stat label="Source errors" v={c?.erroredSources ?? 0} warn={!!c && c.erroredSources > 0} />
          <Stat label="Pending approvals" v={c?.pendingActions ?? 0} warn={!!c && c.pendingActions > 0} />
          <Stat label="Packages" v={c?.packages ?? 0} />
          <Stat label="Jobs" v={c?.jobs ?? 0} />
          <Stat label="Applications" v={c?.applications ?? 0} />
        </div>

        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <Panel title="Failed / dead-letter tasks">
            {(d?.tasks ?? [])
              .filter((t: any) => t.status === "failed" || t.status === "dead_letter")
              .slice(0, 10)
              .map((t: any) => (
                <Row
                  key={t.id}
                  primary={t.kind}
                  secondary={t.last_error ?? "—"}
                  meta={`attempt ${t.attempt}/${t.max_attempts}`}
                  action={
                    <button
                      onClick={() => retry.mutate(t.id)}
                      className="px-2 py-1 rounded bg-foreground text-background text-[10px] uppercase font-mono"
                    >
                      Retry
                    </button>
                  }
                />
              ))}
            {(d?.tasks ?? []).filter((t: any) => t.status === "failed" || t.status === "dead_letter").length === 0 && (
              <Empty msg="No failed tasks." />
            )}
          </Panel>

          <Panel title="Source sync errors">
            {(d?.sources ?? []).filter((s: any) => s.last_error).map((s: any) => (
              <Row
                key={s.id}
                primary={`${s.kind} · ${s.identifier}`}
                secondary={s.last_error}
                meta={s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : "never synced"}
              />
            ))}
            {(d?.sources ?? []).filter((s: any) => s.last_error).length === 0 && <Empty msg="All sources healthy." />}
          </Panel>

          <Panel title="Recent agent runs">
            {(d?.runs ?? []).slice(0, 12).map((r: any) => (
              <Row
                key={r.id}
                primary={r.status}
                secondary={r.error ?? r.reasoning ?? "—"}
                meta={`${r.duration_ms ?? 0}ms · ${(r.confidence ?? 0).toFixed?.(2) ?? "—"}`}
              />
            ))}
            {(d?.runs ?? []).length === 0 && <Empty msg="No runs yet." />}
          </Panel>

          <Panel title="Recent AI decisions">
            {(d?.decisions ?? []).slice(0, 12).map((x: any) => (
              <Row
                key={x.id}
                primary={x.subject_type ?? "decision"}
                secondary={x.rationale ?? "—"}
                meta={`${(Number(x.confidence ?? 0) * 100).toFixed(0)}%`}
              />
            ))}
            {(d?.decisions ?? []).length === 0 && <Empty msg="No decisions logged." />}
          </Panel>

          <Panel title="Pending approvals">
            {(d?.pending ?? []).map((p: any) => (
              <Row
                key={p.id}
                primary={p.title}
                secondary={p.summary ?? p.kind}
                meta={p.agent_kind ?? "—"}
              />
            ))}
            {(d?.pending ?? []).length === 0 && <Empty msg="Nothing waiting on you." />}
          </Panel>

          <Panel title="Workflow runs">
            {(d?.workflowRuns ?? []).slice(0, 12).map((w: any) => (
              <Row
                key={w.id}
                primary={w.current_node ?? w.status}
                secondary={w.error ?? "—"}
                meta={w.status}
              />
            ))}
            {(d?.workflowRuns ?? []).length === 0 && <Empty msg="No workflow runs yet." />}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ v, label, warn, danger }: { v: number; label: string; warn?: boolean; danger?: boolean }) {
  const tone = danger ? "text-destructive" : warn ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-display text-xl font-semibold ${tone}`}>{v}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 font-display uppercase text-xs tracking-[0.2em] font-semibold">{title}</div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-96 overflow-auto">
        {children}
      </div>
    </section>
  );
}

function Row({
  primary,
  secondary,
  meta,
  action,
}: {
  primary: string;
  secondary?: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-2.5 flex items-start gap-3 text-xs">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-foreground">{primary}</div>
        {secondary && <div className="text-muted text-[11px] mt-0.5 line-clamp-2">{secondary}</div>}
      </div>
      {meta && <div className="text-[10px] font-mono text-muted whitespace-nowrap">{meta}</div>}
      {action}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-4 py-8 text-center text-xs text-muted">{msg}</div>;
}

function Center({ msg, children }: { msg: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto pt-32 px-6 text-center">
      <p className="text-sm text-muted">{msg}</p>
      {children}
    </div>
  );
}
