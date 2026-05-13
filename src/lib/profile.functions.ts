/**
 * Career profile — the user intelligence layer that feeds every agent decision.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

const profileSchema = z.object({
  target_titles: z.array(z.string().min(1).max(120)).max(20).default([]),
  preferred_industries: z.array(z.string().min(1).max(80)).max(20).default([]),
  salary_target_min: z.number().int().min(0).max(10_000_000).nullable().optional(),
  salary_target_max: z.number().int().min(0).max(10_000_000).nullable().optional(),
  preferred_locations: z.array(z.string().min(1).max(120)).max(20).default([]),
  work_mode: z.array(z.enum(["Remote", "Hybrid", "Onsite"])).default(["Remote", "Hybrid"]),
  work_authorization: z.string().max(120).nullable().optional(),
  skills: z.array(z.string().min(1).max(80)).max(80).default([]),
  certifications: z.array(z.string().min(1).max(120)).max(40).default([]),
  career_goals: z.string().max(2000).nullable().optional(),
  deal_breakers: z.string().max(2000).nullable().optional(),
  communication_tone: z.enum(["professional", "warm", "direct", "enthusiastic", "concise"]).default("professional"),
  resume_baseline: z.string().max(20_000).nullable().optional(),
  seniority: z.string().max(40).nullable().optional(),
  years_experience: z.number().min(0).max(60).nullable().optional(),
});

export const getCareerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle();
    return { profile: r.data ?? null };
  });

export const saveCareerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const row = { user_id: userId, ...data } as never;
    const r = await supabase
      .from("career_profiles")
      .upsert(row, { onConflict: "user_id" })
      .select("*")
      .single();
    if (r.error) throw new Error(r.error.message);
    return { profile: r.data };
  });
