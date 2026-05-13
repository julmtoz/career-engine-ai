import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getActivation } from "@/lib/activation.functions";
import { jobs } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  component: TodayPage,
  head: () => ({
    meta: [
      { title: "Today — Aether" },
      { name: "description", content: "Your daily AI briefing: what Aether worked on, what needs you, what's next." },
    ],
  }),
});

function TodayPage() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <AppShell>
        <div className="py-32 text-center text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (!user) {
    return (
      <AppShell>
        <div className="py-32 text-center">
          <Link to="/login" className="text-accent hover:underline">Sign in to continue</Link>
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <Today email={user.email ?? ""} />
    </AppShell>
  );
}

function Today({ email }: { email: string }) {
  const _activation = useServerFn(getActivation);
  const activationQ = useQuery({ queryKey: ["activation"], queryFn: () => _activation() });
  const a = activationQ.data;
  const firstName = (email.split("@")[0] ?? "there").replace(/[._-]/g, " ").split(" ")[0];
  const greeting = greetingFor(new Date());
  const topMatches = jobs.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      {/* Greeting */}
      <header className="animate-float">
        <p className="text-[13px] text-muted-foreground mb-2">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="font-serif text-5xl md:text-6xl tracking-tight">
          {greeting}, {capitalize(firstName)}.
        </h1>
      </header>

      {/* Activation nudge (only if incomplete) */}
      {a && a.score < 100 && (
        <Link
          to="/onboarding"
          className="block surface rounded-2xl p-5 hover:bg-secondary/40 transition animate-float"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[12px] text-accent font-medium mb-1">Setup · {a.completed}/{a.total} complete</p>
              <p className="text-[14px] font-medium">
                {a.next ? <>Next: {a.next.label}</> : "Almost there"}
              </p>
              {a.next?.description && (
                <p className="text-[13px] text-muted-foreground mt-0.5">{a.next.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${a.score}%` }} />
              </div>
              <span className="text-[13px] font-medium text-foreground">Continue →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Morning briefing */}
      <section className="surface-raised rounded-2xl p-8 animate-float">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">Morning briefing</p>
            <h2 className="font-serif text-2xl tracking-tight">Here's what I worked on overnight.</h2>
          </div>
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">Updated 2m ago</span>
        </div>
        <ul className="space-y-3">
          {[
            "Reviewed 228 new roles. 3 are strong matches for your senior infra criteria.",
            "Drafted 4 tailored applications. They're waiting for your one-tap approval.",
            "Sarah at Stripe replied — she'd like to schedule a 30-minute screen this week.",
          ].map((line, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-2">
          <Link to="/approvals" className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition">
            Review 4 applications
          </Link>
          <Link to="/prep" className="text-[13px] font-medium px-3.5 py-2 rounded-lg surface hover:bg-secondary/60 transition">
            Prep for Stripe screen
          </Link>
          <Link to="/feed" className="text-[13px] font-medium px-3.5 py-2 rounded-lg surface hover:bg-secondary/60 transition">
            See top matches
          </Link>
        </div>
      </section>

      {/* Outcome metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { v: "2", l: "Interviews this week", d: "+1 vs last week" },
          { v: "4", l: "Replies", d: "Last 7 days" },
          { v: "27", l: "Applications sent", d: "All tailored" },
          { v: "82%", l: "Match quality", d: "Above target" },
        ].map((m) => (
          <div key={m.l} className="surface rounded-xl p-5">
            <div className="font-serif text-4xl tracking-tight">{m.v}</div>
            <div className="text-[13px] mt-2 font-medium">{m.l}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{m.d}</div>
          </div>
        ))}
      </section>

      {/* Top opportunities */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">Top opportunities for you today</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Hand-picked by Aether based on your taste.</p>
          </div>
          <Link to="/feed" className="text-[13px] text-accent hover:underline">View all →</Link>
        </div>
        <div className="space-y-3">
          {topMatches.map((j) => (
            <article key={j.id} className="surface rounded-xl p-5 hover:shadow-sm transition">
              <div className="flex items-start gap-5">
                <div className="shrink-0 size-12 rounded-lg bg-secondary grid place-items-center font-serif text-lg">
                  {j.company[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium text-[15px]">{j.title}</h3>
                    <span className="text-[12px] text-muted-foreground">{j.company}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {j.location} · {j.salary} · {j.postedAgo}
                  </p>
                  <p className="text-[13px] text-foreground/80 mt-3 leading-relaxed line-clamp-2">
                    {j.reasoning}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-serif text-3xl tracking-tight">{j.matchScore}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Match</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition">
                  Apply with Aether
                </button>
                <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg surface hover:bg-secondary/60 transition">
                  Save for later
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
