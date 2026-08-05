import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recruiters",
  title: "List recruiters",
  description:
    "List recruiters tracked in the signed-in user's CRM with company, contact status and engagement/warmth signals.",
  inputSchema: {
    company: z.string().optional().describe("Filter by company name (case-insensitive substring)."),
    limit: z.number().int().optional().describe("Max rows (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ company, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("recruiters")
      .select("*")
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (company) q = q.ilike("company", `%${company}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { recruiters: data ?? [] },
    };
  },
});
