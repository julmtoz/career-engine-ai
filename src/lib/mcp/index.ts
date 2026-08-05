import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listOpportunities from "./tools/list-opportunities";
import getOpportunity from "./tools/get-opportunity";
import addOpportunity from "./tools/add-opportunity";
import getCareerProfile from "./tools/get-career-profile";
import listPipeline from "./tools/list-pipeline";
import updateApplicationStage from "./tools/update-application-stage";
import listRecruiters from "./tools/list-recruiters";

// Issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "career-engine-ai",
  title: "Career Engine AI",
  version: "0.1.0",
  instructions:
    "Tools for Career Engine AI, an AI career-acquisition workspace. Use `get_career_profile` for the user's targets, `list_opportunities`/`get_opportunity` to review scored roles, `add_opportunity` to import a pasted posting, `list_pipeline`/`update_application_stage` to track applications, and `list_recruiters` for recruiter targeting. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getCareerProfile,
    listOpportunities,
    getOpportunity,
    addOpportunity,
    listPipeline,
    updateApplicationStage,
    listRecruiters,
  ],
});
