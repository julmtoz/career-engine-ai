# Aether OS — System Architecture

## 1. Layers

```
                ┌──────────────────────────────────────────────┐
   Client UI ── │  TanStack Start (SSR + React 19)             │
                │  - dashboards, kanban, copilot, command bar  │
                └────────────┬─────────────────────────────────┘
                             │  createServerFn (typed RPC)
                ┌────────────▼─────────────────────────────────┐
   App API ──── │  Server Functions (auth-scoped, RLS)         │
                │  src/lib/**/*.functions.ts                   │
                └────────────┬─────────────────────────────────┘
                             │  emitEvent / enqueue
                ┌────────────▼─────────────────────────────────┐
   Core ─────── │  Event Bus  +  Task Queue  +  Workflow Engine│
                │  src/lib/orchestrator/*                      │
                └────────────┬─────────────────────────────────┘
                             │  agent.run tasks
                ┌────────────▼─────────────────────────────────┐
   Workforce ── │  Agent Runner  →  Lovable AI Gateway         │
                │  scout · analyzer · strategist · writer ·    │
                │  outreach · follow_up · interviewer · core   │
                └────────────┬─────────────────────────────────┘
                             │  writes
                ┌────────────▼─────────────────────────────────┐
   State ────── │  Postgres + pgvector (Lovable Cloud)         │
                │  events · task_queue · agent_runs ·          │
                │  workflows · ai_decisions · agent_memory ·   │
                │  jobs · applications · outreach · audit_log  │
                └──────────────────────────────────────────────┘
                             ▲
                             │ pg_cron → POST /api/public/hooks/tick
```

## 2. Execution model

**Stateless workers, stateful database.** No long-lived processes, no
in-memory queues. Every transition is a row. Horizontal scale = more
ticks per minute.

- `events`        — append-only log of *what happened*
- `task_queue`    — durable to-do list of *what should happen next*
- `workflow_runs` — state machine for multi-step plans
- `agent_runs`    — per-invocation telemetry (tokens, cost, confidence)

A user action or scout discovery calls `emitEvent()`. The event bus
fans out to every agent listening for that `event_kind` by inserting
`agent.run` rows into `task_queue` in the **same transaction** as the
event — guaranteed exactly-one fan-out, never lost.

`pg_cron` posts to `/api/public/hooks/tick` every minute. The worker
claims one task atomically (`UPDATE … WHERE status='pending'`),
dispatches it, and either retries with exponential backoff or moves
it to `dead_letter`. Nothing is silently dropped.

## 3. Agent workforce

| Agent        | Trigger event          | Output                        | Hands off to       |
|--------------|------------------------|-------------------------------|--------------------|
| SCOUT_04     | (cron / manual scan)   | `job.discovered`              | analyzer           |
| ANALYZER     | `job.discovered`       | `job.scored` (+ ai_decision)  | strategist         |
| STRATEGIST   | `job.scored`           | rank, daily-cap gate          | writer · outreach  |
| WRITER_01    | (strategist handoff)   | `resume.tailored`             | orchestrator       |
| OUTREACH_02  | `application.submitted`| `outreach.sent` (approval-gated) | follow_up       |
| FOLLOWUP_07  | `outreach.sent`        | scheduled follow-up           | outreach           |
| INTERVIEWER  | `interview.scheduled`  | loop dossier + drills         | —                  |
| AETHER_CORE  | (system)               | workflow ticks, retries       | —                  |

Each agent declares: `model`, `triggers`, `handoff`, `minConfidence`,
`requiresApproval`, `systemPrompt`, `capabilities`. Replacing an agent
= replacing one entry in the registry.

## 4. Autonomy & safety

`user_preferences.autonomy` ∈ `manual | assisted | auto | full_auto`.

- **manual** — agents only draft; user clicks send for everything.
- **assisted** — agents draft; high-stakes actions require approval.
- **auto** — agents act autonomously above `min_confidence_to_act`.
- **full_auto** — only emergency stop. Caps still enforced.

Hard guardrails enforced by STRATEGIST + OUTREACH:
`daily_application_cap`, `daily_outreach_cap`, `quiet_hours`,
`excluded_companies`. Anything risky writes a `notifications` row
with `kind='approval_required'` and pauses the workflow.

## 5. Memory & explainability

- `agent_memory` (pgvector 1536) — semantic recall scoped per user
  (profile / job / recruiter / global). Importance-weighted; agents
  query before acting.
- `ai_decisions` — every action records *why* (rationale, signals,
  confidence). The Reasoning Panel reads from here, not from logs.
- `audit_log` — immutable before/after for sensitive mutations.

## 6. Workflow examples (ship next)

```text
W1: Discover → Apply
  scout → analyzer → [gate: match≥min] → strategist
        → writer  → [approval if assisted] → submit
        → emit application.submitted

W2: Reply received
  inbound mail → analyzer (classify) → strategist (priority)
              → interviewer (if interview signal)
              OR follow_up (if non-committal)
```

## 7. Integrations

`integrations` table holds OAuth credentials per `provider` (linkedin,
gmail, greenhouse, lever, ashby). Tokens stored encrypted; refresh
handled in connector functions, never exposed to client.

---

## Hardening & Launch Phase

### Safety model (current)
- **Approval-gated externals.** No outreach, application, or follow-up leaves the workspace without an explicit approval entry in `pending_actions` / `outreach_drafts` / `follow_ups` (`status='pending'`).
- **Per-row RLS.** Every user-owned table enforces `auth.uid() = user_id` (or admin role). The server functions never use `supabaseAdmin` for user data — only `requireSupabaseAuth` which preserves RLS as the calling user.
- **Pause switch.** `/automation` exposes a single "Pause all automation" action that sets autonomy to `manual` and freezes pending workflow runs.
- **Decision audit log.** Every model output writes to `ai_decisions` with reasoning + confidence, surfaced in `/automation` and `/admin`.

