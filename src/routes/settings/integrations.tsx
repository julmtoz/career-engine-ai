import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  getIntegrationStatus,
  getGmailConnectUrl,
  disconnectGmailIntegration,
} from "@/lib/integrations.functions";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsPage,
  validateSearch: (search) => ({
    success: (search as any).success as string | undefined,
    error: (search as any).error as string | undefined,
  }),
  head: () => ({
    meta: [{ title: "Integrations — Aether OS" }],
  }),
});

function IntegrationsPage() {
  const { user, loading } = useAuth();
  if (loading) return <AppShell><div className="py-32 text-center text-sm text-muted">Loading…</div></AppShell>;
  if (!user) return <AppShell><div className="py-32 text-center"><Link to="/login" className="text-accent">Sign in</Link></div></AppShell>;
  return <Authed />;
}

function Authed() {
  const { success, error } = Route.useSearch();
  const qc = useQueryClient();
  const _status = useServerFn(getIntegrationStatus);
  const _connectUrl = useServerFn(getGmailConnectUrl);
  const _disconnect = useServerFn(disconnectGmailIntegration);

  const status = useQuery({ queryKey: ["integrations", "status"], queryFn: () => _status() });

  async function connectGmail() {
    const { url } = await _connectUrl();
    window.location.href = url;
  }

  async function disconnectGmail() {
    await _disconnect();
    qc.invalidateQueries({ queryKey: ["integrations", "status"] });
  }

  const connected = status.data?.gmailConnected ?? false;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10 pb-32">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Settings</div>
        <h1 className="mt-2 font-serif italic text-4xl">Integrations</h1>
        <p className="mt-2 text-sm text-muted">
          Connect the accounts Aether uses to act on your behalf.
        </p>

        {success && (
          <div className="mt-6 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 rounded-lg border border-border bg-card p-5 flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Gmail</div>
            <div className="text-xs text-muted mt-0.5">
              {status.isLoading
                ? "Checking connection…"
                : connected
                  ? "Connected — Aether can send outreach on your behalf."
                  : "Not connected."}
            </div>
          </div>
          {connected ? (
            <button
              onClick={disconnectGmail}
              className="px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium hover:bg-secondary"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectGmail}
              className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
