/**
 * Unified approval queue. Every AI artifact destined to leave the workspace
 * (or to be promoted into the pipeline as a tracked application) lands here
 * until the user explicitly approves it.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export const listPendingActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const r = await supabase
      .from("pending_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return { actions: r.data ?? [] };
  });

export const approvePendingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const row = await supabase
      .from("pending_actions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (row.error || !row.data) throw new Error("action not found");
    if (row.data.status !== "pending") throw new Error("action already decided");

    // Side-effects per action kind. Still INTERNAL — no external sends.
    if (row.data.kind === "resume_tailor" && row.data.subject_id) {
      const payload = (row.data.payload ?? {}) as { resume_version_id?: string };
      // Promote opportunity into pipeline as a tracked application (if not already).
      const existing = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", userId)
        .eq("job_id", row.data.subject_id)
        .maybeSingle();
      if (!existing.data) {
        await supabase.from("applications").insert({
          user_id: userId,
          job_id: row.data.subject_id,
          resume_version_id: payload.resume_version_id ?? null,
          stage: "ready",
        });
      }
    }

    await supabase
      .from("pending_actions")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.id);

    return { ok: true };
  });

export const rejectPendingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    await supabase
      .from("pending_actions")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });
