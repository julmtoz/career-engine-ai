import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  listJobSources,
  addJobSource,
  syncJobSource,
  deleteJobSource,
} from "@/lib/connectors.functions";

export const Route = createFileRoute("/sources")({
  component: SourcesPage,
  head: () => ({
    meta: [
      { title: "Connectors — Aether OS" },
      { name: "description", content: "Modular ingestion pipelines for Greenhouse, Lever, Workday, Ashby, RSS, careers pages — with retries, throttling, and freshness tracking." },
    ],
  }),
});

function SourcesPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><Loading /></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

const Loading = () => <div className="py-32 text-center text-sm text-muted">Loading…</div>;

function Authed() {
  const _list = useServerFn(listJobSources);
  const _add = useServerFn(addJobSource);
  const _sync = useServerFn(syncJobSource);
  const _del = useServerFn(deleteJobSource);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sources"], queryFn: () => _list() });
  const [kind, setKind] = useState<string>("greenhouse");
  const [identifier, setIdentifier] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: async () => _add({ data: { kind: kind as never, identifier: identifier.trim(), label: label.trim() || undefined } }),
    onSuccess: () => { setIdentifier(""); setLabel(""); setErr(null); qc.invalidateQueries({ queryKey: ["sources"] }); },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed to add"),
  });
  const sync = useMutation({
    mutationFn: async (id: string) => _sync({ data: { id } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => _del({ data: { id } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  });

  const catalog = q.data?.catalog ?? [];
  const sources = q.data?.sources ?? [];
  const liveKinds = catalog.filter((c) => c.live);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-mono mb-3">Ingestion layer</p>
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-3">Connectors</h1>
          <p className="text-muted max-w-2xl">Each connector pulls jobs into your private opportunity graph. Greenhouse and Lever are live (no auth, no scraping). Other kinds are registered but capture via the URL intake until wired.</p>
        </header>

        <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
          <section className="border border-border rounded-xl p-6 bg-card h-fit">
            <h2 className="font-display font-bold mb-4">Add a source</h2>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm mb-3">
              {catalog.map((c) => (
                <option key={c.kind} value={c.kind}>{c.label}{c.live ? "  ● live" : "  ○ manual"}</option>
              ))}
            </select>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">Identifier</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={kind === "greenhouse" ? "stripe (board token)" : kind === "lever" ? "netflix (org slug)" : "URL or org id"}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm mb-3 font-mono"
            />
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">Label (optional)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm mb-4" />
            <button
              onClick={() => add.mutate()}
              disabled={!identifier.trim() || add.isPending}
              className="w-full px-4 py-2.5 bg-foreground text-background rounded-md text-sm font-medium disabled:opacity-50"
            >
              {add.isPending ? "Adding…" : "Add connector"}
            </button>
            {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
            <div className="mt-6 pt-6 border-t border-border text-xs text-muted space-y-2">
              <p className="font-mono uppercase tracking-wider text-[10px] text-foreground">Live kinds</p>
              <ul className="space-y-1">
                {liveKinds.map((k) => <li key={k.kind}>● {k.label}</li>)}
              </ul>
              <p className="pt-2 italic">Try board tokens: <span className="font-mono not-italic">stripe</span>, <span className="font-mono not-italic">vercel</span>, <span className="font-mono not-italic">airbnb</span> for Greenhouse; <span className="font-mono not-italic">netflix</span>, <span className="font-mono not-italic">figma</span> for Lever.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display font-bold mb-4">Active connectors</h2>
            <div className="space-y-3">
              {sources.length === 0 && <p className="text-sm text-muted">No connectors yet — add one to start the data loop.</p>}
              {sources.map((s) => (
                <div key={s.id} className="border border-border rounded-xl p-5 bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-accent">{s.kind}</span>
                        <StatusDot status={s.status} />
                        <span className="text-xs text-muted">{s.status}</span>
                      </div>
                      <h3 className="font-display font-bold">{s.label || s.identifier}</h3>
                      <p className="font-mono text-xs text-muted">{s.identifier}</p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <div>{s.jobs_imported}/{s.jobs_seen} imported</div>
                      <div className="mt-1">{s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : "never synced"}</div>
                    </div>
                  </div>
                  {s.last_error && <p className="text-xs text-red-500 mt-2">{s.last_error}</p>}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => sync.mutate(s.id)}
                      disabled={sync.isPending}
                      className="px-3 py-1.5 text-xs bg-foreground text-background rounded-md font-medium disabled:opacity-50"
                    >{sync.isPending && sync.variables === s.id ? "Syncing…" : "Sync now"}</button>
                    <button onClick={() => del.mutate(s.id)} className="px-3 py-1.5 text-xs border border-border rounded-md text-muted hover:text-foreground">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function StatusDot({ status }: { status: string }) {
  const c = status === "ok" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : status === "syncing" ? "bg-amber-500 animate-pulse" : "bg-muted";
  return <span className={`size-1.5 rounded-full ${c}`} />;
}
