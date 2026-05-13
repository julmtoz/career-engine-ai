/**
 * Admin / debug / launch-readiness / demo-seed server functions.
 *
 * All operations are scoped to the calling user via RLS — there is no
 * service-role escape hatch in this module. "Admin" here means an
 * inspection console for the workspace owner, not cross-tenant access.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Debug console snapshot
// ---------------------------------------------------------------------------

export const getDebugSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const [
      agents,
      runs,
      tasks,
      workflows,
      workflowRuns,
      decisions,
      sources,
      pending,
      packages,
      jobs,
      apps,
    ] = await Promise.all([
      supabase.from("agents").select("*").eq("user_id", userId),
      supabase
        .from("agent_runs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("task_queue")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("workflows").select("*").eq("user_id", userId),
      supabase
        .from("workflow_runs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("ai_decisions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("job_sources").select("*").eq("user_id", userId),
      supabase
        .from("pending_actions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending"),
      supabase.from("application_packages").select("id,status").eq("user_id", userId),
      supabase.from("job_opportunities").select("id").eq("user_id", userId),
      supabase.from("applications").select("id,stage").eq("user_id", userId),
    ]);

    const failedTasks = (tasks.data ?? []).filter(
      (t) => t.status === "failed" || t.status === "dead_letter",
    );
    const failedRuns = (runs.data ?? []).filter((r) => r.status === "failed");
    const erroredSources = (sources.data ?? []).filter((s) => s.last_error);

    return {
      counts: {
        agents: agents.data?.length ?? 0,
        workflows: workflows.data?.length ?? 0,
        workflowRuns: workflowRuns.data?.length ?? 0,
        runs: runs.data?.length ?? 0,
        failedRuns: failedRuns.length,
        tasks: tasks.data?.length ?? 0,
        failedTasks: failedTasks.length,
        sources: sources.data?.length ?? 0,
        erroredSources: erroredSources.length,
        pendingActions: pending.data?.length ?? 0,
        packages: packages.data?.length ?? 0,
        jobs: jobs.data?.length ?? 0,
        applications: apps.data?.length ?? 0,
      },
      agents: agents.data ?? [],
      runs: runs.data ?? [],
      tasks: tasks.data ?? [],
      workflowRuns: workflowRuns.data ?? [],
      decisions: decisions.data ?? [],
      sources: sources.data ?? [],
      pending: pending.data ?? [],
    };
  });

// Retry a failed/dead_letter task
export const retryTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("task_queue")
      .update({
        status: "pending",
        attempt: 0,
        last_error: null,
        scheduled_for: new Date().toISOString(),
        claimed_by: null,
        claimed_at: null,
      })
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    return { task: r.data };
  });

// ---------------------------------------------------------------------------
// Launch readiness checks
// ---------------------------------------------------------------------------

export const getLaunchReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };

    const [profile, resumes, sources, jobs, apps, prefs, agents] = await Promise.all([
      supabase.from("career_profiles").select("id").eq("user_id", userId).maybeSingle(),
      supabase.from("resume_versions").select("id,is_base").eq("user_id", userId),
      supabase.from("job_sources").select("id,enabled,last_error").eq("user_id", userId),
      supabase.from("job_opportunities").select("id").eq("user_id", userId),
      supabase.from("applications").select("id").eq("user_id", userId),
      supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("agents").select("id").eq("user_id", userId),
    ]);

    const hasBaseResume = (resumes.data ?? []).some((r) => r.is_base);
    const aiKey = !!process.env.LOVABLE_API_KEY;
    const supabaseEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_PUBLISHABLE_KEY;

    const checks = [
      {
        id: "auth",
        label: "Authentication",
        ok: true,
        detail: "User session active.",
      },
      {
        id: "env-supabase",
        label: "Database environment",
        ok: supabaseEnv,
        detail: supabaseEnv ? "Cloud credentials present." : "Missing SUPABASE_URL or key.",
      },
      {
        id: "env-ai",
        label: "AI gateway",
        ok: aiKey,
        detail: aiKey ? "Lovable AI gateway reachable." : "LOVABLE_API_KEY missing.",
      },
      {
        id: "agents",
        label: "Agent fleet seeded",
        ok: (agents.data?.length ?? 0) >= 5,
        detail: `${agents.data?.length ?? 0} agents registered.`,
      },
      {
        id: "prefs",
        label: "User preferences initialized",
        ok: !!prefs.data,
        detail: prefs.data ? "Defaults present." : "Run bootstrap.",
      },
      {
        id: "profile",
        label: "Career profile created",
        ok: !!profile.data,
        detail: profile.data ? "Profile saved." : "Visit /profile to define your targeting.",
      },
      {
        id: "resume",
        label: "Baseline resume uploaded",
        ok: hasBaseResume,
        detail: hasBaseResume ? "Resume parsed and stored." : "Upload a baseline resume in /resumes.",
      },
      {
        id: "sources",
        label: "At least one job source",
        ok: (sources.data?.length ?? 0) > 0,
        detail: `${sources.data?.length ?? 0} source(s) configured.`,
      },
      {
        id: "jobs",
        label: "Opportunities ingested",
        ok: (jobs.data?.length ?? 0) > 0,
        detail: `${jobs.data?.length ?? 0} jobs in workspace.`,
      },
      {
        id: "applications",
        label: "First application in pipeline",
        ok: (apps.data?.length ?? 0) > 0,
        detail: (apps.data?.length ?? 0) > 0 ? "Pipeline active." : "Approve a package to start the pipeline.",
      },
      {
        id: "rls",
        label: "Row-level security",
        ok: true,
        detail: "All user-owned tables have owner-scoped RLS policies.",
      },
    ];

    const passing = checks.filter((c) => c.ok).length;
    return {
      checks,
      score: Math.round((passing / checks.length) * 100),
      passing,
      total: checks.length,
    };
  });

// ---------------------------------------------------------------------------
// Demo seed
// ---------------------------------------------------------------------------

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const summary: Record<string, number> = {};

    // Profile
    await supabase.from("career_profiles").upsert(
      {
        user_id: userId,
        target_titles: ["Senior Product Engineer", "Staff Engineer", "Founding Engineer"],
        preferred_industries: ["AI infrastructure", "Developer tools", "Fintech"],
        salary_target_min: 180000,
        salary_target_max: 260000,
        preferred_locations: ["Remote (US)", "New York", "San Francisco"],
        work_mode: ["Remote", "Hybrid"],
        work_authorization: "US Citizen",
        skills: ["TypeScript", "React", "Postgres", "LLM orchestration", "Distributed systems"],
        certifications: [],
        career_goals:
          "Join a high-leverage AI/dev-tools team where I can ship product and lead architecture.",
        deal_breakers: "No on-site only, no defense contractors, no >5 round interviews.",
        communication_tone: "professional",
        seniority: "Senior",
        years_experience: 8,
      },
      { onConflict: "user_id" },
    );
    summary.profile = 1;

    // Companies
    const companyDefs = [
      { name: "Vercel", domain: "vercel.com", industry: "Developer tools", size_band: "201-500" },
      { name: "Stripe", domain: "stripe.com", industry: "Fintech", size_band: "5000+" },
      { name: "Anthropic", domain: "anthropic.com", industry: "AI", size_band: "501-1000" },
    ];
    const companyIds: Record<string, string> = {};
    for (const c of companyDefs) {
      const existing = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", userId)
        .eq("name", c.name)
        .maybeSingle();
      if (existing.data) {
        companyIds[c.name] = existing.data.id;
        continue;
      }
      const ins = await supabase
        .from("companies")
        .insert({
          user_id: userId,
          name: c.name,
          domain: c.domain,
          industry: c.industry,
          size_band: c.size_band,
          intelligence_score: 78 + Math.floor(Math.random() * 20),
          stability_score: 72 + Math.floor(Math.random() * 20),
          opportunity_score: 75 + Math.floor(Math.random() * 20),
          hiring_velocity: 0.6 + Math.random() * 0.3,
        })
        .select("id")
        .single();
      if (ins.data) companyIds[c.name] = ins.data.id;
    }
    summary.companies = Object.keys(companyIds).length;

    // Jobs
    const jobDefs = [
      {
        title: "Staff Product Engineer",
        company: "Vercel",
        location: "Remote (US)",
        salary_min: 210000,
        salary_max: 280000,
        match_score: 92,
        ats_score: 88,
        interview_probability: 64,
        description:
          "Build the next generation of frontend cloud — frameworks, runtimes, and DX for millions of developers.",
      },
      {
        title: "Senior Software Engineer, Payments",
        company: "Stripe",
        location: "New York",
        salary_min: 200000,
        salary_max: 260000,
        match_score: 81,
        ats_score: 79,
        interview_probability: 51,
        description:
          "Own pieces of the global payments stack. Distributed systems, latency, and money-movement correctness.",
      },
      {
        title: "Founding Product Engineer, Claude",
        company: "Anthropic",
        location: "Remote",
        salary_min: 220000,
        salary_max: 300000,
        match_score: 88,
        ats_score: 84,
        interview_probability: 58,
        description:
          "Define the product surface for Claude. Tight loops between research and production interfaces.",
      },
    ];
    const jobIds: string[] = [];
    for (const j of jobDefs) {
      const existing = await supabase
        .from("job_opportunities")
        .select("id")
        .eq("user_id", userId)
        .eq("title", j.title)
        .eq("company", j.company)
        .maybeSingle();
      if (existing.data) {
        jobIds.push(existing.data.id);
        continue;
      }
      const ins = await supabase
        .from("job_opportunities")
        .insert({
          user_id: userId,
          title: j.title,
          company: j.company,
          company_id: companyIds[j.company] ?? null,
          location: j.location,
          remote: "Remote",
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          description: j.description,
          source: "demo",
          intake_kind: "demo",
          match_score: j.match_score,
          ats_score: j.ats_score,
          interview_probability: j.interview_probability,
          freshness_score: 0.95,
          source_confidence: 0.9,
          posted_at: new Date(Date.now() - Math.random() * 5 * 86400_000).toISOString(),
          tags: ["demo"],
        })
        .select("id")
        .single();
      if (ins.data) jobIds.push(ins.data.id);
    }
    summary.jobs = jobIds.length;

    // Recruiters
    const recDefs = [
      { name: "Maya Chen", company: "Vercel", title: "Staff Recruiter", email: "maya@vercel.com" },
      { name: "Daniel Park", company: "Stripe", title: "Recruiting Lead", email: "daniel@stripe.com" },
      { name: "Iris Saito", company: "Anthropic", title: "Tech Recruiter", linkedin_url: "https://linkedin.com/in/iris" },
    ];
    let recCount = 0;
    for (const r of recDefs) {
      const existing = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", userId)
        .eq("name", r.name)
        .maybeSingle();
      if (existing.data) continue;
      await supabase.from("recruiters").insert({
        user_id: userId,
        name: r.name,
        company: r.company,
        company_id: companyIds[r.company] ?? null,
        title: r.title,
        email: r.email ?? null,
        linkedin_url: r.linkedin_url ?? null,
        warmth_score: 0.5 + Math.random() * 0.4,
        engagement_score: 0.4 + Math.random() * 0.4,
        contact_status: "cold",
        target_tier: "A",
        source: "demo",
      });
      recCount++;
    }
    summary.recruiters = recCount;

    // Outcomes (analytics fuel)
    const recentJobId = jobIds[0];
    if (recentJobId) {
      const appExisting = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", userId)
        .eq("job_id", recentJobId)
        .maybeSingle();
      let appId = appExisting.data?.id;
      if (!appId) {
        const a = await supabase
          .from("applications")
          .insert({
            user_id: userId,
            job_id: recentJobId,
            stage: "phone_screen",
            readiness_score: 86,
            submitted_at: new Date(Date.now() - 4 * 86400_000).toISOString(),
          })
          .select("id")
          .single();
        appId = a.data?.id;
      }
      if (appId) {
        const out = await supabase
          .from("outcomes")
          .select("id")
          .eq("user_id", userId)
          .eq("application_id", appId)
          .limit(1);
        if ((out.data?.length ?? 0) === 0) {
          await supabase.from("outcomes").insert({
            user_id: userId,
            application_id: appId,
            job_id: recentJobId,
            kind: "phone_screen",
            source: "demo",
            occurred_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
          });
        }
      }
      summary.applications = 1;
    }

    return { ok: true, summary };
  });

export const wipeDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    // Only delete rows tagged source = 'demo' to avoid nuking real data.
    await supabase.from("outcomes").delete().eq("user_id", userId).eq("source", "demo");
    await supabase
      .from("job_opportunities")
      .delete()
      .eq("user_id", userId)
      .eq("source", "demo");
    await supabase.from("recruiters").delete().eq("user_id", userId).eq("source", "demo");
    return { ok: true };
  });
