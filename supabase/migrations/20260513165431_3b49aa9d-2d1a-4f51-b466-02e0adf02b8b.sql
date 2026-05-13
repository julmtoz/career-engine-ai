
-- 1) career_profiles ---------------------------------------------------------
CREATE TABLE public.career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  target_titles text[] NOT NULL DEFAULT '{}',
  preferred_industries text[] NOT NULL DEFAULT '{}',
  salary_target_min integer,
  salary_target_max integer,
  preferred_locations text[] NOT NULL DEFAULT '{}',
  work_mode text[] NOT NULL DEFAULT '{Remote,Hybrid}',
  work_authorization text,
  skills text[] NOT NULL DEFAULT '{}',
  certifications text[] NOT NULL DEFAULT '{}',
  career_goals text,
  deal_breakers text,
  communication_tone text NOT NULL DEFAULT 'professional',
  resume_baseline text,
  seniority text,
  years_experience numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_profiles_owner_all ON public.career_profiles
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER career_profiles_touch
  BEFORE UPDATE ON public.career_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) pending_actions ---------------------------------------------------------
CREATE TABLE public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,                -- 'resume_tailor' | 'cover_letter' | 'outreach_email' | 'apply'
  subject_type text,                 -- 'job' | 'application' | etc
  subject_id uuid,
  title text NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'expired'
  agent_kind text,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pending_actions_owner_all ON public.pending_actions
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX pending_actions_user_status_idx
  ON public.pending_actions(user_id, status, created_at DESC);

-- 3) resumes storage bucket --------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes','resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resumes_owner_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_owner_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_owner_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4) resume_versions parsed fields -------------------------------------------
ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS source_filename text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS parsed_text text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority text,
  ADD COLUMN IF NOT EXISTS years_experience numeric,
  ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detected_titles text[] DEFAULT '{}';

-- 5) job_opportunities richer fields -----------------------------------------
ALTER TABLE public.job_opportunities
  ADD COLUMN IF NOT EXISTS requirements text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS responsibilities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority text,
  ADD COLUMN IF NOT EXISTS apply_url text,
  ADD COLUMN IF NOT EXISTS intake_kind text,
  ADD COLUMN IF NOT EXISTS raw_input text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
