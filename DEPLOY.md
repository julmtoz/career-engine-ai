# Deploying Aether Phase 1 to Vercel

Phase 1 adds Gmail OAuth + outbound email (Resend) and switches this app's
deploy target from Cloudflare Workers to Vercel. Read the whole doc before
you start — a few steps (Supabase migration, Google OAuth client) have to
happen in a specific order.

## 0. What changed in this phase

- `src/lib/integrations/gmail.server.ts` — Google OAuth token exchange/refresh/storage
- `src/lib/integrations/email.server.ts` — Resend-backed outreach sending, logs to `email_log`
- `src/lib/integrations.functions.ts` — server functions the UI calls (connect URL, status, disconnect, OAuth completion)
- `src/routes/auth/callback/gmail.ts` — OAuth redirect target, exchanges the code and stores tokens
- `src/routes/settings/integrations.tsx` — minimal UI to connect/disconnect Gmail
- `src/routes/api/public/hooks/tick.ts` — now also accepts `GET` (Vercel Cron only sends GET; the existing `POST` path used by Supabase's pg_cron is untouched)
- `supabase/migrations/..._email_log.sql` — new table for send logs (the pasted code originally assumed a table called `outreach`, which doesn't exist in this schema)
- `vite.config.ts` — `nitro.preset` set to `"vercel"` (the shared build config defaults to `cloudflare-module`; without this override, `npm run build` would emit a Cloudflare Workers bundle, not something Vercel can run)
- `wrangler.jsonc` — removed (Cloudflare Workers is no longer the deploy target)
- `.env` — untracked from git and added to `.gitignore`; `.env.example` added instead

## 1. Apply the new Supabase migration

Run the migration in `supabase/migrations/` that creates `email_log` against
your Supabase project (via the Supabase CLI, or paste the SQL into the
Supabase SQL editor) **before** sending any email — `sendOutreachEmail` will
fail its logging insert otherwise (the send itself still succeeds; only the
log write fails).

## 2. Create the Google OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) an OAuth 2.0 Client ID (Web application).
2. Add an **Authorized redirect URI**: `https://<your-vercel-domain>/auth/callback/gmail`.
   You'll need to come back and add your final production domain here after step 5.
3. Under OAuth consent screen, add the `https://www.googleapis.com/auth/gmail.send` scope, and add any test-user emails if the app is still in "Testing" mode.
4. Copy the Client ID and Client Secret — you'll need them in step 4.

## 3. Get a Resend API key

Create an API key at [resend.com](https://resend.com) and verify the sending
domain you'll use for `FROM_EMAIL`.

## 4. Import the repo into Vercel

1. In Vercel, **Add New → Project**, import this GitHub repo.
2. Framework preset: leave as **Other** (do *not* pick "Vite" — the build
   emits Vercel's Build Output API format directly via Nitro, and Vercel
   auto-detects that regardless of framework preset; forcing "Vite" can
   make Vercel apply its own static-build handling on top and conflict with
   the Nitro output). `vercel.json` already sets `"framework": null` for you.
3. Build command: `npm run build` (already set in `vercel.json`).
4. Install command: `npm install` (already set in `vercel.json`).

## 5. Add environment variables

In Project Settings → Environment Variables, add (see `.env.example` for the
full list):

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | |
| `SUPABASE_PUBLISHABLE_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never prefix with `VITE_`. |
| `VITE_SUPABASE_URL` | Same value as `SUPABASE_URL`, exposed to the client build. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same value as `SUPABASE_PUBLISHABLE_KEY`. |
| `LOVABLE_API_KEY` | |
| `GOOGLE_CLIENT_ID` | From step 2. |
| `GOOGLE_CLIENT_SECRET` | From step 2. Also used to HMAC-sign the OAuth `state` param — keep it secret. |
| `GOOGLE_REDIRECT_URI` | `https://<your-vercel-domain>/auth/callback/gmail` — must exactly match what's registered in Google Cloud Console. |
| `RESEND_API_KEY` | From step 3. |
| `FROM_EMAIL` | Must be on a domain verified in Resend. |
| `FROM_NAME` | Display name for outbound mail. |

Deploy once after adding these so you get your `*.vercel.app` domain (or set
your custom domain first if you already have one).

## 6. Update production URLs

Once you know your final domain:

- Update `GOOGLE_REDIRECT_URI` in Vercel to match it exactly.
- Add the same URL as an Authorized redirect URI back in Google Cloud Console (step 2).
- Redeploy so the env var change takes effect.

## 7. Verify the cron is configured

`vercel.json` schedules `GET /api/public/hooks/tick` **once daily** at
midnight UTC (`0 0 * * *`), not every minute:

> **Vercel Hobby plan crons are limited to once per day.** A `* * * * *`
> schedule will fail to deploy on Hobby. If you're on **Pro or higher**,
> you can tighten this to `* * * * *` in `vercel.json` for the original
> once-a-minute cadence.

After deploying, check **Project → Cron Jobs** in the Vercel dashboard to
confirm the job is registered, and check its run history after the next
scheduled tick to confirm it's returning `200 { ok: true, processed: N }`.

## 8. Smoke test

1. Visit `/settings/integrations`, sign in, click **Connect Gmail**, complete
   the Google consent screen, and confirm you're redirected back with a
   "Gmail connected successfully" banner.
2. Trigger `sendOutreachEmail` (from wherever it's wired into the app) and
   confirm the message arrives and a row appears in `email_log`.
