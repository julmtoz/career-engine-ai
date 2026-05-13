import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/outreach")({
  component: Outreach,
  head: () => ({ meta: [{ title: "Outreach — Aether OS" }] }),
});

const SEQUENCES = [
  {
    name: "Sarah Jenks",
    title: "Sr. Recruiter · Stellaris Cloud",
    status: "Replied",
    statusKind: "success" as const,
    last: "I'd love to set up a 30m intro. Are you free Thursday 2pm PT?",
    when: "2h ago",
    role: "Principal Systems Architect",
  },
  {
    name: "Marcus Patel",
    title: "Hiring Manager · NeuroFlow",
    status: "Sent — awaiting reply",
    statusKind: "wait" as const,
    last: "Personalized intro referencing their Series-B announcement.",
    when: "Sent 6h ago",
    role: "Lead AI Automation Engineer",
  },
  {
    name: "James Whitley",
    title: "Talent Lead · Linear",
    status: "Loop scheduled",
    statusKind: "success" as const,
    last: "Loop confirmed for tomorrow 10:00 PT — Interviewer agent prepping.",
    when: "Yesterday",
    role: "Staff DevOps Engineer",
  },
  {
    name: "VP Eng · Anthropic",
    title: "Cold outreach",
    status: "Queued for Tuesday",
    statusKind: "queued" as const,
    last: "Leadership-tone draft ready · waiting for optimal send window.",
    when: "Queued",
    role: "Director of Site Reliability",
  },
];

const badge = {
  success: "bg-success/10 text-success",
  wait: "bg-warning/15 text-warning",
  queued: "bg-secondary text-foreground",
};

function Outreach() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
            Outreach console
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold">
            <span className="font-serif italic font-bold">28</span> conversations in flight.
          </h1>
          <p className="text-muted mt-2">
            Outreach agent is sequencing follow-ups. Recruiter reply rate: 14%.
          </p>
        </div>

        <div className="space-y-3">
          {SEQUENCES.map((s) => (
            <div
              key={s.name}
              className="p-5 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-foreground text-background grid place-items-center font-display font-extrabold">
                    {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-extrabold tracking-tight">
                      {s.name}
                    </h3>
                    <p className="text-xs text-muted">{s.title}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded ${badge[s.statusKind]}`}
                >
                  {s.status}
                </span>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3 border border-border">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">
                  Re: {s.role}
                </p>
                <p className="text-sm text-foreground/85 italic leading-relaxed">"{s.last}"</p>
              </div>
              <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted">
                {s.when}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
