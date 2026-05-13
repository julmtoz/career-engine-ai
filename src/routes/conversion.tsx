import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { conversionAnalytics, learningSignals, recordOutcome } from "@/lib/conversion.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conversion")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Conversion — Aether OS" },
      { name: "description", content: "Interviews generated per week. Funnel, source quality, learning signals." },
    ],
  }),
});

function Page() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

const KINDS = ["applied", "recruiter_responded", "phone_screen", "interview", "second_interview", "offer", "rejected", "ghosted"] as const;

function Authed() {
  const qc = useQueryClient();
  const _conv = useServerFn(conversionAnalytics);
  const _learn = useServerFn(learningSignals);
  const _record = useServerFn(recordOutcome);

  const conv = useQuery({ queryKey: ["conv"], queryFn: () => _conv(), refetchInterval: 15_000 });
  const learn = useQuery({ queryKey: ["learn"], queryFn: () => _learn() });

  const apps = useQuery({
    queryKey: ["conv-apps"],
    queryFn: async () => {
      const r = await supabase.from("applications").select("id, stage, job:job_opportunities(title, company)").order("updated_at", { ascending: false }).limit(30);
      return r.data ?? [];
    },
  });

  const record = useMutation({
    mutationFn: (v: { applicationId: string; kind: typeof KINDS[number] }) => _record({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conv"] });
      qc.invalidateQueries({ queryKey: ["learn"] });
      qc.invalidateQueries({ queryKey: ["conv-apps"] });
    },
  });

  const headline = conv.data?.headline as any;
  const weekly = (conv.data?.weekly ?? []) as any[];
  const funnel = (conv.data?.funnel ?? {}) as Record<string, number>;
  const sources = (learn.data?.sources ?? []) as any[];
  const topResumes = (learn.data?.topResumes ?? []) as any[];

  const [selApp, setSelApp] = useState<string>("");

  const maxBar = Math.max(1, ...weekly.map((w) => w.applied + w.interviews));

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-10 pb-32">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Conversion engine</p>
        <h1 className="font-serif italic text-5xl mb-2">Interviews generated per week.</h1>
        <p className="text-sm text-muted max-w-2xl mb-10">We optimize for interviews, not applications sent. Track outcomes, learn what works, repeat.</p>

        <section className="grid md:grid-cols-3 gap-3 mb-10">
          <Stat title="Interviews · last 4w" value={headline?.interviews_last_4_weeks ?? 0} accent />
          <Stat title="Applications · last 4w" value={headline?.applications_last_4_weeks ?? 0} />
          <Stat title="Interview rate" value={`${headline?.interview_rate ?? 0}%`} />
        </section>

        <section className="mb-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Weekly</h2>
          <div className="border border-border rounded-xl p-5 bg-card">
            {weekly.length === 0 ? (
              <p className="text-xs text-muted">No outcomes recorded yet — log results below to start the learning loop.</p>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {weekly.slice(-12).map((w, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-stretch justify-end h-32">
                      <div className="bg-accent rounded-t" style={{ height: `${(w.interviews / maxBar) * 100}%` }} title={`${w.interviews} interviews`} />
                      <div className="bg-muted/40" style={{ height: `${(w.applied / maxBar) * 100}%` }} title={`${w.applied} applied`} />
                    </div>
                    <span className="text-[9px] text-muted">{w.week.split("-W")[1]}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] font-mono text-muted"><span className="inline-block size-2 bg-accent mr-1 rounded-sm" /> Interviews · <span className="inline-block size-2 bg-muted/40 mx-1 rounded-sm" /> Applied</p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-10">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Funnel · 12 weeks</h2>
            <ul className="border border-border rounded-xl bg-card divide-y divide-border">
              {KINDS.map((k) => (
                <li key={k} className="px-4 py-2 flex items-center justify-between text-sm">
                  <span className="font-mono uppercase text-[10px] text-muted">{k.replace(/_/g, " ")}</span>
                  <span className="font-semibold">{funnel[k] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Source quality (interview rate)</h2>
            <ul className="border border-border rounded-xl bg-card divide-y divide-border">
              {sources.length === 0 && <li className="px-4 py-3 text-xs text-muted">No data yet.</li>}
              {sources.map((s) => (
                <li key={s.source} className="px-4 py-2 flex items-center justify-between text-sm">
                  <span>{s.source}</span>
                  <span className="text-xs"><span className="text-accent font-semibold">{s.interview_rate}%</span> · {s.interviews}/{s.applied}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Top performing resumes</h2>
          <div className="border border-border rounded-xl bg-card divide-y divide-border">
            {topResumes.length === 0 && <p className="px-4 py-3 text-xs text-muted">Need more outcomes to learn.</p>}
            {topResumes.map((r) => (
              <div key={r.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="truncate">{r.label}</span>
                <span className="text-xs"><span className="text-accent font-semibold">{r.interview_rate}%</span> · {r.interviews}/{r.total}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Log an outcome</h2>
          <div className="border border-border rounded-xl p-4 bg-card">
            <div className="flex flex-wrap gap-3 items-center">
              <select value={selApp} onChange={(e) => setSelApp(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-background min-w-[280px]">
                <option value="">Select application…</option>
                {(apps.data ?? []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.job?.title ?? "Role"} · {a.job?.company} · {a.stage}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    disabled={!selApp || record.isPending}
                    onClick={() => record.mutate({ applicationId: selApp, kind: k })}
                    className="text-[11px] px-2.5 py-1 border border-border rounded hover:border-accent disabled:opacity-40"
                  >
                    {k.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted">Logging an outcome updates pipeline stage, feeds the learning loop, and improves future ranking.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ title, value, accent }: { title: string; value: any; accent?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 ${accent ? "border-accent/40 bg-accent/5" : "border-border bg-card"}`}>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">{title}</p>
      <p className={`mt-2 font-serif italic text-5xl ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
