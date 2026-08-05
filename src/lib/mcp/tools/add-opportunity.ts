import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_opportunity",
  title: "Add opportunity",
  description:
    "Add a job opportunity to the signed-in user's workspace from a pasted job posting. Scoring happens inside the app afterwards.",
  inputSchema: {
    title: z.string().describe("Job title."),
    company: z.string().describe("Company name."),
    description: z.string().optional().describe("Full job description text."),
    location: z.string().optional(),
    remote: z.string().optional().describe("e.g. remote, hybrid, onsite."),
    url: z.string().optional().describe("Link to the posting."),
    salary_min: z.number().optional(),
    salary_max: z.number().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const userId = ctx.getUserId();
    if (!userId) return { content: [{ type: "text", text: "Missing user identity" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("job_opportunities")
      .insert({
        user_id: userId,
        title: input.title,
        company: input.company,
        description: input.description ?? null,
        location: input.location ?? null,
        remote: input.remote ?? null,
        url: input.url ?? null,
        apply_url: input.url ?? null,
        salary_min: input.salary_min ?? null,
        salary_max: input.salary_max ?? null,
        source: "mcp",
        intake_kind: "mcp",
      })
      .select("id, title, company")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { opportunity: data },
    };
  },
});