### Operator surfaces
- **`/launch`** — pre-flight checklist (env, agents, profile, resume, sources, jobs, RLS) with a 0–100 readiness score and direct links to the missing step.
- **`/admin`** — debug console: agent fleet, agent runs, queue health, failed/dead-letter tasks (with retry), source sync errors, AI decisions, pending approvals, workflow runs.
- **Demo seed** — `seedDemoData` / `wipeDemoData` populate a realistic profile, three companies, three jobs, three recruiters, and one in-pipeline application so a new account is instantly demoable. Wipe targets only `source='demo'` rows.

### Reliability primitives
- **Task retries.** `task_queue.attempt`/`max_attempts` with `retryTask` server function to manually re-arm dead-letter tasks.
- **Graceful AI failure.** Agent runner records `error` on `agent_runs` and surfaces it in the operator console; workflows pause rather than silently failing.
- **Duplicate intake guard.** Job ingestion dedupes on `(user_id, title, company)` and `(source, external_id)`.
- **Permission errors** bubble up via Supabase error envelope and the per-route `errorComponent` retry button (root layout).

### Known limitations / next roadmap
1. No autonomous apply — all submission is human-approved by design.
2. Live connectors limited to Greenhouse + Lever public APIs; Workday/Ashby/RSS routed through manual Intake.
3. Email/LinkedIn send-out is draft-only; we do not yet hold OAuth tokens for either channel.
4. Agent memory uses pgvector but recall is not yet wired into the Strategist prompts.
5. Cron tick endpoint (`/api/public/hooks/tick`) exists but is not yet attached to a scheduled job — invoke manually for now.

---

## Beta Demo Flow

The fastest path from cold install to "I get it":

1. Sign in (`/login`) — email/password.
2. Open **Demo** (`/demo`) and click **Seed demo data** — populates your private workspace with a profile, 3 companies, 3 jobs, 3 recruiters, and 1 in-pipeline application. Everything is tagged `source='demo'` and reversible.
3. Walk the 9-step tour: Dashboard → Feed → Packages → Approvals → Pipeline → Follow-ups → Conversion → Launch.
4. Click **Wipe demo data** when finished — only `source='demo'` rows are deleted.

## Integration Status

| Surface | Status |
|---|---|
| Greenhouse public boards | **Live** |
| Lever public postings | **Live** |
| Workday / Ashby / RSS / careers pages | Manual via `/intake` (URL paste) |
| Resume parsing (PDF/DOCX) | **Live** (client-side via pdfjs/mammoth + AI structuring) |
| AI gateway (Lovable AI) | **Live** |
| Email send-out | Draft-only (no SMTP/OAuth) |
| LinkedIn outreach | Draft-only (no API) |
| Auto-apply | Disabled by design |
| Cron tick (`/api/public/hooks/tick`) | Endpoint live, scheduler not attached |

## Recommended Next Steps After Beta

1. Wire `/api/public/hooks/tick` to a cron schedule for autonomous source sync.
2. Add OAuth for Gmail + LinkedIn so approved drafts can actually send.
3. Promote agent memory recall into Strategist prompt context.
4. Ship Workday + Ashby connectors behind their API gates.
5. Build a billing/limits surface once the first 25 beta users are active.

---

## Validation & Optimization Phase

Feature expansion is frozen. Current focus is reliability, trust, and conversion quality.

### Telemetry surfaces
- `/observability` — workflow latency (p50/p90/p99), agent failure rate, AI cost, tokens, queue depth, source reliability, approval conversion, interviews-per-week.
- `/admin` — debug snapshot + dead-letter retry.
- `/launch` — pre-flight checklist (env, profile, resume, sources, RLS).

### Beta feedback loop
- `/feedback` — in-app reports (bug, UX, AI quality, feature) tied to current route, optional 1–5 rating, severity, and free-form details. RLS-scoped per user; `feedback` table.
- AI quality ratings flow into the same inbox so we can correlate low-rated outputs with the agent run that produced them (via `route` + `meta`).

### Performance discipline
- Server functions default to `useQuery` with sane `refetchInterval`s (8–15s) instead of polling loops.
- AI-heavy server functions read `process.env.LOVABLE_API_KEY` inside `.handler()` only.
- Queue work routes through `task_queue` so retries are bounded by `max_attempts` and surfaced in `/observability`.

### Post-beta roadmap (deferred)
1. Autonomous apply (gated behind explicit per-source consent + per-day caps).
2. Browser extension for one-click intake from any careers page.
3. Recruiter marketplace + warm-intro graph.
4. Voice interview prep (live mock interviewer).
5. Enterprise recruiter tooling (multi-seat, shared pipelines).
6. Team collaboration on shared candidate pipelines.
7. AI negotiation assistant (live offer modeling, counter scripts).

### Production deployment checklist
- Secrets present: `LOVABLE_API_KEY`, `SUPABASE_*` (auto-provisioned by Cloud).
- RLS enabled on every `public.*` table (verify via `/launch`).
- Cron tick attached to `/api/public/hooks/tick` once autonomous sync is desired.
- Monitor `/observability` failure-rate < 5% and p99 latency < 15s before opening to beta cohort.
- Backups: managed by Lovable Cloud; no manual action required for beta.

### Success metric
**Interviews generated per user per week.** All other metrics (applications sent, outreach volume, packages built) are inputs, not goals.
