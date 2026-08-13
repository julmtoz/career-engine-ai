/**
 * Gmail OAuth Integration
 * Handles Google OAuth token exchange, storage, and refresh
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete the OAuth round trip

export interface GmailTokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Sign a CSRF-safe OAuth state that encodes the initiating user's id.
 * Verified in the callback route so we know who to attach the tokens to,
 * without needing a server-side pending-request table.
 */
export function signOAuthState(userId: string): string {
  if (!GOOGLE_CLIENT_SECRET) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  const payload = `${userId}.${Date.now() + OAUTH_STATE_TTL_MS}`;
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const signature = createHmac("sha256", GOOGLE_CLIENT_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a state produced by signOAuthState and return the userId it encodes.
 * Throws if the signature is invalid, malformed, or expired.
 */
export function verifyOAuthState(state: string): string {
  if (!GOOGLE_CLIENT_SECRET) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) throw new Error("Malformed OAuth state");

  const expectedSignature = createHmac("sha256", GOOGLE_CLIENT_SECRET)
    .update(payloadB64)
    .digest("hex");
  const provided = Buffer.from(signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const [userId, expiresAtRaw] = payload.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !Number.isFinite(expiresAt)) throw new Error("Malformed OAuth state");
  if (Date.now() > expiresAt) throw new Error("OAuth state expired, please try connecting again");

  return userId;
}

/**
 * Get the Google OAuth authorization URL
 */
export function getGmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeGmailCode(code: string): Promise<GmailTokenData> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI!,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Gmail code: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshGmailToken(
  refreshToken: string
): Promise<GmailTokenData> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Gmail token: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Store Gmail credentials in database.
 * The `integrations` table has no dedicated expires_at column, so expiry
 * travels inside the credentials JSON blob alongside the tokens.
 */
export async function storeGmailCredentials(
  userId: string,
  tokenData: GmailTokenData
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  const { error } = await supabaseAdmin
    .from("integrations")
    .upsert(
      {
        user_id: userId,
        provider: "gmail",
        status: "connected",
        credentials: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_type: tokenData.token_type,
          expires_at: expiresAt.toISOString(),
        },
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    throw new Error(`Failed to store Gmail credentials: ${error.message}`);
  }
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getGmailAccessToken(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("credentials")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .single();

  if (error || !data) {
    throw new Error("Gmail not connected");
  }

  const credentials = data.credentials as {
    access_token: string;
    refresh_token: string | null;
    token_type: string;
    expires_at: string;
  };
  const expiresAt = new Date(credentials.expires_at);

  // If token expired, refresh it
  if (new Date() >= expiresAt && credentials.refresh_token) {
    const newTokenData = await refreshGmailToken(credentials.refresh_token);
    await storeGmailCredentials(userId, newTokenData);
    return newTokenData.access_token;
  }

  return credentials.access_token;
}

/**
 * Disconnect Gmail from account
 */
export async function disconnectGmail(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "gmail");

  if (error) {
    throw new Error(`Failed to disconnect Gmail: ${error.message}`);
  }
}
