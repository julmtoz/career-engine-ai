/**
 * Workflow Engine — declarative DAG executor.
 *
 * A workflow is a directed graph of nodes. Each node is one of:
 *   - { type: 'agent', agent: AgentKind, input: TemplateRef }
 *   - { type: 'gate', condition: string }     // policy / threshold gate
 *   - { type: 'approval', channel: string }   // pause for human input
 *   - { type: 'wait', untilEvent: EventKind }
 *
 * The engine is "tick-based": each tick advances ready nodes, writes a
 * `workflow_steps` row, and either resolves immediately (gates) or
 * enqueues a task (agent runs, waits). State lives entirely in the DB
 * so workers are stateless and horizontally scalable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AgentKind } from "@/lib/agents/registry";
import { enqueue } from "./queue";

export type WorkflowNode =
  | { id: string; type: "agent"; agent: AgentKind; input?: Record<string, unknown>; next?: string[] }
  | { id: string; type: "gate"; expr: string; onTrue: string; onFalse: string }
  | { id: string; type: "approval"; channel: "in_app" | "email"; next: string }
  | { id: string; type: "wait"; untilEvent: string; next: string };

export interface WorkflowGraph {
  start: string;
  nodes: Record<string, WorkflowNode>;
}

export async function startWorkflow(
  supabase: SupabaseClient<Database>,
  args: {
    userId: string;
    workflowId: string;
    triggerEventId?: string;
    context?: Record<string, unknown>;
  },
) {
  const { data: wf, error: wErr } = await supabase
    .from("workflows")
    .select("graph")
    .eq("id", args.workflowId)
    .single();
  if (wErr) throw wErr;

  const graph = wf.graph as unknown as WorkflowGraph;

  const { data: run, error: rErr } = await supabase
    .from("workflow_runs")
    .insert({
      user_id: args.userId,
      workflow_id: args.workflowId,
      status: "running",
      trigger_event_id: args.triggerEventId ?? null,
      context: args.context ?? {},
      current_node: graph.start,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (rErr) throw rErr;

  await enqueue(supabase, {
    userId: args.userId,
    kind: "workflow.tick",
    payload: { workflow_run_id: run.id, node_id: graph.start },
    workflowRunId: run.id,
    priority: 50,
  });

  return run.id;
}

/**
 * Tick a single node. Called by the queue worker for `workflow.tick` tasks.
 * Returns the next node id (if any) so the worker can chain immediately.
 */
export async function tickNode(
  supabase: SupabaseClient<Database>,
  args: { workflowRunId: string; nodeId: string },
): Promise<{ nextNodeIds: string[]; status: "advanced" | "waiting" | "completed" }> {
  const { data: run, error: rErr } = await supabase
    .from("workflow_runs")
    .select("id, user_id, workflow_id, context, status, workflows(graph)")
    .eq("id", args.workflowRunId)
    .single();
  if (rErr) throw rErr;

  const graph = (run.workflows as unknown as { graph: WorkflowGraph }).graph;
  const node = graph.nodes[args.nodeId];
  if (!node) throw new Error(`unknown node ${args.nodeId}`);

  await supabase.from("workflow_steps").insert({
    workflow_run_id: run.id,
    node_id: node.id,
    status: "running",
    started_at: new Date().toISOString(),
    input: { context: run.context },
    agent_kind: node.type === "agent" ? node.agent : null,
  });

  switch (node.type) {
    case "agent": {
      // Hand off to the agent worker.
      await enqueue(supabase, {
        userId: run.user_id,
        kind: "agent.run",
        payload: {
          agent_kind: node.agent,
          workflow_run_id: run.id,
          node_id: node.id,
          input: { ...(node.input ?? {}), ...(run.context as object) },
        },
        workflowRunId: run.id,
        priority: 75,
      });
      return { nextNodeIds: [], status: "waiting" };
    }
    case "gate": {
      const ok = evalGate(node.expr, run.context as Record<string, unknown>);
      const next = ok ? node.onTrue : node.onFalse;
      return { nextNodeIds: [next], status: "advanced" };
    }
    case "approval": {
      await supabase.from("notifications").insert({
        user_id: run.user_id,
        kind: "approval_required",
        title: "Approval needed",
        body: `Workflow ${run.workflow_id} paused at ${node.id}`,
        severity: "warn",
        meta: { workflow_run_id: run.id, node_id: node.id },
      });
      await supabase
        .from("workflow_runs")
        .update({ status: "paused", current_node: node.id })
        .eq("id", run.id);
      return { nextNodeIds: [], status: "waiting" };
    }
    case "wait":
      return { nextNodeIds: [], status: "waiting" };
  }
}

/**
 * Tiny safe-ish gate evaluator. Supports `ctx.x.y >= n`, `ctx.flag === true`.
 * Real implementation should swap in JSONLogic or a proper expression engine.
 */
function evalGate(expr: string, ctx: Record<string, unknown>): boolean {
  const fn = new Function("ctx", `try { return Boolean(${expr}); } catch { return false; }`);
  return fn(ctx) as boolean;
}
