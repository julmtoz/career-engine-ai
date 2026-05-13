export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          importance: number | null
          kind: string
          meta: Json | null
          scope: string
          scope_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number | null
          kind: string
          meta?: Json | null
          scope: string
          scope_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number | null
          kind?: string
          meta?: Json | null
          scope?: string
          scope_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_id: string | null
          confidence: number | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          output: Json | null
          reasoning: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          task_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
          workflow_run_id: string | null
        }
        Insert: {
          agent_id?: string | null
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json | null
          reasoning?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          task_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
          workflow_run_id?: string | null
        }
        Update: {
          agent_id?: string | null
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json | null
          reasoning?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          task_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          codename: string
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["agent_kind"]
          model: string
          system_prompt: string | null
          user_id: string
        }
        Insert: {
          codename: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["agent_kind"]
          model?: string
          system_prompt?: string | null
          user_id: string
        }
        Update: {
          codename?: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["agent_kind"]
          model?: string
          system_prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_decisions: {
        Row: {
          agent_run_id: string | null
          confidence: number
          created_at: string
          decision: string
          id: string
          rationale: string
          signals: Json
          subject_id: string | null
          subject_type: string
          user_id: string
        }
        Insert: {
          agent_run_id?: string | null
          confidence: number
          created_at?: string
          decision: string
          id?: string
          rationale: string
          signals?: Json
          subject_id?: string | null
          subject_type: string
          user_id: string
        }
        Update: {
          agent_run_id?: string | null
          confidence?: number
          created_at?: string
          decision?: string
          id?: string
          rationale?: string
          signals?: Json
          subject_id?: string | null
          subject_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_decisions_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor: string
          application_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["application_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["application_stage"]
          user_id: string
        }
        Insert: {
          actor: string
          application_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["application_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["application_stage"]
          user_id: string
        }
        Update: {
          actor?: string
          application_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["application_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["application_stage"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_letter_id: string | null
          created_at: string
          id: string
          job_id: string
          meta: Json
          notes: string | null
          resume_version_id: string | null
          stage: Database["public"]["Enums"]["application_stage"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          meta?: Json
          notes?: string | null
          resume_version_id?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          meta?: Json
          notes?: string | null
          resume_version_id?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          ip: string | null
          subject_id: string | null
          subject_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      career_profiles: {
        Row: {
          career_goals: string | null
          certifications: string[]
          communication_tone: string
          created_at: string
          deal_breakers: string | null
          id: string
          preferred_industries: string[]
          preferred_locations: string[]
          resume_baseline: string | null
          salary_target_max: number | null
          salary_target_min: number | null
          seniority: string | null
          skills: string[]
          target_titles: string[]
          updated_at: string
          user_id: string
          work_authorization: string | null
          work_mode: string[]
          years_experience: number | null
        }
        Insert: {
          career_goals?: string | null
          certifications?: string[]
          communication_tone?: string
          created_at?: string
          deal_breakers?: string | null
          id?: string
          preferred_industries?: string[]
          preferred_locations?: string[]
          resume_baseline?: string | null
          salary_target_max?: number | null
          salary_target_min?: number | null
          seniority?: string | null
          skills?: string[]
          target_titles?: string[]
          updated_at?: string
          user_id: string
          work_authorization?: string | null
          work_mode?: string[]
          years_experience?: number | null
        }
        Update: {
          career_goals?: string | null
          certifications?: string[]
          communication_tone?: string
          created_at?: string
          deal_breakers?: string | null
          id?: string
          preferred_industries?: string[]
          preferred_locations?: string[]
          resume_baseline?: string | null
          salary_target_max?: number | null
          salary_target_min?: number | null
          seniority?: string | null
          skills?: string[]
          target_titles?: string[]
          updated_at?: string
          user_id?: string
          work_authorization?: string | null
          work_mode?: string[]
          years_experience?: number | null
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          agent_run_id: string | null
          body: string
          created_at: string
          id: string
          job_id: string | null
          tone: string | null
          user_id: string
        }
        Insert: {
          agent_run_id?: string | null
          body: string
          created_at?: string
          id?: string
          job_id?: string | null
          tone?: string | null
          user_id: string
        }
        Update: {
          agent_run_id?: string | null
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          tone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          correlation_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          payload: Json
          source: string
          subject_id: string | null
          subject_type: string | null
          user_id: string
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["event_kind"]
          payload?: Json
          source: string
          subject_id?: string | null
          subject_type?: string | null
          user_id: string
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          payload?: Json
          source?: string
          subject_id?: string | null
          subject_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          connected_at: string
          credentials: Json
          id: string
          meta: Json | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          credentials?: Json
          id?: string
          meta?: Json | null
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          credentials?: Json
          id?: string
          meta?: Json | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          duration_min: number | null
          format: string | null
          id: string
          outcome: string | null
          prep_notes: string | null
          round: string | null
          scheduled_at: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_min?: number | null
          format?: string | null
          id?: string
          outcome?: string | null
          prep_notes?: string | null
          round?: string | null
          scheduled_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_min?: number | null
          format?: string | null
          id?: string
          outcome?: string | null
          prep_notes?: string | null
          round?: string | null
          scheduled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_opportunities: {
        Row: {
          apply_url: string | null
          ats_score: number | null
          company: string
          description: string | null
          discovered_at: string
          embedding: string | null
          external_id: string | null
          id: string
          intake_kind: string | null
          interview_probability: number | null
          location: string | null
          match_score: number | null
          meta: Json | null
          posted_at: string | null
          raw_input: string | null
          reasoning: string | null
          remote: string | null
          requirements: string[] | null
          responsibilities: string[] | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          source: string | null
          tags: string[] | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          apply_url?: string | null
          ats_score?: number | null
          company: string
          description?: string | null
          discovered_at?: string
          embedding?: string | null
          external_id?: string | null
          id?: string
          intake_kind?: string | null
          interview_probability?: number | null
          location?: string | null
          match_score?: number | null
          meta?: Json | null
          posted_at?: string | null
          raw_input?: string | null
          reasoning?: string | null
          remote?: string | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          source?: string | null
          tags?: string[] | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          apply_url?: string | null
          ats_score?: number | null
          company?: string
          description?: string | null
          discovered_at?: string
          embedding?: string | null
          external_id?: string | null
          id?: string
          intake_kind?: string | null
          interview_probability?: number | null
          location?: string | null
          match_score?: number | null
          meta?: Json | null
          posted_at?: string | null
          raw_input?: string | null
          reasoning?: string | null
          remote?: string | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          source?: string | null
          tags?: string[] | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          meta: Json | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          meta?: Json | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          meta?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_messages: {
        Row: {
          agent_run_id: string | null
          body: string
          created_at: string
          direction: string
          id: string
          sent_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          agent_run_id?: string | null
          body: string
          created_at?: string
          direction: string
          id?: string
          sent_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          agent_run_id?: string | null
          body?: string
          created_at?: string
          direction?: string
          id?: string
          sent_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_threads: {
        Row: {
          application_id: string | null
          channel: string
          created_at: string
          id: string
          next_followup_at: string | null
          recruiter_id: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          next_followup_at?: string | null
          recruiter_id?: string | null
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          next_followup_at?: string | null
          recruiter_id?: string | null
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_threads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          agent_kind: string | null
          confidence: number | null
          created_at: string
          decided_at: string | null
          decision_note: string | null
          id: string
          kind: string
          payload: Json
          status: string
          subject_id: string | null
          subject_type: string | null
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          agent_kind?: string | null
          confidence?: number | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          kind: string
          payload?: Json
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          agent_kind?: string | null
          confidence?: number | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          kind?: string
          payload?: Json
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          headline: string | null
          id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          headline?: string | null
          id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruiters: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          linkedin_url: string | null
          meta: Json | null
          name: string
          notes: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          meta?: Json | null
          name: string
          notes?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          meta?: Json | null
          name?: string
          notes?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          achievements: Json | null
          agent_run_id: string | null
          ats_score: number | null
          content: Json
          created_at: string
          detected_titles: string[] | null
          id: string
          is_base: boolean
          job_id: string | null
          keyword_density: Json | null
          label: string
          parent_id: string | null
          parsed_text: string | null
          rendered_md: string | null
          seniority: string | null
          skills: string[] | null
          source_filename: string | null
          storage_path: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          achievements?: Json | null
          agent_run_id?: string | null
          ats_score?: number | null
          content: Json
          created_at?: string
          detected_titles?: string[] | null
          id?: string
          is_base?: boolean
          job_id?: string | null
          keyword_density?: Json | null
          label: string
          parent_id?: string | null
          parsed_text?: string | null
          rendered_md?: string | null
          seniority?: string | null
          skills?: string[] | null
          source_filename?: string | null
          storage_path?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          achievements?: Json | null
          agent_run_id?: string | null
          ats_score?: number | null
          content?: Json
          created_at?: string
          detected_titles?: string[] | null
          id?: string
          is_base?: boolean
          job_id?: string | null
          keyword_density?: Json | null
          label?: string
          parent_id?: string | null
          parsed_text?: string | null
          rendered_md?: string | null
          seniority?: string | null
          skills?: string[] | null
          source_filename?: string | null
          storage_path?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_queue: {
        Row: {
          attempt: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          kind: string
          last_error: string | null
          max_attempts: number
          payload: Json
          priority: number
          scheduled_for: string
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          user_id: string
          workflow_run_id: string | null
        }
        Insert: {
          attempt?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          scheduled_for?: string
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id: string
          workflow_run_id?: string | null
        }
        Update: {
          attempt?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          scheduled_for?: string
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_queue_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          autonomy: Database["public"]["Enums"]["autonomy_level"]
          daily_application_cap: number
          daily_outreach_cap: number
          excluded_companies: string[] | null
          min_confidence_to_act: number
          min_match_score: number
          notification_channels: Json
          quiet_hours: Json
          salary_floor: number | null
          target_locations: string[] | null
          target_remote: string[] | null
          target_titles: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autonomy?: Database["public"]["Enums"]["autonomy_level"]
          daily_application_cap?: number
          daily_outreach_cap?: number
          excluded_companies?: string[] | null
          min_confidence_to_act?: number
          min_match_score?: number
          notification_channels?: Json
          quiet_hours?: Json
          salary_floor?: number | null
          target_locations?: string[] | null
          target_remote?: string[] | null
          target_titles?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autonomy?: Database["public"]["Enums"]["autonomy_level"]
          daily_application_cap?: number
          daily_outreach_cap?: number
          excluded_companies?: string[] | null
          min_confidence_to_act?: number
          min_match_score?: number
          notification_channels?: Json
          quiet_hours?: Json
          salary_floor?: number | null
          target_locations?: string[] | null
          target_remote?: string[] | null
          target_titles?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          context: Json
          created_at: string
          current_node: string | null
          error: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          trigger_event_id: string | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_node?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_event_id?: string | null
          user_id: string
          workflow_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_node?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_event_id?: string | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          agent_kind: Database["public"]["Enums"]["agent_kind"] | null
          attempt: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          node_id: string
          output: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          workflow_run_id: string
        }
        Insert: {
          agent_kind?: Database["public"]["Enums"]["agent_kind"] | null
          attempt?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          node_id: string
          output?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          workflow_run_id: string
        }
        Update: {
          agent_kind?: Database["public"]["Enums"]["agent_kind"] | null
          attempt?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          node_id?: string
          output?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          graph: Json
          id: string
          is_template: boolean
          name: string
          trigger: Json
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          graph: Json
          id?: string
          is_template?: boolean
          name: string
          trigger: Json
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          graph?: Json
          id?: string
          is_template?: boolean
          name?: string
          trigger?: Json
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_kind:
        | "scout"
        | "analyzer"
        | "writer"
        | "strategist"
        | "outreach"
        | "follow_up"
        | "interviewer"
        | "orchestrator"
      app_role: "admin" | "user"
      application_stage:
        | "discovered"
        | "tailoring"
        | "ready"
        | "applied"
        | "outreach"
        | "interview"
        | "offer"
        | "rejected"
        | "withdrawn"
      autonomy_level: "manual" | "assisted" | "auto" | "full_auto"
      event_kind:
        | "job.discovered"
        | "job.scored"
        | "resume.tailored"
        | "application.submitted"
        | "outreach.sent"
        | "outreach.replied"
        | "interview.scheduled"
        | "interview.completed"
        | "offer.received"
        | "agent.thinking"
        | "agent.decision"
        | "system.error"
        | "approval.requested"
        | "approval.granted"
        | "approval.denied"
      run_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "awaiting_approval"
      task_status:
        | "pending"
        | "claimed"
        | "running"
        | "succeeded"
        | "failed"
        | "dead_letter"
        | "cancelled"
      workflow_status:
        | "pending"
        | "running"
        | "paused"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_kind: [
        "scout",
        "analyzer",
        "writer",
        "strategist",
        "outreach",
        "follow_up",
        "interviewer",
        "orchestrator",
      ],
      app_role: ["admin", "user"],
      application_stage: [
        "discovered",
        "tailoring",
        "ready",
        "applied",
        "outreach",
        "interview",
        "offer",
        "rejected",
        "withdrawn",
      ],
      autonomy_level: ["manual", "assisted", "auto", "full_auto"],
      event_kind: [
        "job.discovered",
        "job.scored",
        "resume.tailored",
        "application.submitted",
        "outreach.sent",
        "outreach.replied",
        "interview.scheduled",
        "interview.completed",
        "offer.received",
        "agent.thinking",
        "agent.decision",
        "system.error",
        "approval.requested",
        "approval.granted",
        "approval.denied",
      ],
      run_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
        "awaiting_approval",
      ],
      task_status: [
        "pending",
        "claimed",
        "running",
        "succeeded",
        "failed",
        "dead_letter",
        "cancelled",
      ],
      workflow_status: [
        "pending",
        "running",
        "paused",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
