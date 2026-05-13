import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { listPendingActions, approvePendingAction, rejectPendingAction } from "@/lib/approvals.functions";

export const Route = createFileRoute("/approvals")({
  component: ApprovalsPage,
  head: () => ({
    meta: [
      { title: "Approval Queue — Aether OS" },
      { name: "description", content: "Every AI artifact destined to leave your workspace lives here until you approve it." },
    ],
  }),
});

function ApprovalsPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const qc = useQueryClient();
  const _list = useServerFn(listPendingActions);
  const _approve = useServerFn(approvePendingAction);
  const _reject = useServerFn(rejectPendingAction);

  const q = useQuery({ queryKey: ["approvals"], queryFn: () => _list(), refetchInterval: 5000 });
  const approve = useMutation({
    mutationFn: (id: string) => _approve({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => _reject({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });

  const actions = (q.data?.actions ?? []) as any[];
  const pending = actions.filter((a) => a.status === "pending");
  const decided = actions.filter((a) => a.status !== "pending").slice(0, 20);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 pb-32">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Approval Queue</div>
        <h1 className="mt-2 font-serif italic text-4xl">Nothing leaves without your signature.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tailored resumes, cover letters, outreach drafts, and application submissions all wait here for human
          review.
        </p>

        <section className="mt-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Pending ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-xs text-muted">
              You're caught up.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <ActionCard key={a.id} action={a} onApprove={() => approve.mutate(a.id)} onReject={() => reject.mutate(a.id)} busy={approve.isPending || reject.isPending} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Recent decisions</h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {decided.map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-foreground">{a.title}</div>
                  <div className="text-[10px] text-muted mt-0.5">{a.kind} · {new Date(a.decided_at ?? a.created_at).toLocaleString()}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${a.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{a.status}</span>
              </div>
            ))}
            {decided.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted">No decisions yet.</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActionCard({ action, onApprove, onReject, busy }: { action: any; onApprove: () => void; onReject: () => void; busy: boolean }) {
  const payload = action.payload ?? {};
  return (
    <div className="rounded-lg border-2 border-warning/40 bg-warning/5 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-warning text-background text-[10px] font-mono uppercase tracking-wider">
              {action.kind.replace("_", " ")}
            </span>
            {typeof action.confidence === "number" && (
              <span className="text-[10px] font-mono text-warning">confidence {(action.confidence * 100).toFixed(0)}%</span>
            )}
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">{action.title}</h3>
          {action.summary && <p className="mt-1 text-sm text-foreground/80">{action.summary}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReject} disabled={busy} className="px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium hover:bg-secondary disabled:opacity-50">Reject</button>
          <button onClick={onApprove} disabled={busy} className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium disabled:opacity-50">Approve</button>
        </div>
      </div>

      {Array.isArray(payload.bullets) && payload.bullets.length > 0 && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">View tailored bullets ({payload.bullets.length})</summary>
          <ul className="mt-2 space-y-2">
            {payload.bullets.slice(0, 8).map((b: any, i: number) => (
              <li key={i} className="border-l-2 border-accent/30 pl-3">
                <div className="text-foreground">{b.rewritten}</div>
                {b.why && <div className="text-[10px] text-muted mt-0.5 italic">{b.why}</div>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {Array.isArray(payload.keywords_injected) && payload.keywords_injected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {payload.keywords_injected.slice(0, 14).map((k: string) => (
            <span key={k} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono">{k}</span>
          ))}
        </div>
      )}
      {payload.reasoning && (
        <div className="mt-3 text-xs text-muted italic">— {payload.reasoning}</div>
      )}
    </div>
  );
}
