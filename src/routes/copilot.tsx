import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/copilot")({
  component: Copilot,
  head: () => ({ meta: [{ title: "Copilot — Aether OS" }] }),
});

const SUGGESTIONS = [
  "Find remote AWS architect roles paying $200k+",
  "Why is my ATS score low for the Linear application?",
  "Generate recruiter outreach for the Stripe role",
  "Prepare me for tomorrow's Linear loop",
  "What jobs should I prioritize this week?",
  "What skills am I missing for staff-level infra roles?",
];

const TRANSCRIPT = [
  {
    role: "user" as const,
    text: "What jobs should I prioritize this week?",
  },
  {
    role: "agent" as const,
    text:
      "Three roles dominate your ROI curve: (1) Stellaris — 98 match, recruiter active, auto-apply ready. (2) Linear Staff DevOps — interview already scheduled, focus prep. (3) Perplexity founding — warm intro path detected via two former colleagues. Everything else can wait until Thursday.",
  },
  {
    role: "user" as const,
    text: "Why Stellaris over Anthropic?",
  },
  {
    role: "agent" as const,
    text:
      "Stellaris has lower competitor density (estimated 38 applicants vs 410 at Anthropic), an active recruiter who replies within 6h on average, and a salary band above your floor. Anthropic is a stretch — leadership tone resume queued, outreach goes Tuesday.",
  },
];

function Copilot() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
            Career copilot
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight font-extrabold">
            Ask the <span className="font-serif italic font-bold">fleet</span>.
          </h1>
          <p className="text-muted mt-2">
            One conversation. Six specialists listening. Full memory of your career.
          </p>
        </div>

        <div className="border border-border rounded-2xl bg-card overflow-hidden">
          <div className="p-6 space-y-6 max-h-[480px] overflow-y-auto">
            {TRANSCRIPT.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-foreground text-background text-sm">
                    {m.text}
                  </div>
                ) : (
                  <div className="max-w-[85%]">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1.5">
                      Strategist
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{m.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Command your agent…"
              className="flex-1 bg-transparent outline-none text-sm px-3 py-2 placeholder:text-muted"
            />
            <button className="px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-md">
              Send
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
            Try
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="px-3 py-1.5 rounded-full border border-border bg-card text-xs hover:border-foreground/30 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
