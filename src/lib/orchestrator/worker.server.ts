/**
 * Queue worker — pulls one task at a time, dispatches to the right
 * handler, advances workflow state. Designed to be invoked by:
 *   - cron (every minute) via /api/public/hooks/tick
 *   - user-triggered "run now" actions
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { claimNext, complete, fail, enqueue } from "./queue";
import { tickNode } from "./workflow-engine";
import { executeAgent } from "./agent-runner.server";
import type { AgentKind } from "@/lib/agents/registry";

export async function tickOnce(workerId: string): Promise<{ processed: number }> {
  const task = await claimNext(supabaseAdmin, workerId);
  if (!task) return { processed: 0 };

  try {
    switch (task.kind) {
      case "agent.run": {
        const p = task.payload as {
          agent_kind: AgentKind;
          workflow_run_id?: string | null;
          node_id?: string;
          input?: Record<string, unknown>;
        };
        const result = await executeAgent({
          userId: task.user_id,
          agentKind: p.agent_kind,
          workflowRunId: p.workflow_run_id ?? null,
          taskId: task.id,
          input: p.input ?? {},
        });

        // Advance workflow if this run was attached to a node.
        if (p.workflow_run_id && p.node_id) {
          await advanceAfterAgent(p.workflow_run_id, p.node_id, result.status);
        }
        break;
      }
      case "workflow.tick": {
        const p = task.payload as { workflow_run_id: string; node_id: string };
        const { nextNodeIds } = await tickNode(supabaseAdmin, {
          workflowRunId: p.workflow_run_id,
          nodeId: p.node_id,
        });
        for (const nextId of nextNodeIds) {
          await enqueue(supabaseAdmin, {
            userId: task.user_id,
            kind: "workflow.tick",
            payload: { workflow_run_id: p.workflow_run_id, node_id: nextId },
            workflowRunId: p.workflow_run_id,
            priority: 50,
          });
        }
        break;
      }
      default:
        throw new Error(`unknown task kind: ${task.kind}`);
    }
    await complete(supabaseAdmin, task.id);
    return { processed: 1 };
  } catch (err) {
    await fail(supabaseAdmin, task, err);
    throw err;
  }
}

async function advanceAfterAgent(
  workflowRunId: string,
  nodeId: string,
  status: "succeeded" | "failed" | "awaiting_approval",
) {
  await supabaseAdmin
    .from("workflow_steps")
    .update({ status, finished_at: new Date().toISOString() })
    .eq("workflow_run_id", workflowRunId)
    .eq("node_id", nodeId);

  if (status === "awaiting_approval") {
    await supabaseAdmin
      .from("workflow_runs")
      .update({ status: "paused", current_node: nodeId })
      .eq("id", workflowRunId);
    return;
  }

  // Re-tick to advance to next node based on the graph.
  const { data: run } = await supabaseAdmin
    .from("workflow_runs")
    .select("user_id, workflows(graph)")
    .eq("id", workflowRunId)
    .single();
  if (!run) return;
  const graph = (run.workflows as unknown as { graph: { nodes: Record<string, any> } }).graph;
  const node = graph.nodes[nodeId];
  const next = node?.next as string[] | undefined;
  if (!next || next.length === 0) {
    await supabaseAdmin
      .from("workflow_runs")
      .update({ status: "completed", finished_at: new Date().toISOString() })
      .eq("id", workflowRunId);
    return;
  }
  for (const n of next) {
    await enqueue(supabaseAdmin, {
      userId: run.user_id,
      kind: "workflow.tick",
      payload: { workflow_run_id: workflowRunId, node_id: n },
      workflowRunId,
      priority: 50,
    });
  }
}
