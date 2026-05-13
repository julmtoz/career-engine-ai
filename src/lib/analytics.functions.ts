/**
 * Analytics & feedback loop — funnel metrics across the workspace.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [evRes, jobs, apps, drafts, interviews] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("kind,value,created_at")
        .eq("user_id", userId)
        .gte("created_at", since30),
      supabase.from("job_opportunities").select("id,match_score,ats_score").eq("user_id", userId),
      supabase.from("applications").select("id,stage").eq("user_id", userId),
      supabase
        .from("outreach_drafts")
        .select("id,status,created_at")
        .eq("user_id", userId)
        .gte("created_at", since30),
      supabase.from("interviews").select("id,outcome").eq("user_id", userId),
    ]);

    const events = evRes.data ?? [];
    const sumKind = (k: string) =>
      events
        .filter((e) => e.kind === k)
        .reduce((acc, e) => acc + (Number(e.value) || 1), 0);

    const stageCounts = (apps.data ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.stage] = (acc[a.stage] ?? 0) + 1;
      return acc;
    }, {});

    const draftCounts = (drafts.data ?? []).reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    }, {});

    const matches = (jobs.data ?? []).map((j) => Number(j.match_score) || 0).filter(Boolean);
    const avgMatch = matches.length ? Math.round(matches.reduce((a, b) => a + b, 0) / matches.length) : 0;
    const atsScores = (jobs.data ?? []).map((j) => Number(j.ats_score) || 0).filter(Boolean);
    const avgAts = atsScores.length ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length) : 0;

    return {
      totals: {
        jobs_total: jobs.data?.length ?? 0,
        jobs_imported_30d: sumKind("jobs.imported"),
        applications_total: apps.data?.length ?? 0,
        outreach_drafted_30d: sumKind("outreach.drafted"),
        outreach_sent_30d: sumKind("outreach.sent"),
        interviews_total: interviews.data?.length ?? 0,
        avg_match_score: avgMatch,
        avg_ats_score: avgAts,
      },
      pipeline: stageCounts,
      drafts_by_status: draftCounts,
    };
  });
