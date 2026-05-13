import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { to: "/dashboard", label: "Fleet" },
  { to: "/automation", label: "Automation" },
  { to: "/sources", label: "Sources" },
  { to: "/feed", label: "Feed" },
  { to: "/intake", label: "Intake" },
  { to: "/companies", label: "Companies" },
  { to: "/recruiters", label: "Recruiters" },
  { to: "/strategist", label: "Strategist" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/packages", label: "Packages" },
  { to: "/approvals", label: "Approvals" },
  { to: "/follow-ups", label: "Follow-ups" },
  { to: "/prep", label: "Prep" },
  { to: "/conversion", label: "Conversion" },
  { to: "/resumes", label: "Vault" },
  { to: "/analytics", label: "Analytics" },
  { to: "/profile", label: "Profile" },
  { to: "/launch", label: "Launch" },
  { to: "/admin", label: "Debug" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-6 rounded-sm bg-foreground grid place-items-center">
              <div className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
            </div>
            <span className="font-display text-base tracking-tight uppercase font-extrabold">
              Aether OS
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/15">
            <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
            <span className="text-[10px] font-mono font-medium text-accent uppercase tracking-widest">
              Fleet online
            </span>
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="text-xs text-muted hover:text-foreground transition px-2"
              title={user.email ?? ""}
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="text-xs text-muted hover:text-foreground transition px-2">
              Sign in
            </Link>
          )}
          <div className="size-8 rounded-full bg-foreground/90 grid place-items-center text-background text-xs font-semibold">
            {user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
        </div>
      </nav>

      <main>{children}</main>

      {/* Command palette affordance */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-foreground text-background rounded-full shadow-2xl border border-white/10">
        <span className="text-xs font-medium tracking-wide">Command agent</span>
        <span className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-mono">⌘K</span>
      </div>
    </div>
  );
}
