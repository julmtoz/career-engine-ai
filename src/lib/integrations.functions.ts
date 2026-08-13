/**
 * Integration connect/disconnect server functions (Gmail Phase 1).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  getGmailAuthUrl,
  signOAuthState,
  verifyOAuthState,
  exchangeGmailCode,
  storeGmailCredentials,
  disconnectGmail,
} from "@/lib/integrations/gmail.server";

type DB = SupabaseClient<Database>;

export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: DB; userId: string };
    const { data } = await supabase
      .from("integrations")
      .select("provider, status, connected_at")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .maybeSingle();

    return { gmailConnected: !!data, connectedAt: data?.connected_at ?? null };
  });

export const getGmailConnectUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const state = signOAuthState(userId);
    return { url: getGmailAuthUrl(state) };
  });

export const disconnectGmailIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await disconnectGmail(userId);
    return { ok: true };
  });

/**
 * Completes the Gmail OAuth round trip from the callback route. No Bearer
 * token is available on this raw browser redirect, so authorization comes
 * from the HMAC-signed `state` minted by getGmailConnectUrl instead.
 */
export const completeGmailOAuth = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = verifyOAuthState(data.state);
    const tokenData = await exchangeGmailCode(data.code);
    await storeGmailCredentials(userId, tokenData);
    return { ok: true };
  });
