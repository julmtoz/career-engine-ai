import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { seedDemoData, wipeDemoData } from "@/lib/admin.functions";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Demo Walkthrough — Aether OS" },
      {
        name: "description",
        content:
          "Nine-step guided tour of Aether OS — seed sample data, watch the agent fleet build a real application package, approve, and track outcomes.",
      },
    ],
  }),
});

const STEPS: { n: number; title: string; body: string; to?: string; cta?: string }[] = [
  {
    n: 1,
    title: "Seed sample workspace",
    body: "Loads a realistic career profile, three companies, three opportunities, three recruiters, and one in-pipeline application — all tagged source='demo' so you can wipe it any time.",
    cta: "Run seed below",
  },
  {
    n: 2,
    title: "Land on the fleet view",
    body: "Confirm the agent fleet is online and the dashboard reflects your seeded workspace.",
    to: "/dashboard",
    cta: "Open Dashboard",
  },
  {
    n: 3,
    title: "Browse the AI-ranked feed",
    body: "Aether ranks each opportunity by composite score: match × ATS × interview probability × freshness.",
    to: "/feed",
    cta: "Open Feed",
  },
  {
    n: 4,
    title: "Build an application package",
    body: "Pick a job and let the Writer + Strategist + Outreach + Follow-up agents draft a full package — tailored resume, cover letter, recruiter ping, scheduled nudges.",
    to: "/packages",
    cta: "Open Packages",
  },
  {
    n: 5,
    title: "Approve in the safety queue",
    body: "Nothing leaves your workspace without your signature. Review readiness, reasoning, and confidence before promoting to the pipeline.",
    to: "/approvals",
    cta: "Open Approvals",
  },
  {
    n: 6,
    title: "Watch it land in the pipeline",
    body: "Approved packages auto-promote to applications and seed the follow-up sequence.",
    to: "/pipeline",
    cta: "Open Pipeline",
  },
  {
    n: 7,
    title: "Schedule a quiet nudge",
    body: "Follow-ups are time-windowed and approval-gated — no spam, no surprise sends.",
    to: "/follow-ups",
    cta: "Open Follow-ups",
  },
  {
    n: 8,
    title: "Track conversion",
    body: "Interviews per week is the only metric that matters. The conversion view attributes outcomes back to source, resume, and recruiter quality.",
    to: "/conversion",
    cta: "Open Conversion",
  },
  {
    n: 9,
    title: "Run pre-flight",
    body: "The launch checklist scores your workspace 0–100 and links you to whatever is missing for production use.",
    to: "/launch",
    cta: "Open Launch",
  },
];

function DemoPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const _seed = useServerFn(seedDemoData);
  const _wipe = useServerFn(wipeDemoData);

  const seed = useMutation({
    mutationFn: () => _seed(),
    onSuccess: () => qc.invalidateQueries(),
  });
  const wipe = useMutation({
    mutationFn: () => _wipe(),
    onSuccess: () => qc.invalidateQueries(),
  });

  if (loading) return <AppShell><div className="pt-32 text-center text-sm text-muted">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          Guided tour
        </div>
        <h1 className="mt-2 font-serif italic text-4xl tracking-tight">
          See Aether OS in nine steps.
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xl">
          A scripted demo of the full conversion loop — discover, package, approve, pipeline, follow
          up, attribute. Safe by default: the seeder only writes rows tagged{" "}
          <code className="text-foreground">source='demo'</code>, and wipe removes only those rows.
        </p>

        {!user && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
            Sign in first — the demo seeds into your private workspace.{" "}
            <Link to="/login" className="underline">Open login</Link>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => seed.mutate()}
            disabled={!user || seed.isPending}
            className="px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
          >
            {seed.isPending ? "Seeding…" : "Seed demo data"}
          </button>
          <button
            onClick={() => wipe.mutate()}
            disabled={!user || wipe.isPending}
            className="px-5 py-2.5 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Wipe demo data
          </button>
          {seed.data?.summary && (
            <span className="text-xs font-mono text-success">
              ✓ {Object.entries(seed.data.summary).map(([k, v]) => `${k}=${v}`).join(" · ")}
            </span>
          )}
          {seed.error && (
            <span className="text-xs font-mono text-destructive">
              {(seed.error as Error).message}
            </span>
          )}
        </div>

        <ol className="mt-12 relative border-l border-border pl-8 space-y-8">
          {STEPS.map((s) => (
            <li key={s.n} className="relative">
              <span className="absolute -left-[2.1rem] top-0 size-6 rounded-full bg-foreground text-background text-[11px] font-mono grid place-items-center">
                {s.n}
              </span>
              <h3 className="font-display font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
              {s.to && (
                <Link
                  to={s.to}
                  className="mt-2 inline-block text-[11px] font-mono uppercase tracking-wider text-foreground hover:text-accent"
                >
                  {s.cta} →
                </Link>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-lg border border-border bg-card p-5 text-xs text-muted">
          <div className="font-mono uppercase tracking-wider text-foreground text-[10px] mb-2">
            Safety reminders
          </div>
          <ul className="space-y-1.5 list-disc pl-4">
            <li>No outreach, application, or follow-up leaves the workspace without your approval.</li>
            <li>Every AI decision is logged with reasoning + confidence in the audit log.</li>
            <li>Pause the entire fleet from <Link to="/automation" className="underline">Automation</Link>.</li>
            <li>RLS scopes every row to your user — no cross-tenant access, ever.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
