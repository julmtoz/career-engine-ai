import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getLaunchReadiness } from "@/lib/admin.functions";

export const Route = createFileRoute("/launch")({
  component: LaunchPage,
  head: () => ({
    meta: [
      { title: "Launch Readiness — Aether OS" },
      {
        name: "description",
        content:
          "Pre-flight checks before turning Aether OS loose: environment, agents, profile, resume, sources, RLS, and pipeline health.",
      },
    ],
  }),
});

function LaunchPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="pt-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user)
    return (
      <AppShell>
        <div className="max-w-md mx-auto pt-32 px-6 text-center">
          <h1 className="font-serif italic text-3xl tracking-tight">Sign in to run pre-flight</h1>
          <Link to="/login" className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium">
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  return <Authed />;
}

const NEXT_STEPS: Record<string, { label: string; to: string }> = {
  profile: { label: "Open Profile", to: "/profile" },
  resume: { label: "Open Vault", to: "/resumes" },
  sources: { label: "Add Source", to: "/sources" },
  jobs: { label: "Open Intake", to: "/intake" },
  applications: { label: "Open Approvals", to: "/approvals" },
  agents: { label: "Bootstrap", to: "/automation" },
  prefs: { label: "Bootstrap", to: "/automation" },
};

function Authed() {
  const _r = useServerFn(getLaunchReadiness);
  const r = useQuery({ queryKey: ["readiness"], queryFn: () => _r(), refetchInterval: 8000 });
  const data = r.data;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          Launch readiness
        </div>
        <h1 className="mt-2 font-serif italic text-4xl tracking-tight">Pre-flight checklist.</h1>
        <p className="mt-2 text-sm text-muted">
          Aether OS will run with whatever you give it. Higher readiness means better matches and
          fewer rejected approvals.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <div className="font-display text-5xl font-bold">{data?.score ?? "—"}</div>
            <div className="text-xs font-mono text-muted">
              {data ? `${data.passing}/${data.total} checks passing` : "loading…"}
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${data?.score ?? 0}%` }}
            />
          </div>
        </div>

        <ul className="mt-8 space-y-2">
          {(data?.checks ?? []).map((c) => {
            const next = !c.ok ? NEXT_STEPS[c.id] : undefined;
            return (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span
                  className={`mt-1 size-2 rounded-full ${c.ok ? "bg-success" : "bg-warning animate-pulse-soft"}`}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{c.label}</div>
                  <div className="text-[11px] text-muted mt-0.5">{c.detail}</div>
                </div>
                {next && (
                  <Link
                    to={next.to}
                    className="text-[11px] font-mono uppercase tracking-wider text-foreground hover:text-accent"
                  >
                    {next.label} →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 rounded-lg border border-border bg-card p-5 text-xs text-muted">
          <div className="font-mono uppercase tracking-wider text-foreground text-[10px] mb-2">
            Safety model
          </div>
          Every external action requires explicit approval. Every AI decision is logged to{" "}
          <code className="text-foreground">ai_decisions</code> with reasoning + confidence. Pause
          the entire fleet from <Link to="/automation" className="underline">Automation</Link>.
        </div>
      </div>
    </AppShell>
  );
}
