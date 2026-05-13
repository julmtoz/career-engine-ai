
-- Extend application stage enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'phone_screen' AND enumtypid = 'application_stage'::regtype) THEN
    ALTER TYPE application_stage ADD VALUE 'phone_screen' AFTER 'applied';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'interview_2' AND enumtypid = 'application_stage'::regtype) THEN
    ALTER TYPE application_stage ADD VALUE 'interview_2' AFTER 'interview';
  END IF;
END$$;

-- Application packages
CREATE TABLE IF NOT EXISTS public.application_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  application_id UUID,
  resume_version_id UUID,
  cover_letter_id UUID,
  recruiter_outreach_id UUID,
  linkedin_outreach_id UUID,
  qa_answers JSONB NOT NULL DEFAULT '{}'::jsonb,        -- application form answers
  pitch JSONB NOT NULL DEFAULT '{}'::jsonb,             -- tell-me-about-yourself, why interested
  salary_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  followup_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  readiness_score INTEGER,                              -- 0-100
  readiness_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',                 -- draft | ready | approved | sent
  reasoning TEXT,
  confidence NUMERIC,
  agent_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.application_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY application_packages_owner_all ON public.application_packages
  FOR ALL USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS application_packages_user_job_idx ON public.application_packages(user_id, job_id);

CREATE TRIGGER application_packages_touch BEFORE UPDATE ON public.application_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  application_id UUID,
  recruiter_id UUID,
  package_id UUID,
  kind TEXT NOT NULL,             -- recruiter_followup | application_followup | thank_you | second_followup | nurture_after_rejection
  channel TEXT NOT NULL DEFAULT 'email', -- email | linkedin
  subject TEXT,
  body TEXT NOT NULL,
  send_after TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | sent | skipped | rejected
  reasoning TEXT,
  confidence NUMERIC,
  decided_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  agent_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY follow_ups_owner_all ON public.follow_ups
  FOR ALL USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS follow_ups_user_status_idx ON public.follow_ups(user_id, status, send_after);

-- Interview prep packs
CREATE TABLE IF NOT EXISTS public.interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  round TEXT,                      -- screen | technical | onsite | final
  company_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  behavioral_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  star_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_to_ask JSONB NOT NULL DEFAULT '[]'::jsonb,
  negotiation_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT,
  confidence NUMERIC,
  agent_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interview_prep ENABLE ROW LEVEL SECURITY;
CREATE POLICY interview_prep_owner_all ON public.interview_prep
  FOR ALL USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS interview_prep_user_app_idx ON public.interview_prep(user_id, application_id);
CREATE TRIGGER interview_prep_touch BEFORE UPDATE ON public.interview_prep
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Outcomes (rich, attributed)
CREATE TABLE IF NOT EXISTS public.outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  application_id UUID NOT NULL,
  job_id UUID,
  resume_version_id UUID,
  recruiter_id UUID,
  package_id UUID,
  source TEXT,                  -- mirrors job_opportunities.source for cohort attribution
  company_id UUID,
  kind TEXT NOT NULL,           -- applied | recruiter_responded | phone_screen | interview | second_interview | offer | rejected | ghosted
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY outcomes_owner_all ON public.outcomes
  FOR ALL USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS outcomes_user_kind_idx ON public.outcomes(user_id, kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS outcomes_user_app_idx ON public.outcomes(user_id, application_id);

-- Applications: readiness + package linkage
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS readiness_score INTEGER,
  ADD COLUMN IF NOT EXISTS package_id UUID;
