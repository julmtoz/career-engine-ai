import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pipeline",
  title: "List pipeline",
  description:
    "List the signed-in user's applications with their stage, readiness score and the linked opportunity — the current career pipeline.",
  inputSchema: {
    stage: z
      .string()
      .optional()
      .describe(
        "Optional stage filter: discovered, tailoring, ready, applied, phone_screen, outreach, interview, interview_2, offer, rejected, withdrawn.",
      ),
    limit: z.number().int().optional().describe("Max rows (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stage, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("applications")
      .select(
        "id, stage, readiness_score, submitted_at, notes, updated_at, job_opportunities(id, title, company, location, match_score, interview_probability)",
      )
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (stage) q = q.eq("stage", stage as never);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { applications: data ?? [] },
    };
  },
});
