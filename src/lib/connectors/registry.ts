/**
 * Connector registry. Workday/Ashby/RSS are stubbed with manual import paths
 * pending org-by-org configuration; the contract is uniform so they slot in.
 */
import type { Connector, SourceKind, SyncResult } from "./types";
import { greenhouseConnector } from "./greenhouse.server";
import { leverConnector } from "./lever.server";

const stub = (kind: SourceKind): Connector => ({
  kind,
  async fetch(): Promise<SyncResult> {
    return {
      ok: false,
      seen: 0,
      imported: 0,
      jobs: [],
      error: `${kind} connector is registered but not yet wired — use Manual / URL intake for now.`,
    };
  },
});

export const CONNECTORS: Record<SourceKind, Connector> = {
  greenhouse: greenhouseConnector,
  lever: leverConnector,
  workday: stub("workday"),
  ashby: stub("ashby"),
  rss: stub("rss"),
  careers_page: stub("careers_page"),
  manual: stub("manual"),
};

export const CONNECTOR_LABELS: Record<SourceKind, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  ashby: "Ashby",
  rss: "RSS feed",
  careers_page: "Careers page",
  manual: "Manual",
};

export const LIVE_KINDS: SourceKind[] = ["greenhouse", "lever"];
