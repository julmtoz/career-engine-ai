/**
 * Agent runner — server-only.
 *
 * Executes a single agent invocation:
 *   1. Load AgentDefinition from registry
 *   2. Hydrate memory (semantic recall via pgvector)
 *   3. Call Lovable AI Gateway via Vercel AI SDK
 *   4. Persist agent_run + ai_decision + (optional) emit downstream events
 *
 * This file is server-only (`*.server.ts`) and must never be imported
 * from client code. It uses the admin client because it writes across
 * users on behalf of the orchestrator.
 */

import { generateText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { getAgent, type AgentKind } from "@/lib/agents/registry";

export interface AgentExecuteArgs {
  userId: string;
  agentKind: AgentKind;
  workflowRunId?: string | null;
  taskId?: string | null;
  input: Record<string, unknown>;
  correlationId?: string;
}

export interface AgentExecuteResult {
  runId: string;
  output: unknown;
  reasoning: string;
  confidence: number;
  status: "succeeded" | "failed" | "awaiting_approval";
}

export async function executeAgent(args: AgentExecuteArgs): Promise<AgentExecuteResult> {
  const def = getAgent(args.agentKind);
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing — server-side only");

  const startedAt = new Date();
  const { data: run, error: insErr } = await supabaseAdmin
    .from("agent_runs")
    .insert({
      user_id: args.userId,
      workflow_run_id: args.workflowRunId ?? null,
      task_id: args.taskId ?? null,
      status: "running",
      input: args.input,
      started_at: startedAt.toISOString(),
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  try {
    // Pull autonomy preferences to gate confidence.
    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("autonomy, min_confidence_to_act")
      .eq("user_id", args.userId)
      .maybeSingle();

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway(def.model);

    const result = await generateText({
      model,
      system: def.systemPrompt,
      prompt: JSON.stringify({
        role: def.role,
        capabilities: def.capabilities,
        input: args.input,
        instruction:
          "Respond as JSON: { reasoning: string, confidence: 0..1, output: object, decision?: string }",
      }),
    });

    const parsed = safeJson(result.text);
    const confidence = clamp01(parsed.confidence ?? 0.5);
    const minConf = prefs?.min_confidence_to_act ?? def.minConfidence;
    const needsApproval =
      def.requiresApproval && (prefs?.autonomy === "manual" || prefs?.autonomy === "assisted");
    const finalStatus: AgentExecuteResult["status"] =
      needsApproval || confidence < minConf ? "awaiting_approval" : "succeeded";

    const finishedAt = new Date();
    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: finalStatus,
        output: parsed,
        reasoning: parsed.reasoning ?? null,
        confidence,
        tokens_in: result.usage?.inputTokens ?? 0,
        tokens_out: result.usage?.outputTokens ?? 0,
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
      })
      .eq("id", run.id);

    if (parsed.decision) {
      await supabaseAdmin.from("ai_decisions").insert({
        user_id: args.userId,
        agent_run_id: run.id,
        subject_type: (args.input.subject_type as string) ?? def.kind,
        subject_id: (args.input.subject_id as string) ?? null,
        decision: parsed.decision,
        rationale: parsed.reasoning ?? "",
        confidence,
        signals: parsed.signals ?? {},
      });
    }

    return {
      runId: run.id,
      output: parsed.output,
      reasoning: parsed.reasoning ?? "",
      confidence,
      status: finalStatus,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "failed",
        error: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw err;
  }
}

function safeJson(text: string): Record<string, any> {
  try {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(fence ? fence[1] : text);
  } catch {
    return { reasoning: text, confidence: 0.4, output: { raw: text } };
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}
