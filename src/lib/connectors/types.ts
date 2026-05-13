/**
 * Connector contract — every external job source normalizes to NormalizedJob.
 * Server-only helpers consume these and write into job_opportunities.
 */

export type SourceKind =
  | "greenhouse"
  | "lever"
  | "workday"
  | "ashby"
  | "rss"
  | "careers_page"
  | "manual";

export interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  location?: string | null;
  remote?: string | null;
  description?: string | null;
  applyUrl?: string | null;
  url?: string | null;
  postedAt?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface SyncResult {
  ok: boolean;
  seen: number;
  imported: number;
  jobs: NormalizedJob[];
  error?: string;
}

export interface Connector {
  kind: SourceKind;
  /** Pull a fresh batch of normalized jobs for this source identifier. */
  fetch(identifier: string, config?: Record<string, unknown>): Promise<SyncResult>;
}
