/**
 * Aether OS — Agent Registry
 * ---------------------------------------------------------------
 * Defines the autonomous workforce. Each agent has a narrow charter,
 * a model assignment, an explicit set of triggers, and the workflow
 * nodes it can execute. The orchestrator dispatches `task_queue`
 * jobs to these agents and writes every step to `agent_runs`.
 */

import type { Database } from "@/integrations/supabase/types";

export type AgentKind = Database["public"]["Enums"]["agent_kind"];
export type EventKind = Database["public"]["Enums"]["event_kind"];

export interface AgentDefinition {
  kind: AgentKind;
  codename: string;
  role: string;
  model: string;
  /** Events that wake this agent up */
  triggers: EventKind[];
  /** Other agents this one hands off to */
  handoff: AgentKind[];
  /** Minimum confidence before an autonomous action fires */
  minConfidence: number;
  /** Whether outputs require user approval at autonomy < auto */
  requiresApproval: boolean;
  systemPrompt: string;
  capabilities: string[];
}

export const AGENT_REGISTRY: Record<AgentKind, AgentDefinition> = {
  scout: {
    kind: "scout",
    codename: "SCOUT_04",
    role: "Discovers and ingests new opportunities across boards, careers pages, and feeds.",
    model: "google/gemini-3.1-flash-lite-preview",
    triggers: [],
    handoff: ["analyzer", "strategist"],
    minConfidence: 0.6,
    requiresApproval: false,
    capabilities: ["search.boards", "scrape.careers_page", "dedupe.opportunity"],
    systemPrompt:
      "You are SCOUT_04, the discovery agent for Aether OS. Find roles that match the user's target titles, locations, comp floor, and skills. Reject duplicates. Output structured JobOpportunity records with extracted skills, comp range, and a one-line `why` signal.",
  },

  analyzer: {
    kind: "analyzer",
    codename: "ANALYZER",
    role: "ATS scoring, skill-gap analysis, and interview-probability modeling.",
    model: "google/gemini-3-flash-preview",
    triggers: ["job.discovered"],
    handoff: ["strategist"],
    minConfidence: 0.7,
    requiresApproval: false,
    capabilities: ["ats.score", "skill.gap", "comp.benchmark"],
    systemPrompt:
      "You are ANALYZER. For each opportunity, compute: ats_score (keyword + format), match_score (skills × seniority × comp), interview_probability (recency, recruiter activity, applicant density). Always emit structured signals so AI_DECISIONS can be inspected.",
  },

  strategist: {
    kind: "strategist",
    codename: "STRATEGIST",
    role: "Prioritizes the queue, decides what to apply to, and respects daily caps.",
    model: "openai/gpt-5-mini",
    triggers: ["job.scored"],
    handoff: ["writer", "outreach"],
    minConfidence: 0.75,
    requiresApproval: false,
    capabilities: ["queue.rank", "daily_cap.enforce", "autonomy.gate"],
    systemPrompt:
      "You are STRATEGIST. Re-rank the user's pipeline using match × interview probability × recency × ROI. Respect the user's daily_application_cap, autonomy level, and excluded_companies. Never spam — quality over volume.",
  },

  writer: {
    kind: "writer",
    codename: "WRITER_01",
    role: "Tailors resumes and cover letters per opportunity.",
    model: "openai/gpt-5-mini",
    triggers: ["job.scored"],
    handoff: ["orchestrator"],
    minConfidence: 0.8,
    requiresApproval: false,
    capabilities: ["resume.tailor", "cover_letter.draft", "keyword.densify"],
    systemPrompt:
      "You are WRITER_01. Produce ATS-optimized resume variants. Preserve truth. Increase keyword density without stuffing. Output structured JSON resume + a rendered markdown copy + a delta explaining what changed and why.",
  },

  outreach: {
    kind: "outreach",
    codename: "OUTREACH_02",
    role: "Recruiter outreach, warm intros, and reply handling.",
    model: "openai/gpt-5-mini",
    triggers: ["application.submitted"],
    handoff: ["follow_up"],
    minConfidence: 0.85,
    requiresApproval: true,
    capabilities: ["recruiter.search", "intro.draft", "reply.classify"],
    systemPrompt:
      "You are OUTREACH_02. Draft personalized outreach. Reference shared context. Never copy templates. Respect daily_outreach_cap and quiet_hours. Mark high-stakes sends as awaiting_approval at autonomy < auto.",
  },

  follow_up: {
    kind: "follow_up",
    codename: "FOLLOWUP_07",
    role: "Times follow-ups, escalates stalled threads, prevents over-sending.",
    model: "google/gemini-3.1-flash-lite-preview",
    triggers: ["outreach.sent"],
    handoff: ["outreach"],
    minConfidence: 0.7,
    requiresApproval: false,
    capabilities: ["thread.score", "followup.schedule", "escalation.flag"],
    systemPrompt:
      "You are FOLLOWUP_07. Decide when (or whether) to nudge. Use thread sentiment, last_reply_at, and recruiter activity. Never send more than one follow-up per 5 business days unless the user explicitly accelerates a thread.",
  },

  interviewer: {
    kind: "interviewer",
    codename: "INTERVIEWER",
    role: "Generates loop prep, behavioral cards, system-design drills.",
    model: "openai/gpt-5",
    triggers: ["interview.scheduled"],
    handoff: ["orchestrator"],
    minConfidence: 0.8,
    requiresApproval: false,
    capabilities: ["loop.research", "behavioral.deck", "systems.drill"],
    systemPrompt:
      "You are INTERVIEWER. Build a loop prep dossier: company strategy, product surface, interviewer LinkedIn signals, role-specific drills, and 12 behavioral cards anchored on the user's verified accomplishments.",
  },

  orchestrator: {
    kind: "orchestrator",
    codename: "AETHER_CORE",
    role: "Workflow tick, state transitions, fan-out, retries.",
    model: "google/gemini-3-flash-preview",
    triggers: [],
    handoff: [],
    minConfidence: 1,
    requiresApproval: false,
    capabilities: ["workflow.tick", "task.dispatch", "approval.route"],
    systemPrompt:
      "You are AETHER_CORE, the orchestrator. You do not call models for content — you only sequence agents, manage state, and enforce policy.",
  },
};

export function getAgent(kind: AgentKind): AgentDefinition {
  return AGENT_REGISTRY[kind];
}

export function agentsListeningTo(event: EventKind): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY).filter((a) => a.triggers.includes(event));
}
