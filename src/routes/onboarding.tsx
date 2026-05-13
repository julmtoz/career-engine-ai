import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getActivation } from "@/lib/activation.functions";

export const Route = createFileRoute("/onboarding")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Get Started — Aether OS" },
      { name: "description", content: "First-session activation flow. Reach Interview Ready in under 10 minutes." },
    ],
  }),
});

function Page() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in to begin</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const _get = useServerFn(getActivation);
  const q = useQuery({ queryKey: ["activation"], queryFn: () => _get(), refetchInterval: 6000 });
  const data = q.data;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">First session · activation</p>
        <h1 className="font-serif italic text-5xl mb-3">Welcome to Aether OS.</h1>
        <p className="text-muted max-w-2xl mb-8">
          Eight steps to <span className="text-foreground font-medium">Interview Ready</span>. Most users complete this in 10 minutes.
          The agents wake up the moment your profile and resume are in.
        </p>

        {data && (
          <div className="mb-10 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted">Activation score</p>
                <p className="font-display text-4xl font-bold mt-1">{data.score}<span className="text-muted text-2xl">/100</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{data.completed} of {data.total} milestones</p>
                {data.next && (
                  <Link
                    to={data.next.href}
                    className="inline-flex mt-2 px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium"
                  >
                    Next: {data.next.cta} →
                  </Link>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-muted/15 rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all duration-700" style={{ width: `${data.score}%` }} />
            </div>
          </div>
        )}

        <ol className="space-y-3">
          {(data?.milestones ?? []).map((m, i) => (
            <li
              key={m.id}
              className={`group flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                m.done ? "border-accent/30 bg-accent/5" : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`size-9 shrink-0 rounded-full grid place-items-center text-xs font-mono font-semibold ${
                  m.done ? "bg-accent text-background" : "bg-muted/15 text-muted"
                }`}>
                  {m.done ? "✓" : i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.label}</p>
                  <p className="text-xs text-muted truncate">{m.description}</p>
                </div>
              </div>
              <Link
                to={m.href}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition ${
                  m.done
                    ? "border-transparent text-muted hover:text-foreground"
                    : "border-border hover:bg-foreground hover:text-background"
                }`}
              >
                {m.done ? "Review" : m.cta}
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid sm:grid-cols-3 gap-3">
          <Link to="/demo" className="rounded-xl border border-border p-4 hover:border-foreground/40 transition">
            <p className="text-xs font-mono uppercase text-muted mb-1">Shortcut</p>
            <p className="font-medium">Try with demo data</p>
            <p className="text-xs text-muted mt-1">Seed a sandbox workspace and walk the full loop.</p>
          </Link>
          <Link to="/strategist" className="rounded-xl border border-border p-4 hover:border-foreground/40 transition">
            <p className="text-xs font-mono uppercase text-muted mb-1">Guidance</p>
            <p className="font-medium">Ask the strategist</p>
            <p className="text-xs text-muted mt-1">Get an opinion on what to do next.</p>
          </Link>
          <Link to="/launch" className="rounded-xl border border-border p-4 hover:border-foreground/40 transition">
            <p className="text-xs font-mono uppercase text-muted mb-1">Status</p>
            <p className="font-medium">Pre-flight checklist</p>
            <p className="text-xs text-muted mt-1">System readiness across integrations.</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
