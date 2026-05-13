/**
 * Aether OS — Signature UI primitives.
 *
 * A small library of recognizable, dense, "operational" components used to
 * give Aether a distinct visual identity:
 *
 *   - <OrchestrationTimeline />   horizontal time-bar of agent activity
 *   - <ReasoningStream />          live AI reasoning log
 *   - <LiveQueueMap />             radar-style heatmap of opportunity flow
 *   - <OpportunityIntelCard />     dense, multi-signal opportunity card
 *   - <AgentCoordinationView />    multi-agent state grid with traffic
 *   - <AutomationStateBar />       compact automation indicator strip
 *
 * All motion is CSS-driven, all data is presentational (component-level
 * mocks) so these can drop anywhere without server wiring.
 */
import { useEffect, useState } from "react";

/* ────────────────────────────────────────────────────────────────────────── */
/*  ORCHESTRATION TIMELINE                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const LANES = [
  { code: "SCOUT", color: "var(--color-accent)" },
  { code: "STRATEGIST", color: "var(--color-accent)" },
  { code: "WRITER", color: "var(--color-signal)" },
  { code: "ANALYZER", color: "var(--color-accent)" },
  { code: "OUTREACH", color: "var(--color-warning)" },
  { code: "INTERVIEWER", color: "var(--color-signal)" },
];

// (laneIdx, startPct, widthPct, label)
const RUNS: [number, number, number, string][] = [
  [0, 2, 14, "sweep · careers"],
  [0, 22, 8, "sweep · linkedin"],
  [0, 38, 11, "ingest · 312 jobs"],
  [0, 60, 18, "sweep · greenhouse"],
  [0, 84, 10, "ingest · 88 jobs"],
  [1, 8, 18, "rerank · feed"],
  [1, 36, 10, "score · 142 opps"],
  [1, 58, 22, "promote → P0 · stripe"],
  [2, 14, 16, "tailor v14 · vercel"],
  [2, 44, 20, "tailor v15 · linear"],
  [2, 72, 14, "tailor v16 · scale"],
  [3, 4, 12, "salary delta · sf"],
  [3, 28, 16, "velocity · +14%"],
  [3, 62, 20, "competitive · seed→A"],
  [4, 18, 14, "intro · sarah j."],
  [4, 40, 8, "follow · linear"],
  [4, 56, 18, "intro · scale ai"],
  [4, 80, 12, "reply · proposed"],
  [5, 26, 22, "STAR · anthropic"],
  [5, 60, 18, "drills · system design"],
];

export function OrchestrationTimeline({ height = "h-64" }: { height?: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 0.6) % 100), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="surface rounded-2xl overflow-hidden">
      <Header
        left="orchestration timeline · 14:00 → 14:24"
        right={
          <>
            <span className="text-muted/70">RUNS</span>
            <span className="text-foreground/85">{RUNS.length}</span>
            <span className="text-muted/70">DENSITY</span>
            <span className="text-accent">0.84</span>
            <Live />
          </>
        }
      />

      <div className={`relative ${height}`}>
        {/* time grid */}
        <div className="absolute inset-0 grid grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-l border-border/50 first:border-l-0 relative">
              <span className="absolute top-1 left-1 text-[8px] font-mono text-muted/50">
                {String(i * 2).padStart(2, "0")}m
              </span>
            </div>
          ))}
        </div>

        {/* lanes */}
        <div className="absolute inset-0 flex flex-col">
          {LANES.map((lane, li) => (
            <div key={lane.code} className="flex-1 relative border-b border-border/40 last:border-b-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase tracking-widest text-muted/80 z-10">
                {lane.code}
              </span>
              {RUNS.filter((r) => r[0] === li).map((r, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded-sm flex items-center px-1.5 overflow-hidden group hover:h-5 transition-all"
                  style={{
                    left: `${r[1]}%`,
                    width: `${r[2]}%`,
                    backgroundColor: `color-mix(in oklab, ${lane.color} 22%, transparent)`,
                    borderLeft: `2px solid ${lane.color}`,
                    boxShadow: `inset 0 0 8px color-mix(in oklab, ${lane.color} 18%, transparent)`,
                  }}
                >
                  <span className="text-[8px] font-mono text-foreground/70 truncate group-hover:text-foreground">
                    {r[3]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* moving "now" cursor */}
        <div
          className="absolute top-0 bottom-0 w-px bg-accent/80 pointer-events-none"
          style={{ left: `${tick}%`, boxShadow: "0 0 12px var(--color-accent)" }}
        >
          <span className="absolute -top-px -left-1 size-2 rounded-full bg-accent animate-pulse-soft" />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  REASONING STREAM                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

const REASONING = [
  { agent: "STRATEGIST", k: "decide", text: "Promote Stripe · Staff PE → P0. Vector 0.94, recruiter active 06:12 ago.", conf: 0.91 },
  { agent: "ANALYZER", k: "observe", text: "Hiring velocity at Linear +14% wow. Infra cluster expanding.", conf: 0.86 },
  { agent: "SCOUT", k: "ingest", text: "Detected 312 net-new listings across 220 sources in last sweep.", conf: 1.0 },
  { agent: "WRITER", k: "compose", text: "CV v14: keyword density +34%, ATS score 96, three bullet rewrites pending review.", conf: 0.88 },
  { agent: "OUTREACH", k: "decide", text: "Hold intro to Scale AI for 12h — recruiter calendar shows OOO marker.", conf: 0.74 },
  { agent: "STRATEGIST", k: "rerank", text: "Demoting 8 stale ICP-misaligned roles. New focal: payments infra · staff+.", conf: 0.93 },
  { agent: "INTERVIEWER", k: "compose", text: "Generated 12 STAR cards for Anthropic loop · system design weighted heavily.", conf: 0.9 },
  { agent: "ANALYZER", k: "observe", text: "Salary delta detected: SF infra roles +8% vs. last 30d trailing.", conf: 0.82 },
  { agent: "OUTREACH", k: "act", text: "Sent personalized intro to Sarah J. (Stripe). Mentioned 2 mutual connections.", conf: 0.95 },
];

export function ReasoningStream({ height = "h-80" }: { height?: string }) {
  return (
    <div className="surface rounded-2xl overflow-hidden">
      <Header
        left="strategist · reasoning stream"
        right={
          <>
            <span className="text-muted/70">MODEL</span>
            <span className="text-foreground/85">orchestrator-v3</span>
            <span className="text-muted/70">CONF</span>
            <span className="text-signal">0.89</span>
            <Live />
          </>
        }
      />
      <div className={`relative ${height} overflow-hidden`}>
        <div className="absolute inset-x-0 top-0 animate-stream space-y-px">
          {[...REASONING, ...REASONING].map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border/40 hover:bg-elevated/40">
              <span className="col-span-2 text-[9px] font-mono uppercase tracking-widest text-muted/80">
                {r.agent}
              </span>
              <span
                className={`col-span-1 text-[9px] font-mono uppercase ${
                  r.k === "decide"
                    ? "text-accent"
                    : r.k === "act"
                      ? "text-signal"
                      : r.k === "compose"
                        ? "text-warning"
                        : "text-muted"
                }`}
              >
                {r.k}
              </span>
              <p className="col-span-7 text-xs leading-snug text-foreground/85">
                <span className="text-accent mr-1.5">›</span>
                {r.text}
              </p>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <div className="flex-1 h-1 bg-foreground/5 rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.conf * 100}%`,
                      backgroundColor: r.conf > 0.85 ? "var(--color-signal)" : "var(--color-accent)",
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted w-7 text-right">
                  {r.conf.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  LIVE QUEUE MAP                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

const HEAT = Array.from({ length: 12 * 6 }, () => Math.random());

export function LiveQueueMap() {
  const [pulseIdx, setPulseIdx] = useState<number[]>([]);
  useEffect(() => {
    const id = setInterval(
      () => setPulseIdx(Array.from({ length: 4 }, () => Math.floor(Math.random() * HEAT.length))),
      900,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="surface rounded-2xl overflow-hidden">
      <Header
        left="opportunity heat map · 24h"
        right={
          <>
            <span className="text-muted/70">CELLS</span>
            <span className="text-foreground/85">72</span>
            <span className="text-muted/70">PEAK</span>
            <span className="text-accent">14:08</span>
          </>
        }
      />
      <div className="p-4">
        <div className="grid grid-cols-12 gap-1">
          {HEAT.map((v, i) => {
            const pulsing = pulseIdx.includes(i);
            return (
              <div
                key={i}
                className={`aspect-square rounded-sm transition-all ${pulsing ? "scale-110" : ""}`}
                style={{
                  backgroundColor: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 70)}%, transparent)`,
                  boxShadow: pulsing ? "0 0 8px var(--color-accent)" : v > 0.7 ? "0 0 4px color-mix(in oklab, var(--color-accent) 40%, transparent)" : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted/70">
          <span>00:00</span>
          <div className="flex items-center gap-2">
            <span>low</span>
            <div className="h-1.5 w-24 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--color-accent) 5%, transparent), var(--color-accent))" }} />
            <span>high</span>
          </div>
          <span>now</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  OPPORTUNITY INTELLIGENCE CARD                                             */
/* ────────────────────────────────────────────────────────────────────────── */

export type OpportunityIntel = {
  company: string;
  title: string;
  location: string;
  salary: string;
  match: number;
  signals: { label: string; value: string; tone?: "accent" | "signal" | "warning" }[];
  recruiter?: { name: string; warmth: number; lastSeen: string };
  rationale: string;
  priority: "P0" | "P1" | "P2";
};

const PRIORITY_TONE = {
  P0: { color: "var(--color-accent)", label: "P0 · CRITICAL" },
  P1: { color: "var(--color-signal)", label: "P1 · HIGH" },
  P2: { color: "var(--color-warning)", label: "P2 · WATCH" },
};

export function OpportunityIntelCard({ o }: { o: OpportunityIntel }) {
  const p = PRIORITY_TONE[o.priority];
  return (
    <div className="surface rounded-xl p-4 hover:bg-elevated/60 transition-all relative overflow-hidden group">
      {/* priority bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: p.color, boxShadow: `0 0 12px ${p.color}` }} />
      <div className="absolute right-0 top-0 size-24 opacity-30 group-hover:opacity-60 transition-opacity"
        style={{ background: `radial-gradient(circle at top right, ${p.color}, transparent 70%)` }} />

      {/* header row */}
      <div className="flex items-start justify-between gap-3 mb-3 relative">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: p.color }}>
              {p.label}
            </span>
            <span className="text-[9px] font-mono text-muted/60">·</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted/70">{o.location}</span>
          </div>
          <h3 className="font-display text-base font-extrabold tracking-tight truncate">
            {o.title} <span className="text-muted font-normal">@ {o.company}</span>
          </h3>
          <p className="text-[10px] font-mono text-muted/80 mt-0.5">{o.salary}</p>
        </div>
        {/* match dial */}
        <div className="relative size-12 shrink-0">
          <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(210 30% 96% / 0.08)" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={p.color} strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${(o.match / 100) * 94.2} 94.2`}
              style={{ filter: `drop-shadow(0 0 4px ${p.color})` }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-xs font-bold">
            {o.match}
          </span>
        </div>
      </div>

      {/* signal grid */}
      <div className="grid grid-cols-4 gap-px bg-border/40 rounded-md overflow-hidden mb-3">
        {o.signals.map((s, i) => (
          <div key={i} className="bg-surface/80 p-2">
            <p className="text-[8px] font-mono uppercase tracking-widest text-muted/70 mb-0.5 truncate">
              {s.label}
            </p>
            <p
              className={`text-xs font-mono font-bold ${
                s.tone === "accent" ? "text-accent" : s.tone === "signal" ? "text-signal" : s.tone === "warning" ? "text-warning" : ""
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* rationale */}
      <p className="text-[11px] leading-relaxed text-foreground/80 mb-3">
        <span className="text-accent mr-1">›</span>
        {o.rationale}
      </p>

      {/* recruiter strip */}
      {o.recruiter && (
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
            <span className="text-muted/70 uppercase tracking-widest">recruiter</span>
            <span className="text-foreground/85">{o.recruiter.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted/70">warmth</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-sm"
                  style={{
                    backgroundColor:
                      i < o.recruiter!.warmth
                        ? "var(--color-signal)"
                        : "hsl(210 30% 96% / 0.1)",
                  }}
                />
              ))}
            </div>
            <span className="text-muted/60">{o.recruiter.lastSeen}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  AGENT COORDINATION VIEW                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function AgentCoordinationView() {
  const fleet = [
    { code: "SCOUT", state: "running", task: "sweep · greenhouse · 312 jobs", load: 78, cpu: 0.42 },
    { code: "STRATEGIST", state: "running", task: "rerank · 142 opps", load: 41, cpu: 0.61 },
    { code: "WRITER", state: "running", task: "tailor v14 · vercel-lead", load: 64, cpu: 0.55 },
    { code: "ANALYZER", state: "idle", task: "awaiting cycle · T+02:14", load: 12, cpu: 0.08 },
    { code: "OUTREACH", state: "blocked", task: "approval gate · 3 drafts", load: 22, cpu: 0.04 },
    { code: "INTERVIEWER", state: "running", task: "STAR · anthropic loop", load: 33, cpu: 0.31 },
  ];
  return (
    <div className="surface rounded-2xl overflow-hidden">
      <Header
        left="agent coordination · fleet"
        right={
          <>
            <span className="text-muted/70">RUN</span>
            <span className="text-signal">4</span>
            <span className="text-muted/70">IDLE</span>
            <span className="text-foreground/85">1</span>
            <span className="text-muted/70">BLK</span>
            <span className="text-warning">1</span>
          </>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        {fleet.map((a) => {
          const tone =
            a.state === "running" ? "var(--color-signal)" : a.state === "blocked" ? "var(--color-warning)" : "hsl(218 12% 55%)";
          return (
            <div key={a.code} className="bg-surface p-3 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/85">
                  {a.code}_01
                </span>
                <span className="flex items-center gap-1 text-[9px] font-mono uppercase" style={{ color: tone }}>
                  <span
                    className={`size-1.5 rounded-full ${a.state === "running" ? "animate-pulse-soft" : ""}`}
                    style={{ backgroundColor: tone, boxShadow: `0 0 6px ${tone}` }}
                  />
                  {a.state}
                </span>
              </div>
              <p className="text-[10px] text-muted/85 mb-3 truncate">{a.task}</p>
              <div className="space-y-1">
                <Bar label="load" value={a.load} tone="accent" />
                <Bar label="cpu" value={Math.round(a.cpu * 100)} tone="signal" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "accent" | "signal" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono uppercase text-muted/70 w-7">{label}</span>
      <div className="flex-1 h-1 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: `var(--color-${tone})`,
            boxShadow: `0 0 4px var(--color-${tone})`,
          }}
        />
      </div>
      <span className="text-[8px] font-mono text-muted/80 w-6 text-right">{value}%</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  AUTOMATION STATE BAR                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export function AutomationStateBar() {
  const states = [
    { k: "discovery", v: "active", tone: "signal" },
    { k: "ranking", v: "active", tone: "signal" },
    { k: "tailoring", v: "active", tone: "signal" },
    { k: "outreach", v: "approval", tone: "warning" },
    { k: "follow-up", v: "queued", tone: "accent" },
    { k: "interview prep", v: "ready", tone: "signal" },
  ];
  return (
    <div className="surface rounded-xl overflow-hidden flex items-stretch divide-x divide-border">
      {states.map((s) => (
        <div key={s.k} className="flex-1 px-3 py-2 flex items-center gap-2 min-w-0">
          <span
            className={`size-1.5 rounded-full shrink-0 ${s.tone === "signal" ? "animate-pulse-soft" : ""}`}
            style={{ backgroundColor: `var(--color-${s.tone})`, boxShadow: `0 0 6px var(--color-${s.tone})` }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-mono uppercase tracking-widest text-muted/70 truncate">{s.k}</p>
            <p
              className={`text-[10px] font-mono uppercase truncate ${
                s.tone === "signal" ? "text-signal" : s.tone === "warning" ? "text-warning" : "text-accent"
              }`}
            >
              {s.v}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared chrome                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function Header({ left, right }: { left: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-elevated/40">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted/85">{left}</span>
      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest">
        {right}
      </div>
    </div>
  );
}

function Live() {
  return (
    <span className="flex items-center gap-1.5 text-signal">
      <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
      LIVE
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Sample data                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export const SAMPLE_OPPS: OpportunityIntel[] = [
  {
    company: "Stripe",
    title: "Staff Engineer · Payments Infra",
    location: "Remote · US",
    salary: "$320k–$420k · 0.04% eq",
    match: 96,
    priority: "P0",
    signals: [
      { label: "Vector", value: "0.94", tone: "accent" },
      { label: "Velocity", value: "+18%", tone: "signal" },
      { label: "ICP", value: "92%", tone: "accent" },
      { label: "Recency", value: "06m", tone: "signal" },
    ],
    rationale:
      "Direct alignment with payment-orchestration history. Recruiter Sarah J. active 06:12 ago. Hiring loop confirmed for staff+ infra band.",
    recruiter: { name: "Sarah J.", warmth: 4, lastSeen: "06m" },
  },
  {
    company: "Linear",
    title: "Sr. Platform Engineer",
    location: "Hybrid · NYC",
    salary: "$240k–$310k · 0.08% eq",
    match: 88,
    priority: "P1",
    signals: [
      { label: "Vector", value: "0.86", tone: "accent" },
      { label: "Velocity", value: "+14%", tone: "signal" },
      { label: "ICP", value: "84%", tone: "accent" },
      { label: "Recency", value: "1d", tone: "signal" },
    ],
    rationale:
      "Infra cluster expanding. Two mutual connections at company. CTO publicly hiring on platform engineering this week.",
    recruiter: { name: "Marcus T.", warmth: 3, lastSeen: "2h" },
  },
  {
    company: "Anthropic",
    title: "Member of Tech Staff · Eval",
    location: "Remote · US",
    salary: "$300k–$390k · sig eq",
    match: 84,
    priority: "P1",
    signals: [
      { label: "Vector", value: "0.81", tone: "accent" },
      { label: "Velocity", value: "+9%", tone: "accent" },
      { label: "ICP", value: "78%", tone: "accent" },
      { label: "Recency", value: "3d", tone: "accent" },
    ],
    rationale:
      "Loop scheduled. STAR cards generated. System design weighted heavily — drilling now.",
    recruiter: { name: "Priya K.", warmth: 4, lastSeen: "1h" },
  },
];
