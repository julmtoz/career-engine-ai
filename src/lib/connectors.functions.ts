/**
 * Job source connectors — list, add, sync.
 *
 * Real ingestion: Greenhouse + Lever public APIs (no auth, no scraping).
 * Sync writes normalized rows into job_opportunities, links them to a
 * companies row (auto-created), records freshness, and emits an
 * analytics_events row per import.
 *
 * Other connector kinds (workday/ashby/rss/careers_page) are registered
 * with the same contract so the UI is uniform; users can still capture
 * those jobs through Intake (URL paste).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { CONNECTORS, CONNECTOR_LABELS, LIVE_KINDS } from "@/lib/connectors/registry";
import type { NormalizedJob, SourceKind } from "@/lib/connectors/types";

type DB = SupabaseClient<Database>;

const SOURCE_KINDS = [
  "greenhouse",
  "lever",
  "workday",
  "ashby",
  "rss",
  "careers_page",
  "manual",
] as const;

// ---------- Queries ----------

export const listJobSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data } = await supabase
      .from("job_sources")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return {
      sources: data ?? [],
      catalog: SOURCE_KINDS.map((k) => ({
        kind: k,
        label: CONNECTOR_LABELS[k],
        live: LIVE_KINDS.includes(k),
      })),
    };
  });

// ---------- Add source ----------

export const addJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(SOURCE_KINDS),
        identifier: z.string().min(1).max(200),
        label: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: row, error } = await supabase
      .from("job_sources")
      .insert({
        user_id: userId,
        kind: data.kind,
        identifier: data.identifier.trim(),
        label: data.label ?? data.identifier.trim(),
        source_confidence: data.kind === "greenhouse" || data.kind === "lever" ? 0.95 : 0.7,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { source: row };
  });

export const deleteJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { error } = await supabase
      .from("job_sources")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Helpers ----------

async function ensureCompany(
  supabase: DB,
  userId: string,
  name: string,
): Promise<string> {
  const cleaned = name.trim();
  if (!cleaned) throw new Error("company required");
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .eq("name", cleaned)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from("companies")
    .insert({ user_id: userId, name: cleaned })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

function freshness(postedAt: string | null | undefined): number {
  if (!postedAt) return 0.4;
  const ageDays = (Date.now() - new Date(postedAt).getTime()) / 86_400_000;
  if (ageDays < 1) return 1;
  if (ageDays < 7) return 0.85;
  if (ageDays < 21) return 0.6;
  if (ageDays < 60) return 0.35;
  return 0.15;
}

async function importJobs(
  supabase: DB,
  userId: string,
  sourceId: string,
  sourceKind: SourceKind,
  jobs: NormalizedJob[],
): Promise<number> {
  if (!jobs.length) return 0;
  let imported = 0;
  for (const j of jobs) {
    const company_id = await ensureCompany(supabase, userId, j.company);
    const { error } = await supabase
      .from("job_opportunities")
      .upsert(
        {
          user_id: userId,
          job_source_id: sourceId,
          company_id,
          external_id: j.externalId,
          source: sourceKind,
          title: j.title,
          company: j.company,
          location: j.location ?? null,
          remote: j.remote ?? null,
          description: j.description ?? null,
          url: j.url ?? null,
          apply_url: j.applyUrl ?? null,
          posted_at: j.postedAt ?? null,
          tags: j.tags ?? [],
          intake_kind: "connector",
          freshness_score: freshness(j.postedAt),
          source_confidence: sourceKind === "greenhouse" || sourceKind === "lever" ? 0.95 : 0.7,
          meta: (j.meta ?? {}) as never,
        },
        { onConflict: "user_id,job_source_id,external_id", ignoreDuplicates: false },
      );
    if (!error) imported += 1;
  }
  await supabase.from("analytics_events").insert({
    user_id: userId,
    kind: "jobs.imported",
    subject_type: "job_source",
    subject_id: sourceId,
    value: imported,
    meta: { source_kind: sourceKind, seen: jobs.length },
  });
  return imported;
}

// ---------- Sync ----------

export const syncJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: source, error } = await supabase
      .from("job_sources")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error || !source) throw new Error("source not found");

    await supabase
      .from("job_sources")
      .update({ status: "syncing", last_error: null })
      .eq("id", source.id);

    const connector = CONNECTORS[source.kind as SourceKind];
    const result = await connector.fetch(source.identifier, source.config as Record<string, unknown>);

    let imported = 0;
    if (result.ok && result.jobs.length) {
      imported = await importJobs(supabase, userId, source.id, source.kind as SourceKind, result.jobs);
    }

    await supabase
      .from("job_sources")
      .update({
        status: result.ok ? "ok" : "error",
        last_synced_at: new Date().toISOString(),
        last_error: result.error ?? null,
        jobs_seen: (source.jobs_seen ?? 0) + result.seen,
        jobs_imported: (source.jobs_imported ?? 0) + imported,
      })
      .eq("id", source.id);

    return {
      ok: result.ok,
      seen: result.seen,
      imported,
      error: result.error ?? null,
    };
  });

// ---------- Live feed ----------

export const liveOpportunityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: jobs } = await supabase
      .from("job_opportunities")
      .select(
        "id,title,company,location,remote,posted_at,match_score,ats_score,interview_probability,reasoning,tags,url,apply_url,freshness_score,recruiter_active,source,source_confidence,company_id,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);

    const { data: companies } = await supabase
      .from("companies")
      .select("id,name,intelligence_score,opportunity_score,stability_score,size_band,funding_stage,recruiter_activity_score")
      .eq("user_id", userId);

    const cmap = new Map((companies ?? []).map((c) => [c.id, c]));

    const ranked = (jobs ?? [])
      .map((j) => {
        const c = j.company_id ? cmap.get(j.company_id) : undefined;
        const match = j.match_score ?? 0;
        const ats = j.ats_score ?? 0;
        const ip = j.interview_probability ?? 0;
        const fresh = Number(j.freshness_score ?? 0.5);
        const opp = c?.opportunity_score ?? 50;
        const conf = Number(j.source_confidence ?? 0.7);
        // Strategist composite: weighted blend
        const score =
          match * 0.32 +
          ats * 0.18 +
          ip * 0.22 +
          fresh * 100 * 0.12 +
          opp * 0.1 +
          conf * 100 * 0.06;
        return { ...j, company_intel: c ?? null, rank_score: Math.round(score) };
      })
      .sort((a, b) => b.rank_score - a.rank_score);

    return { jobs: ranked };
  });
