import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { listPackages, getPackage, buildApplicationPackage } from "@/lib/conversion.functions";
import { listIntakeJobs } from "@/lib/intake.functions";

export const Route = createFileRoute("/packages")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Application Packages — Aether OS" },
      { name: "description", content: "Per-job application packages: tailored resume, cover letter, recruiter outreach, Q&A, salary, follow-ups." },
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
  const _list = useServerFn(listPackages);
  const _jobs = useServerFn(listIntakeJobs);
  const _build = useServerFn(buildApplicationPackage);
  const _detail = useServerFn(getPackage);

  const list = useQuery({ queryKey: ["packages"], queryFn: () => _list(), refetchInterval: 8000 });
  const jobs = useQuery({ queryKey: ["pkg-jobs"], queryFn: () => _jobs() });
  const build = useMutation({
    mutationFn: (jobId: string) => _build({ data: { jobId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packages"] }); qc.invalidateQueries({ queryKey: ["approvals"] }); },
  });

  const [selected, setSelected] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["pkg", selected],
    queryFn: () => _detail({ data: { id: selected! } }),
    enabled: !!selected,
  });

  const packages = (list.data?.packages ?? []) as any[];
  const jobOpts = (jobs.data?.jobs ?? []) as any[];
  const builtJobIds = new Set(packages.map((p) => p.job_id));
  const candidates = jobOpts.filter((j) => !builtJobIds.has(j.id)).slice(0, 8);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-10 pb-32">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Conversion engine</p>
        <h1 className="font-serif italic text-4xl mb-2">Packages, not applications.</h1>
        <p className="text-muted text-sm max-w-2xl mb-10">A complete, approval-gated pack per opportunity: tailored resume, cover letter, recruiter outreach, application Q&amp;A, pitch, salary strategy, and a 4-step follow-up sequence.</p>

        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <aside className="space-y-6">
            <section>
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Build new</h2>
              {candidates.length === 0 ? (
                <p className="text-xs text-muted">No new opportunities. <Link to="/intake" className="text-accent">Add one →</Link></p>
              ) : (
                <ul className="space-y-1.5">
                  {candidates.map((j) => (
                    <li key={j.id} className="border border-border rounded-md p-3 bg-card">
                      <p className="text-sm font-medium">{j.title}</p>
                      <p className="text-[11px] text-muted">{j.company} · match {j.match_score ?? "—"}</p>
                      <button
                        onClick={() => build.mutate(j.id)}
                        disabled={build.isPending}
                        className="mt-2 text-[11px] px-2.5 py-1 bg-foreground text-background rounded disabled:opacity-50"
                      >
                        {build.isPending ? "Building…" : "Build package"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Packages ({packages.length})</h2>
              <ul className="space-y-1.5">
                {packages.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelected(p.id)}
                      className={`w-full text-left border rounded-md p-3 transition ${selected === p.id ? "border-accent bg-accent/5" : "border-border bg-card hover:border-foreground/30"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{p.job?.title ?? "Untitled"}</span>
                        <ScoreBadge score={p.readiness_score ?? 0} />
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">{p.job?.company} · {p.status}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <main>
            {!selected && <p className="text-sm text-muted">Select a package to inspect, or build a new one.</p>}
            {selected && detail.isLoading && <p className="text-sm text-muted">Loading package…</p>}
            {selected && detail.data && <PackageDetail data={detail.data as any} />}
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "bg-success/15 text-success" : score >= 60 ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive";
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${tone}`}>{score}</span>;
}

function PackageDetail({ data }: { data: any }) {
  const { pkg, job, resume, cover, recruiter_outreach, linkedin_outreach, base_resume } = data;
  const breakdown = (pkg.readiness_breakdown ?? {}) as Record<string, any>;
  const blockers = (breakdown.blockers ?? []) as string[];

  return (
    <div className="space-y-6">
      <header className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted">{pkg.status}</p>
            <h2 className="font-display text-2xl font-bold mt-1">{job?.title}</h2>
            <p className="text-sm text-muted">{job?.company} · {job?.location ?? "—"} · {job?.remote ?? ""}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Readiness</p>
            <p className="font-serif italic text-5xl">{pkg.readiness_score ?? "—"}</p>
            <p className="text-[11px] text-muted">/ 100 — optimized for interview probability</p>
          </div>
        </div>
        {blockers.length > 0 && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-destructive mb-1">Blockers</p>
            <ul className="text-xs space-y-0.5">{blockers.map((b, i) => <li key={i}>· {b}</li>)}</ul>
          </div>
        )}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(breakdown).filter(([k]) => k !== "blockers").map(([k, v]) => (
          <div key={k} className="border border-border rounded-md px-3 py-2 bg-card">
            <p className="text-[10px] font-mono uppercase text-muted">{k.replace(/_/g, " ")}</p>
            <p className="text-base font-semibold">{Number(v) || 0}</p>
          </div>
        ))}
      </section>

      <Tabs items={[
        { label: "Resume compare", body: <ResumeCompare original={base_resume?.parsed_text ?? base_resume?.rendered_md ?? "(no baseline)"} tailored={resume?.rendered_md ?? "(no tailored render)"} /> },
        { label: "Cover letter", body: <pre className="whitespace-pre-wrap text-sm font-sans">{cover?.body ?? "—"}</pre> },
        { label: "Recruiter outreach", body: (
          <div className="space-y-3">
            <Section title="Email" subtitle={recruiter_outreach?.subject}><pre className="whitespace-pre-wrap text-sm font-sans">{recruiter_outreach?.body ?? "—"}</pre></Section>
            <Section title="LinkedIn"><pre className="whitespace-pre-wrap text-sm font-sans">{linkedin_outreach?.body ?? "—"}</pre></Section>
          </div>
        ) },
        { label: "Pitch", body: (
          <div className="space-y-3">
            <Section title="Tell me about yourself"><p className="text-sm">{(pkg.pitch as any)?.tell_me_about_yourself ?? "—"}</p></Section>
            <Section title="Why interested"><p className="text-sm">{(pkg.pitch as any)?.why_interested ?? "—"}</p></Section>
            <Section title="Why you fit"><p className="text-sm">{(pkg.pitch as any)?.why_you_fit ?? "—"}</p></Section>
          </div>
        ) },
        { label: "Q&A", body: (
          <ul className="space-y-3">
            {((pkg.qa_answers as any)?.questions ?? []).map((q: any, i: number) => (
              <li key={i} className="border border-border rounded-md p-3 bg-card">
                <p className="text-xs font-mono uppercase text-muted">{q.question}</p>
                <p className="text-sm mt-1">{q.answer}</p>
              </li>
            ))}
          </ul>
        ) },
        { label: "Salary", body: (
          <div className="space-y-2 text-sm">
            <p>Floor: <strong>${(pkg.salary_strategy as any)?.recommended_floor ?? "—"}</strong></p>
            <p>Target: <strong>${(pkg.salary_strategy as any)?.recommended_target ?? "—"}</strong></p>
            <ul className="list-disc pl-5 text-muted">{((pkg.salary_strategy as any)?.talking_points ?? []).map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
          </div>
        ) },
        { label: "Follow-ups", body: (
          <ol className="space-y-3">
            {((pkg.followup_plan as any) ?? []).map((s: any, i: number) => (
              <li key={i} className="border border-border rounded-md p-3 bg-card">
                <p className="text-xs font-mono uppercase text-muted">+{s.send_after_days}d · {s.channel} · {s.kind}</p>
                {s.subject && <p className="text-sm font-medium mt-1">{s.subject}</p>}
                <p className="text-sm whitespace-pre-wrap mt-1">{s.body}</p>
              </li>
            ))}
          </ol>
        ) },
      ]} />

      <div className="flex items-center gap-3">
        <Link to="/approvals" className="text-xs px-3 py-1.5 border border-border rounded hover:border-foreground/30">Review in Approvals →</Link>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md p-3 bg-card">
      <p className="text-[10px] font-mono uppercase text-muted">{title}{subtitle ? ` · ${subtitle}` : ""}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Tabs({ items }: { items: { label: string; body: React.ReactNode }[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border mb-4">
        {items.map((it, idx) => (
          <button key={idx} onClick={() => setI(idx)} className={`px-3 py-1.5 text-xs font-medium ${i === idx ? "border-b-2 border-foreground -mb-px" : "text-muted"}`}>{it.label}</button>
        ))}
      </div>
      <div>{items[i].body}</div>
    </div>
  );
}

function ResumeCompare({ original, tailored }: { original: string; tailored: string }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="border border-border rounded-md p-3 bg-card max-h-[480px] overflow-auto">
        <p className="text-[10px] font-mono uppercase text-muted mb-2">Original</p>
        <pre className="whitespace-pre-wrap text-xs font-sans">{original}</pre>
      </div>
      <div className="border border-accent/40 rounded-md p-3 bg-accent/5 max-h-[480px] overflow-auto">
        <p className="text-[10px] font-mono uppercase text-accent mb-2">Tailored</p>
        <pre className="whitespace-pre-wrap text-xs font-sans">{tailored}</pre>
      </div>
    </div>
  );
}
