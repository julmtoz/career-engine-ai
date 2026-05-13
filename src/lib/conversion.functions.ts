/**
 * Conversion Engine — turn opportunities into interviews.
 *
 * Surfaces:
 *   - Application package builder (resume + cover letter + outreach + Q&A + pitch + salary + follow-up plan)
 *   - Readiness score (composite of ATS, keyword coverage, skill-gap, salary alignment, outreach quality, etc.)
 *   - Resume version compare
 *   - Approval-gated follow-up queue
 *   - Outcome tracking + learning loop signals
 *   - Interview prep packs
 *   - Conversion analytics ("interviews generated per week")
 *
 * Nothing leaves the workspace. Every send is gated on user approval.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { callAgent } from "@/lib/agents/call.server";

type DB = SupabaseClient<Database>;

const clamp100 = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// ────────────────────────────────────────────────────────────────────────
// PACKAGE BUILDER
// ────────────────────────────────────────────────────────────────────────

async function loadCtx(supabase: DB, userId: string, jobId: string) {
  const [{ data: job }, { data: profile }, { data: baseResume }] = await Promise.all([
    supabase.from("job_opportunities").select("*").eq("id", jobId).eq("user_id", userId).single(),
    supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("resume_versions").select("*").eq("user_id", userId).eq("is_base", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!job) throw new Error("job not found");
  return { job, profile, baseResume };
}

function computeReadiness(parts: {
  ats: number; match: number; interview: number;
  keyword_coverage: number; skill_gap_risk: number;
  cover_quality: number; outreach_quality: number;
  salary_alignment: "below" | "aligned" | "above" | null;
  has_resume: boolean; has_cover: boolean; has_outreach: boolean;
}) {
  const sal = parts.salary_alignment === "aligned" ? 90 : parts.salary_alignment === "above" ? 100 : parts.salary_alignment === "below" ? 55 : 70;
  const breakdown = {
    ats_match: parts.ats,
    match_score: parts.match,
    interview_probability: parts.interview,
    keyword_coverage: parts.keyword_coverage,
    skill_gap_inverse: 100 - parts.skill_gap_risk,
    cover_quality: parts.cover_quality,
    outreach_quality: parts.outreach_quality,
    salary_alignment: sal,
    completeness:
      (parts.has_resume ? 40 : 0) + (parts.has_cover ? 30 : 0) + (parts.has_outreach ? 30 : 0),
  };
  // Weighted blend optimized for INTERVIEW probability, not application volume.
  const score = Math.round(
    breakdown.ats_match * 0.10 +
    breakdown.match_score * 0.18 +
    breakdown.interview_probability * 0.20 +
    breakdown.keyword_coverage * 0.12 +
    breakdown.skill_gap_inverse * 0.10 +
    breakdown.cover_quality * 0.08 +
    breakdown.outreach_quality * 0.10 +
    breakdown.salary_alignment * 0.05 +
    breakdown.completeness * 0.07
  );
  const blockers: string[] = [];
  if (!parts.has_resume) blockers.push("No tailored resume");
  if (!parts.has_cover) blockers.push("No cover letter");
  if (!parts.has_outreach) blockers.push("No recruiter outreach drafted");
  if (parts.keyword_coverage < 60) blockers.push("Keyword coverage below 60%");
  if (parts.skill_gap_risk > 50) blockers.push("Material skill gap vs requirements");
  if (parts.salary_alignment === "below") blockers.push("Comp band is below your floor");
  return { score: clamp100(score), breakdown, blockers };
}

export const buildApplicationPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { job, profile, baseResume } = await loadCtx(supabase, userId, data.jobId);
    if (!baseResume) throw new Error("upload a base resume first");

    // 1. Tailored resume (Writer)
    const resumeAi = await callAgent("writer", {
      task: "tailor_resume_for_package",
      job: {
        title: job.title, company: job.company, seniority: job.seniority,
        requirements: job.requirements, responsibilities: job.responsibilities,
        ats_keywords: (job.meta as any)?.ats_keywords ?? [],
        skill_gaps: (job.meta as any)?.skill_gaps ?? [],
        recommended_strategy: (job.meta as any)?.recommended_strategy,
      },
      candidate: { profile, base: baseResume.content, baseline_text: baseResume.parsed_text?.slice(0, 5000) },
      tone: profile?.communication_tone ?? "professional",
      schema_hint: {
        headline: "string", summary: "string",
        keywords_injected: "string[]", keyword_coverage_pct: "0-100",
        rendered_md: "string (full resume markdown)",
        delta_summary: "string (what changed)",
      },
    });

    const resumeOut = resumeAi.output as Record<string, any>;
    const resumeIns = await supabase.from("resume_versions").insert({
      user_id: userId, job_id: job.id, parent_id: baseResume.id, is_base: false,
      label: `Package — ${job.company}`,
      content: resumeOut as never,
      rendered_md: typeof resumeOut.rendered_md === "string" ? resumeOut.rendered_md : null,
      ats_score: job.ats_score, skills: baseResume.skills as never,
      seniority: baseResume.seniority,
    }).select("*").single();

    // 2. Cover letter (Writer)
    const coverAi = await callAgent("writer", {
      task: "write_cover_letter",
      job: { title: job.title, company: job.company, description: job.description, requirements: job.requirements },
      candidate: { profile, achievements: baseResume.achievements, summary: (baseResume.content as any)?.summary },
      tone: profile?.communication_tone ?? "professional",
      schema_hint: { subject: "string", body: "string (3-4 short paragraphs)", quality_score: "0-100", reasoning: "string" },
    });
    const coverOut = coverAi.output as Record<string, any>;
    const coverIns = await supabase.from("cover_letters").insert({
      user_id: userId, job_id: job.id,
      body: String(coverOut.body ?? "").slice(0, 8000),
      tone: profile?.communication_tone ?? "professional",
    }).select("id").single();

    // 3. Recruiter + LinkedIn outreach drafts (Outreach)
    const outAi = await callAgent("outreach", {
      task: "draft_outreach_pair",
      job: { title: job.title, company: job.company, seniority: job.seniority },
      candidate: { profile, achievements: baseResume.achievements },
      schema_hint: {
        email: { subject: "string", body: "string (90-140 words)" },
        linkedin: { body: "string (under 300 chars, conversational)" },
        quality_score: "0-100",
      },
    });
    const outOut = outAi.output as Record<string, any>;
    const recIns = await supabase.from("outreach_drafts").insert({
      user_id: userId, job_id: job.id, channel: "email", variant: "cold",
      subject: String(outOut.email?.subject ?? `Re: ${job.title}`).slice(0, 200),
      body: String(outOut.email?.body ?? "").slice(0, 4000),
      reasoning: outAi.reasoning, confidence: outAi.confidence,
    }).select("id").single();
    const liIns = await supabase.from("outreach_drafts").insert({
      user_id: userId, job_id: job.id, channel: "linkedin", variant: "cold",
      body: String(outOut.linkedin?.body ?? "").slice(0, 1200),
      reasoning: outAi.reasoning, confidence: outAi.confidence,
    }).select("id").single();

    // 4. Application Q&A + pitch + salary strategy (Strategist)
    const pitchAi = await callAgent("strategist", {
      task: "build_application_pitch",
      job: { title: job.title, company: job.company, salary_min: job.salary_min, salary_max: job.salary_max, requirements: job.requirements },
      candidate: { profile, achievements: baseResume.achievements },
      schema_hint: {
        tell_me_about_yourself: "string (60-90 words)",
        why_interested: "string (50-80 words)",
        why_you_fit: "string",
        common_app_answers: "[{ question: string, answer: string }] (top 5)",
        salary: { recommended_floor: "number", recommended_target: "number", talking_points: "string[]" },
      },
    });
    const pitch = pitchAi.output as Record<string, any>;

    // 5. Follow-up plan (Follow_up)
    const fuAi = await callAgent("follow_up", {
      task: "draft_followup_sequence",
      job: { title: job.title, company: job.company },
      candidate: { profile, tone: profile?.communication_tone ?? "professional" },
      schema_hint: {
        sequence: "[{ kind: string, channel: 'email'|'linkedin', send_after_days: number, subject?: string, body: string, reasoning: string }] (4-5 items)",
      },
    });
    const fuPlan = Array.isArray((fuAi.output as any).sequence) ? (fuAi.output as any).sequence : [];

    // 6. Readiness score
    const ats = clamp100(job.ats_score ?? 60);
    const match = clamp100(job.match_score ?? 60);
    const interview = clamp100(job.interview_probability ?? 50);
    const kc = clamp100(resumeOut.keyword_coverage_pct ?? 70);
    const gaps = ((job.meta as any)?.skill_gaps ?? []).length;
    const skillRisk = clamp100(gaps * 12);
    const salAlign = ((job.meta as any)?.salary_alignment ?? null) as "below" | "aligned" | "above" | null;
    const readiness = computeReadiness({
      ats, match, interview,
      keyword_coverage: kc, skill_gap_risk: skillRisk,
      cover_quality: clamp100(coverOut.quality_score ?? 70),
      outreach_quality: clamp100(outOut.quality_score ?? 70),
      salary_alignment: salAlign,
      has_resume: true, has_cover: true, has_outreach: true,
    });

    // 7. Persist package
    const pkg = await supabase.from("application_packages").insert({
      user_id: userId, job_id: job.id,
      resume_version_id: resumeIns.data?.id,
      cover_letter_id: coverIns.data?.id,
      recruiter_outreach_id: recIns.data?.id,
      linkedin_outreach_id: liIns.data?.id,
      qa_answers: { questions: pitch.common_app_answers ?? [] } as never,
      pitch: {
        tell_me_about_yourself: pitch.tell_me_about_yourself,
        why_interested: pitch.why_interested,
        why_you_fit: pitch.why_you_fit,
      } as never,
      salary_strategy: pitch.salary ?? {} as never,
      followup_plan: fuPlan as never,
      readiness_score: readiness.score,
      readiness_breakdown: { ...readiness.breakdown, blockers: readiness.blockers } as never,
      status: readiness.score >= 75 ? "ready" : "draft",
      reasoning: resumeAi.reasoning,
      confidence: (resumeAi.confidence + coverAi.confidence + outAi.confidence + pitchAi.confidence) / 4,
    }).select("*").single();

    // 8. Queue ONE approval action that gates the whole package
    await supabase.from("pending_actions").insert({
      user_id: userId,
      kind: "application_package",
      subject_type: "package",
      subject_id: pkg.data?.id,
      title: `Approve application package — ${job.title} · ${job.company}`,
      summary: `Readiness ${readiness.score}/100. ${readiness.blockers.length === 0 ? "No blockers detected." : "Blockers: " + readiness.blockers.join(", ")}`,
      agent_kind: "writer",
      confidence: pkg.data?.confidence ?? null,
      payload: { package_id: pkg.data?.id, job_id: job.id } as never,
    });

    return { packageId: pkg.data?.id, readiness };
  });

// ────────────────────────────────────────────────────────────────────────
// READ
// ────────────────────────────────────────────────────────────────────────

export const listPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("application_packages")
      .select("id, job_id, status, readiness_score, readiness_breakdown, created_at, updated_at, application_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(60);
    const ids = Array.from(new Set((r.data ?? []).map((p) => p.job_id)));
    const jobs = ids.length
      ? await supabase.from("job_opportunities").select("id, title, company, location, remote").in("id", ids)
      : { data: [] as any[] };
    const jmap = new Map((jobs.data ?? []).map((j: any) => [j.id, j]));
    return {
      packages: (r.data ?? []).map((p) => ({ ...p, job: jmap.get(p.job_id) ?? null })),
    };
  });

export const getPackage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const pkg = await supabase.from("application_packages").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (pkg.error || !pkg.data) throw new Error("package not found");
    const [job, resume, cover, recOut, liOut, baseR] = await Promise.all([
      supabase.from("job_opportunities").select("*").eq("id", pkg.data.job_id).single(),
      pkg.data.resume_version_id ? supabase.from("resume_versions").select("*").eq("id", pkg.data.resume_version_id).single() : Promise.resolve({ data: null } as any),
      pkg.data.cover_letter_id ? supabase.from("cover_letters").select("*").eq("id", pkg.data.cover_letter_id).single() : Promise.resolve({ data: null } as any),
      pkg.data.recruiter_outreach_id ? supabase.from("outreach_drafts").select("*").eq("id", pkg.data.recruiter_outreach_id).single() : Promise.resolve({ data: null } as any),
      pkg.data.linkedin_outreach_id ? supabase.from("outreach_drafts").select("*").eq("id", pkg.data.linkedin_outreach_id).single() : Promise.resolve({ data: null } as any),
      supabase.from("resume_versions").select("*").eq("user_id", userId).eq("is_base", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      pkg: pkg.data,
      job: job.data, resume: resume.data, cover: cover.data,
      recruiter_outreach: recOut.data, linkedin_outreach: liOut.data,
      base_resume: baseR.data,
    };
  });

// ────────────────────────────────────────────────────────────────────────
// FOLLOW-UPS
// ────────────────────────────────────────────────────────────────────────

export const seedFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ packageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const pkg = await supabase.from("application_packages").select("*").eq("id", data.packageId).eq("user_id", userId).single();
    if (pkg.error || !pkg.data) throw new Error("package not found");
    const seq = (pkg.data.followup_plan ?? []) as any[];
    const now = Date.now();
    if (!Array.isArray(seq) || seq.length === 0) return { inserted: 0 };
    const rows = seq.slice(0, 6).map((s) => ({
      user_id: userId,
      application_id: pkg.data!.application_id,
      package_id: pkg.data!.id,
      kind: String(s.kind ?? "application_followup").slice(0, 60),
      channel: s.channel === "linkedin" ? "linkedin" : "email",
      subject: s.subject ? String(s.subject).slice(0, 200) : null,
      body: String(s.body ?? "").slice(0, 4000),
      send_after: new Date(now + Math.max(0, Number(s.send_after_days) || 2) * 86_400_000).toISOString(),
      reasoning: s.reasoning ? String(s.reasoning).slice(0, 800) : null,
      status: "pending" as const,
    }));
    const ins = await supabase.from("follow_ups").insert(rows as any).select("id");
    return { inserted: ins.data?.length ?? 0 };
  });

export const listFollowUps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase.from("follow_ups").select("*").eq("user_id", userId)
      .order("send_after", { ascending: true }).limit(100);
    return { followUps: r.data ?? [] };
  });

export const decideFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["approved", "rejected", "skipped", "sent"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const update: any = { status: data.decision, decided_at: new Date().toISOString() };
    if (data.decision === "sent") update.sent_at = new Date().toISOString();
    await supabase.from("follow_ups").update(update).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────────────────
// OUTCOMES + LEARNING
// ────────────────────────────────────────────────────────────────────────

const outcomeKindEnum = z.enum([
  "applied", "recruiter_responded", "phone_screen",
  "interview", "second_interview", "offer", "rejected", "ghosted",
]);

const stageMap: Record<string, Database["public"]["Enums"]["application_stage"]> = {
  applied: "applied",
  recruiter_responded: "outreach",
  phone_screen: "phone_screen",
  interview: "interview",
  second_interview: "interview_2",
  offer: "offer",
  rejected: "rejected",
  ghosted: "rejected",
};

export const recordOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    applicationId: z.string().uuid(),
    kind: outcomeKindEnum,
    note: z.string().max(800).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const app = await supabase.from("applications").select("*").eq("id", data.applicationId).eq("user_id", userId).single();
    if (app.error || !app.data) throw new Error("application not found");
    const job = app.data.job_id ? await supabase.from("job_opportunities").select("source, company").eq("id", app.data.job_id).maybeSingle() : null;

    await supabase.from("outcomes").insert({
      user_id: userId,
      application_id: data.applicationId,
      job_id: app.data.job_id,
      resume_version_id: app.data.resume_version_id,
      package_id: (app.data as any).package_id ?? null,
      source: job?.data?.source ?? null,
      kind: data.kind,
      meta: { note: data.note ?? null } as never,
    });

    const newStage = stageMap[data.kind];
    if (newStage) {
      await supabase.from("applications").update({ stage: newStage, updated_at: new Date().toISOString() }).eq("id", data.applicationId);
      await supabase.from("application_events").insert({
        user_id: userId, application_id: data.applicationId,
        actor: "user", to_stage: newStage, note: data.note ?? null,
      } as any);
    }

    return { ok: true };
  });

// Learning loop: aggregate which signals correlate with interviews+offers
export const learningSignals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const r = await supabase.from("outcomes").select("kind, source, resume_version_id, package_id, occurred_at, job_id")
      .eq("user_id", userId).gte("occurred_at", since);
    const rows = r.data ?? [];

    const bySource = new Map<string, { applied: number; interviews: number; offers: number }>();
    const interviewKinds = new Set(["phone_screen", "interview", "second_interview", "offer"]);
    for (const o of rows) {
      const key = o.source ?? "unknown";
      const b = bySource.get(key) ?? { applied: 0, interviews: 0, offers: 0 };
      if (o.kind === "applied") b.applied += 1;
      if (interviewKinds.has(o.kind)) b.interviews += 1;
      if (o.kind === "offer") b.offers += 1;
      bySource.set(key, b);
    }

    const sources = Array.from(bySource.entries()).map(([source, v]) => ({
      source,
      applied: v.applied,
      interviews: v.interviews,
      offers: v.offers,
      interview_rate: v.applied > 0 ? Math.round((v.interviews / v.applied) * 100) : 0,
    })).sort((a, b) => b.interview_rate - a.interview_rate);

    // Top resume versions by interview yield
    const byResume = new Map<string, { interviews: number; total: number }>();
    for (const o of rows) {
      if (!o.resume_version_id) continue;
      const b = byResume.get(o.resume_version_id) ?? { interviews: 0, total: 0 };
      b.total += 1;
      if (interviewKinds.has(o.kind)) b.interviews += 1;
      byResume.set(o.resume_version_id, b);
    }
    const topResumeIds = Array.from(byResume.entries())
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => (b[1].interviews / b[1].total) - (a[1].interviews / a[1].total))
      .slice(0, 5)
      .map(([id, v]) => ({ id, ...v, interview_rate: Math.round((v.interviews / v.total) * 100) }));

    const ids = topResumeIds.map((r) => r.id);
    const labels = ids.length ? await supabase.from("resume_versions").select("id, label").in("id", ids) : { data: [] as any[] };
    const lmap = new Map((labels.data ?? []).map((r: any) => [r.id, r.label]));

    return {
      sources,
      topResumes: topResumeIds.map((r) => ({ ...r, label: lmap.get(r.id) ?? "Resume" })),
      total: rows.length,
    };
  });

// ────────────────────────────────────────────────────────────────────────
// INTERVIEW PREP
// ────────────────────────────────────────────────────────────────────────

export const generateInterviewPrep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    applicationId: z.string().uuid(),
    round: z.enum(["screen", "technical", "onsite", "final"]).default("screen"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const app = await supabase.from("applications").select("*").eq("id", data.applicationId).eq("user_id", userId).single();
    if (app.error || !app.data) throw new Error("application not found");
    const [{ data: job }, { data: profile }, { data: baseResume }] = await Promise.all([
      supabase.from("job_opportunities").select("*").eq("id", app.data.job_id).single(),
      supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("resume_versions").select("*").eq("user_id", userId).eq("is_base", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const ai = await callAgent("interviewer", {
      task: "build_interview_prep_pack",
      round: data.round,
      job: { title: job?.title, company: job?.company, requirements: job?.requirements, responsibilities: job?.responsibilities, description: job?.description, salary_min: job?.salary_min, salary_max: job?.salary_max },
      candidate: { profile, achievements: baseResume?.achievements, summary: (baseResume?.content as any)?.summary },
      schema_hint: {
        company_brief: { mission: "string", products: "string[]", recent_news: "string[]", culture_signals: "string[]" },
        role_questions: "string[] (8)",
        technical_questions: "[{ question: string, why_asked: string, framework: string }] (6)",
        behavioral_questions: "[{ question: string, competency: string }] (6)",
        star_answers: "[{ question: string, situation: string, task: string, action: string, result: string }] (4)",
        questions_to_ask: "string[] (8 sharp questions)",
        negotiation_strategy: { anchor: "number", floor: "number", talking_points: "string[]" },
        red_flags: "string[]",
      },
    });
    const o = ai.output as Record<string, any>;
    const ins = await supabase.from("interview_prep").insert({
      user_id: userId, application_id: data.applicationId, job_id: app.data.job_id, round: data.round,
      company_brief: o.company_brief ?? {} as never,
      role_questions: o.role_questions ?? [] as never,
      technical_questions: o.technical_questions ?? [] as never,
      behavioral_questions: o.behavioral_questions ?? [] as never,
      star_answers: o.star_answers ?? [] as never,
      questions_to_ask: o.questions_to_ask ?? [] as never,
      negotiation_strategy: o.negotiation_strategy ?? {} as never,
      red_flags: o.red_flags ?? [] as never,
      reasoning: ai.reasoning, confidence: ai.confidence,
    }).select("id").single();
    return { prepId: ins.data?.id };
  });

export const listInterviewPrep = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase.from("interview_prep").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(40);
    const appIds = Array.from(new Set((r.data ?? []).map((p) => p.application_id)));
    const apps = appIds.length ? await supabase.from("applications").select("id, job_id").in("id", appIds) : { data: [] as any[] };
    const jobIds = Array.from(new Set((apps.data ?? []).map((a: any) => a.job_id)));
    const jobs = jobIds.length ? await supabase.from("job_opportunities").select("id, title, company").in("id", jobIds) : { data: [] as any[] };
    const amap = new Map((apps.data ?? []).map((a: any) => [a.id, a]));
    const jmap = new Map((jobs.data ?? []).map((j: any) => [j.id, j]));
    return {
      packs: (r.data ?? []).map((p) => {
        const a = amap.get(p.application_id);
        const j = a ? jmap.get(a.job_id) : null;
        return { ...p, job: j };
      }),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// CONVERSION ANALYTICS
// ────────────────────────────────────────────────────────────────────────

export const conversionAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const since = new Date(Date.now() - 84 * 86_400_000).toISOString(); // 12 weeks
    const out = await supabase.from("outcomes").select("kind, occurred_at, source").eq("user_id", userId).gte("occurred_at", since);
    const rows = out.data ?? [];

    const interviewKinds = new Set(["phone_screen", "interview", "second_interview", "offer"]);
    const week = (iso: string) => {
      const d = new Date(iso);
      const onejan = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - onejan.getTime()) / 86_400_000);
      return `${d.getFullYear()}-W${String(Math.ceil((days + onejan.getDay() + 1) / 7)).padStart(2, "0")}`;
    };

    const byWeek = new Map<string, { applied: number; interviews: number; offers: number }>();
    let funnel = { applied: 0, recruiter_responded: 0, phone_screen: 0, interview: 0, second_interview: 0, offer: 0, rejected: 0, ghosted: 0 };
    for (const o of rows) {
      (funnel as any)[o.kind] = ((funnel as any)[o.kind] ?? 0) + 1;
      const w = week(o.occurred_at);
      const b = byWeek.get(w) ?? { applied: 0, interviews: 0, offers: 0 };
      if (o.kind === "applied") b.applied += 1;
      if (interviewKinds.has(o.kind)) b.interviews += 1;
      if (o.kind === "offer") b.offers += 1;
      byWeek.set(w, b);
    }

    const weekly = Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([w, v]) => ({ week: w, ...v }));
    const last4 = weekly.slice(-4);
    const interviewsLast4 = last4.reduce((a, b) => a + b.interviews, 0);
    const appliedLast4 = last4.reduce((a, b) => a + b.applied, 0);

    return {
      headline: {
        interviews_last_4_weeks: interviewsLast4,
        applications_last_4_weeks: appliedLast4,
        interview_rate: appliedLast4 > 0 ? Math.round((interviewsLast4 / appliedLast4) * 100) : 0,
      },
      weekly,
      funnel,
    };
  });
