/**
 * Mission Control — signature visual primitive for Aether OS.
 *
 * Renders a live orchestration graph (agent nodes + animated signal paths),
 * a horizontal event ticker, agent status grid, and queue lanes. This is the
 * cinematic "the system is operating" centerpiece used on the landing hero
 * and dashboard. All motion is CSS-driven, no runtime cost.
 */
import { useEffect, useState } from "react";

const AGENTS = [
  { code: "SCOUT", x: 12, y: 30, color: "var(--color-accent)" },
  { code: "STRATEGIST", x: 38, y: 18, color: "var(--color-accent)" },
  { code: "WRITER", x: 38, y: 50, color: "var(--color-signal)" },
  { code: "ANALYZER", x: 62, y: 30, color: "var(--color-accent)" },
  { code: "OUTREACH", x: 86, y: 18, color: "var(--color-warning)" },
  { code: "INTERVIEWER", x: 86, y: 50, color: "var(--color-signal)" },
];

const PATHS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 4],
];

const TICKER = [
  { t: "14:21:02", a: "SCOUT", m: "Detected Lead Engineer · Vercel · score 98", k: "ok" },
  { t: "14:20:47", a: "STRATEGIST", m: "Re-ranked queue · Stripe → P0", k: "ok" },
  { t: "14:19:44", a: "WRITER", m: "Tailored CV v14 · keyword density +34%", k: "ok" },
  { t: "14:18:12", a: "OUTREACH", m: "Scheduled follow-up · Linear · T+48h", k: "warn" },
  { t: "14:15:00", a: "ANALYZER", m: "Salary delta detected · SF infra · +8%", k: "ok" },
  { t: "14:12:33", a: "INTERVIEWER", m: "Generated 12 STAR cards · Anthropic loop", k: "ok" },
  { t: "14:09:01", a: "OUTREACH", m: "Recruiter replied · Scale AI · interview proposed", k: "good" },
  { t: "14:04:17", a: "SCOUT", m: "Sweeping 220 careers pages · 3,402 listings", k: "dim" },
] as const;

