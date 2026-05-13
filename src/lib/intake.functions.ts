/**
 * Job intake + analysis + tailored resume generation.
 *
 * Intake supports three modes:
 *   - "manual": user fills the form
 *   - "paste":  user pastes a job description, AI extracts structured fields
 *   - "url":    user pastes a URL, server fetches HTML, strips it, then AI extracts
 *
 * After intake we immediately run a real-AI analysis pass (ATS + match + skill
 * gap + salary alignment + reasoning + recommended strategy) using the user's
 * career profile + base resume. Nothing external happens here — this is all
 * internal scoring.
 *
 * Generating a tailored resume queues an item in `pending_actions` AND writes
 * a draft `resume_versions` row tied to the job. Nothing leaves the workspace
 * until the user approves.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { callAgent } from "@/lib/agents/call.server";

type DB = SupabaseClient<Database>;

// ---------- Helpers -----------------------------------------------------

async function fetchJobUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AetherOS/1.0; +https://aether.os/intake)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  const html = await res.text();
  // crude html → text
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 18_000);
}

async function loadProfileContext(supabase: DB, userId: string) {
  const [prof, base] = await Promise.all([
    supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("resume_versions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_base", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return { profile: prof.data, baseResume: base.data };
}

// ---------- Intake ------------------------------------------------------

const intakeSchema = z.object({
  kind: z.enum(["manual", "paste", "url"]),
  url: z.string().url().max(2000).optional(),
  raw_text: z.string().max(40_000).optional(),
  manual: z
    .object({
      title: z.string().min(1).max(200),
      company: z.string().min(1).max(200),
      location: z.string().max(200).optional(),
      remote: z.enum(["Remote", "Hybrid", "Onsite"]).optional(),
      salary_min: z.number().int().min(0).max(10_000_000).optional(),
      salary_max: z.number().int().min(0).max(10_000_000).optional(),
      description: z.string().max(20_000).optional(),
      apply_url: z.string().url().max(2000).optional(),
    })
    .optional(),
});

export const intakeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => intakeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    let extracted: Record<string, any> = {};
    let raw_input: string | null = null;
    let apply_url: string | null = null;

    if (data.kind === "manual") {
      if (!data.manual) throw new Error("manual fields required");
      extracted = { ...data.manual };
      apply_url = data.manual.apply_url ?? null;
    } else {
      if (data.kind === "url") {
        if (!data.url) throw new Error("url required");
        raw_input = await fetchJobUrl(data.url);
        apply_url = data.url;
      } else {
        if (!data.raw_text || data.raw_text.length < 50)
          throw new Error("paste at least 50 chars of job description");
        raw_input = data.raw_text;
      }

      // Extract structured job from raw text via AI (Analyzer agent).
      const ai = await callAgent("analyzer", {
        task: "extract_job_posting",
        raw_text: raw_input,
        schema_hint: {
          title: "string",
          company: "string",
          location: "string",
          remote: "Remote|Hybrid|Onsite|null",
          salary_min: "number|null",
          salary_max: "number|null",
          seniority: "junior|mid|senior|staff|principal|exec|null",
          requirements: "string[]",
          responsibilities: "string[]",
          ats_keywords: "string[] (top 12 most-likely ATS terms)",
          tech_skills: "string[]",
          description: "string (2-3 sentence summary)",
          apply_url: "string|null",
        },
      });
      extracted = ai.output;
      if (!apply_url && typeof extracted.apply_url === "string") apply_url = extracted.apply_url;
    }

    // Insert opportunity (without scores yet).
    const ins = await supabase
      .from("job_opportunities")
      .insert({
        user_id: userId,
        source: data.kind,
        intake_kind: data.kind,
        raw_input,
        title: String(extracted.title ?? "Untitled role").slice(0, 200),
        company: String(extracted.company ?? "Unknown").slice(0, 200),
        location: extracted.location ? String(extracted.location).slice(0, 200) : null,
        remote: extracted.remote ?? null,
        salary_min: typeof extracted.salary_min === "number" ? extracted.salary_min : null,
        salary_max: typeof extracted.salary_max === "number" ? extracted.salary_max : null,
        description: extracted.description ? String(extracted.description).slice(0, 8000) : null,
        seniority: extracted.seniority ?? null,
        requirements: (Array.isArray(extracted.requirements) ? extracted.requirements : []).slice(0, 30) as never,
        responsibilities: (Array.isArray(extracted.responsibilities) ? extracted.responsibilities : []).slice(0, 30) as never,
        tags: (Array.isArray(extracted.tech_skills) ? extracted.tech_skills : extracted.ats_keywords ?? []).slice(0, 30) as never,
        apply_url,
        url: apply_url,
        meta: { ats_keywords: extracted.ats_keywords ?? [] } as never,
        discovered_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);

    // Run analysis (best-effort — don't fail intake if AI hiccups).
    try {
      await analyzeOpportunity(supabase, userId, ins.data!.id);
    } catch (e) {
      console.error("analyzeOpportunity failed", e);
    }

    return { jobId: ins.data!.id };
  });

// ---------- Analysis ----------------------------------------------------

async function analyzeOpportunity(supabase: DB, userId: string, jobId: string) {
  const [{ data: job }, { profile, baseResume }] = await Promise.all([
    supabase.from("job_opportunities").select("*").eq("id", jobId).eq("user_id", userId).single(),
    loadProfileContext(supabase, userId),
  ]);
  if (!job) throw new Error("job not found");

  const ai = await callAgent("strategist", {
    task: "score_opportunity",
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      seniority: job.seniority,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      tags: job.tags,
      ats_keywords: (job.meta as any)?.ats_keywords ?? [],
      description: job.description,
    },
    candidate: {
      profile: profile && {
        target_titles: profile.target_titles,
        skills: profile.skills,
        seniority: profile.seniority,
        years_experience: profile.years_experience,
        salary_target_min: profile.salary_target_min,
        salary_target_max: profile.salary_target_max,
        preferred_locations: profile.preferred_locations,
        work_mode: profile.work_mode,
        deal_breakers: profile.deal_breakers,
      },
      base_resume: baseResume && {
        skills: baseResume.skills,
        seniority: baseResume.seniority,
        years_experience: baseResume.years_experience,
        detected_titles: baseResume.detected_titles,
        achievements: baseResume.achievements,
        summary: (baseResume.content as any)?.summary,
      },
    },
    schema_hint: {
      match_score: "0-100",
      ats_score: "0-100",
      interview_probability: "0-100",
      priority_score: "0-100",
      salary_alignment: "below|aligned|above",
      skill_gaps: "string[] (skills required but missing)",
      strength_signals: "string[] (top reasons this is a fit)",
      recommended_strategy: "string (1-2 sentences on resume framing)",
      reasoning: "string (2-3 sentence executive summary)",
    },
  });

  const out = ai.output as Record<string, any>;
  const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const meta = {
    ...((job.meta as any) ?? {}),
    skill_gaps: Array.isArray(out.skill_gaps) ? out.skill_gaps.slice(0, 20) : [],
    strength_signals: Array.isArray(out.strength_signals) ? out.strength_signals.slice(0, 10) : [],
    salary_alignment: typeof out.salary_alignment === "string" ? out.salary_alignment : null,
    recommended_strategy: typeof out.recommended_strategy === "string" ? out.recommended_strategy : null,
    priority_score: clamp(out.priority_score),
    last_analyzed_at: new Date().toISOString(),
    analysis_confidence: ai.confidence,
  };

  await supabase
    .from("job_opportunities")
    .update({
      match_score: clamp(out.match_score),
      ats_score: clamp(out.ats_score),
      interview_probability: clamp(out.interview_probability),
      reasoning: String(out.reasoning ?? ai.reasoning).slice(0, 1500),
      meta: meta as never,
    })
    .eq("id", jobId);

  await supabase.from("ai_decisions").insert({
    user_id: userId,
    subject_type: "job",
    subject_id: jobId,
    decision: "scored",
    rationale: String(out.reasoning ?? ai.reasoning).slice(0, 1500),
    confidence: ai.confidence,
    signals: meta as never,
  });

  return { meta };
}

export const reanalyzeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    await analyzeOpportunity(supabase, userId, data.jobId);
    return { ok: true };
  });

// ---------- Read --------------------------------------------------------

export const listIntakeJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("job_opportunities")
      .select("id, title, company, location, remote, match_score, ats_score, interview_probability, salary_min, salary_max, intake_kind, discovered_at, meta, reasoning")
      .eq("user_id", userId)
      .order("discovered_at", { ascending: false })
      .limit(100);
    return { jobs: r.data ?? [] };
  });

export const getJobDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("job_opportunities")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.jobId)
      .single();
    if (r.error) throw new Error(r.error.message);
    const tailored = await supabase
      .from("resume_versions")
      .select("id, label, ats_score, created_at, content, skills")
      .eq("user_id", userId)
      .eq("job_id", data.jobId)
      .order("created_at", { ascending: false });
    return { job: r.data, tailored: tailored.data ?? [] };
  });

// ---------- Tailored resume generation (queues approval) ---------------

export const generateTailoredResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const [{ data: job }, { profile, baseResume }] = await Promise.all([
      supabase.from("job_opportunities").select("*").eq("id", data.jobId).eq("user_id", userId).single(),
      loadProfileContext(supabase, userId),
    ]);
    if (!job) throw new Error("job not found");
    if (!baseResume) throw new Error("upload a base resume first");

    const ai = await callAgent("writer", {
      task: "tailor_resume",
      job: {
        title: job.title,
        company: job.company,
        seniority: job.seniority,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        ats_keywords: (job.meta as any)?.ats_keywords ?? [],
        skill_gaps: (job.meta as any)?.skill_gaps ?? [],
        strength_signals: (job.meta as any)?.strength_signals ?? [],
        recommended_strategy: (job.meta as any)?.recommended_strategy,
      },
      candidate: {
        profile,
        base_resume: baseResume.content,
        baseline_text: baseResume.parsed_text?.slice(0, 6000),
      },
      tone: profile?.communication_tone ?? "professional",
      schema_hint: {
        headline: "string",
        summary: "string (3 sentences)",
        keywords_injected: "string[]",
        bullets: "[{ section: string, original?: string, rewritten: string, why: string }]",
        rendered_md: "string (full markdown resume, do not invent experience)",
      },
    });

    const out = ai.output as Record<string, any>;
    const rendered = typeof out.rendered_md === "string" ? out.rendered_md : JSON.stringify(out, null, 2);

    const draft = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        job_id: data.jobId,
        parent_id: baseResume.id,
        is_base: false,
        label: `Tailored — ${job.company}`,
        content: out as never,
        rendered_md: rendered,
        ats_score: job.ats_score,
        skills: baseResume.skills as never,
        seniority: baseResume.seniority,
      })
      .select("*")
      .single();

    const action = await supabase
      .from("pending_actions")
      .insert({
        user_id: userId,
        kind: "resume_tailor",
        subject_type: "job",
        subject_id: data.jobId,
        title: `Approve tailored resume — ${job.title} · ${job.company}`,
        summary: typeof out.headline === "string" ? out.headline : ai.reasoning.slice(0, 300),
        agent_kind: "writer",
        confidence: ai.confidence,
        payload: {
          resume_version_id: draft.data?.id,
          keywords_injected: out.keywords_injected ?? [],
          bullets: out.bullets ?? [],
          reasoning: ai.reasoning,
        } as never,
      })
      .select("id")
      .single();

    return { resumeVersionId: draft.data?.id, pendingActionId: action.data?.id };
  });
