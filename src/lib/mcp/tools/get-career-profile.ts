import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_career_profile",
  title: "Get career profile",
  description:
    "Read the signed-in user's career profile: target titles, industries, locations, work mode, salary target, skills, seniority and goals.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("career_profiles")
      .select(
        "target_titles, preferred_industries, preferred_locations, work_mode, salary_target_min, salary_target_max, seniority, years_experience, skills, certifications, career_goals, deal_breakers, work_authorization, communication_tone, updated_at",
      )
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "No career profile yet. Create one in the app under Profile." }],
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { profile: data },
    };
  },
});
