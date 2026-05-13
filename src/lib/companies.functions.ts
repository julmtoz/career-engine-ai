/**
 * Company intelligence — list, detail, AI enrichment.
 *
 * Enrichment uses the Strategist agent to infer plausible company signals
 * from publicly known context. We DO NOT scrape; we let the model reason
 * over the company's name + any jobs we've already pulled, and emit
 * structured signals + three composite scores. Stored on companies row.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { callAgent } from "@/lib/agents/call.server";

type DB = SupabaseClient<Database>;

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: companies } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .order("opportunity_score", { ascending: false, nullsFirst: false });

    // attach job counts
    const ids = (companies ?? []).map((c) => c.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: jobs } = await supabase
        .from("job_opportunities")
        .select("company_id")
        .eq("user_id", userId)
        .in("company_id", ids);
      counts = (jobs ?? []).reduce<Record<string, number>>((acc, j) => {
        if (j.company_id) acc[j.company_id] = (acc[j.company_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    return {
      companies: (companies ?? []).map((c) => ({
        ...c,
        open_jobs: counts[c.id] ?? 0,
      })),
    };
  });

export const enrichCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (!company) throw new Error("company not found");

    const { data: jobs } = await supabase
      .from("job_opportunities")
      .select("title,location,description,posted_at")
      .eq("user_id", userId)
      .eq("company_id", data.id)
      .limit(20);

    const recent30 = (jobs ?? []).filter(
      (j) => j.posted_at && Date.now() - new Date(j.posted_at).getTime() < 30 * 86_400_000,
    ).length;

    const result = await callAgent("strategist", {
      task: "company.intelligence",
      company: { name: company.name, domain: company.domain, hq: company.hq_location },
      open_jobs_sample: (jobs ?? []).slice(0, 12).map((j) => ({
        title: j.title,
        location: j.location,
        posted_at: j.posted_at,
      })),
      jobs_in_last_30d: recent30,
      instruction:
        "Infer a structured company intelligence record. Output keys: industry, size_band ('1-10'|'11-50'|'51-200'|'201-500'|'501-1k'|'1k-5k'|'5k+'), funding_stage, tech_stack (string[]), growth_signals (object: hiring_trend, news_signals[], product_momentum 0..1), hiring_velocity (number, jobs/30d estimate), recruiter_activity_score 0..1, layoff_signal (bool), intelligence_score 0..100, stability_score 0..100, opportunity_score 0..100. Be conservative when unknown.",
    });

    const o = result.output as Record<string, unknown>;
    const num = (k: string) => (typeof o[k] === "number" ? (o[k] as number) : null);
    const arr = (k: string) =>
      Array.isArray(o[k]) ? (o[k] as unknown[]).map(String) : [];

    await supabase
      .from("companies")
      .update({
        industry: (o.industry as string) ?? company.industry,
        size_band: (o.size_band as string) ?? company.size_band,
        funding_stage: (o.funding_stage as string) ?? company.funding_stage,
        tech_stack: arr("tech_stack"),
        growth_signals: (o.growth_signals as never) ?? {},
        hiring_velocity: num("hiring_velocity") ?? recent30,
        recruiter_activity_score: num("recruiter_activity_score"),
        layoff_signal: Boolean(o.layoff_signal),
        intelligence_score: num("intelligence_score"),
        stability_score: num("stability_score"),
        opportunity_score: num("opportunity_score"),
        last_enriched_at: new Date().toISOString(),
        meta: ({ ...((company.meta as object) ?? {}), reasoning: result.reasoning } as never),
      })
      .eq("id", data.id);

    await supabase.from("ai_decisions").insert({
      user_id: userId,
      subject_type: "company",
      subject_id: data.id,
      decision: "enriched",
      rationale: result.reasoning,
      confidence: result.confidence,
      signals: o as never,
    });

    return { ok: true as const, output: JSON.parse(JSON.stringify(o)) as Record<string, string | number | boolean | null>, reasoning: result.reasoning };
  });
