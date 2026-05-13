import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MissionControl } from "@/components/mission-control";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Aether OS" }] }),
});

const OVERNIGHT = [
  { t: "+0:42", a: "SCOUT", m: "228 new listings swept · 14 P0 candidates" },
  { t: "+1:18", a: "STRATEGIST", m: "Re-ranked queue · Stripe Staff PE → P0" },
  { t: "+2:04", a: "OUTREACH", m: "Recruiter reply · Scale AI · interview proposed" },
  { t: "+3:26", a: "WRITER", m: "Tailored CV v14 · keyword density +34%" },
  { t: "+5:11", a: "ANALYZER", m: "Salary delta · SF infra +8% wow" },
];

function LoginPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/automation" });
  }, [user, loading, nav]);

  const sessionId = useMemo(
    () => Math.random().toString(16).slice(2, 8).toUpperCase(),
    [],
  );
  const now = useMemo(() => {
    const d = new Date();
    return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { emailRedirectTo: `${window.location.origin}/automation` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.35fr_1fr] bg-background text-foreground">
      {/* ─── LEFT: operations deck ─────────────────────────────────── */}
      <aside className="relative hidden lg:flex flex-col border-r border-border overflow-hidden">
        {/* Atmospheric layered background */}
        <div className="absolute inset-0 signal-grid opacity-[0.55]" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 25% 30%, hsl(186 100% 56% / 0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, hsl(220 100% 60% / 0.08), transparent 60%), radial-gradient(ellipse 80% 60% at 50% 110%, hsl(152 90% 55% / 0.05), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 noise opacity-[0.4] pointer-events-none" />

        {/* Top frame */}
        <div className="relative flex items-center justify-between px-8 py-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-6 rounded-sm bg-foreground grid place-items-center">
              <div className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
            </div>
            <span className="font-display text-sm tracking-[0.2em] uppercase font-extrabold">
              Aether OS
            </span>
          </Link>
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-muted">
            <span>SESSION · {sessionId}</span>
            <span>{now}</span>
            <span className="flex items-center gap-1.5 text-signal">
              <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
              SYS NOMINAL
            </span>
          </div>
        </div>

        {/* Cinematic copy */}
        <div className="relative px-10 pt-4 pb-2 max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent mb-4">
            <span className="size-1 rounded-full bg-accent" />
            Operations deck · authenticated entry
          </div>
          <h1 className="font-serif italic text-[2.6rem] leading-[1.05] tracking-tight text-foreground">
            Your agent fleet kept
            <br />
            working while you slept.
          </h1>
          <p className="mt-4 text-sm text-muted max-w-md leading-relaxed">
            228 listings swept · 14 high-fit opportunities surfaced · 1 recruiter
            reply pending review. Reconnect to mission control to triage.
          </p>
        </div>

        {/* Live mission control */}
        <div className="relative px-10 mt-6">
          <MissionControl compact />
        </div>

        {/* Overnight log */}
        <div className="relative mt-auto px-10 pb-8 pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
              Overnight activity log
            </span>
            <span className="text-[10px] font-mono text-signal">
              while you were away · 06:42:11
            </span>
          </div>
          <ul className="space-y-1.5">
            {OVERNIGHT.map((e, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-[11px] font-mono"
                style={{
                  opacity: 0,
                  animation: `float-up 0.8s var(--ease-out-expo) ${i * 0.08}s forwards`,
                }}
              >
                <span className="text-muted/60 w-12">{e.t}</span>
                <span className="text-accent">›</span>
                <span className="text-foreground/55 w-24">{e.a}</span>
                <span className="text-foreground/85">{e.m}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ─── RIGHT: auth form ──────────────────────────────────────── */}
      <main className="relative flex flex-col">
        {/* Mobile-only minimal grid */}
        <div className="absolute inset-0 lg:hidden signal-grid opacity-30 pointer-events-none" />

        {/* Top utility bar */}
        <div className="relative flex items-center justify-between px-6 lg:px-10 py-6 border-b border-border/60">
          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 text-xs font-mono uppercase tracking-widest"
          >
            <div className="size-5 rounded-sm bg-foreground grid place-items-center">
              <div className="size-1 rounded-full bg-accent" />
            </div>
            Aether OS
          </Link>
          <div className="hidden lg:block text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
            secure entry · TLS 1.3 · session-bound
          </div>
          <Link
            to="/"
            className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground transition"
          >
            ← exit
          </Link>
        </div>

        {/* Form */}
        <div className="relative flex-1 flex items-center justify-center px-6 lg:px-12 py-10">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent mb-4">
              <span className="size-1 rounded-full bg-accent animate-pulse-soft" />
              {mode === "signin" ? "credential handshake" : "operator provisioning"}
            </div>
            <h2 className="font-serif italic text-[2rem] leading-tight tracking-tight">
              {mode === "signin"
                ? "Resume acquisition operations."
                : "Provision a new operator."}
            </h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              {mode === "signin"
                ? "Reconnect to your agent fleet, queues, and reasoning streams."
                : "Spin up a private workspace with your own orchestration layer and agent fleet."}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-3">
              <FieldLabel>Operator email</FieldLabel>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-card/60 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition"
              />
              <FieldLabel>Authentication key</FieldLabel>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-card/60 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition"
              />
              {err && (
                <div className="text-xs font-mono text-destructive flex items-center gap-2">
                  <span className="size-1 rounded-full bg-destructive" /> {err}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 mt-2 rounded-md bg-foreground text-background text-sm font-medium tracking-tight hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 group"
              >
                <span>
                  {busy
                    ? "Establishing link…"
                    : mode === "signin"
                      ? "Enter mission control"
                      : "Provision operator"}
                </span>
                <span className="text-accent transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-5 w-full text-[11px] font-mono uppercase tracking-widest text-muted hover:text-foreground transition"
            >
              {mode === "signin"
                ? "› Provision new operator"
                : "› Existing operator · sign in"}
            </button>

            {/* Trust strip */}
            <div className="mt-10 pt-6 border-t border-border/60">
              <div className="grid grid-cols-3 gap-3 text-[10px] font-mono uppercase tracking-widest text-muted">
                <TrustCell label="Encryption" value="AES-256" />
                <TrustCell label="Isolation" value="RLS · per-op" />
                <TrustCell label="Autonomy" value="Approval-gated" />
              </div>
              <p className="mt-4 text-[10px] font-mono text-muted/70 leading-relaxed">
                Aether agents operate under your supervision. No outbound action
                is taken without explicit approval. Read-only by default.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom status */}
        <div className="relative border-t border-border/60 px-6 lg:px-10 py-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
            gateway online · 14ms
          </span>
          <span>aether.os · v1.4.0</span>
        </div>
      </main>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-muted/80 mb-1 mt-3 first:mt-0">
      {children}
    </label>
  );
}

function TrustCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted/60">{label}</div>
      <div className="text-foreground/85 mt-0.5">{value}</div>
    </div>
  );
}
