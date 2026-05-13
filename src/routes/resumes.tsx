import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { extractResumeText } from "@/lib/resume-extract.client";
import {
  ingestResume,
  listResumes,
  setBaseResume,
  deleteResume,
  getResume,
} from "@/lib/resumes.functions";

export const Route = createFileRoute("/resumes")({
  component: ResumesPage,
  head: () => ({
    meta: [
      { title: "Resume Vault — Aether OS" },
      {
        name: "description",
        content:
          "Upload and version every resume. Aether OS parses your baseline, tracks tailored drafts, and feeds the writer agent.",
      },
    ],
  }),
});

function ResumesPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><Loading /></AppShell>;
  if (!user) return <AppShell><SignInGate /></AppShell>;
  return <Authed userId={user.id} />;
}

function Authed({ userId }: { userId: string }) {
  const _list = useServerFn(listResumes);
  const _ingest = useServerFn(ingestResume);
  const _setBase = useServerFn(setBaseResume);
  const _delete = useServerFn(deleteResume);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["resumes"], queryFn: () => _list() });
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      setError(null);
      setProgress("Reading file…");
      const text = await extractResumeText(file);
      if (text.length < 50) throw new Error("Could not extract enough text from this file.");
      setProgress("Uploading to vault…");
      const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
      const up = await supabase.storage.from("resumes").upload(path, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);
      setProgress("Parsing with AI…");
      await _ingest({
        data: { filename: file.name, storage_path: path, raw_text: text, is_base: true } as any,
      });
      setProgress(null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
    onError: (e: any) => {
      setProgress(null);
      setError(e.message ?? String(e));
    },
  });

  const setBase = useMutation({
    mutationFn: (id: string) => _setBase({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => _delete({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });

  const resumes = list.data?.resumes ?? [];
  const base = resumes.find((r: any) => r.is_base);
  const tailored = resumes.filter((r: any) => !r.is_base);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 pb-32">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Resume Vault</div>
        <h1 className="mt-2 font-serif italic text-4xl">Every version. One canonical baseline.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload your master resume — Aether OS extracts skills, achievements, and seniority, then anchors every
          tailored draft to it.
        </p>

        {/* Uploader */}
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card p-6 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="font-display font-semibold">Upload baseline resume</div>
            <div className="text-xs text-muted mt-1">PDF or DOCX · parsed locally then enriched by the Analyzer agent</div>
          </div>
          <div className="flex items-center gap-3">
            {progress && <span className="text-xs font-mono text-accent">{progress}</span>}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
              className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {upload.isPending ? "Working…" : "Choose file"}
            </button>
          </div>
        </div>
        {error && <div className="mt-3 text-xs text-destructive">⚠ {error}</div>}

        {/* Base */}
        <section className="mt-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Baseline</h2>
          {base ? (
            <ResumeCard resume={base} onPreview={() => setPreviewId(base.id)} onDelete={() => del.mutate(base.id)} isBase />
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted">No baseline yet — upload above.</div>
          )}
        </section>

        {/* Tailored */}
        <section className="mt-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold mb-3">Tailored drafts</h2>
          {tailored.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted">
              No tailored drafts yet. Add a job in <Link to="/intake" className="text-accent hover:underline">Job Intake</Link> and the Writer agent will generate one.
            </div>
          ) : (
            <div className="space-y-3">
              {tailored.map((r: any) => (
                <ResumeCard
                  key={r.id}
                  resume={r}
                  onPreview={() => setPreviewId(r.id)}
                  onDelete={() => del.mutate(r.id)}
                  onSetBase={() => setBase.mutate(r.id)}
                />
              ))}
            </div>
          )}
        </section>

        {previewId && <PreviewModal id={previewId} onClose={() => setPreviewId(null)} />}
      </div>
    </AppShell>
  );
}

function ResumeCard({
  resume,
  onPreview,
  onDelete,
  onSetBase,
  isBase,
}: {
  resume: any;
  onPreview: () => void;
  onDelete: () => void;
  onSetBase?: () => void;
  isBase?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isBase && <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-mono uppercase tracking-wider">Baseline</span>}
          <span className="font-display font-semibold truncate">{resume.label}</span>
        </div>
        <div className="mt-1 text-xs text-muted">
          {resume.source_filename ?? "—"} · {resume.seniority ?? "n/a"} · {resume.years_experience ?? "?"}y experience
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(resume.skills ?? []).slice(0, 10).map((s: string) => (
            <span key={s} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">{s}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {resume.ats_score != null && (
          <span className="px-2 py-1 rounded bg-secondary font-mono">ATS {resume.ats_score}</span>
        )}
        <button onClick={onPreview} className="px-3 py-1.5 rounded-md border border-border hover:bg-secondary">Preview</button>
        {onSetBase && <button onClick={onSetBase} className="px-3 py-1.5 rounded-md border border-border hover:bg-secondary">Set as base</button>}
        <button onClick={onDelete} className="px-3 py-1.5 rounded-md border border-border text-destructive hover:bg-destructive/5">Delete</button>
      </div>
    </div>
  );
}

function PreviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const _get = useServerFn(getResume);
  const q = useQuery({ queryKey: ["resume", id], queryFn: () => _get({ data: { id } as any }) });
  const r = q.data?.resume as any;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-6" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="font-display font-semibold">{r?.label ?? "Loading…"}</div>
          <button onClick={onClose} className="text-muted hover:text-foreground">×</button>
        </div>
        <div className="p-5">
          {r?.rendered_md ? (
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{r.rendered_md}</pre>
          ) : (
            <pre className="whitespace-pre-wrap text-xs font-mono">{JSON.stringify(r?.content ?? {}, null, 2)}</pre>
          )}
          {r?.parsed_text && (
            <details className="mt-6">
              <summary className="text-xs font-mono text-muted cursor-pointer">Raw parsed text</summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] text-muted">{r.parsed_text}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function Loading() { return <div className="px-6 py-32 text-center text-sm text-muted">Loading…</div>; }
function SignInGate() {
  return (
    <div className="max-w-md mx-auto pt-32 px-6 text-center">
      <h1 className="font-serif italic text-3xl">Sign in to access your vault</h1>
      <Link to="/login" className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium">Sign in</Link>
    </div>
  );
}
