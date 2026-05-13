
-- =========================================================
-- COMPANIES
-- =========================================================
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  domain text,
  industry text,
  size_band text,                         -- '1-10','11-50','51-200','201-500','501-1k','1k-5k','5k+'
  funding_stage text,                     -- 'bootstrapped','seed','series_a',...
  hq_location text,
  tech_stack text[] NOT NULL DEFAULT '{}',
  growth_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  hiring_velocity numeric,                -- jobs posted / 30d
  layoff_signal boolean DEFAULT false,
  recruiter_activity_score numeric,       -- 0..1
  intelligence_score integer,             -- 0..100
  stability_score integer,                -- 0..100
  opportunity_score integer,              -- 0..100
  last_enriched_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX companies_user_idx ON public.companies(user_id);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_owner_all ON public.companies FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- JOB SOURCES (modular ingestion connectors)
-- =========================================================
CREATE TABLE public.job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  kind text NOT NULL,                     -- 'greenhouse','lever','workday','ashby','rss','careers_page','manual'
  identifier text NOT NULL,               -- e.g. greenhouse board token, lever org slug, RSS URL
  label text,
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'idle',    -- 'idle','syncing','ok','error'
  last_synced_at timestamptz,
  last_error text,
  jobs_seen integer NOT NULL DEFAULT 0,
  jobs_imported integer NOT NULL DEFAULT 0,
  source_confidence numeric NOT NULL DEFAULT 0.7,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_sources_user_idx ON public.job_sources(user_id);
CREATE INDEX job_sources_kind_idx ON public.job_sources(user_id, kind);
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_sources_owner_all ON public.job_sources FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER job_sources_touch BEFORE UPDATE ON public.job_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- JOB OPPORTUNITIES — enrich with company + source link
-- =========================================================
ALTER TABLE public.job_opportunities
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_source_id uuid REFERENCES public.job_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS freshness_score numeric,
  ADD COLUMN IF NOT EXISTS recruiter_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_confidence numeric;

CREATE INDEX IF NOT EXISTS job_opp_company_idx ON public.job_opportunities(user_id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS job_opp_source_extid_uq
  ON public.job_opportunities(user_id, job_source_id, external_id)
  WHERE job_source_id IS NOT NULL AND external_id IS NOT NULL;

-- =========================================================
-- RECRUITERS — add intelligence columns
-- =========================================================
ALTER TABLE public.recruiters
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warmth_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_rate numeric,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_tier text,                -- 'A','B','C'
  ADD COLUMN IF NOT EXISTS contact_status text DEFAULT 'cold', -- 'cold','warming','engaged','silent'
  ADD COLUMN IF NOT EXISTS source text;

-- =========================================================
-- OUTREACH DRAFTS (approval-staged)
-- =========================================================
CREATE TABLE public.outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recruiter_id uuid REFERENCES public.recruiters(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'linkedin',  -- 'linkedin','email','intro_request','followup'
  variant text NOT NULL DEFAULT 'cold',
  subject text,
  body text NOT NULL,
  reasoning text,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending',    -- 'pending','approved','rejected','sent'
  agent_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX outreach_drafts_user_idx ON public.outreach_drafts(user_id, status);
ALTER TABLE public.outreach_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY outreach_drafts_owner_all ON public.outreach_drafts FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ANALYTICS EVENTS (lightweight per-user funnel log)
-- =========================================================
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,                  -- 'job.viewed','job.imported','recruiter.contacted','resume.tailored','interview.scheduled', etc.
  subject_type text,
  subject_id uuid,
  value numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_user_kind_idx ON public.analytics_events(user_id, kind, created_at DESC);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_events_owner_all ON public.analytics_events FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);
