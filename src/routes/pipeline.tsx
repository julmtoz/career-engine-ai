import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { jobs, pipelineStages } from "@/lib/mock-data";

export const Route = createFileRoute("/pipeline")({
  component: Pipeline,
  head: () => ({
    meta: [
      { title: "Pipeline — Aether OS" },
      { name: "description", content: "Kanban acquisition pipeline across discovery, outreach, interviews, and offers." },
    ],
  }),
});

function Pipeline() {
  return (
    <AppShell>
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
            Acquisition pipeline
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold">
            From <span className="font-serif italic font-bold">discovered</span> to{" "}
            <span className="font-serif italic font-bold">signed</span>.
          </h1>
        </div>

        <div className="grid grid-cols-7 gap-3 min-h-[600px]">
          {pipelineStages.map((stage) => {
            const items = jobs.filter((j) => j.stage === stage.id);
            return (
              <div key={stage.id} className="flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                    {stage.label}
                  </span>
                  <span className="text-[10px] font-mono text-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-2 rounded-xl border border-border bg-secondary/40">
                  {items.length === 0 && (
                    <div className="h-full grid place-items-center text-[10px] font-mono uppercase text-muted/50 tracking-widest py-8">
                      empty
                    </div>
                  )}
                  {items.map((j) => (
                    <div
                      key={j.id}
                      className="p-3 rounded-lg bg-card border border-border hover:border-foreground/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-display text-sm font-extrabold leading-tight">
                          {j.title}
                        </span>
                        <span className="text-xs font-mono text-accent shrink-0 ml-2">
                          {j.matchScore}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted mb-2">{j.company}</p>
                      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                        <span className="text-muted">{j.remote}</span>
                        <span className="text-success">{j.interviewProbability}%</span>
                      </div>
                      {j.status && (
                        <p className="text-[10px] text-foreground/70 mt-2 pt-2 border-t border-border italic">
                          {j.status}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
