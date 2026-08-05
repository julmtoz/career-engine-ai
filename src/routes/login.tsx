import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) ?? undefined }),
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Aether" }] }),
});

function LoginPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (next) window.location.href = next;
      else nav({ to: "/dashboard" });
    }
  }, [user, loading, nav, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
          },
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 h-14 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-foreground grid place-items-center">
            <div className="size-1.5 rounded-full bg-accent" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight">Aether</span>
        </Link>
        <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground transition">
          ← Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-4xl tracking-tight mb-3">
            {mode === "signin" ? "Welcome back." : "Create your account."}
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-8">
            {mode === "signin"
              ? "Sign in to see what Aether worked on overnight."
              : "Five minutes of setup. Aether takes it from there."}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-card border border-input rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="At least 8 characters"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-card border border-input rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition"
              />
            </div>

            {err && (
              <div className="text-[13px] text-destructive">{err}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 mt-2 rounded-lg bg-foreground text-background text-[14px] font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {busy ? "Just a moment…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-[13px] text-muted-foreground hover:text-foreground transition"
          >
            {mode === "signin"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>

          <p className="mt-10 text-center text-[12px] text-muted-foreground">
            By continuing you agree to Aether's terms and privacy policy.
          </p>
        </div>
      </main>
    </div>
  );
}
