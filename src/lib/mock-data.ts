// Mock data for the AI Career Acquisition OS — Phase 1 demo state.

export type AgentName =
  | "SCOUT_04"
  | "WRITER_01"
  | "OUTREACH_02"
  | "ANALYZER"
  | "STRATEGIST"
  | "INTERVIEWER";

export interface AgentEvent {
  id: string;
  agent: AgentName;
  timestamp: string;
  message: string;
  kind: "discovery" | "tailor" | "outreach" | "analysis" | "success" | "wait";
}

export const agentEvents: AgentEvent[] = [
  { id: "e1", agent: "SCOUT_04", timestamp: "14:21:02", message: "Detected Lead Engineer role at Vercel. Match: 98%.", kind: "discovery" },
  { id: "e2", agent: "WRITER_01", timestamp: "14:19:44", message: "Tailored CV v14 for 'Senior Product Designer' — keyword density +34%.", kind: "tailor" },
  { id: "e3", agent: "OUTREACH_02", timestamp: "14:18:12", message: "Scheduled follow-up to hiring manager at Linear (T+48h).", kind: "outreach" },
  { id: "e4", agent: "ANALYZER", timestamp: "14:15:00", message: "Updated salary benchmarks for SF / Remote infra roles.", kind: "analysis" },
  { id: "e5", agent: "STRATEGIST", timestamp: "14:09:37", message: "Re-ranked feed: pushed Stripe role to top of priority queue.", kind: "analysis" },
  { id: "e6", agent: "OUTREACH_02", timestamp: "13:58:21", message: "Sent personalized intro to Sarah Jenks (Stellaris).", kind: "outreach" },
  { id: "e7", agent: "WRITER_01", timestamp: "13:44:02", message: "Drafted cover letter — leadership tone — for Anthropic.", kind: "tailor" },
  { id: "e8", agent: "INTERVIEWER", timestamp: "13:30:15", message: "Generated 12 behavioral prep cards for tomorrow's Linear loop.", kind: "analysis" },
  { id: "e9", agent: "OUTREACH_02", timestamp: "13:12:00", message: "SUCCESS: Recruiter at Scale AI replied — interview proposed.", kind: "success" },
  { id: "e10", agent: "SCOUT_04", timestamp: "12:48:33", message: "Awaiting recruiter response for Google Cloud Infra role…", kind: "wait" },
];

export type PipelineStage =
  | "discovered"
  | "tailoring"
  | "ready"
  | "applied"
  | "outreach"
  | "interview"
  | "offer";

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  postedAgo: string;
  matchScore: number;
  atsScore: number;
  interviewProbability: number;
  stage: PipelineStage;
  remote: "Remote" | "Hybrid" | "Onsite";
  tags: string[];
  reasoning: string;
  recruiter?: string;
  status?: string;
}