export function MissionControl({ compact = false }: { compact?: boolean }) {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % AGENTS.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="surface relative rounded-2xl overflow-hidden scanlines">
      {/* Top status bar */}
      <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-border bg-elevated/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive/70" />
            <span className="size-1.5 rounded-full bg-warning/70" />
            <span className="size-1.5 rounded-full bg-signal/80" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
            aether.os · mission-control · v1.4.0
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
          <Stat label="UP" value="14d 02h" />
          <Stat label="OPS/H" value="1.4k" tone="accent" />
          <Stat label="QUEUE" value="42" />
          <span className="flex items-center gap-1.5 text-signal">
            <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
            LIVE
          </span>
        </div>
      </div>

      {/* Orchestration graph */}
      <div className="relative signal-grid" style={{ aspectRatio: compact ? "16/7" : "16/8" }}>
        <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="signalLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="hsl(186 100% 56%)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="hsl(186 100% 56%)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="hsl(186 100% 56%)" stopOpacity="0.1" />
            </linearGradient>
            <radialGradient id="nodeGlow">
              <stop offset="0%" stopColor="hsl(186 100% 56%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(186 100% 56%)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {PATHS.map(([a, b], i) => {
            const A = AGENTS[a], B = AGENTS[b];
            const cx = (A.x + B.x) / 2;
            const cy = Math.min(A.y, B.y) - 6;
            return (
              <g key={i}>
                <path
                  d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`}
                  stroke="url(#signalLine)"
                  strokeWidth="0.4"
                  fill="none"
                />
                <path
                  d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`}
                  stroke="hsl(186 100% 70%)"
                  strokeWidth="0.3"
                  fill="none"
                  strokeOpacity="0.9"
                  className="animate-flow"
                  style={{ animationDelay: `${i * -0.2}s` }}
                />
              </g>
            );
          })}
        </svg>

        {/* Agent nodes */}
        {AGENTS.map((a, i) => {
          const active = i === pulse;
          return (
            <div
              key={a.code}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${a.x}%`, top: `${(a.y / 60) * 100}%` }}
            >
              <div className="relative flex flex-col items-center gap-1.5">
                <div
                  className={`relative size-3 rounded-full transition-all ${active ? "scale-150" : ""}`}
                  style={{ backgroundColor: a.color, boxShadow: active ? `0 0 16px 2px ${a.color}` : `0 0 8px 0 ${a.color}` }}
                >
                  {active && <span className="absolute inset-0 rounded-full animate-pulse-ring" />}
                </div>
                <span
                  className={`text-[9px] font-mono tracking-widest uppercase whitespace-nowrap transition-colors ${
                    active ? "text-foreground text-glow" : "text-muted"
                  }`}
                >
                  {a.code}
                </span>
              </div>
            </div>
          );
        })}

        {/* Crosshair scanline */}
        <div className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent animate-scan" />

        {/* Corner brackets */}
        <Bracket pos="tl" /><Bracket pos="tr" /><Bracket pos="bl" /><Bracket pos="br" />
      </div>

      {/* Lane: queue + reasoning + ticker */}
      <div className="grid grid-cols-12 border-t border-border">
        {/* Queue lanes */}
        <div className="col-span-12 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Task queue</span>
            <span className="text-[10px] font-mono text-accent">42 pending · 3 claimed</span>
          </div>
          <div className="space-y-1.5">
            {[
              { kind: "agent.run", lbl: "STRATEGIST · re-rank feed", w: 92, tone: "accent" },
              { kind: "workflow.tick", lbl: "package.generate · vercel-lead", w: 64, tone: "signal" },
              { kind: "agent.run", lbl: "OUTREACH · draft intro", w: 38, tone: "warning" },
              { kind: "agent.run", lbl: "WRITER · tailor v14", w: 22, tone: "accent" },
            ].map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-muted/70 w-24 truncate">{q.kind}</span>
                <div className="flex-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden relative">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${q.w}%`,
                      backgroundColor: `var(--color-${q.tone})`,
                      boxShadow: `0 0 8px var(--color-${q.tone})`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted/80 w-8 text-right">{q.w}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reasoning panel */}
        <div className="col-span-12 lg:col-span-7 p-4 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Strategist reasoning</span>
            <span className="text-[10px] font-mono text-signal">conf 0.91</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">
            <span className="text-accent">›</span> Promoting <span className="text-foreground font-medium">Stripe · Staff PE</span> to P0.
            Vector alignment <span className="font-mono text-accent">0.94</span> with payment-orchestration history.
            Recruiter <span className="text-foreground">Sarah J.</span> active in last <span className="font-mono">06:12</span> ·
            company hiring velocity <span className="font-mono text-signal">+14%</span> wow.
          </p>
        </div>
      </div>

      {/* Ticker */}
      <div className="relative border-t border-border bg-elevated/40 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap py-2">
          {[...TICKER, ...TICKER].map((e, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-[10px] font-mono">
              <span className="text-muted/60">{e.t}</span>
              <span className={tone(e.k)}>›</span>
              <span className="text-foreground/60">{e.a}</span>
              <span className="text-foreground/85">{e.m}</span>
              <span className="text-border">·</span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-elevated to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-elevated to-transparent" />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted/70">{label}</span>
      <span className={tone === "accent" ? "text-accent" : "text-foreground/85"}>{value}</span>
    </span>
  );
}

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map = {
    tl: "top-2 left-2 border-t border-l",
    tr: "top-2 right-2 border-t border-r",
    bl: "bottom-2 left-2 border-b border-l",
    br: "bottom-2 right-2 border-b border-r",
  } as const;
  return <span className={`absolute size-2.5 border-accent/50 ${map[pos]}`} />;
}

function tone(k: string) {
  if (k === "good") return "text-signal";
  if (k === "warn") return "text-warning";
  if (k === "dim") return "text-muted/50";
  return "text-accent";
}
