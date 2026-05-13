import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { listFeedback, submitFeedback, resolveFeedback } from "@/lib/feedback.functions";

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
  head: () => ({
    meta: [
      { title: "Beta Feedback — Aether OS" },
      { name: "description", content: "Report bugs, rate AI quality, and request features." },
    ],
  }),
});

function FeedbackPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="pt-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user)
    return (
      <AppShell>
        <div className="max-w-md mx-auto pt-32 px-6 text-center">
          <h1 className="font-serif italic text-3xl tracking-tight">Sign in to send feedback</h1>
          <Link to="/login" className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium">Sign in</Link>
        </div>
      </AppShell>
    );
  return <Authed />;
}

function Authed() {
  const qc = useQueryClient();
  const _list = useServerFn(listFeedback);
  const _submit = useServerFn(submitFeedback);
  const _resolve = useServerFn(resolveFeedback);
  const list = useQuery({ queryKey: ["feedback"], queryFn: () => _list() });

  const [kind, setKind] = useState<"bug" | "ux" | "ai_quality" | "feature" | "general">("bug");
  const [severity, setSeverity] = useState<"low" | "normal" | "high" | "blocker">("normal");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | "">("");

  const submit = useMutation({
    mutationFn: () =>
      _submit({
        data: {
          kind,
          severity,
          title,
          body: body || null,
          rating: rating === "" ? null : Number(rating),
          route: typeof window !== "undefined" ? window.location.pathname : null,
        },
      }),
    onSuccess: () => {
      setTitle(""); setBody(""); setRating("");
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const resolve = useMutation({
    mutationFn: (vars: { id: string; status: "open" | "triaged" | "resolved" | "wontfix" }) =>
      _resolve({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Beta feedback</div>
        <h1 className="mt-2 font-serif italic text-4xl tracking-tight">Tell the agent what's broken.</h1>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Bugs, confusing UX, low-quality AI output, missing features — all in one inbox. Routed to the workspace owner.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) submit.mutate(); }}
          className="mt-8 grid gap-4 p-6 rounded-2xl border border-border bg-card"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Kind">
              <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm">
                <option value="bug">Bug</option>
                <option value="ux">UX friction</option>
                <option value="ai_quality">AI quality</option>
                <option value="feature">Feature request</option>
                <option value="general">General</option>
              </select>
            </Field>
            <Field label="Severity">
              <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="blocker">Blocker</option>
              </select>
            </Field>
            <Field label="Rating (1–5)">
              <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm" />
            </Field>
            <Field label="Route">
              <input readOnly value={typeof window !== "undefined" ? window.location.pathname : ""} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm text-muted" />
            </Field>
          </div>
          <Field label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="One-line summary" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Details">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Steps to reproduce, expected vs actual, AI output you disagree with, etc." className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          <div className="flex justify-end">
            <button disabled={submit.isPending || !title.trim()} className="px-5 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50">
              {submit.isPending ? "Sending…" : "Submit"}
            </button>
          </div>
        </form>

        <div className="mt-12">
          <h2 className="font-serif italic text-2xl tracking-tight">Your reports</h2>
          <div className="mt-4 grid gap-2">
            {(list.data?.items ?? []).length === 0 && (
              <div className="text-sm text-muted">Nothing submitted yet.</div>
            )}
            {(list.data?.items ?? []).map((f: any) => (
              <div key={f.id} className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted">
                    <span>{f.kind}</span>·<span>{f.severity}</span>·<span>{f.status}</span>
                    {f.rating ? <span>· {f.rating}/5</span> : null}
                  </div>
                  <div className="mt-1 text-sm font-medium truncate">{f.title}</div>
                  {f.body ? <div className="mt-1 text-xs text-muted line-clamp-2">{f.body}</div> : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  {f.status !== "resolved" && (
                    <button onClick={() => resolve.mutate({ id: f.id, status: "resolved" })} className="text-[11px] px-2 py-1 rounded border border-border hover:bg-foreground hover:text-background transition">Resolve</button>
                  )}
                  {f.status !== "wontfix" && (
                    <button onClick={() => resolve.mutate({ id: f.id, status: "wontfix" })} className="text-[11px] px-2 py-1 rounded border border-border hover:bg-foreground hover:text-background transition">Won't fix</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}
