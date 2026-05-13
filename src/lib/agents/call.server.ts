/**
 * Shared AI agent call helper. Server-only.
 * Wraps Lovable AI Gateway (via Vercel AI SDK) with a strict JSON contract:
 *   { reasoning: string; confidence: number; output: object }
 */
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { AGENT_REGISTRY, type AgentKind } from "@/lib/agents/registry";

export interface AgentCallResult {
  reasoning: string;
  confidence: number;
  output: Record<string, unknown>;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
}

export async function callAgent(
  kind: AgentKind,
  promptInput: Record<string, unknown>,
  overrides?: { instruction?: string; model?: string },
): Promise<AgentCallResult> {
  const def = AGENT_REGISTRY[kind];
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const gateway = createLovableAiGatewayProvider(apiKey);
  const t0 = Date.now();
  const r = await generateText({
    model: gateway(overrides?.model ?? def.model),
    system: def.systemPrompt + (overrides?.instruction ? `\n\n${overrides.instruction}` : ""),
    prompt:
      `Respond ONLY with JSON: {"reasoning": string, "confidence": number 0..1, "output": object}. No prose, no markdown fences.\n\nInput:\n` +
      JSON.stringify(promptInput).slice(0, 12000),
  });
  const durationMs = Date.now() - t0;
  let parsed: any;
  try {
    const fence = r.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(fence ? fence[1] : r.text);
  } catch {
    parsed = { reasoning: r.text.slice(0, 600), confidence: 0.5, output: {} };
  }
  return {
    reasoning: String(parsed.reasoning ?? "").slice(0, 1500),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.6)),
    output: parsed.output ?? {},
    tokensIn: r.usage?.inputTokens ?? 0,
    tokensOut: r.usage?.outputTokens ?? 0,
    durationMs,
  };
}
