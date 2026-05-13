/**
 * Resume vault — store baseline + tailored resume versions, parse with AI.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { callAgent } from "@/lib/agents/call.server";

type DB = SupabaseClient<Database>;

const parseSchema = z.object({
  filename: z.string().min(1).max(255),
  storage_path: z.string().min(1).max(500),
  raw_text: z.string().min(20).max(50_000),
  is_base: z.boolean().default(true),
  label: z.string().min(1).max(120).optional(),
});

export const ingestResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    // Ask the analyzer to structure the resume.
    const ai = await callAgent("analyzer", {
      task: "parse_resume",
      raw_text: data.raw_text,
      schema_hint: {
        full_name: "string",
        headline: "string",
        years_experience: "number",
        seniority: "junior|mid|senior|staff|principal|exec",
        skills: "string[]",
        detected_titles: "string[]",
        certifications: "string[]",
        achievements: "[{ description: string, metric?: string }]",
        summary: "string (2-3 sentences)",
      },
    });

    const out = ai.output as Record<string, any>;
    const skills: string[] = Array.isArray(out.skills) ? out.skills.slice(0, 80) : [];
    const titles: string[] = Array.isArray(out.detected_titles) ? out.detected_titles.slice(0, 20) : [];
    const achievements = Array.isArray(out.achievements) ? out.achievements.slice(0, 30) : [];
    const seniority = typeof out.seniority === "string" ? out.seniority : null;
    const years = typeof out.years_experience === "number" ? out.years_experience : null;

    if (data.is_base) {
      await supabase
        .from("resume_versions")
        .update({ is_base: false })
        .eq("user_id", userId)
        .eq("is_base", true);
    }

    const ins = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        is_base: data.is_base,
        label: data.label ?? (data.is_base ? "Base resume" : data.filename),
        source_filename: data.filename,
        storage_path: data.storage_path,
        parsed_text: data.raw_text,
        skills: skills as never,
        seniority,
        years_experience: years,
        achievements: achievements as never,
        detected_titles: titles as never,
        content: out as never,
      })
      .select("*")
      .single();
    if (ins.error) throw new Error(ins.error.message);

    // Backfill profile defaults if empty.
    const prof = await supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data.is_base) {
      const merged: any = {
        user_id: userId,
        skills: prof.data?.skills?.length ? prof.data.skills : skills,
        target_titles: prof.data?.target_titles?.length ? prof.data.target_titles : titles,
        seniority: prof.data?.seniority ?? seniority,
        years_experience: prof.data?.years_experience ?? years,
      };
      await supabase.from("career_profiles").upsert(merged, { onConflict: "user_id" });
    }

    return { resume: ins.data };
  });

export const listResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("resume_versions")
      .select("id, label, is_base, source_filename, ats_score, skills, seniority, years_experience, job_id, created_at, parent_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { resumes: r.data ?? [] };
  });

export const getResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("resume_versions")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.id)
      .single();
    if (r.error) throw new Error(r.error.message);
    return { resume: r.data };
  });

export const setBaseResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    await supabase.from("resume_versions").update({ is_base: false }).eq("user_id", userId).eq("is_base", true);
    await supabase.from("resume_versions").update({ is_base: true }).eq("user_id", userId).eq("id", data.id);
    return { ok: true };
  });

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const row = await supabase
      .from("resume_versions")
      .select("storage_path")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (row.data?.storage_path) {
      await supabase.storage.from("resumes").remove([row.data.storage_path]);
    }
    await supabase.from("resume_versions").delete().eq("user_id", userId).eq("id", data.id);
    return { ok: true };
  });
