import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { liveOpportunityFeed } from "@/lib/connectors.functions";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Live Feed — Aether OS" },
      { name: "description", content: "Personalized AI-ranked opportunity feed with freshness, recruiter activity, and reasoning per role." },
    ],
  }),
});

function FeedPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _feed = useServerFn(liveOpportunityFeed);
  const q = useQuery({ queryKey: ["live-feed"], queryFn: () => _feed() });
  const jobs = q.data?.jobs ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-8 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Strategist-ranked</p>
            <h1 className="font-display text-5xl font-extrabold tracking-tight mb-2">Live opportunity feed</h1>
            <p className="text-muted max-w-2xl">Composite rank = match × ATS × interview probability × freshness × company opportunity score.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/sources" className="px-4 py-2 text-sm border border-border rounded-md hover:border-accent transition">Manage sources</Link>
            <Link to="/strategist" className="px-4 py-2 text-sm bg-foreground text-background rounded-md font-medium">Run strategist</Link>
          </div>
        </header>

        {q.isLoading && <p className="text-sm text-muted">Loading feed…</p>}
        {!q.isLoading && jobs.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-10 text-center">
            <p className="text-muted mb-3">Your feed is empty.</p>
            <Link to="/sources" className="text-accent text-sm">Add a connector →</Link>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map((j) => (
            <article key={j.id} className="border border-border rounded-xl p-5 bg-card hover:border-accent/40 transition">
              <div className="flex items-start gap-5">
                <div className="shrink-0 w-16 text-center">
                  <div className="font-display text-3xl font-extrabold tabular-nums">{j.rank_score}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted font-mono">rank</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display font-bold text-lg truncate">{j.title}</h3>
                    {j.recruiter_active && <span className="text-[9px] uppercase tracking-widest font-mono text-accent border border-accent/30 px-1.5 py-0.5 rounded">recruiter live</span>}
                    <FreshDot v={Number(j.freshness_score ?? 0)} />
                  </div>
                  <p className="text-sm text-muted mb-3">
                    <span className="font-medium text-foreground">{j.company}</span>
                    {j.location && <> · {j.location}</>}
                    {j.source && <> · <span className="font-mono text-xs">{j.source}</span></>}
                    {j.posted_at && <> · {timeAgo(j.posted_at)}</>}
                  </p>
                  <div className="flex gap-4 text-xs">
                    <Stat label="match" v={j.match_score} />
                    <Stat label="ATS" v={j.ats_score} />
                    <Stat label="interview" v={j.interview_probability} />
                    {j.company_intel?.opportunity_score != null && <Stat label="company" v={j.company_intel.opportunity_score} />}
                  </div>
                  {j.reasoning && <p className="text-xs text-muted mt-3 line-clamp-2 italic">{j.reasoning}</p>}
                </div>
                {j.apply_url && (
                  <a href={j.apply_url} target="_blank" rel="noreferrer" className="shrink-0 px-3 py-1.5 text-xs border border-border rounded-md hover:border-accent">View →</a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, v }: { label: string; v: number | null | undefined }) {
  return (
    <div>
      <span className="font-mono tabular-nums font-bold">{v ?? "—"}</span>
      <span className="text-muted ml-1">{label}</span>
    </div>
  );
}
function FreshDot({ v }: { v: number }) {
  const c = v > 0.8 ? "bg-emerald-500" : v > 0.5 ? "bg-amber-500" : "bg-muted";
  return <span className={`size-1.5 rounded-full ${c}`} title={`freshness ${v.toFixed(2)}`} />;
}
function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.round(d)}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}
