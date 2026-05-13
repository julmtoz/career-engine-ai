/**
 * Beta feedback server functions: in-app feedback, bug reports,
 * AI quality ratings, and feature requests. RLS-scoped per user.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

const submitSchema = z.object({
  kind: z.enum(["bug", "ux", "ai_quality", "feature", "general"]).default("general"),
  severity: z.enum(["low", "normal", "high", "blocker"]).default("normal"),
  title: z.string().min(2).max(200),
  body: z.string().max(4000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  route: z.string().max(255).optional().nullable(),
  subjectType: z.string().max(64).optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  meta: z.record(z.string(), z.any()).optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data: row, error } = await supabase
      .from("feedback" as never)
      .insert({
        user_id: userId,
        kind: data.kind,
        severity: data.severity,
        title: data.title,
        body: data.body ?? null,
        rating: data.rating ?? null,
        route: data.route ?? null,
        subject_type: data.subjectType ?? null,
        subject_id: data.subjectId ?? null,
        meta: data.meta ?? {},
      } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data, error } = await supabase
      .from("feedback" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as Array<Record<string, any>> };
  });

export const resolveFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["open", "triaged", "resolved", "wontfix"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { error } = await supabase
      .from("feedback" as never)
      .update({ status: data.status } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
