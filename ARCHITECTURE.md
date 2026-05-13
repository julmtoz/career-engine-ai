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
