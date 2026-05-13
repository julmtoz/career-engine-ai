/**
 * Recruiter intelligence + AI-drafted outreach.
 * Outreach is always staged in `outreach_drafts` with status 'pending'
 * and a parallel `pending_actions` row. Nothing sends automatically.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { callAgent } from "@/lib/agents/call.server";

type DB = SupabaseClient<Database>;

export const listRecruiters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: recruiters } = await supabase
      .from("recruiters")
      .select("*")
      .eq("user_id", userId)
      .order("warmth_score", { ascending: false, nullsFirst: false });
    const { data: drafts } = await supabase
      .from("outreach_drafts")
      .select("id,recruiter_id,status,channel,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const draftMap = new Map<string, number>();
    (drafts ?? []).forEach((d) => {
      if (d.recruiter_id) draftMap.set(d.recruiter_id, (draftMap.get(d.recruiter_id) ?? 0) + 1);
    });
    return {
      recruiters: (recruiters ?? []).map((r) => ({
        ...r,
        draft_count: draftMap.get(r.id) ?? 0,
      })),
    };
  });

export const upsertRecruiter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(200),
        title: z.string().max(200).optional().nullable(),
        company: z.string().max(200).optional().nullable(),
        company_id: z.string().uuid().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        linkedin_url: z.string().url().optional().nullable().or(z.literal("")),
        notes: z.string().max(4000).optional().nullable(),
        target_tier: z.enum(["A", "B", "C"]).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const payload = {
      user_id: userId,
      name: data.name,
      title: data.title || null,
      company: data.company || null,
      company_id: data.company_id || null,
      email: data.email || null,
      linkedin_url: data.linkedin_url || null,
      notes: data.notes || null,
      target_tier: data.target_tier || null,
    };
    if (data.id) {
      const { error } = await supabase
        .from("recruiters")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("recruiters")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const draftRecruiterOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        recruiter_id: z.string().uuid(),
        job_id: z.string().uuid().optional().nullable(),
        channel: z.enum(["linkedin", "email", "intro_request", "followup"]).default("linkedin"),
        variant: z.enum(["cold", "warm", "followup", "intro"]).default("cold"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const [{ data: recruiter }, { data: profile }, jobRes] = await Promise.all([
      supabase.from("recruiters").select("*").eq("id", data.recruiter_id).eq("user_id", userId).single(),
      supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
      data.job_id
        ? supabase.from("job_opportunities").select("*").eq("id", data.job_id).eq("user_id", userId).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);
    if (!recruiter) throw new Error("recruiter not found");

    const result = await callAgent("outreach", {
      task: "draft.recruiter_outreach",
      channel: data.channel,
      variant: data.variant,
      recruiter: {
        name: recruiter.name,
        title: recruiter.title,
        company: recruiter.company,
        notes: recruiter.notes,
      },
      candidate: profile
        ? {
            target_titles: profile.target_titles,
            seniority: profile.seniority,
            years_experience: profile.years_experience,
            top_skills: (profile.skills ?? []).slice(0, 12),
            tone: profile.communication_tone,
          }
        : null,
      job: jobRes?.data
        ? {
            title: jobRes.data.title,
            company: jobRes.data.company,
            location: jobRes.data.location,
          }
        : null,
      instruction:
        "Write a short, specific, human message. No flattery, no template-speak. Reference one concrete signal (their company, role, or the job). Output keys: subject (string|null, only for email), body (string, ≤120 words for linkedin/intro_request, ≤200 for email), confidence 0..1.",
    });

    const out = result.output as { subject?: string | null; body?: string };
    const body = String(out.body ?? "").trim();
    if (!body) throw new Error("AI produced empty body");
    const subject = data.channel === "email" ? (out.subject ?? null) : null;

    const { data: draft, error } = await supabase
      .from("outreach_drafts")
      .insert({
        user_id: userId,
        recruiter_id: data.recruiter_id,
        job_id: data.job_id ?? null,
        channel: data.channel,
        variant: data.variant,
        subject,
        body,
        reasoning: result.reasoning,
        confidence: result.confidence,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("pending_actions").insert({
      user_id: userId,
      kind: "outreach.draft",
      agent_kind: "outreach",
      title: `${data.channel} → ${recruiter.name}${recruiter.company ? " @ " + recruiter.company : ""}`,
      summary: body.slice(0, 240),
      confidence: result.confidence,
      subject_type: "outreach_draft",
      subject_id: draft.id,
      payload: { recruiter_id: data.recruiter_id, job_id: data.job_id ?? null, channel: data.channel } as never,
    });

    await supabase.from("analytics_events").insert({
      user_id: userId,
      kind: "outreach.drafted",
      subject_type: "recruiter",
      subject_id: data.recruiter_id,
      meta: { channel: data.channel, variant: data.variant } as never,
    });

    return { draft_id: draft.id, body, subject, confidence: result.confidence };
  });

export const decideOutreachDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject", "sent"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const status = data.action === "approve" ? "approved" : data.action === "sent" ? "sent" : "rejected";
    const { data: draft, error } = await supabase
      .from("outreach_drafts")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.action === "sent" && draft.recruiter_id) {
      await supabase
        .from("recruiters")
        .update({
          last_contacted_at: new Date().toISOString(),
          contact_status: "engaged",
          warmth_score: 0.4,
        })
        .eq("id", draft.recruiter_id);
      await supabase.from("analytics_events").insert({
        user_id: userId,
        kind: "outreach.sent",
        subject_type: "recruiter",
        subject_id: draft.recruiter_id,
      });
    }
    return { ok: true };
  });
