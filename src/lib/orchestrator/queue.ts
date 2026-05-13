/**
 * Durable task queue.
 * - claim() uses SELECT … FOR UPDATE SKIP LOCKED semantics via an RPC-less
 *   pattern: optimistic atomic UPDATE filtered by status='pending'.
 * - retries use exponential backoff capped at 1h.
 * - >max_attempts → dead_letter (operator-visible, never silently dropped).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BACKOFF_BASE_MS = 15_000;
const BACKOFF_CAP_MS = 60 * 60 * 1000;

export type QueuedTask = Database["public"]["Tables"]["task_queue"]["Row"];

export async function enqueue(
  supabase: SupabaseClient<Database>,
  args: {
    userId: string;
    kind: string;
    payload?: Record<string, unknown>;
    priority?: number;
    scheduledFor?: Date;
    workflowRunId?: string;
    maxAttempts?: number;
  },
) {
  const { data, error } = await supabase
    .from("task_queue")
    .insert({
      user_id: args.userId,
      kind: args.kind,
      payload: (args.payload ?? {}) as never,
      priority: args.priority ?? 100,
      scheduled_for: (args.scheduledFor ?? new Date()).toISOString(),
      workflow_run_id: args.workflowRunId ?? null,
      max_attempts: args.maxAttempts ?? 5,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function claimNext(
  supabase: SupabaseClient<Database>,
  workerId: string,
  userId?: string,
): Promise<QueuedTask | null> {
  // Pick the highest-priority ready task we can see, then atomically claim it.
  let q = supabase
    .from("task_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("priority", { ascending: true })
    .order("scheduled_for", { ascending: true })
    .limit(1);
  if (userId) q = q.eq("user_id", userId);

  const { data: candidates, error } = await q;
  if (error) throw error;
  const candidate = candidates?.[0];
  if (!candidate) return null;

  const { data: claimed, error: cErr } = await supabase
    .from("task_queue")
    .update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
      claimed_by: workerId,
      attempt: candidate.attempt + 1,
    })
    .eq("id", candidate.id)
    .eq("status", "pending") // race guard
    .select("*")
    .maybeSingle();
  if (cErr) throw cErr;
  return claimed;
}

export async function complete(
  supabase: SupabaseClient<Database>,
  taskId: string,
) {
  const { error } = await supabase
    .from("task_queue")
    .update({ status: "succeeded" })
    .eq("id", taskId);
  if (error) throw error;
}

export async function fail(
  supabase: SupabaseClient<Database>,
  task: QueuedTask,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = task.attempt >= task.max_attempts;
  const backoff = Math.min(
    BACKOFF_BASE_MS * Math.pow(2, task.attempt - 1),
    BACKOFF_CAP_MS,
  );
  const next = new Date(Date.now() + backoff).toISOString();

  await supabase
    .from("task_queue")
    .update({
      status: exhausted ? "dead_letter" : "pending",
      last_error: message,
      scheduled_for: exhausted ? task.scheduled_for : next,
      claimed_at: null,
      claimed_by: null,
    })
    .eq("id", task.id);
}
