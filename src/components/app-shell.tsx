import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { to: "/dashboard", label: "Today" },
  { to: "/feed", label: "Opportunities" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/prep", label: "Prepare" },
  { to: "/analytics", label: "Insights" },
] as const;

const MORE = [
  { to: "/profile", label: "Profile" },
  { to: "/automation", label: "Automation" },
  { to: "/sources", label: "Sources" },
  { to: "/companies", label: "Companies" },
  { to: "/recruiters", label: "Recruiters" },
  { to: "/resumes", label: "Resume vault" },
  { to: "/strategist", label: "Strategy" },
  { to: "/copilot", label: "Copilot" },
  { to: "/approvals", label: "Approvals" },
  { to: "/follow-ups", label: "Follow-ups" },
  { to: "/outreach", label: "Outreach" },
  { to: "/conversion", label: "Conversion" },
  { to: "/packages", label: "Packages" },
  { to: "/intake", label: "Intake" },
  { to: "/observability", label: "Activity" },
  { to: "/feedback", label: "Feedback" },
  { to: "/admin", label: "Admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-foreground grid place-items-center">
                <div className="size-1.5 rounded-full bg-accent" />
              </div>
              <span className="font-display text-[15px] tracking-tight font-semibold">
                Aether
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {NAV.map((n) => {
                const active = pathname === n.to || pathname.startsWith(n.to + "/");
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                      active
                        ? "text-foreground bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/70 hover:bg-secondary border border-border text-[12px] text-muted-foreground transition"
            >
              <span className="opacity-70">Ask Aether…</span>
              <kbd className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border">⌘K</kbd>
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="size-8 rounded-full bg-foreground text-background grid place-items-center text-[12px] font-semibold hover:opacity-90 transition"
              >
                {user?.email?.[0]?.toUpperCase() ?? "A"}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-float">
                    {user && (
                      <div className="px-4 py-3 border-b border-border">
                        <div className="text-[13px] font-medium truncate">{user.email}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Signed in</div>
                      </div>
                    )}
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {MORE.map((m) => (
                        <Link
                          key={m.to}
                          to={m.to}
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-[13px] text-foreground hover:bg-secondary transition"
                        >
                          {m.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-border p-1">
                      {user ? (
                        <button
                          onClick={() => { setMenuOpen(false); signOut(); }}
                          className="w-full text-left px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition"
                        >
                          Sign out
                        </button>
                      ) : (
                        <Link
                          to="/login"
                          onClick={() => setMenuOpen(false)}
                          className="block px-3 py-1.5 text-[13px] hover:bg-secondary rounded-md transition"
                        >
                          Sign in
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
