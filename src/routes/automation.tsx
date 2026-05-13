import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  bootstrapWorkspace,
  startCareerWorkflow,
  approveWorkflow,
  rejectWorkflow,
  pauseAllAutomation,
  setAutonomy,
  getAutomationState,
} from "@/lib/career.functions";
import { CAREER_ACQUISITION_WORKFLOW } from "@/lib/workflows/career-acquisition";

export const Route = createFileRoute("/automation")({
  component: AutomationPage,
  head: () => ({
    meta: [
      { title: "Automation Control Center — Aether OS" },
      {
        name: "description",
        content:
          "Run, pause, approve, and audit autonomous career workflows. Every AI decision is logged, every action requires approval until you say otherwise.",
      },
    ],
  }),
});

function AutomationPage() {
  const { user, loading } = useAuth();

  if (loading) return <AppShell><Empty msg="Loading…" /></AppShell>;
  if (!user) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto pt-32 px-6 text-center">
          <h1 className="font-serif italic text-3xl tracking-tight">Sign in to run workflows</h1>
          <p className="mt-3 text-sm text-muted">
            The Automation Control Center is private to your workspace. Create an account or sign in
            to start your agent fleet.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  return <Authed />;
}

function Authed() {
  const qc = useQueryClient();
  const _bootstrap = useServerFn(bootstrapWorkspace);
  const _state = useServerFn(getAutomationState);
  const _start = useServerFn(startCareerWorkflow);
  const _approve = useServerFn(approveWorkflow);
  const _reject = useServerFn(rejectWorkflow);
  const _pause = useServerFn(pauseAllAutomation);
  const _autonomy = useServerFn(setAutonomy);

  // Bootstrap once.
  useEffect(() => {
    _bootstrap().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useQuery({
    queryKey: ["automation-state"],
    queryFn: () => _state(),
    refetchInterval: 4000,
  });

  const start = useMutation({
    mutationFn: () => _start(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-state"] }),
  });
  const approve = useMutation({
    mutationFn: (workflowRunId: string) => _approve({ data: { workflowRunId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-state"] }),
  });
  const reject = useMutation({
    mutationFn: (workflowRunId: string) => _reject({ data: { workflowRunId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-state"] }),
  });
  const pause = useMutation({
    mutationFn: () => _pause(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-state"] }),
  });
  const autonomy = useMutation({
    mutationFn: (v: { autonomy?: any; minConfidence?: number }) => _autonomy({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-state"] }),
  });

  const data = state.data;
  const stepsByRun = useMemo(() => {
    const m = new Map<string, any[]>();
    (data?.steps ?? []).forEach((s: any) => {
      const arr = m.get(s.workflow_run_id) ?? [];
      arr.push(s);
      m.set(s.workflow_run_id, arr);
    });
    return m;
  }, [data]);

  const activeRuns = (data?.runs ?? []).filter((r: any) => r.status === "running");
  const pausedRuns = (data?.runs ?? []).filter((r: any) => r.status === "paused");
  const failedRuns = (data?.runs ?? []).filter((r: any) => r.status === "failed");
  const queuedTasks = (data?.queue ?? []).filter((t: any) => t.status === "pending");
  const approvalQueue = pausedRuns;

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
              Automation Control Center
            </div>
            <h1 className="mt-2 font-serif italic text-4xl tracking-tight text-foreground">
              The fleet is your second brain.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Every external action requires your approval. Every AI decision is logged. Pause the
              entire workforce with one click.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {start.isPending ? "Starting…" : "Run workflow"}
            </button>
            <button
              onClick={() => pause.mutate()}
              disabled={pause.isPending}
              className="px-4 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary"
            >
              Pause all automation
            </button>
          </div>
        </div>

        {/* Top stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Running" value={activeRuns.length} accent />
          <Stat label="Awaiting approval" value={approvalQueue.length} warn />
          <Stat label="Queued tasks" value={queuedTasks.length} />
          <Stat label="Failed runs" value={failedRuns.length} danger={failedRuns.length > 0} />
          <Stat label="Agents online" value={data?.agents.length ?? 0} />
        </div>

        {/* Safety controls */}
        <section className="mt-8 grid md:grid-cols-3 gap-4">
          <Card title="Autonomy level" hint="Controls when agents act without you.">
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(["manual", "assisted", "auto", "full_auto"] as const).map((v) => {
                const active = data?.prefs?.autonomy === v;
                return (
                  <button
                    key={v}
                    onClick={() => autonomy.mutate({ autonomy: v })}
                    className={`px-3 py-2 rounded-md text-xs font-mono uppercase tracking-wider border transition ${
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-muted border-border hover:text-foreground"
                    }`}
                  >
                    {v.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card title="Confidence threshold" hint="Below this, agents always wait for you.">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              defaultValue={data?.prefs?.min_confidence_to_act ?? 0.75}
              onMouseUp={(e) =>
                autonomy.mutate({ minConfidence: Number((e.target as HTMLInputElement).value) })
              }
              className="mt-4 w-full"
            />
            <div className="mt-2 text-xs font-mono text-muted">
              current: {(Number(data?.prefs?.min_confidence_to_act ?? 0.75) * 100).toFixed(0)}%
            </div>
          </Card>
          <Card title="Daily caps" hint="Hard upper bounds on agent activity.">
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted uppercase tracking-wider text-[10px]">Applications</div>
                <div className="font-mono text-foreground text-base">
                  {data?.prefs?.daily_application_cap ?? 10} / day
                </div>
              </div>
              <div>
                <div className="text-muted uppercase tracking-wider text-[10px]">Outreach</div>
                <div className="font-mono text-foreground text-base">
                  {data?.prefs?.daily_outreach_cap ?? 15} / day
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Approval queue (most important) */}
        <section className="mt-10">
          <SectionHeader title="Approval queue" subtitle="Review every AI artifact before it leaves your workspace." />
          {approvalQueue.length === 0 ? (
            <Empty msg="No actions are waiting on you." />
          ) : (
            <div className="grid gap-3">
              {approvalQueue.map((run: any) => (
                <ApprovalCard
                  key={run.id}
                  run={run}
                  steps={stepsByRun.get(run.id) ?? []}
                  onApprove={() => approve.mutate(run.id)}
                  onReject={() => reject.mutate(run.id)}
                  busy={approve.isPending || reject.isPending}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 grid lg:grid-cols-3 gap-6">
          {/* Workflow runs */}
          <section className="lg:col-span-2">
            <SectionHeader title="Workflow runs" subtitle="Live execution graph for every workflow." />
            <div className="space-y-3">
              {(data?.runs ?? []).slice(0, 8).map((run: any) => (
                <RunCard key={run.id} run={run} steps={stepsByRun.get(run.id) ?? []} />
              ))}
              {(data?.runs ?? []).length === 0 && <Empty msg="No runs yet. Click Run workflow." />}
            </div>
          </section>

          {/* Side panels */}
          <div className="space-y-6">
            <section>
              <SectionHeader title="Agent fleet" />
              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {(data?.agents ?? []).map((a: any) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-foreground">{a.codename}</div>
                      <div className="text-muted text-[11px] mt-0.5 line-clamp-1">{a.description}</div>
                    </div>
                    <span
                      className={`size-1.5 rounded-full ${
                        a.enabled ? "bg-success animate-pulse-soft" : "bg-muted"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeader title="Queued tasks" />
              <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-72 overflow-auto">
                {(data?.queue ?? []).slice(0, 12).map((t: any) => (
                  <div key={t.id} className="px-4 py-2 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-mono text-foreground">{t.kind}</div>
                      <div className="text-[10px] text-muted">
                        attempt {t.attempt}/{t.max_attempts}
                        {t.last_error ? ` · ${t.last_error.slice(0, 40)}…` : ""}
                      </div>
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                ))}
                {(data?.queue ?? []).length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted">Queue is clear.</div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* AI decision audit log */}
        <section className="mt-10 mb-20">
          <SectionHeader title="AI decision audit log" subtitle="Every model output, scored, with reasoning." />
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {(data?.decisions ?? []).map((d: any) => (
              <div key={d.id} className="px-4 py-3 grid grid-cols-12 gap-3 text-xs items-start">
                <div className="col-span-2 font-mono uppercase text-muted text-[10px] tracking-wider">
                  {d.subject_type}
                </div>
                <div className="col-span-7 text-foreground/90">{d.rationale || "—"}</div>
                <div className="col-span-2 font-mono text-foreground">
                  {(Number(d.confidence ?? 0) * 100).toFixed(0)}%
                </div>
                <div className="col-span-1 text-[10px] text-muted text-right">
                  {new Date(d.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {(data?.decisions ?? []).length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted">
                No AI decisions logged yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// ---------- Pieces ------------------------------------------------------

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-display uppercase text-xs tracking-[0.2em] font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  warn,
  danger,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? "text-destructive"
    : warn
    ? "text-warning"
    : accent
    ? "text-accent"
    : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-foreground">{title}</div>
      {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "bg-accent/10 text-accent",
    paused: "bg-warning/10 text-warning",
    completed: "bg-success/10 text-success",
    succeeded: "bg-success/10 text-success",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted/15 text-muted",
    pending: "bg-secondary text-foreground/60",
    awaiting_approval: "bg-warning/15 text-warning",
    dead_letter: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${map[status] ?? "bg-secondary text-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function StepDots({ steps, current }: { steps: any[]; current?: string | null }) {
  const defs = CAREER_ACQUISITION_WORKFLOW.steps;
  const byNode = new Map(steps.map((s: any) => [s.node_id, s]));
  return (
    <div className="flex items-center gap-1.5">
      {defs.map((d) => {
        const s = byNode.get(d.id);
        const status = s?.status ?? (d.id === current ? "running" : "pending");
        const dot =
          status === "succeeded"
            ? "bg-success"
            : status === "failed"
            ? "bg-destructive"
            : status === "awaiting_approval"
            ? "bg-warning animate-pulse-soft"
            : status === "running"
            ? "bg-accent animate-pulse-soft"
            : status === "cancelled"
            ? "bg-muted/50"
            : "bg-border";
        return (
          <div key={d.id} className="flex items-center gap-1.5" title={`${d.label} — ${status}`}>
            <span className={`size-2 rounded-full ${dot}`} />
            <span className="text-[10px] font-mono text-muted hidden sm:inline">{d.id}</span>
          </div>
        );
      })}
    </div>
  );
}

function RunCard({ run, steps }: { run: any; steps: any[] }) {
  const [open, setOpen] = useState(false);
  const job = run.context?.source;
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-secondary/40 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <StatusPill status={run.status} />
            <span className="text-sm font-medium text-foreground truncate">
              {job ? `${job.title} · ${job.company}` : run.workflows?.name ?? "Workflow"}
            </span>
          </div>
          <div className="mt-2">
            <StepDots steps={steps} current={run.current_node} />
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted ml-3">
          {new Date(run.started_at ?? run.created_at).toLocaleTimeString()}
        </div>
      </button>
      {open && (
        <div className="border-t border-border bg-background/40 divide-y divide-border">
          {steps.map((s) => (
            <div key={s.id} className="px-4 py-2.5 grid grid-cols-12 gap-3 text-xs items-start">
              <div className="col-span-2 font-mono text-muted">{s.node_id}</div>
              <div className="col-span-2">
                <StatusPill status={s.status} />
              </div>
              <div className="col-span-6 text-foreground/80 line-clamp-2">
                {s.error
                  ? `error: ${s.error}`
                  : s.output
                  ? JSON.stringify(s.output).slice(0, 200)
                  : "—"}
              </div>
              <div className="col-span-2 text-right text-[10px] text-muted font-mono">
                attempt {s.attempt}
              </div>
            </div>
          ))}
          {run.error && (
            <div className="px-4 py-2 text-xs text-destructive">⚠ {run.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  run,
  steps,
  onApprove,
  onReject,
  busy,
}: {
  run: any;
  steps: any[];
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const job = run.context?.source;
  const tailorStep = steps.find((s) => s.node_id === "tailor");
  const reasonStep = steps.find((s) => s.node_id === "reason");
  const reasoning = (reasonStep?.output as any)?.reasoning;
  const confidence = (reasonStep?.output as any)?.confidence;
  return (
    <div className="rounded-lg border-2 border-warning/40 bg-warning/5 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-warning text-background text-[10px] font-mono uppercase tracking-wider">
              Approval required
            </span>
            {typeof confidence === "number" && (
              <span className="text-[10px] font-mono text-warning">
                confidence {(confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold">
            {job ? `${job.title} · ${job.company}` : "Workflow paused"}
          </h3>
          {reasoning && (
            <p className="mt-2 max-w-2xl text-sm text-foreground/80 leading-relaxed">
              <span className="text-muted">Strategist:</span> {reasoning}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
          >
            Approve & continue
          </button>
        </div>
      </div>

      <div className="mt-4">
        <StepDots steps={steps} current={run.current_node} />
      </div>

      {tailorStep && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">
            View tailored resume artifact
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto bg-background border border-border rounded-md p-3 text-[11px] font-mono">
            {JSON.stringify(tailorStep.output, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-10 text-center text-xs text-muted">
      {msg}
    </div>
  );
}
