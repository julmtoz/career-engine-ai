import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { listFollowUps, decideFollowUp } from "@/lib/conversion.functions";

export const Route = createFileRoute("/follow-ups")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Follow-Ups — Aether OS" },
      { name: "description", content: "Approval-based follow-up sequences for recruiters, applications, thank-yous, and nurture." },
    ],
  }),
});

function Page() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const qc = useQueryClient();
  const _list = useServerFn(listFollowUps);
  const _decide = useServerFn(decideFollowUp);
  const q = useQuery({ queryKey: ["follow-ups"], queryFn: () => _list(), refetchInterval: 8000 });
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" | "skipped" | "sent" }) => _decide({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-ups"] }),
  });

  const rows = (q.data?.followUps ?? []) as any[];
  const pending = rows.filter((r) => r.status === "pending" || r.status === "approved");
  const decided = rows.filter((r) => !(r.status === "pending" || r.status === "approved"));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 pb-32">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Follow-up queue</p>
        <h1 className="font-serif italic text-4xl mb-2">Quiet, well-timed nudges.</h1>
        <p className="text-sm text-muted max-w-2xl mb-8">Recruiter follow-ups · application checks · thank-yous · second pings · nurture-after-rejection. Nothing sends without your signature.</p>

        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Queued ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-xs text-muted">Nothing scheduled. Approve an application package to seed a sequence.</div>
          ) : (
            <ul className="space-y-3">
              {pending.map((r) => (
                <li key={r.id} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase text-muted">{r.kind} · {r.channel}</p>
                      {r.subject && <p className="font-medium">{r.subject}</p>}
                      <p className="text-[11px] text-muted">Send after {new Date(r.send_after).toLocaleString()} · status {r.status}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {r.status === "pending" && (
                        <button onClick={() => decide.mutate({ id: r.id, decision: "approved" })} className="text-xs px-2.5 py-1 bg-foreground text-background rounded">Approve</button>
                      )}
                      {r.status === "approved" && (
                        <button onClick={() => decide.mutate({ id: r.id, decision: "sent" })} className="text-xs px-2.5 py-1 bg-success text-background rounded">Mark sent</button>
                      )}
                      <button onClick={() => decide.mutate({ id: r.id, decision: "skipped" })} className="text-xs px-2.5 py-1 border border-border rounded">Skip</button>
                      <button onClick={() => decide.mutate({ id: r.id, decision: "rejected" })} className="text-xs px-2.5 py-1 border border-destructive/40 text-destructive rounded">Reject</button>
                    </div>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm font-sans text-foreground/90">{r.body}</pre>
                  {r.reasoning && <p className="mt-2 text-[11px] text-muted italic">{r.reasoning}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {decided.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">History</h2>
            <ul className="divide-y divide-border border border-border rounded-lg bg-card">
              {decided.slice(0, 30).map((r) => (
                <li key={r.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium">{r.subject ?? r.kind}</p>
                    <p className="text-[10px] text-muted">{new Date(r.decided_at ?? r.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{r.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
