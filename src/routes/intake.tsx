import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  intakeJob,
  listIntakeJobs,
  reanalyzeJob,
  generateTailoredResume,
} from "@/lib/intake.functions";

export const Route = createFileRoute("/intake")({
  component: IntakePage,
  head: () => ({
    meta: [
      { title: "Job Intake — Aether OS" },
      { name: "description", content: "Paste a job URL or description. Aether OS extracts, scores, and recommends a strategy — no external action without your approval." },
    ],
  }),
});

type Mode = "paste" | "url" | "manual";

function IntakePage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in to add jobs</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _intake = useServerFn(intakeJob);
  const _list = useServerFn(listIntakeJobs);
  const _reanalyze = useServerFn(reanalyzeJob);
  const _tailor = useServerFn(generateTailoredResume);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("paste");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [manual, setManual] = useState({ title: "", company: "", location: "", description: "", apply_url: "" });
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({ queryKey: ["intake-jobs"], queryFn: () => _list() });

  const submit = useMutation({
    mutationFn: async () => {
      setError(null);
      const payload: any = { kind: mode };
      if (mode === "url") payload.url = url;
      if (mode === "paste") payload.raw_text = text;
      if (mode === "manual") payload.manual = manual;
      return _intake({ data: payload });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["intake-jobs"] });
      setUrl(""); setText(""); setManual({ title: "", company: "", location: "", description: "", apply_url: "" });
      console.log("intake ok", r);
    },
    onError: (e: any) => setError(e.message ?? String(e)),
  });

  const reanalyze = useMutation({
    mutationFn: (jobId: string) => _reanalyze({ data: { jobId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["intake-jobs"] }),
  });
  const tailor = useMutation({
    mutationFn: (jobId: string) => _tailor({ data: { jobId } }),
    onSuccess: () => navigate({ to: "/approvals" }),
  });

  const jobs = list.data?.jobs ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 pb-32">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Job Intake</div>
        <h1 className="mt-2 font-serif italic text-4xl">Bring the opportunity. Aether reads it.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Paste a URL, drop the description, or fill it in manually. The Analyzer agent extracts structure; the
          Strategist scores fit against your profile. Nothing is submitted.
        </p>

        {/* Mode tabs */}
        <div className="mt-8 flex gap-1 p-1 bg-secondary rounded-md w-fit">
          {(["paste", "url", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider ${mode === m ? "bg-card shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-5 space-y-4">
          {mode === "paste" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste the full job description here…"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          {mode === "url" && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/staff-engineer"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          {mode === "manual" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ["title", "Title *"],
                ["company", "Company *"],
                ["location", "Location"],
                ["apply_url", "Apply URL"],
              ] as const).map(([k, label]) => (
                <input
                  key={k}
                  value={(manual as any)[k]}
                  onChange={(e) => setManual({ ...manual, [k]: e.target.value })}
                  placeholder={label}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              ))}
              <textarea
                value={manual.description}
                onChange={(e) => setManual({ ...manual, description: e.target.value })}
                placeholder="Description"
                rows={6}
                className="sm:col-span-2 px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {submit.isPending ? "Analyzing with AI…" : "Add & analyze"}
            </button>
            {error && <span className="text-xs text-destructive">⚠ {error}</span>}
          </div>
        </div>

        {/* Recent intakes */}
        <section className="mt-12">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Recent intakes</h2>
          <div className="space-y-3">
            {jobs.map((j: any) => (
              <JobIntakeCard
                key={j.id}
                job={j}
                onReanalyze={() => reanalyze.mutate(j.id)}
                onTailor={() => tailor.mutate(j.id)}
                busy={reanalyze.isPending || tailor.isPending}
              />
            ))}
            {jobs.length === 0 && (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted">No intakes yet.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function JobIntakeCard({ job, onReanalyze, onTailor, busy }: { job: any; onReanalyze: () => void; onTailor: () => void; busy: boolean }) {
  const meta = (job.meta ?? {}) as any;
  const gaps: string[] = meta.skill_gaps ?? [];
  const strengths: string[] = meta.strength_signals ?? [];
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display text-lg font-semibold">{job.title}</div>
          <div className="text-xs text-muted mt-0.5">{job.company} · {job.location ?? "—"} · {job.remote ?? "—"}</div>
          <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted">via {job.intake_kind ?? job.source ?? "manual"}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Score label="Match" v={job.match_score} />
          <Score label="ATS" v={job.ats_score} />
          <Score label="Interview" v={job.interview_probability} />
        </div>
      </div>
      {job.reasoning && (
        <p className="mt-3 text-sm text-foreground/80 leading-relaxed border-l-2 border-accent/30 pl-3 italic">
          {job.reasoning}
        </p>
      )}
      {(gaps.length > 0 || strengths.length > 0) && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
          {strengths.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-success">Strengths</div>
              <ul className="mt-1 list-disc list-inside text-foreground/80 space-y-0.5">
                {strengths.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-warning">Skill gaps</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {gaps.slice(0, 8).map((g) => <span key={g} className="px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-mono">{g}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
      {meta.recommended_strategy && (
        <div className="mt-3 text-xs text-muted">
          <span className="text-foreground font-medium">Strategist:</span> {meta.recommended_strategy}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button onClick={onTailor} disabled={busy} className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium disabled:opacity-50">
          Generate tailored resume
        </button>
        <button onClick={onReanalyze} disabled={busy} className="px-3 py-1.5 rounded-md border border-border text-xs hover:bg-secondary">
          Re-analyze
        </button>
      </div>
    </div>
  );
}

function Score({ label, v }: { label: string; v: number | null | undefined }) {
  const tone = v == null ? "text-muted" : v >= 80 ? "text-success" : v >= 60 ? "text-accent" : "text-warning";
  return (
    <div className="px-2.5 py-1.5 rounded-md bg-secondary text-center">
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display text-base font-semibold ${tone}`}>{v ?? "—"}</div>
    </div>
  );
}
