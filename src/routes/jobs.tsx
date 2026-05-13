import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { JobCard } from "@/components/job-card";
import { jobs } from "@/lib/mock-data";

export const Route = createFileRoute("/jobs")({
  component: Jobs,
  head: () => ({
    meta: [
      { title: "Opportunities — Aether OS" },
      { name: "description", content: "AI-ranked job opportunities, prioritized by interview probability." },
    ],
  }),
});

const FILTERS = ["All", "Remote", "Hybrid", "Onsite"] as const;

function Jobs() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const filtered = filter === "All" ? jobs : jobs.filter((j) => j.remote === filter);
  const sorted = [...filtered].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
              Opportunity feed
            </p>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold">
              <span className="font-serif italic font-bold">142</span> live opportunities
            </h1>
            <p className="text-muted mt-2">Re-ranked by interview probability, refreshed 4m ago.</p>
          </div>
          <div className="flex gap-1 p-1 bg-secondary rounded-md">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === f ? "bg-card shadow-sm text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
