/**
 * Observability metrics — workflow, queue, AI latency, source reliability,
 * approval conversion. Read-only, scoped to the calling user via RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export const getObservability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [runs, tasks, decisions, sources, pending, packages, outcomes] = await Promise.all([
      supabase
        .from("agent_runs")
        .select("status,duration_ms,cost_usd,tokens_in,tokens_out,confidence,error,created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("task_queue")
        .select("status,attempt,kind,last_error")
        .eq("user_id", userId)
        .limit(500),
      supabase
        .from("ai_decisions")
        .select("decision,confidence,created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .limit(500),
      supabase
        .from("job_sources")
        .select("identifier,kind,status,jobs_seen,jobs_imported,last_error,last_synced_at,source_confidence")
        .eq("user_id", userId),
      supabase
        .from("pending_actions")
        .select("status,kind,created_at,decided_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .limit(500),
      supabase
        .from("application_packages")
        .select("status,readiness_score,created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .limit(500),
      supabase
        .from("outcomes")
        .select("kind,occurred_at")
        .eq("user_id", userId)
        .gte("occurred_at", since)
        .limit(500),
    ]);

    const runRows = runs.data ?? [];
    const completed = runRows.filter((r) => r.status === "succeeded");
    const failed = runRows.filter((r) => r.status === "failed");
    const durations = completed.map((r) => r.duration_ms ?? 0).filter(Boolean).sort((a, b) => a - b);
    const p = (q: number) => durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * q))] : 0;
    const cost = runRows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
    const tokensIn = runRows.reduce((s, r) => s + (r.tokens_in ?? 0), 0);
    const tokensOut = runRows.reduce((s, r) => s + (r.tokens_out ?? 0), 0);
    const avgConf = completed.length
      ? completed.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / completed.length
      : 0;

    const taskRows = tasks.data ?? [];
    const queue = {
      pending: taskRows.filter((t) => t.status === "pending").length,
      running: taskRows.filter((t) => t.status === "running").length,
      failed: taskRows.filter((t) => t.status === "failed").length,
      dead: taskRows.filter((t) => t.status === "dead_letter").length,
      done: taskRows.filter((t) => t.status === "succeeded").length,
    };

    const sourceRows = sources.data ?? [];
    const sourceHealth = sourceRows.map((s) => ({
      identifier: s.identifier,
      kind: s.kind,
      status: s.status,
      reliability: pct(s.jobs_imported ?? 0, s.jobs_seen || 1),
      jobs_imported: s.jobs_imported ?? 0,
      jobs_seen: s.jobs_seen ?? 0,
      last_error: s.last_error,
      last_synced_at: s.last_synced_at,
      confidence: Number(s.source_confidence ?? 0),
    }));

    const pendingRows = pending.data ?? [];
    const approval = {
      pending: pendingRows.filter((a) => a.status === "pending").length,
      approved: pendingRows.filter((a) => a.status === "approved").length,
      rejected: pendingRows.filter((a) => a.status === "rejected").length,
      conversion: pct(
        pendingRows.filter((a) => a.status === "approved").length,
        pendingRows.filter((a) => a.status !== "pending").length || 1,
      ),
    };

    const outcomeRows = outcomes.data ?? [];
    const interviewCount = outcomeRows.filter((o) =>
      ["phone_screen", "technical", "onsite", "offer"].includes(String(o.kind)),
    ).length;

    return {
      window_days: 7,
      runs: {
        total: runRows.length,
        completed: completed.length,
        failed: failed.length,
        failure_rate: pct(failed.length, runRows.length || 1),
        avg_confidence: Math.round(avgConf * 100) / 100,
        latency_p50_ms: p(0.5),
        latency_p90_ms: p(0.9),
        latency_p99_ms: p(0.99),
        cost_usd: Math.round(cost * 1000) / 1000,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      },
      queue,
      decisions: {
        total: (decisions.data ?? []).length,
        avg_confidence:
          (decisions.data ?? []).length
            ? Math.round(
                ((decisions.data ?? []).reduce((s, d) => s + Number(d.confidence ?? 0), 0) /
                  (decisions.data ?? []).length) *
                  100,
              ) / 100
            : 0,
      },
      sources: sourceHealth,
      approval,
      packages: {
        total: (packages.data ?? []).length,
        avg_readiness:
          (packages.data ?? []).length
            ? Math.round(
                (packages.data ?? []).reduce((s, p) => s + (p.readiness_score ?? 0), 0) /
                  (packages.data ?? []).length,
              )
            : 0,
      },
      interviews_7d: interviewCount,
      recent_failures: failed.slice(0, 8).map((f) => ({
        error: f.error,
        at: f.created_at,
      })),
    };
  });