export const jobs: JobOpportunity[] = [
  {
    id: "j1",
    title: "Principal Systems Architect",
    company: "Stellaris Cloud",
    location: "Remote · US",
    salary: "$190k – $240k",
    postedAgo: "2h ago",
    matchScore: 98,
    atsScore: 96,
    interviewProbability: 71,
    stage: "ready",
    remote: "Remote",
    tags: ["AWS", "Kubernetes", "Terraform", "Multi-region"],
    reasoning:
      "Aligns with your AWS architecture expertise and 8-year tenure. Competitor density is low. Recruiter Sarah Jenks is active this week. Identity-V3 resume recommended.",
    recruiter: "Sarah Jenks",
    status: "Auto-apply ready",
  },
  {
    id: "j2",
    title: "Lead AI Automation Engineer",
    company: "NeuroFlow Systems",
    location: "Hybrid · San Francisco",
    salary: "$210k + Equity",
    postedAgo: "5h ago",
    matchScore: 92,
    atsScore: 88,
    interviewProbability: 58,
    stage: "tailoring",
    remote: "Hybrid",
    tags: ["LangChain", "Vector DB", "Supabase", "Python"],
    reasoning:
      "Strong skill overlap with your automation portfolio. Series-B funding closed last month — headcount expanding 3x.",
    recruiter: "Marcus Patel",
  },
  {
    id: "j3",
    title: "Senior Cloud Security Engineer",
    company: "Vault & Co.",
    location: "Remote · Worldwide",
    salary: "$180k – $215k",
    postedAgo: "1d ago",
    matchScore: 89,
    atsScore: 84,
    interviewProbability: 52,
    stage: "applied",
    remote: "Remote",
    tags: ["SOC2", "Zero-Trust", "GCP", "IAM"],
    reasoning:
      "Your CISSP cert plus zero-trust migration history is a 1:1 match for their stated Q2 roadmap.",
  },
  {
    id: "j4",
    title: "Founding Platform Engineer",
    company: "Perplexity",
    location: "Onsite · New York",
    salary: "$220k + 0.4%",
    postedAgo: "3h ago",
    matchScore: 94,
    atsScore: 91,
    interviewProbability: 64,
    stage: "discovered",
    remote: "Onsite",
    tags: ["Distributed Systems", "Go", "PostgreSQL"],
    reasoning:
      "Pre-IPO trajectory. Hiring manager previously worked with two of your former colleagues — warm intro path detected.",
  },
  {
    id: "j5",
    title: "Staff DevOps Engineer",
    company: "Linear",
    location: "Remote · EU/US",
    salary: "$200k – $235k",
    postedAgo: "6h ago",
    matchScore: 96,
    atsScore: 93,
    interviewProbability: 68,
    stage: "interview",
    remote: "Remote",
    tags: ["GitHub Actions", "Observability", "Rust"],
    reasoning:
      "Recruiter replied within 4h of outreach. Loop scheduled for tomorrow at 10:00 PT.",
    recruiter: "James Whitley",
    status: "Loop tomorrow 10:00 PT",
  },
  {
    id: "j6",
    title: "Director of Site Reliability",
    company: "Anthropic",
    location: "Hybrid · SF",
    salary: "$260k – $310k",
    postedAgo: "8h ago",
    matchScore: 91,
    atsScore: 87,
    interviewProbability: 49,
    stage: "outreach",
    remote: "Hybrid",
    tags: ["SRE", "Leadership", "Incident Response"],
    reasoning:
      "Stretch role — leadership tone resume queued. Outreach to VP Eng scheduled for Tuesday 09:00.",
  },
  {
    id: "j7",
    title: "Senior Network Engineer",
    company: "Cloudflare",
    location: "Remote · US",
    salary: "$170k – $200k",
    postedAgo: "12h ago",
    matchScore: 86,
    atsScore: 82,
    interviewProbability: 44,
    stage: "discovered",
    remote: "Remote",
    tags: ["BGP", "Anycast", "Edge"],
    reasoning: "Solid match. Lower urgency — queued behind higher-ROI opportunities.",
  },
];

export const pipelineStages: { id: PipelineStage; label: string }[] = [
  { id: "discovered", label: "Discovered" },
  { id: "tailoring", label: "Tailoring" },
  { id: "ready", label: "Ready" },
  { id: "applied", label: "Applied" },
  { id: "outreach", label: "Outreach" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
];

export const dashboardMetrics = {
  jobsScanned: { value: 1402, delta: "+12%" },
  matchAccuracy: { value: "94.2%", delta: "+3.1pt" },
  outreachActive: { value: 28, delta: "8 replied" },
  interviewsBooked: { value: 4, delta: "+2 this week" },
};

export const fleetStats = [
  { label: "Jobs processed", value: "12,402" },
  { label: "CV iterations", value: "1,429" },
  { label: "Interview rate", value: "12.4%" },
  { label: "Time saved/mo", value: "140h" },
];

export interface AgentDescriptor {
  id: string;
  codename: string;
  role: string;
  status: "active" | "idle" | "queued";
  task: string;
}

export const agentFleet: AgentDescriptor[] = [
  { id: "a1", codename: "SCOUT_04", role: "Discovery agent", status: "active", task: "Sweeping 14 boards + 220 careers pages." },
  { id: "a2", codename: "STRATEGIST", role: "Prioritization", status: "active", task: "Re-ranking 142 active opportunities." },
  { id: "a3", codename: "WRITER_01", role: "Resume tailoring", status: "active", task: "Iterating 4 CV variants in parallel." },
  { id: "a4", codename: "OUTREACH_02", role: "Recruiter outreach", status: "active", task: "Sequencing 28 conversations." },
  { id: "a5", codename: "ANALYZER", role: "Market intelligence", status: "idle", task: "Next sweep at 18:00." },
  { id: "a6", codename: "INTERVIEWER", role: "Interview prep", status: "queued", task: "Loop prep for Linear at 09:00 tomorrow." },
];
