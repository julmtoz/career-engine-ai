/**
 * Lever Postings API — public, no auth.
 *   GET https://api.lever.co/v0/postings/{site}?mode=json
 * Identifier = lever site slug (e.g. "netflix", "figma").
 */
import type { Connector, NormalizedJob, SyncResult } from "./types";

const BASE = "https://api.lever.co/v0/postings";

function stripHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const leverConnector: Connector = {
  kind: "lever",
  async fetch(identifier: string): Promise<SyncResult> {
    const url = `${BASE}/${encodeURIComponent(identifier)}?mode=json`;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) {
        return { ok: false, seen: 0, imported: 0, jobs: [], error: `HTTP ${r.status}` };
      }
      const data = (await r.json()) as any[];
      const jobs: NormalizedJob[] = (data ?? []).map((j) => {
        const loc = j.categories?.location ?? null;
        const desc = [
          j.descriptionPlain,
          ...(Array.isArray(j.lists)
            ? j.lists.map((l: any) => `${l.text}: ${stripHtml(l.content)}`)
            : []),
          j.additionalPlain,
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 8000);
        return {
          externalId: String(j.id),
          title: String(j.text ?? ""),
          company: identifier,
          location: loc,
          remote: /remote/i.test(loc ?? "") || j.categories?.commitment === "Remote" ? "Remote" : null,
          description: desc,
          applyUrl: j.applyUrl ?? j.hostedUrl ?? null,
          url: j.hostedUrl ?? null,
          postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
          tags: [j.categories?.team, j.categories?.department, j.categories?.commitment].filter(
            Boolean,
          ),
          meta: { workplaceType: j.workplaceType, country: j.country },
        };
      });
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
