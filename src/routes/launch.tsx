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

        <div className="mt-10 grid sm:grid-cols-2 gap-3">
          <Section title="Ready" tone="success">
            {(data?.checks ?? []).filter((c) => c.ok).map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
            {data && data.checks.filter((c) => c.ok).length === 0 && (
              <div className="text-[11px] text-muted">Nothing yet.</div>
            )}
          </Section>
          <Section title="Needs configuration" tone="warning">
            {(data?.checks ?? []).filter((c) => !c.ok).map((c) => (
              <CheckRow key={c.id} c={c} next={NEXT_STEPS[c.id]} />
            ))}
            {data && data.checks.every((c) => c.ok) && (
              <div className="text-[11px] text-muted">All clear — you're production-ready.</div>
            )}
          </Section>
        </div>

        <div className="mt-8 grid sm:grid-cols-3 gap-3 text-xs">
          <Badge label="Live integrations" value="Greenhouse · Lever" tone="success" />
          <Badge label="Manual intake" value="URL · Paste · Workday · Ashby" tone="muted" />
          <Badge label="Demo-only" value="Email / LinkedIn send-out" tone="warning" />
        </div>

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

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "success" | "warning";
  children: React.ReactNode;
}) {
  const dot = tone === "success" ? "bg-success" : "bg-warning";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`size-1.5 rounded-full ${dot}`} />
        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground">{title}</div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CheckRow({
  c,
  next,
}: {
  c: { id: string; label: string; ok: boolean; detail: string };
  next?: { label: string; to: string };
}) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className={`mt-1 size-1.5 rounded-full ${c.ok ? "bg-success" : "bg-warning animate-pulse-soft"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-foreground">{c.label}</div>
        <div className="text-[10px] text-muted mt-0.5">{c.detail}</div>
      </div>
      {next && (
        <Link to={next.to} className="text-[10px] font-mono uppercase tracking-wider text-foreground hover:text-accent whitespace-nowrap">
          {next.label} →
        </Link>
      )}
    </div>
  );
}

function Badge({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "muted" }) {
  const cls =
    tone === "success"
      ? "border-success/30 bg-success/5"
      : tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : "border-border bg-card";
  return (
    <div className={`rounded-lg border ${cls} px-3 py-2.5`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-foreground">{value}</div>
    </div>
  );
}
