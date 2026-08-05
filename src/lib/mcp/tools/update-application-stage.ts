import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const STAGES = [
  "discovered",
  "tailoring",
  "ready",
  "applied",
  "phone_screen",
  "outreach",
  "interview",
  "interview_2",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export default defineTool({
  name: "update_application_stage",
  title: "Update application stage",
  description:
    "Move one of the signed-in user's applications to a new pipeline stage, optionally appending a note.",
  inputSchema: {
    application_id: z.string().describe("Application id (uuid)."),
    stage: z.enum(STAGES).describe("New pipeline stage."),
    notes: z.string().optional().describe("Optional note to store on the application."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ application_id, stage, notes }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const patch: Record<string, unknown> = { stage, updated_at: new Date().toISOString() };
    if (notes) patch.notes = notes;
    if (stage === "applied") patch.submitted_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("applications")
      .update(patch as never)
      .eq("id", application_id)
      .select("id, stage, submitted_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return { content: [{ type: "text", text: "Application not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { application: data },
    };
  },
});
