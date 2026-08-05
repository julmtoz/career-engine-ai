import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_opportunities",
  title: "List opportunities",
  description:
    "List the signed-in user's job opportunities, newest first, with match score, ATS score, interview probability and AI reasoning.",
  inputSchema: {
    limit: z.number().int().optional().describe("Max rows to return (default 20, max 100)."),
    min_match_score: z.number().optional().describe("Only return opportunities at or above this match score (0-100)."),
    company: z.string().optional().describe("Filter by company name (case-insensitive substring)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, min_match_score, company }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("job_opportunities")
      .select(
        "id, title, company, location, remote, seniority, salary_min, salary_max, match_score, ats_score, interview_probability, reasoning, url, apply_url, source, discovered_at",
      )
      .order("discovered_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));
    if (typeof min_match_score === "number") q = q.gte("match_score", min_match_score);
    if (company) q = q.ilike("company", `%${company}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { opportunities: data ?? [] },
    };
  },
});
