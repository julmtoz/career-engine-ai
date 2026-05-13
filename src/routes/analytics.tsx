import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics — Aether OS" },
      { name: "description", content: "Funnel metrics across discovery, outreach, applications, and interviews." },
    ],
  }),
});

function AnalyticsPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _get = useServerFn(getAnalytics);
  const q = useQuery({ queryKey: ["analytics"], queryFn: () => _get() });
  const t = q.data?.totals;
  const pipeline = q.data?.pipeline ?? {};
  const drafts = q.data?.drafts_by_status ?? {};

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Feedback loop</p>
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-2">Analytics</h1>
          <p className="text-muted">Last 30 days across the workspace.</p>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <Metric label="Jobs in graph" v={t?.jobs_total} />
          <Metric label="Imported (30d)" v={t?.jobs_imported_30d} />
          <Metric label="Applications" v={t?.applications_total} />
          <Metric label="Interviews" v={t?.interviews_total} />
          <Metric label="Avg match" v={t?.avg_match_score} suffix="/100" />
          <Metric label="Avg ATS" v={t?.avg_ats_score} suffix="/100" />
          <Metric label="Outreach drafted" v={t?.outreach_drafted_30d} />
          <Metric label="Outreach sent" v={t?.outreach_sent_30d} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Pipeline by stage">
            {Object.keys(pipeline).length === 0 && <p className="text-sm text-muted">No applications yet.</p>}
            {Object.entries(pipeline).map(([k, v]) => (
              <Row key={k} label={k} v={v as number} />
            ))}
          </Section>
          <Section title="Outreach drafts by status">
            {Object.keys(drafts).length === 0 && <p className="text-sm text-muted">No drafts yet.</p>}
            {Object.entries(drafts).map(([k, v]) => (
              <Row key={k} label={k} v={v as number} />
            ))}
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, v, suffix }: { label: string; v: number | undefined; suffix?: string }) {
  return (
    <div className="border border-border rounded-xl p-5 bg-card">
      <div className="font-display text-3xl font-extrabold tabular-nums">{v ?? "—"}{suffix && <span className="text-sm text-muted ml-1">{suffix}</span>}</div>
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted mt-1">{label}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-xl p-5 bg-card">
      <h2 className="font-display font-bold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="capitalize">{label.replace(/_/g, " ")}</span>
      <span className="font-mono tabular-nums font-bold">{v}</span>
    </div>
  );
}
