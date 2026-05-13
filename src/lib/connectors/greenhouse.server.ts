/**
 * Greenhouse Job Board API — public, no auth.
 *   GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 * Identifier = board_token (e.g. "stripe", "airbnb", "vercel").
 */
import type { Connector, NormalizedJob, SyncResult } from "./types";

const BASE = "https://boards-api.greenhouse.io/v1/boards";

function stripHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export const greenhouseConnector: Connector = {
  kind: "greenhouse",
  async fetch(identifier: string): Promise<SyncResult> {
    const url = `${BASE}/${encodeURIComponent(identifier)}/jobs?content=true`;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) {
        return { ok: false, seen: 0, imported: 0, jobs: [], error: `HTTP ${r.status}` };
      }
      const data = (await r.json()) as { jobs?: any[] };
      const jobs: NormalizedJob[] = (data.jobs ?? []).map((j) => ({
        externalId: String(j.id),
        title: String(j.title ?? ""),
        company: String(j.company_name ?? identifier),
        location: j.location?.name ?? null,
        remote: /remote/i.test(j.location?.name ?? "") ? "Remote" : null,
        description: stripHtml(j.content).slice(0, 8000),
        applyUrl: j.absolute_url ?? null,
        url: j.absolute_url ?? null,
        postedAt: j.updated_at ?? j.first_published ?? null,
        tags: Array.isArray(j.departments)
          ? j.departments.map((d: any) => String(d.name)).filter(Boolean)
          : [],
        meta: { offices: j.offices, departments: j.departments },
      }));
      return { ok: true, seen: jobs.length, imported: 0, jobs };
    } catch (e) {
      return {
        ok: false,
        seen: 0,
        imported: 0,
        jobs: [],
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  },
};
