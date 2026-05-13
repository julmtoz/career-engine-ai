import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  listRecruiters,
  upsertRecruiter,
  draftRecruiterOutreach,
  decideOutreachDraft,
} from "@/lib/recruiters.functions";

export const Route = createFileRoute("/recruiters")({
  component: RecruitersPage,
  head: () => ({
    meta: [
      { title: "Recruiter Intelligence — Aether OS" },
      { name: "description", content: "Recruiter CRM with warmth scoring, AI-drafted outreach, and approval-gated sending across LinkedIn, email, and intro requests." },
    ],
  }),
});

function RecruitersPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _list = useServerFn(listRecruiters);
  const _upsert = useServerFn(upsertRecruiter);
  const _draft = useServerFn(draftRecruiterOutreach);
  const _decide = useServerFn(decideOutreachDraft);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["recruiters"], queryFn: () => _list() });

  const [form, setForm] = useState({ name: "", title: "", company: "", linkedin_url: "", email: "" });
  const [drafted, setDrafted] = useState<{ id: string; body: string; subject: string | null; channel: string } | null>(null);

  const add = useMutation({
    mutationFn: async () => _upsert({ data: form }),
    onSuccess: () => { setForm({ name: "", title: "", company: "", linkedin_url: "", email: "" }); qc.invalidateQueries({ queryKey: ["recruiters"] }); },
  });
  const draft = useMutation({
    mutationFn: async (vars: { recruiter_id: string; channel: "linkedin" | "email" | "intro_request" | "followup" }) =>
      _draft({ data: { recruiter_id: vars.recruiter_id, channel: vars.channel, variant: "cold" } }),
    onSuccess: (r, vars) => setDrafted({ id: r.draft_id, body: r.body, subject: r.subject, channel: vars.channel }),
  });
  const decide = useMutation({
    mutationFn: async (vars: { id: string; action: "approve" | "reject" | "sent" }) => _decide({ data: vars }),
    onSettled: () => { qc.invalidateQueries({ queryKey: ["recruiters"] }); setDrafted(null); },
  });

  const recruiters = q.data?.recruiters ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Recruiter intelligence</p>
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-2">People graph</h1>
          <p className="text-muted max-w-2xl">Track every recruiter, founder, or hiring manager. Warmth, last touch, and AI-drafted outreach — never sends without your approval.</p>
        </header>

        <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
          <section className="border border-border rounded-xl p-6 bg-card h-fit">
            <h2 className="font-display font-bold mb-4">Add recruiter</h2>
            {(["name", "title", "company", "linkedin_url", "email"] as const).map((k) => (
              <div key={k} className="mb-3">
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-1 font-mono">{k.replace("_", " ")}</label>
                <input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              onClick={() => add.mutate()}
              disabled={!form.name.trim() || add.isPending}
              className="w-full px-4 py-2.5 bg-foreground text-background rounded-md text-sm font-medium disabled:opacity-50"
            >{add.isPending ? "Saving…" : "Add"}</button>
          </section>

          <section>
            <h2 className="font-display font-bold mb-4">Targets</h2>
            <div className="space-y-3">
              {recruiters.length === 0 && <p className="text-sm text-muted">No recruiters yet.</p>}
              {recruiters.map((r) => (
                <article key={r.id} className="border border-border rounded-xl p-5 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold">{r.name}</h3>
                        {r.target_tier && <span className="text-[9px] font-mono uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5 rounded">tier {r.target_tier}</span>}
                        <ContactDot s={r.contact_status} />
                      </div>
                      <p className="text-xs text-muted">{r.title || "—"} · {r.company || "—"}</p>
                      {r.last_contacted_at && <p className="text-[10px] text-muted mt-1">last contact {new Date(r.last_contacted_at).toLocaleDateString()}</p>}
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-mono tabular-nums">warmth {(Number(r.warmth_score ?? 0)).toFixed(2)}</div>
                      <div className="text-muted">{r.draft_count} drafts</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {(["linkedin", "email", "intro_request", "followup"] as const).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => draft.mutate({ recruiter_id: r.id, channel: ch })}
                        disabled={draft.isPending}
                        className="text-xs px-2.5 py-1.5 border border-border rounded-md hover:border-accent disabled:opacity-50"
                      >Draft {ch.replace("_", " ")}</button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {drafted && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur z-50 grid place-items-center px-6">
            <div className="bg-card border border-border rounded-xl max-w-xl w-full p-6">
              <p className="text-[10px] uppercase tracking-widest font-mono text-accent mb-2">{drafted.channel} draft</p>
              {drafted.subject && <p className="font-display font-bold mb-2">Re: {drafted.subject}</p>}
              <div className="bg-background border border-border rounded-md p-4 text-sm whitespace-pre-wrap mb-4 max-h-[50vh] overflow-y-auto">{drafted.body}</div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => decide.mutate({ id: drafted.id, action: "reject" })} className="px-3 py-2 text-xs border border-border rounded-md text-muted hover:text-foreground">Reject</button>
                <button onClick={() => decide.mutate({ id: drafted.id, action: "approve" })} className="px-3 py-2 text-xs border border-border rounded-md hover:border-accent">Approve</button>
                <button onClick={() => decide.mutate({ id: drafted.id, action: "sent" })} className="px-3 py-2 text-xs bg-foreground text-background rounded-md font-medium">Mark sent</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ContactDot({ s }: { s: string | null | undefined }) {
  const c = s === "engaged" ? "bg-emerald-500" : s === "warming" ? "bg-amber-500" : s === "silent" ? "bg-red-500" : "bg-muted";
  return <span className={`size-1.5 rounded-full ${c}`} title={s ?? "cold"} />;
}
