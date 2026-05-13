/**
 * The first production workflow.
 *
 *   discover → score → reason → tailor → APPROVAL → outreach.draft → crm.update
 *
 * No external action fires before the human approves. This workflow is
 * intentionally semi-autonomous: it does the entire intelligence loop
 * (discovery, scoring, reasoning, resume tailoring, outreach drafting) but
 * stops at the approval gate. The user inspects every artifact, then either
 * approves (resumes into outreach.draft + crm.update) or rejects (workflow
 * marks itself cancelled, no application is created).
 */

export const CAREER_ACQUISITION_WORKFLOW = {
  slug: "career.acquisition.v1",
  name: "Career Acquisition Loop",
  description:
    "Discover roles, score them, reason about fit, tailor a resume, draft outreach, await approval, then update the CRM.",
  steps: [
    { id: "discover", label: "Discover opportunities", agent: "scout", autonomous: true },
    { id: "score", label: "Score & rank", agent: "analyzer", autonomous: true },
    { id: "reason", label: "Generate reasoning", agent: "strategist", autonomous: true },
    { id: "tailor", label: "Draft tailored resume", agent: "writer", autonomous: true },
    { id: "approval", label: "Human approval", agent: "orchestrator", autonomous: false },
    { id: "outreach", label: "Draft outreach", agent: "outreach", autonomous: true },
    { id: "crm", label: "Update pipeline", agent: "orchestrator", autonomous: true },
  ] as const,
} as const;

export type StepId = typeof CAREER_ACQUISITION_WORKFLOW.steps[number]["id"];
