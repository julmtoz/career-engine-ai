import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { listInterviewPrep, generateInterviewPrep } from "@/lib/conversion.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/prep")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Interview Prep — Aether OS" },
      { name: "description", content: "Auto-generated company briefing, technical and behavioral drills, STAR answers, negotiation strategy." },
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
  const _list = useServerFn(listInterviewPrep);
  const _gen = useServerFn(generateInterviewPrep);
  const list = useQuery({ queryKey: ["prep"], queryFn: () => _list() });
  const apps = useQuery({
    queryKey: ["prep-apps"],
    queryFn: async () => {
      const r = await supabase.from("applications").select("id, stage, job_id, job:job_opportunities(title, company)").in("stage", ["phone_screen", "interview", "interview_2", "ready"]).limit(20);
      return r.data ?? [];
    },
  });
  const gen = useMutation({
    mutationFn: (v: { applicationId: string; round: "screen" | "technical" | "onsite" | "final" }) => _gen({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prep"] }),
  });

  const [open, setOpen] = useState<string | null>(null);
  const packs = (list.data?.packs ?? []) as any[];
  const active = packs.find((p) => p.id === open) ?? packs[0];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-10 pb-32">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Interview prep</p>
        <h1 className="font-serif italic text-4xl mb-2">Walk in already inside the room.</h1>
        <p className="text-sm text-muted max-w-2xl mb-8">Company brief · role-specific & technical questions · behavioral drills with STAR · sharp questions to ask · negotiation strategy · red flags.</p>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="space-y-6">
            <section>
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Generate</h2>
              <ul className="space-y-1.5">
                {(apps.data ?? []).map((a: any) => (
                  <li key={a.id} className="border border-border rounded-md p-3 bg-card">
                    <p className="text-sm font-medium">{a.job?.title ?? "Role"}</p>
                    <p className="text-[11px] text-muted">{a.job?.company} · {a.stage}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(["screen", "technical", "onsite", "final"] as const).map((r) => (
                        <button key={r} disabled={gen.isPending} onClick={() => gen.mutate({ applicationId: a.id, round: r })} className="text-[10px] px-2 py-0.5 border border-border rounded hover:border-accent disabled:opacity-50">{r}</button>
                      ))}
                    </div>
                  </li>
                ))}
                {(apps.data ?? []).length === 0 && <p className="text-xs text-muted">No applications past "ready". <Link to="/packages" className="text-accent">Build a package →</Link></p>}
              </ul>
            </section>
            <section>
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Packs ({packs.length})</h2>
              <ul className="space-y-1">
                {packs.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setOpen(p.id)} className={`w-full text-left p-2 rounded text-xs ${active?.id === p.id ? "bg-accent/10 text-accent" : "hover:bg-muted/10"}`}>
                      {p.job?.title ?? "Role"} · <span className="text-muted">{p.round}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <main>
            {active ? <PrepPack pack={active} /> : <p className="text-sm text-muted">Generate a prep pack to begin.</p>}
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function PrepPack({ pack }: { pack: any }) {
  const cb = pack.company_brief ?? {};
  const ns = pack.negotiation_strategy ?? {};
  return (
    <div className="space-y-6">
      <header className="border border-border rounded-xl p-5 bg-card">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">{pack.round}</p>
        <h2 className="font-display text-2xl font-bold">{pack.job?.title}</h2>
        <p className="text-sm text-muted">{pack.job?.company}</p>
      </header>

      <Card title="Company brief">
        <Field k="Mission" v={cb.mission} />
        <ListField k="Products" v={cb.products} />
        <ListField k="Recent news" v={cb.recent_news} />
        <ListField k="Culture signals" v={cb.culture_signals} />
      </Card>

      <Card title="Role questions">
        <ul className="list-decimal pl-5 text-sm space-y-1">{(pack.role_questions ?? []).map((q: string, i: number) => <li key={i}>{q}</li>)}</ul>
      </Card>

      <Card title="Technical drills">
        <ul className="space-y-3">
          {(pack.technical_questions ?? []).map((q: any, i: number) => (
            <li key={i} className="border border-border rounded-md p-3">
              <p className="text-sm font-medium">{q.question}</p>
              <p className="text-[11px] text-muted mt-1">Why asked: {q.why_asked}</p>
              <p className="text-[11px] text-muted">Framework: {q.framework}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Behavioral + STAR">
        <ul className="space-y-3">
          {(pack.behavioral_questions ?? []).map((q: any, i: number) => (
            <li key={i} className="text-sm">
              <p className="font-medium">{q.question} <span className="text-[10px] font-mono uppercase text-muted">{q.competency}</span></p>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-3">
          {(pack.star_answers ?? []).map((s: any, i: number) => (
            <div key={i} className="border border-accent/30 bg-accent/5 rounded-md p-3 text-sm">
              <p className="font-medium">{s.question}</p>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div><span className="font-mono uppercase text-muted">Situation</span> · {s.situation}</div>
                <div><span className="font-mono uppercase text-muted">Task</span> · {s.task}</div>
                <div><span className="font-mono uppercase text-muted">Action</span> · {s.action}</div>
                <div><span className="font-mono uppercase text-muted">Result</span> · {s.result}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Questions to ask back">
        <ul className="list-disc pl-5 text-sm space-y-1">{(pack.questions_to_ask ?? []).map((q: string, i: number) => <li key={i}>{q}</li>)}</ul>
      </Card>

      <Card title="Negotiation strategy">
        <Field k="Anchor" v={ns.anchor ? `$${ns.anchor}` : ""} />
        <Field k="Floor" v={ns.floor ? `$${ns.floor}` : ""} />
        <ListField k="Talking points" v={ns.talking_points} />
      </Card>

      <Card title="Red flags">
        <ul className="list-disc pl-5 text-sm space-y-1 text-destructive">{(pack.red_flags ?? []).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-xl p-5 bg-card">
      <h3 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}
function Field({ k, v }: { k: string; v: any }) {
  if (!v) return null;
  return <p className="text-sm"><span className="text-[10px] font-mono uppercase text-muted">{k}</span> · {String(v)}</p>;
}
function ListField({ k, v }: { k: string; v: any }) {
  if (!Array.isArray(v) || v.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-mono uppercase text-muted mb-1">{k}</p>
      <ul className="list-disc pl-5 text-sm space-y-0.5">{v.map((x: any, i: number) => <li key={i}>{String(x)}</li>)}</ul>
    </div>
  );
}
