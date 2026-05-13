import { agentEvents } from "@/lib/mock-data";

const kindColor: Record<string, string> = {
  discovery: "text-accent",
  tailor: "text-foreground",
  outreach: "text-warning",
  analysis: "text-muted",
  success: "text-success",
  wait: "text-muted/60",
};

export function AgentStream({ height = "600px" }: { height?: string }) {
  // Duplicate for seamless scroll loop
  const stream = [...agentEvents, ...agentEvents];

  return (
    <div
      className="border border-border rounded-2xl bg-card overflow-hidden flex flex-col"
      style={{ height }}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Agent log stream
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent uppercase tracking-widest">
          <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
          Live
        </span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="animate-stream flex flex-col gap-3 p-4">
          {stream.map((e, i) => (
            <div
              key={`${e.id}-${i}`}
              className="p-3 rounded-lg border border-border bg-background"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono uppercase ${kindColor[e.kind]}`}>
                  [{e.timestamp}] {e.agent}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/85">{e.message}</p>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
      </div>
    </div>
  );
}
