import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getCareerProfile, saveCareerProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Career Profile — Aether OS" },
      {
        name: "description",
        content:
          "Define the targeting criteria that drive every Aether OS agent decision: target titles, locations, salary, skills, deal-breakers, and more.",
      },
    ],
  }),
});

const TONES = ["professional", "warm", "direct", "enthusiastic", "concise"] as const;
const MODES = ["Remote", "Hybrid", "Onsite"] as const;

type FormState = {
  target_titles: string[];
  preferred_industries: string[];
  salary_target_min: number | null;
  salary_target_max: number | null;
  preferred_locations: string[];
  work_mode: ("Remote" | "Hybrid" | "Onsite")[];
  work_authorization: string;
  skills: string[];
  certifications: string[];
  career_goals: string;
  deal_breakers: string;
  communication_tone: (typeof TONES)[number];
  resume_baseline: string;
  seniority: string;
  years_experience: number | null;
};

const EMPTY: FormState = {
  target_titles: [],
  preferred_industries: [],
  salary_target_min: null,
  salary_target_max: null,
  preferred_locations: [],
  work_mode: ["Remote", "Hybrid"],
  work_authorization: "",
  skills: [],
  certifications: [],
  career_goals: "",
  deal_breakers: "",
  communication_tone: "professional",
  resume_baseline: "",
  seniority: "",
  years_experience: null,
};

function ProfilePage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><Loading /></AppShell>;
  if (!user) return <AppShell><SignInGate /></AppShell>;
  return <Authed />;
}

