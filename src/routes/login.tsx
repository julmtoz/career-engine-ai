import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Aether OS" }] }),
});

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
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="size-6 rounded-sm bg-foreground grid place-items-center">
            <div className="size-1.5 rounded-full bg-accent" />
          </div>
          <span className="font-display text-base tracking-tight uppercase font-extrabold">Aether OS</span>
        </Link>
        <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
          {mode === "signin" ? "Welcome back." : "Create your operator."}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "signin"
            ? "Sign in to access your agent fleet."
            : "Spin up a private workspace and your first agent fleet."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="Password (min 8 chars)"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-xs text-muted hover:text-foreground transition"
        >
          {mode === "signin" ? "Don't have an account? Create one." : "Already have an account? Sign in."}
        </button>
      </div>
    </div>
  );
}
