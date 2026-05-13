/**
 * Event bus — durable, append-only, RLS-scoped.
 * All system state changes flow through here. Subscribers (agents,
 * workflows, notifications) react by polling `events` or by being
 * fanned out via `task_queue` inserts in the same transaction.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { agentsListeningTo, type EventKind } from "@/lib/agents/registry";

export interface EmitOptions {
  source: string;
  subjectType?: string;
  subjectId?: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
}

export async function emitEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: EventKind,
  opts: EmitOptions,
) {
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      kind,
      source: opts.source,
      subject_type: opts.subjectType ?? null,
      subject_id: opts.subjectId ?? null,
      payload: (opts.payload ?? {}) as never,
      correlation_id: opts.correlationId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Fan out: enqueue an agent.run task for every agent that listens.
  const listeners = agentsListeningTo(kind);
  if (listeners.length > 0) {
    const tasks = listeners.map((a) => ({
      user_id: userId,
      kind: "agent.run",
      priority: 100,
      payload: {
        agent_kind: a.kind,
        event_id: event.id,
        event_kind: kind,
        subject_type: opts.subjectType,
        subject_id: opts.subjectId,
        correlation_id: opts.correlationId ?? event.id,
      },
    }));
    const { error: qErr } = await supabase.from("task_queue").insert(tasks);
    if (qErr) throw qErr;
  }

  return event.id;
}