function Authed() {
  const _get = useServerFn(getCareerProfile);
  const _save = useServerFn(saveCareerProfile);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["career-profile"], queryFn: () => _get() });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data?.profile) {
      const p = q.data.profile as any;
      setForm({
        target_titles: p.target_titles ?? [],
        preferred_industries: p.preferred_industries ?? [],
        salary_target_min: p.salary_target_min ?? null,
        salary_target_max: p.salary_target_max ?? null,
        preferred_locations: p.preferred_locations ?? [],
        work_mode: p.work_mode ?? ["Remote", "Hybrid"],
        work_authorization: p.work_authorization ?? "",
        skills: p.skills ?? [],
        certifications: p.certifications ?? [],
        career_goals: p.career_goals ?? "",
        deal_breakers: p.deal_breakers ?? "",
        communication_tone: p.communication_tone ?? "professional",
        resume_baseline: p.resume_baseline ?? "",
        seniority: p.seniority ?? "",
        years_experience: p.years_experience ?? null,
      });
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      _save({
        data: {
          ...form,
          work_authorization: form.work_authorization || null,
          career_goals: form.career_goals || null,
          deal_breakers: form.deal_breakers || null,
          resume_baseline: form.resume_baseline || null,
          seniority: form.seniority || null,
        } as any,
      }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["career-profile"] });
      setTimeout(() => setSaved(false), 2200);
    },
  });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10 pb-32">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Career Profile</div>
        <h1 className="mt-2 font-serif italic text-4xl tracking-tight">The signal every agent reads from.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Aether OS uses your profile to score opportunities, tailor resumes, and frame outreach. Be specific —
          deal-breakers and salary floors prevent wasted cycles.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-10 space-y-10"
        >
          <Section title="Targeting">
            <Field label="Target job titles">
              <TagInput value={form.target_titles} onChange={(v) => setForm({ ...form, target_titles: v })} placeholder="Staff AI Engineer, Senior Product Engineer…" />
            </Field>
            <Field label="Preferred industries">
              <TagInput value={form.preferred_industries} onChange={(v) => setForm({ ...form, preferred_industries: v })} placeholder="AI infra, fintech, dev tools…" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Seniority"><Input value={form.seniority} onChange={(v) => setForm({ ...form, seniority: v })} placeholder="senior, staff, principal…" /></Field>
              <Field label="Years of experience"><Input type="number" value={form.years_experience ?? ""} onChange={(v) => setForm({ ...form, years_experience: v === "" ? null : Number(v) })} placeholder="8" /></Field>
            </div>
          </Section>

          <Section title="Compensation & location">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Salary floor (USD)"><Input type="number" value={form.salary_target_min ?? ""} onChange={(v) => setForm({ ...form, salary_target_min: v === "" ? null : Number(v) })} placeholder="180000" /></Field>
              <Field label="Salary ceiling (USD)"><Input type="number" value={form.salary_target_max ?? ""} onChange={(v) => setForm({ ...form, salary_target_max: v === "" ? null : Number(v) })} placeholder="260000" /></Field>
            </div>
            <Field label="Preferred locations">
              <TagInput value={form.preferred_locations} onChange={(v) => setForm({ ...form, preferred_locations: v })} placeholder="NYC, Remote US, Berlin…" />
            </Field>
            <Field label="Work mode">
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => {
                  const active = form.work_mode.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          work_mode: active ? form.work_mode.filter((x) => x !== m) : [...form.work_mode, m],
                        })
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider border transition ${active ? "bg-foreground text-background border-foreground" : "border-border text-muted hover:text-foreground"}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Work authorization"><Input value={form.work_authorization} onChange={(v) => setForm({ ...form, work_authorization: v })} placeholder="US citizen, EU work permit, requires sponsorship…" /></Field>
          </Section>

          <Section title="Skills & credentials">
            <Field label="Skills"><TagInput value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} placeholder="TypeScript, Postgres, LLM orchestration…" /></Field>
            <Field label="Certifications"><TagInput value={form.certifications} onChange={(v) => setForm({ ...form, certifications: v })} placeholder="AWS Solutions Architect, CKA…" /></Field>
          </Section>

          <Section title="Goals & guardrails">
            <Field label="Career goals">
              <Textarea value={form.career_goals} onChange={(v) => setForm({ ...form, career_goals: v })} placeholder="What do you want from your next 3 years? What kind of work matters?" />
            </Field>
            <Field label="Deal-breakers">
              <Textarea value={form.deal_breakers} onChange={(v) => setForm({ ...form, deal_breakers: v })} placeholder="Companies, technologies, or work styles you will not consider." />
            </Field>
            <Field label="Communication tone">
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, communication_tone: t })}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider border transition ${form.communication_tone === t ? "bg-foreground text-background border-foreground" : "border-border text-muted hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Resume baseline">
            <Field label="Optional — paste a baseline summary the Writer agent should anchor to">
              <Textarea
                value={form.resume_baseline}
                onChange={(v) => setForm({ ...form, resume_baseline: v })}
                placeholder="Short narrative of your career so far. Or upload a resume in the Resume Vault to populate this automatically."
                rows={6}
              />
            </Field>
            <Link to="/resumes" className="text-xs text-accent hover:underline">→ Open Resume Vault to upload a file</Link>
          </Section>

          <div className="sticky bottom-20 z-10 flex items-center gap-3 bg-background/90 backdrop-blur border-t border-border py-3">
            <button
              type="submit"
              disabled={save.isPending}
              className="px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save profile"}
            </button>
            {saved && <span className="text-xs font-mono text-success">Saved · agents updated</span>}
          </div>
        </form>
      </div>
    </AppShell>
  );
}

// ---------- Form primitives ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="font-display text-xs uppercase tracking-[0.2em] font-semibold">{title}</h2>
      <div className="space-y-5 rounded-lg border border-border bg-card p-6">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted">{label}</div>
      {children}
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder }: { value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value as any}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setDraft("");
  };
  return (
    <div className="rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap items-center gap-1.5">
      {value.map((t) => (
        <span key={t} className="px-2 py-0.5 rounded bg-secondary text-xs font-mono inline-flex items-center gap-1">
          {t}
          <button type="button" className="text-muted hover:text-destructive" onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent px-1 py-1 text-sm focus:outline-none"
      />
    </div>
  );
}
function Loading() {
  return <div className="px-6 py-32 text-center text-sm text-muted">Loading…</div>;
}
function SignInGate() {
  return (
    <div className="max-w-md mx-auto pt-32 px-6 text-center">
      <h1 className="font-serif italic text-3xl">Sign in to build your profile</h1>
      <Link to="/login" className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium">Sign in</Link>
    </div>
  );
}
