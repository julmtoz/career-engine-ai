
-- ============================================================================
-- AETHER OS — System Foundation Migration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.agent_kind AS ENUM (
  'scout', 'analyzer', 'writer', 'strategist',
  'outreach', 'follow_up', 'interviewer', 'orchestrator'
);
CREATE TYPE public.run_status AS ENUM (
  'queued', 'running', 'succeeded', 'failed', 'cancelled', 'awaiting_approval'
);
CREATE TYPE public.workflow_status AS ENUM (
  'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
);
CREATE TYPE public.task_status AS ENUM (
  'pending', 'claimed', 'running', 'succeeded', 'failed', 'dead_letter', 'cancelled'
);
CREATE TYPE public.application_stage AS ENUM (
  'discovered', 'tailoring', 'ready', 'applied',
  'outreach', 'interview', 'offer', 'rejected', 'withdrawn'
);
CREATE TYPE public.event_kind AS ENUM (
  'job.discovered', 'job.scored', 'resume.tailored', 'application.submitted',
  'outreach.sent', 'outreach.replied', 'interview.scheduled', 'interview.completed',
  'offer.received', 'agent.thinking', 'agent.decision', 'system.error',
  'approval.requested', 'approval.granted', 'approval.denied'
);
CREATE TYPE public.autonomy_level AS ENUM ('manual', 'assisted', 'auto', 'full_auto');

-- ---------- IDENTITY & ROLES ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  headline TEXT,
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ---------- USER PREFERENCES (autonomy, throttling, targeting) ----------
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  autonomy public.autonomy_level NOT NULL DEFAULT 'assisted',
  daily_application_cap INT NOT NULL DEFAULT 10,
  daily_outreach_cap INT NOT NULL DEFAULT 15,
  min_match_score INT NOT NULL DEFAULT 70,
  min_confidence_to_act NUMERIC(3,2) NOT NULL DEFAULT 0.75,
  target_titles TEXT[] DEFAULT '{}',
  target_locations TEXT[] DEFAULT '{}',
  target_remote TEXT[] DEFAULT '{Remote,Hybrid}',
  salary_floor INT,
  excluded_companies TEXT[] DEFAULT '{}',
  notification_channels JSONB NOT NULL DEFAULT '{"in_app":true,"email":false}',
  quiet_hours JSONB NOT NULL DEFAULT '{"start":"22:00","end":"07:00"}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- AGENT FLEET ----------
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codename TEXT NOT NULL,
  kind public.agent_kind NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  system_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, codename)
);
CREATE INDEX idx_agents_user_kind ON public.agents(user_id, kind);

CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  workflow_run_id UUID,
  task_id UUID,
  status public.run_status NOT NULL DEFAULT 'queued',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  reasoning TEXT,
  confidence NUMERIC(3,2),
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  duration_ms INT,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_runs_user_created ON public.agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_workflow ON public.agent_runs(workflow_run_id);
CREATE INDEX idx_agent_runs_status ON public.agent_runs(status) WHERE status IN ('queued','running','awaiting_approval');

-- ---------- WORKFLOW ENGINE ----------
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,        -- { kind: 'event'|'cron'|'manual', ... }
  graph JSONB NOT NULL,          -- nodes + edges describing the DAG
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_template BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflows_user ON public.workflows(user_id);

CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status public.workflow_status NOT NULL DEFAULT 'pending',
  trigger_event_id UUID,
  context JSONB NOT NULL DEFAULT '{}',  -- shared blackboard between nodes
  current_node TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflow_runs_user_status ON public.workflow_runs(user_id, status);

CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  agent_kind public.agent_kind,
  status public.run_status NOT NULL DEFAULT 'queued',
  attempt INT NOT NULL DEFAULT 1,
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflow_steps_run ON public.workflow_steps(workflow_run_id);

-- ---------- DURABLE TASK QUEUE ----------
CREATE TABLE public.task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                       -- e.g. 'agent.run', 'workflow.tick'
  payload JSONB NOT NULL DEFAULT '{}',
  priority INT NOT NULL DEFAULT 100,        -- lower = higher priority
  status public.task_status NOT NULL DEFAULT 'pending',
  attempt INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  last_error TEXT,
  workflow_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_queue_ready
  ON public.task_queue(scheduled_for, priority)
  WHERE status = 'pending';
CREATE INDEX idx_task_queue_user ON public.task_queue(user_id, status);

-- ---------- EVENT BUS (immutable log) ----------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.event_kind NOT NULL,
  source TEXT NOT NULL,               -- e.g. 'agent:scout', 'system', 'user'
  subject_type TEXT,                  -- 'job' | 'application' | 'outreach' ...
  subject_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_user_created ON public.events(user_id, created_at DESC);
CREATE INDEX idx_events_kind ON public.events(user_id, kind, created_at DESC);
CREATE INDEX idx_events_subject ON public.events(subject_type, subject_id);

