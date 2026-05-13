import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MatchRing } from "@/components/match-ring";

export const Route = createFileRoute("/resume")({
  component: ResumePage,
  head: () => ({ meta: [{ title: "Resume intelligence — Aether OS" }] }),
});

const VERSIONS = [
  { id: "v1", name: "Identity-V3 · Cloud Architect", ats: 96, used: 14, replies: 4, current: true },
  { id: "v2", name: "Leadership-V2 · Director SRE", ats: 91, used: 6, replies: 1 },
  { id: "v3", name: "Startup-V1 · Founding Eng", ats: 87, used: 9, replies: 2 },
  { id: "v4", name: "Security-V2 · CISSP focus", ats: 89, used: 4, replies: 1 },
];

function ResumePage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
            Resume intelligence
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold">
            Four versions.
            <br />
            <span className="font-serif italic font-bold">One identity per role.</span>
          </h1>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-3">
            {VERSIONS.map((v) => (
              <div
                key={v.id}
                className={`p-5 rounded-2xl border bg-card flex items-center justify-between ${
                  v.current ? "border-accent/30 bg-accent/5" : "border-border"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-lg font-extrabold tracking-tight">
                      {v.name}
                    </h3>
                    {v.current && (
                      <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-accent text-white rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    Used {v.used}× · {v.replies} recruiter replies
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-display text-2xl font-extrabold text-accent">{v.ats}</div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted">
                      ATS
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-secondary">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card grid place-items-center">
              <MatchRing value={96} label="Avg ATS" />
              <p className="text-xs text-muted text-center mt-4">
                Across all 4 versions
              </p>
            </div>
            <div className="p-6 bg-foreground text-background rounded-2xl">
              <p className="text-[10px] font-mono uppercase tracking-widest text-background/50 mb-3">
                Writer agent insight
              </p>
              <p className="text-sm leading-relaxed font-serif italic">
                "Identity-V3 is converting at 28% recruiter reply rate — 2.4x your other versions.
                Recommend defaulting it for all infra roles for the next 14 days."
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
