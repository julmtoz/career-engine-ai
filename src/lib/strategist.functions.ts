/**
 * AI Strategist — synthesizes recommendations across the workspace.
 *
 * Pulls recent jobs, recruiters, applications, and the user's profile,
 * and asks the strategist agent to emit prioritized next-actions:
 *   - top jobs to focus on (with reasoning)
 *   - top recruiters to contact
 *   - resume version to use
 *   - suggested timing
 * No actions are executed; output is rendered for the user.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { callAgent } from "@/lib/agents/call.server";

type DB = SupabaseClient<Database>;

export const getStrategistRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const [profile, jobs, recruiters, apps, resumes] = await Promise.all([
      supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("job_opportunities")
        .select("id,title,company,match_score,interview_probability,ats_score,freshness_score,location,posted_at,reasoning")
        .eq("user_id", userId)
        .order("discovered_at", { ascending: false })
        .limit(40),
      supabase
        .from("recruiters")
        .select("id,name,title,company,target_tier,warmth_score,contact_status,last_contacted_at")
        .eq("user_id", userId)
        .limit(40),
      supabase
        .from("applications")
        .select("id,stage,job_id,updated_at")
        .eq("user_id", userId)
        .limit(40),
      supabase
        .from("resume_versions")
        .select("id,label,is_base,ats_score,seniority,detected_titles")
        .eq("user_id", userId)
        .limit(20),
    ]);

    const result = await callAgent("strategist", {
      task: "weekly.strategy",
      profile: profile.data,
      open_pipeline: apps.data,
      jobs_recent: jobs.data,
      recruiters: recruiters.data,
      resumes: resumes.data,
      instruction:
        "Produce a prioritized action plan. Output keys: focus_jobs (array of {job_id, title, reason}), recruiter_targets (array of {recruiter_id, name, why_now, suggested_channel}), resume_strategy (string with which version to use & why), timing (string: when this week to act), risks (string[] of pitfalls), confidence_overall 0..1. Be specific; reference IDs from the input.",
    });

    return {
      reasoning: result.reasoning,
      confidence: result.confidence,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: JSON.parse(JSON.stringify(result.output)) as Record<string, any>,
    };
  });
