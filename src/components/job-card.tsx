import type { JobOpportunity } from "@/lib/mock-data";

const stageBadge: Record<string, string> = {
  discovered: "bg-secondary text-foreground",
  tailoring: "bg-accent/10 text-accent",
  ready: "bg-success/10 text-success",
  applied: "bg-foreground text-background",
  outreach: "bg-warning/15 text-warning",
  interview: "bg-success text-white",
  offer: "bg-accent text-white",
};

export function JobCard({ job, dense = false }: { job: JobOpportunity; dense?: boolean }) {
  return (
    <article className="group p-5 rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-lg tracking-tight font-extrabold truncate">
              {job.title}
            </h3>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted">
              {job.remote}
            </span>
          </div>
          <p className="text-sm text-muted">
            {job.company} · {job.location} · <span className="text-foreground">{job.salary}</span>
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="font-display text-2xl font-extrabold leading-none text-accent">
            {job.matchScore}
          </span>
          <span className="text-[9px] uppercase font-mono text-muted tracking-widest mt-0.5">
            match
          </span>
        </div>
      </div>

      {!dense && (
        <div className="rounded-lg bg-secondary/60 p-3 mb-3 border border-border">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
            AI reasoning
          </p>
          <p className="text-xs leading-relaxed text-foreground/80 italic">{job.reasoning}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {job.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[10px] font-mono uppercase tracking-wider text-muted px-2 py-0.5 rounded border border-border bg-background"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase text-muted shrink-0">
          <span>ATS {job.atsScore}</span>
          <span className="text-accent">{job.interviewProbability}% interview</span>
        </div>
      </div>

      {job.status && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted">{job.status}</span>
          <span
            className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded ${
              stageBadge[job.stage] ?? "bg-secondary text-foreground"
            }`}
          >
            {job.stage}
          </span>
        </div>
      )}
    </article>
  );
}
