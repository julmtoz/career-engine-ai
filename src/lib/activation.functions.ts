/**
 * Activation & milestone tracking.
 *
 * Derives activation state from real workspace data — no separate
 * milestones table needed. Each milestone is a query against existing
 * tables, so the source of truth is always live.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export type MilestoneId =
  | "profile_created"
  | "resume_uploaded"
  | "source_connected"
  | "job_imported"
  | "package_generated"
  | "outreach_approved"
  | "interview_generated"
  | "offer_tracked";

export interface Milestone {
  id: MilestoneId;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
}

export const getActivation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const [profile, resume, source, job, pkg, outreach, interview, offer] = await Promise.all([
      supabase.from("career_profiles").select("id,target_titles").eq("user_id", userId).maybeSingle(),
      supabase.from("resume_versions").select("id").eq("user_id", userId).limit(1),
      supabase.from("job_sources").select("id").eq("user_id", userId).limit(1),
      supabase.from("job_opportunities").select("id").eq("user_id", userId).limit(1),
      supabase.from("application_packages").select("id").eq("user_id", userId).limit(1),
      supabase
        .from("outreach_drafts")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["approved", "sent"])
        .limit(1),
      supabase.from("interviews").select("id").eq("user_id", userId).limit(1),
      supabase.from("outcomes").select("id").eq("user_id", userId).eq("kind", "offer").limit(1),
    ]);

    const has = (r: { data: unknown }) => Array.isArray(r.data) ? r.data.length > 0 : !!r.data;
    const profileDone = !!profile.data && (profile.data.target_titles?.length ?? 0) > 0;

    const milestones: Milestone[] = [
      { id: "profile_created", label: "Career profile", description: "Tell agents what you want.", done: profileDone, href: "/profile", cta: "Build profile" },
      { id: "resume_uploaded", label: "Resume uploaded", description: "Baseline for every tailored version.", done: has(resume), href: "/resumes", cta: "Upload resume" },
      { id: "source_connected", label: "Source connected", description: "Pipe in real opportunities.", done: has(source), href: "/sources", cta: "Add source" },
      { id: "job_imported", label: "First opportunity", description: "Import or sync at least one role.", done: has(job), href: "/feed", cta: "View feed" },
      { id: "package_generated", label: "First package", description: "Tailored resume + cover + pitch.", done: has(pkg), href: "/packages", cta: "Generate package" },
      { id: "outreach_approved", label: "First approval", description: "Approve an outreach draft.", done: has(outreach), href: "/approvals", cta: "Open approvals" },
      { id: "interview_generated", label: "Interview booked", description: "The metric that matters.", done: has(interview), href: "/pipeline", cta: "View pipeline" },
      { id: "offer_tracked", label: "Offer tracked", description: "Close the loop.", done: has(offer), href: "/conversion", cta: "Log outcome" },
    ];

    const completed = milestones.filter((m) => m.done).length;
    const next = milestones.find((m) => !m.done) ?? null;
    const score = Math.round((completed / milestones.length) * 100);

    return { milestones, completed, total: milestones.length, score, next };
  });
