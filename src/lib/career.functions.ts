/**
 * Career Acquisition — server functions.
 *
 * Every callable is auth-protected. Workflow runs are synchronous on the
 * server: each step writes a `workflow_steps` row so the UI can stream the
 * exact state of the run (current step, completed steps, failed steps,
 * retry attempts, AI confidence, approval-required badge, full activity
 * log). All writes happen via the user-scoped supabase client so RLS is
 * enforced — the server never bypasses ownership.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { AGENT_REGISTRY, type AgentKind } from "@/lib/agents/registry";
import { CAREER_ACQUISITION_WORKFLOW } from "@/lib/workflows/career-acquisition";

type DB = SupabaseClient<Database>;

// ---------- Bootstrap ----------------------------------------------------

export const bootstrapWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    // 1. Seed user_preferences if missing.
    await supabase
      .from("user_preferences")
      .upsert({ user_id: userId }, { onConflict: "user_id" });

    // 2. Seed agent fleet (one row per AgentKind for this user).
    const existing = await supabase
      .from("agents")
      .select("kind")
      .eq("user_id", userId);
    const have = new Set((existing.data ?? []).map((r) => r.kind));
    const toInsert = Object.values(AGENT_REGISTRY)
      .filter((a) => !have.has(a.kind))
      .map((a) => ({
        user_id: userId,
        kind: a.kind,
        codename: a.codename,
        description: a.role,
        model: a.model,
        system_prompt: a.systemPrompt,
        config: { capabilities: a.capabilities, handoff: a.handoff } as never,
      }));
    if (toInsert.length) {
      await supabase.from("agents").insert(toInsert);
    }

    // 3. Seed workflow definition (per-user copy).
    const wf = await supabase
      .from("workflows")
      .select("id")
      .eq("user_id", userId)
      .eq("name", CAREER_ACQUISITION_WORKFLOW.name)
      .maybeSingle();
    let workflowId = wf.data?.id;
    if (!workflowId) {
      const ins = await supabase
        .from("workflows")
        .insert({
          user_id: userId,
          name: CAREER_ACQUISITION_WORKFLOW.name,
          description: CAREER_ACQUISITION_WORKFLOW.description,
          graph: { steps: CAREER_ACQUISITION_WORKFLOW.steps } as never,
          trigger: { kind: "manual" } as never,
        })
        .select("id")
        .single();
      workflowId = ins.data?.id;
    }

    return { ok: true, workflowId };
  });

// ---------- Helpers ------------------------------------------------------

async function recordStep(
  supabase: DB,
  workflowRunId: string,
  nodeId: string,
  fields: Partial<Database["public"]["Tables"]["workflow_steps"]["Insert"]>,
) {
  await supabase.from("workflow_steps").insert({
    workflow_run_id: workflowRunId,
    node_id: nodeId,
    status: (fields.status ?? "succeeded") as never,
    agent_kind: fields.agent_kind ?? null,
    input: (fields.input ?? null) as never,
    output: (fields.output ?? null) as never,
    error: fields.error ?? null,
    started_at: fields.started_at ?? new Date().toISOString(),
    finished_at: fields.finished_at ?? new Date().toISOString(),
  });
}

async function recordAgentRun(
  supabase: DB,
  userId: string,
  workflowRunId: string,
  kind: AgentKind,
  args: { input: unknown; output: unknown; reasoning: string; confidence: number; status: "succeeded" | "awaiting_approval" | "failed"; durationMs: number; tokensIn?: number; tokensOut?: number; error?: string },
) {
  const row = await supabase
    .from("agent_runs")
    .insert({
      user_id: userId,
      workflow_run_id: workflowRunId,
      status: args.status as never,
      input: args.input as never,
      output: args.output as never,
      reasoning: args.reasoning,
      confidence: args.confidence,
      tokens_in: args.tokensIn ?? 0,
      tokens_out: args.tokensOut ?? 0,
      duration_ms: args.durationMs,
      error: args.error ?? null,
      started_at: new Date(Date.now() - args.durationMs).toISOString(),
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  await supabase.from("ai_decisions").insert({
    user_id: userId,
    agent_run_id: row.data?.id ?? null,
    subject_type: kind,
    decision: args.status,
    rationale: args.reasoning,
    confidence: args.confidence,
    signals: (args.output ?? {}) as never,
  });

  return row.data?.id;
}

// AI call — Lovable AI Gateway via Vercel AI SDK. Returns parsed JSON or fallback.
async function callAgent(
  kind: AgentKind,
  promptInput: Record<string, unknown>,
): Promise<{ reasoning: string; confidence: number; output: Record<string, unknown>; tokensIn: number; tokensOut: number; durationMs: number }> {
  const def = AGENT_REGISTRY[kind];
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const gateway = createLovableAiGatewayProvider(apiKey);
  const t0 = Date.now();
  const r = await generateText({
    model: gateway(def.model),
    system: def.systemPrompt,
    prompt:
      `Respond ONLY with JSON: {"reasoning": string, "confidence": number 0..1, "output": object}. No prose, no fences.\n\nInput:\n` +
      JSON.stringify(promptInput),
  });
  const durationMs = Date.now() - t0;
  let parsed: any;
  try {
    const fence = r.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(fence ? fence[1] : r.text);
  } catch {
    parsed = { reasoning: r.text.slice(0, 600), confidence: 0.55, output: {} };
  }
  return {
    reasoning: String(parsed.reasoning ?? "").slice(0, 1200),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.6)),
    output: parsed.output ?? {},
    tokensIn: r.usage?.inputTokens ?? 0,
    tokensOut: r.usage?.outputTokens ?? 0,
    durationMs,
  };
}

// Mock discovery sources — deterministic, safe, no external scraping yet.
const DEMO_SOURCES = [
  { title: "Staff AI Platform Engineer", company: "Conduit Labs", location: "Remote · US", remote: "Remote", salary_min: 210_000, salary_max: 260_000, tags: ["Python", "LLMs", "Distributed Systems", "Postgres"], description: "Build the orchestration layer behind Conduit's autonomous agents." },
  { title: "Senior Product Engineer", company: "Northwind", location: "Hybrid · NYC", remote: "Hybrid", salary_min: 180_000, salary_max: 220_000, tags: ["TypeScript", "React", "Postgres", "Stripe"], description: "Own end-to-end product surface for Northwind's billing platform." },
  { title: "Lead Infrastructure Engineer", company: "Helio Systems", location: "Remote · Worldwide", remote: "Remote", salary_min: 200_000, salary_max: 245_000, tags: ["Kubernetes", "Terraform", "AWS", "Observability"], description: "Scale the Helio multi-region edge to 99.99% reliability." },
];

function deterministicScores(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const r = (n: number) => 60 + ((h >> n) & 0x3f) % 40; // 60..99
  return { match: r(0), ats: r(3), interview: r(7) - 25 }; // 35..74
}

// ---------- Run workflow -------------------------------------------------

export const startCareerWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    // Resolve workflow id (auto-bootstrap if needed).
    let wf = await supabase
      .from("workflows")
      .select("id")
      .eq("user_id", userId)
      .eq("name", CAREER_ACQUISITION_WORKFLOW.name)
      .maybeSingle();
    if (!wf.data) {
      const ins = await supabase
        .from("workflows")
        .insert({
          user_id: userId,
          name: CAREER_ACQUISITION_WORKFLOW.name,
          description: CAREER_ACQUISITION_WORKFLOW.description,
          graph: { steps: CAREER_ACQUISITION_WORKFLOW.steps } as never,
          trigger: { kind: "manual" } as never,
        })
        .select("id")
        .single();
      wf = { data: ins.data, error: null } as never;
    }
    const workflowId = wf.data!.id;

    // Pick a demo source rotating by total runs so each click feels different.
    const { count } = await supabase
      .from("workflow_runs")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId);
    const source = DEMO_SOURCES[(count ?? 0) % DEMO_SOURCES.length];
    const scores = deterministicScores(source.title + source.company + (count ?? 0));

    // Create workflow_run.
    const runIns = await supabase
      .from("workflow_runs")
      .insert({
        user_id: userId,
        workflow_id: workflowId,
        status: "running",
        current_node: "discover",
        started_at: new Date().toISOString(),
        context: { source } as never,
      })
      .select("id")
      .single();
    const workflowRunId = runIns.data!.id;

    try {
      // 1. DISCOVER (deterministic, no AI required for safety) -----------
      const job = await supabase
        .from("job_opportunities")
        .insert({
          user_id: userId,
          source: "demo",
          title: source.title,
          company: source.company,
          location: source.location,
          remote: source.remote,
          salary_min: source.salary_min,
          salary_max: source.salary_max,
          description: source.description,
          tags: source.tags as never,
          discovered_at: new Date().toISOString(),
        })
        .select("id, title, company")
        .single();

      await recordStep(supabase, workflowRunId, "discover", {
        agent_kind: "scout",
        status: "succeeded",
        output: { job_id: job.data!.id, ...source } as never,
      });

      // 2. SCORE (deterministic) -----------------------------------------
      await supabase
        .from("job_opportunities")
        .update({
          match_score: scores.match,
          ats_score: scores.ats,
          interview_probability: scores.interview,
        })
        .eq("id", job.data!.id);

      await recordStep(supabase, workflowRunId, "score", {
        agent_kind: "analyzer",
        status: "succeeded",
        output: scores as never,
      });

      // 3. REASON (real AI) ----------------------------------------------
      await supabase.from("workflow_runs").update({ current_node: "reason" }).eq("id", workflowRunId);
      const reasoning = await callAgent("strategist", { job: source, scores });
      await supabase
        .from("job_opportunities")
        .update({ reasoning: reasoning.reasoning })
        .eq("id", job.data!.id);
      await recordAgentRun(supabase, userId, workflowRunId, "strategist", {
        input: { job: source, scores },
        output: reasoning.output,
        reasoning: reasoning.reasoning,
        confidence: reasoning.confidence,
        status: "succeeded",
        durationMs: reasoning.durationMs,
        tokensIn: reasoning.tokensIn,
        tokensOut: reasoning.tokensOut,
      });
      await recordStep(supabase, workflowRunId, "reason", {
        agent_kind: "strategist",
        status: "succeeded",
        output: { reasoning: reasoning.reasoning, confidence: reasoning.confidence } as never,
      });

      // 4. TAILOR (real AI — produces a draft resume artifact) ----------
      await supabase.from("workflow_runs").update({ current_node: "tailor" }).eq("id", workflowRunId);
      const tailor = await callAgent("writer", {
        job: source,
        instruction:
          "Produce a tailored resume strategy: which sections to emphasize, top 8 keywords to inject (no stuffing), and a 4-bullet 'impact' section rewritten for this role.",
      });
      const resumeIns = await supabase
        .from("resume_versions")
        .insert({
          user_id: userId,
          job_id: job.data!.id,
          label: `Tailored — ${source.company}`,
          content: tailor.output as never,
          rendered_md: typeof (tailor.output as any).rendered_md === "string"
            ? (tailor.output as any).rendered_md
            : JSON.stringify(tailor.output, null, 2),
          ats_score: scores.ats,
          is_base: false,
        })
        .select("id")
        .single();
      await recordAgentRun(supabase, userId, workflowRunId, "writer", {
        input: { job: source },
        output: tailor.output,
        reasoning: tailor.reasoning,
        confidence: tailor.confidence,
        status: "succeeded",
        durationMs: tailor.durationMs,
        tokensIn: tailor.tokensIn,
        tokensOut: tailor.tokensOut,
      });
      await recordStep(supabase, workflowRunId, "tailor", {
        agent_kind: "writer",
        status: "succeeded",
        output: { resume_version_id: resumeIns.data?.id, confidence: tailor.confidence } as never,
      });

      // 5. APPROVAL — pause the workflow ---------------------------------
      await recordStep(supabase, workflowRunId, "approval", {
        agent_kind: "orchestrator",
        status: "awaiting_approval",
        output: {
          job_id: job.data!.id,
          resume_version_id: resumeIns.data?.id,
        } as never,
        finished_at: null as never,
      });
      await supabase
        .from("workflow_runs")
        .update({ status: "paused", current_node: "approval" })
        .eq("id", workflowRunId);
      await supabase.from("notifications").insert({
        user_id: userId,
        kind: "approval_required",
        title: `Approval needed — ${job.data!.title} · ${job.data!.company}`,
        body: "Aether OS has prepared a tailored resume and outreach plan. Review and approve before any external action fires.",
        severity: "warn",
        meta: { workflow_run_id: workflowRunId, job_id: job.data!.id } as never,
      });

      return { ok: true, workflowRunId, jobId: job.data!.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("workflow_runs")
        .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
        .eq("id", workflowRunId);
      throw err;
    }
  });

// ---------- Approve / Reject --------------------------------------------

export const approveWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workflowRunId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const run = await supabase
      .from("workflow_runs")
      .select("id, context, status")
      .eq("id", data.workflowRunId)
      .single();
    if (!run.data) throw new Error("workflow run not found");
    if (run.data.status !== "paused") throw new Error("workflow is not awaiting approval");

    // Find the approval step + the previous tailor step to recover artifacts.
    const stepsRes = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_run_id", data.workflowRunId)
      .order("created_at", { ascending: true });
    const approvalStep = stepsRes.data?.find((s) => s.node_id === "approval");
    const tailorStep = stepsRes.data?.find((s) => s.node_id === "tailor");
    const approvalOut = (approvalStep?.output ?? {}) as { job_id?: string; resume_version_id?: string };
    const jobId = approvalOut.job_id;
    const resumeVersionId = approvalOut.resume_version_id ?? (tailorStep?.output as any)?.resume_version_id;

    // Mark approval step succeeded.
    if (approvalStep) {
      await supabase
        .from("workflow_steps")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("id", approvalStep.id);
    }
    await supabase.from("workflow_runs").update({ status: "running", current_node: "outreach" }).eq("id", data.workflowRunId);

    // 6. OUTREACH DRAFT (real AI) ----------------------------------------
    const ctx = run.data.context as { source?: any };
    const draft = await callAgent("outreach", {
      job: ctx.source,
      instruction:
        "Draft a 110-word, plain-text outreach email to the hiring manager. Reference one concrete signal from the job. Do not send.",
    });
    const threadIns = await supabase
      .from("outreach_threads")
      .insert({
        user_id: userId,
        channel: "email",
        subject: `Re: ${ctx.source?.title ?? "your role"} at ${ctx.source?.company ?? ""}`.trim(),
        status: "draft",
      })
      .select("id")
      .single();
    await supabase.from("outreach_messages").insert({
      user_id: userId,
      thread_id: threadIns.data!.id,
      direction: "outbound",
      body: typeof (draft.output as any).body === "string"
        ? (draft.output as any).body
        : JSON.stringify(draft.output),
    });
    await recordAgentRun(supabase, userId, data.workflowRunId, "outreach", {
      input: { job: ctx.source },
      output: draft.output,
      reasoning: draft.reasoning,
      confidence: draft.confidence,
      status: "succeeded",
      durationMs: draft.durationMs,
      tokensIn: draft.tokensIn,
      tokensOut: draft.tokensOut,
    });
    await recordStep(supabase, data.workflowRunId, "outreach", {
      agent_kind: "outreach",
      status: "succeeded",
      output: { thread_id: threadIns.data!.id, confidence: draft.confidence } as never,
    });

    // 7. CRM UPDATE — promote into the pipeline as a tracked application.
    if (jobId) {
      await supabase.from("applications").insert({
        user_id: userId,
        job_id: jobId,
        resume_version_id: resumeVersionId ?? null,
        stage: "ready",
      });
    }
    await recordStep(supabase, data.workflowRunId, "crm", {
      agent_kind: "orchestrator",
      status: "succeeded",
      output: { promoted_to_stage: "ready" } as never,
    });

    await supabase
      .from("workflow_runs")
      .update({ status: "completed", current_node: "crm", finished_at: new Date().toISOString() })
      .eq("id", data.workflowRunId);

    return { ok: true };
  });

export const rejectWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ workflowRunId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: DB };
    const stepsRes = await supabase
      .from("workflow_steps")
      .select("id, node_id")
      .eq("workflow_run_id", data.workflowRunId);
    const approval = stepsRes.data?.find((s) => s.node_id === "approval");
    if (approval) {
      await supabase
        .from("workflow_steps")
        .update({ status: "cancelled", error: data.reason ?? "rejected by user", finished_at: new Date().toISOString() })
        .eq("id", approval.id);
    }
    await supabase
      .from("workflow_runs")
      .update({ status: "cancelled", error: data.reason ?? "rejected by user", finished_at: new Date().toISOString() })
      .eq("id", data.workflowRunId);
    return { ok: true };
  });

// ---------- Safety controls ---------------------------------------------

export const setAutonomy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        autonomy: z.enum(["manual", "assisted", "auto", "full_auto"]).optional(),
        minConfidence: z.number().min(0).max(1).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const patch: Record<string, unknown> = {};
    if (data.autonomy) patch.autonomy = data.autonomy;
    if (typeof data.minConfidence === "number") patch.min_confidence_to_act = data.minConfidence;
    await supabase
      .from("user_preferences")
      .update(patch)
      .eq("user_id", userId);
    return { ok: true };
  });

export const pauseAllAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    await supabase.from("user_preferences").update({ autonomy: "manual" }).eq("user_id", userId);
    await supabase
      .from("task_queue")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "pending");
    await supabase
      .from("workflow_runs")
      .update({ status: "paused" })
      .eq("user_id", userId)
      .eq("status", "running");
    return { ok: true };
  });

// ---------- Read state for the Automation Control Center ---------------

export const getAutomationState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const [prefs, agents, runsRes, stepsRes, queueRes, decisionsRes, notificationsRes] =
      await Promise.all([
        supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("agents").select("*").eq("user_id", userId).order("created_at"),
        supabase
          .from("workflow_runs")
          .select("id, status, current_node, started_at, finished_at, error, context, workflows(name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("workflow_steps")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(300),
        supabase
          .from("task_queue")
          .select("id, kind, status, attempt, max_attempts, last_error, scheduled_for, priority, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("ai_decisions")
          .select("id, decision, rationale, confidence, subject_type, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("notifications")
          .select("id, kind, title, body, severity, created_at, read_at, meta")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    return {
      prefs: prefs.data,
      agents: agents.data ?? [],
      runs: runsRes.data ?? [],
      steps: stepsRes.data ?? [],
      queue: queueRes.data ?? [],
      decisions: decisionsRes.data ?? [],
      notifications: notificationsRes.data ?? [],
    };
  });
