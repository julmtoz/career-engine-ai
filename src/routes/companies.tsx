import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { listCompanies, enrichCompany } from "@/lib/companies.functions";

export const Route = createFileRoute("/companies")({
  component: CompaniesPage,
  head: () => ({
    meta: [
      { title: "Company Intelligence — Aether OS" },
      { name: "description", content: "AI-enriched company intelligence: size, funding, hiring velocity, growth signals, and three composite scores per employer." },
    ],
  }),
});

function CompaniesPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _list = useServerFn(listCompanies);
  const _enrich = useServerFn(enrichCompany);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["companies"], queryFn: () => _list() });
  const enrich = useMutation({
    mutationFn: async (id: string) => _enrich({ data: { id } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });

  const companies = q.data?.companies ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Company intelligence</p>
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-2">Employer graph</h1>
          <p className="text-muted max-w-2xl">Auto-created from every job source. Run enrichment to score each company on intelligence, stability, and opportunity.</p>
        </header>

        {companies.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-10 text-center">
            <p className="text-muted">No companies yet. Add a connector or import a job to start populating the employer graph.</p>
            <Link to="/sources" className="text-accent text-sm mt-3 inline-block">Add a connector →</Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {companies.map((c) => (
            <article key={c.id} className="border border-border rounded-xl p-5 bg-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display font-bold text-lg">{c.name}</h3>
                  <p className="text-xs text-muted">{c.industry || "industry —"} · {c.size_band || "size —"} · {c.funding_stage || "stage —"}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-muted">{c.open_jobs} open</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <ScorePill label="intel" v={c.intelligence_score} />
                <ScorePill label="stable" v={c.stability_score} />
                <ScorePill label="opp" v={c.opportunity_score} />
              </div>
              {(c.tech_stack ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {(c.tech_stack ?? []).slice(0, 8).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 text-[10px] font-mono bg-muted/10 rounded">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted">
                  {c.last_enriched_at ? `enriched ${new Date(c.last_enriched_at).toLocaleDateString()}` : "not enriched"}
                  {c.layoff_signal && <span className="ml-2 text-red-500">⚠ layoff signal</span>}
                </span>
                <button
                  onClick={() => enrich.mutate(c.id)}
                  disabled={enrich.isPending && enrich.variables === c.id}
                  className="text-xs px-3 py-1.5 border border-border rounded-md hover:border-accent disabled:opacity-50"
                >{enrich.isPending && enrich.variables === c.id ? "Enriching…" : c.last_enriched_at ? "Re-enrich" : "Enrich with AI"}</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ScorePill({ label, v }: { label: string; v: number | null | undefined }) {
  const val = v ?? null;
  const tone = val == null ? "text-muted" : val >= 75 ? "text-emerald-500" : val >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="border border-border rounded-md px-2 py-1.5 text-center">
      <div className={`font-display font-bold tabular-nums ${tone}`}>{val ?? "—"}</div>
      <div className="text-[9px] uppercase tracking-widest font-mono text-muted">{label}</div>
    </div>
  );
}
