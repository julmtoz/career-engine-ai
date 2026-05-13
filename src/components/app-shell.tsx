import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type NavItem = { to: string; label: string };

const PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Home" },
  { to: "/feed", label: "Opportunities" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/prep", label: "Interviews" },
  { to: "/profile", label: "Profile" },
];

// Contextual sub-tabs per section. Each merged area shows a calm tab bar
// under the main nav so related workspaces feel like one continuous surface
// instead of separate top-level destinations.
const SUB_NAV: Record<string, { label: string; tabs: NavItem[] }> = {
  opportunities: {
    label: "Opportunities",
    tabs: [
      { to: "/feed", label: "Feed" },
      { to: "/companies", label: "Companies" },
      { to: "/recruiters", label: "Recruiters" },
      { to: "/sources", label: "Sources" },
      { to: "/intake", label: "Intake" },
    ],
  },
  pipeline: {
    label: "Pipeline",
    tabs: [
      { to: "/pipeline", label: "Active" },
      { to: "/packages", label: "Packages" },
      { to: "/approvals", label: "Needs review" },
      { to: "/follow-ups", label: "Follow-ups" },
      { to: "/conversion", label: "Outcomes" },
    ],
  },
  interviews: {
    label: "Interviews",
    tabs: [
      { to: "/prep", label: "Prep" },
      { to: "/strategist", label: "Game plan" },
      { to: "/copilot", label: "Live coach" },
    ],
  },
  profile: {
    label: "Profile",
    tabs: [
      { to: "/profile", label: "Profile" },
      { to: "/resumes", label: "Resumes" },
      { to: "/automation", label: "Automation" },
      { to: "/observability", label: "Activity" },
    ],
  },
};

function sectionFor(pathname: string): keyof typeof SUB_NAV | null {
  if (["/feed", "/companies", "/recruiters", "/sources", "/intake"].some((p) => pathname.startsWith(p))) return "opportunities";
  if (["/pipeline", "/packages", "/approvals", "/follow-ups", "/conversion"].some((p) => pathname.startsWith(p))) return "pipeline";
  if (["/prep", "/strategist", "/copilot"].some((p) => pathname.startsWith(p))) return "interviews";
  if (["/profile", "/resumes", "/automation", "/observability"].some((p) => pathname.startsWith(p))) return "profile";
  return null;
}

function primaryActive(primaryTo: string, pathname: string) {
  if (primaryTo === "/dashboard") return pathname === "/dashboard";
  if (primaryTo === "/feed") return sectionFor(pathname) === "opportunities";
  if (primaryTo === "/pipeline") return sectionFor(pathname) === "pipeline";
  if (primaryTo === "/prep") return sectionFor(pathname) === "interviews";
  if (primaryTo === "/profile") return sectionFor(pathname) === "profile";
  return false;
}

const SECONDARY = [
  { to: "/feedback", label: "Send feedback" },
  { to: "/admin", label: "Admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const section = sectionFor(pathname);
  const sub = section ? SUB_NAV[section] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border">
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
              {PRIMARY.map((n) => {
                const active = primaryActive(n.to, pathname);
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
                    <div className="py-1">
                      {SECONDARY.map((m) => (
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

        {/* Contextual sub-tabs for merged workspaces */}
        {sub && (
          <div className="border-t border-border/60 bg-background/60">
            <div className="max-w-7xl mx-auto px-6 h-11 flex items-center gap-1 overflow-x-auto">
              {sub.tabs.map((t) => {
                const active = pathname === t.to || pathname.startsWith(t.to + "/");
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={`shrink-0 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                      active
                        ? "text-foreground bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main>{children}</main>
    </div>
  );
}
