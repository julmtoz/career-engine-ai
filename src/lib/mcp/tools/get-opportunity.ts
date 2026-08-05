import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_opportunity",
  title: "Get opportunity",
  description:
    "Fetch one job opportunity in full (description, requirements, responsibilities, scores, reasoning) plus any linked application stage.",
  inputSchema: { id: z.string().describe("Opportunity id (uuid)."), },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("job_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Opportunity not found" }], isError: true };
    const { embedding: _embedding, raw_input: _raw, ...opportunity } = data as Record<string, unknown>;
    const { data: applications } = await supabase
      .from("applications")
      .select("id, stage, readiness_score, submitted_at, notes")
      .eq("job_id", id);
    return {
      content: [{ type: "text", text: JSON.stringify({ opportunity, applications: applications ?? [] }) }],
      structuredContent: { opportunity, applications: applications ?? [] },
    };
  },
});