-- ---------- JOB PIPELINE ----------
CREATE TABLE public.job_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,
  source TEXT,                       -- 'linkedin' | 'greenhouse' | 'careers_page' ...
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  remote TEXT,                       -- 'Remote' | 'Hybrid' | 'Onsite'
  salary_min INT,
  salary_max INT,
  description TEXT,
  url TEXT,
  posted_at TIMESTAMPTZ,
  match_score INT,
  ats_score INT,
  interview_probability INT,
  reasoning TEXT,
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, external_id)
);
CREATE INDEX idx_jobs_user_score ON public.job_opportunities(user_id, match_score DESC);
CREATE INDEX idx_jobs_embedding ON public.job_opportunities
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
  stage public.application_stage NOT NULL DEFAULT 'discovered',
  resume_version_id UUID,
  cover_letter_id UUID,
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
CREATE INDEX idx_apps_user_stage ON public.applications(user_id, stage);

CREATE TABLE public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_stage public.application_stage,
  to_stage public.application_stage NOT NULL,
  actor TEXT NOT NULL,                -- 'user' | 'agent:writer' ...
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_events_app ON public.application_events(application_id, created_at DESC);

-- ---------- RESUMES & COVER LETTERS ----------
CREATE TABLE public.resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_base BOOLEAN NOT NULL DEFAULT false,
  content JSONB NOT NULL,            -- structured: sections, bullets, keywords
  rendered_md TEXT,
  parent_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
  ats_score INT,
  keyword_density JSONB,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resumes_user ON public.resume_versions(user_id, created_at DESC);

CREATE TABLE public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
  tone TEXT,
  body TEXT NOT NULL,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- RECRUITERS, OUTREACH, INTERVIEWS ----------
CREATE TABLE public.recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  email TEXT,
  linkedin_url TEXT,
  notes TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES public.recruiters(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  next_followup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outreach_user ON public.outreach_threads(user_id, status);

CREATE TABLE public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.outreach_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,        -- 'outbound' | 'inbound'
  body TEXT NOT NULL,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  duration_min INT,
  format TEXT,                    -- 'phone' | 'video' | 'onsite'
  round TEXT,
  prep_notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- VECTOR MEMORY (semantic recall) ----------
CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,             -- 'profile' | 'job' | 'recruiter' | 'global'
  scope_id UUID,
  kind TEXT NOT NULL,              -- 'fact' | 'preference' | 'skill' | 'outcome'
  content TEXT NOT NULL,
  embedding vector(1536),
  importance NUMERIC(3,2) DEFAULT 0.5,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_user_scope ON public.agent_memory(user_id, scope);
CREATE INDEX idx_memory_embedding ON public.agent_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------- AI DECISIONS (transparency / explainability) ----------
CREATE TABLE public.ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,      -- 'job' | 'outreach' | 'resume' ...
  subject_id UUID,
  decision TEXT NOT NULL,          -- 'apply' | 'skip' | 'reach_out' ...
  rationale TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  signals JSONB NOT NULL DEFAULT '{}',   -- structured contributing factors
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_decisions_user ON public.ai_decisions(user_id, created_at DESC);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,              -- 'approval_required' | 'interview_scheduled' ...
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info',  -- info | success | warn | error
  link TEXT,
  read_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ---------- AUDIT LOG ----------
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,             -- 'user:<id>' | 'agent:<kind>' | 'system'
  action TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  before JSONB,
  after JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON public.audit_log(user_id, created_at DESC);

-- ---------- INTEGRATIONS ----------
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,          -- 'linkedin' | 'gmail' | 'greenhouse' ...
  status TEXT NOT NULL DEFAULT 'connected',
  credentials JSONB NOT NULL DEFAULT '{}',  -- store via secrets in real impl
  meta JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- ---------- TRIGGERS ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_workflows_touch BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_applications_touch BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_task_queue_touch BEFORE UPDATE ON public.task_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New-user bootstrap: create profile + default preferences + base 'user' role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- ROW LEVEL SECURITY ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_self_upsert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Roles (read your own; only admin can mutate)
CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Generic owner policies for the rest
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'user_preferences','agents','workflows','workflow_runs','task_queue',
    'events','job_opportunities','applications','application_events',
    'resume_versions','cover_letters','recruiters','outreach_threads',
    'outreach_messages','interviews','agent_memory','ai_decisions',
    'notifications','integrations'
  ])
  LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_owner_all" ON public.%1$I FOR ALL
        USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
        WITH CHECK (auth.uid() = user_id);
    $f$, t);
  END LOOP;
END $$;

-- Read-only tables for users (system writes via service role)
CREATE POLICY "agent_runs_owner_read" ON public.agent_runs FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "workflow_steps_owner_read" ON public.workflow_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflow_runs wr
    WHERE wr.id = workflow_run_id AND wr.user_id = auth.uid()
  ));
CREATE POLICY "audit_owner_read" ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
