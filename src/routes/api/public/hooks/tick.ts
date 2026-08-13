/**
 * Cron entry point. Called every minute by pg_cron, and by Vercel Cron
 * (which invokes via GET) once deployed there.
 * Drains up to 25 tasks per tick to keep latency low without thundering herds.
 */
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { tickOnce } from "@/lib/orchestrator/worker.server";

async function runTick() {
  const workerId = `worker-${crypto.randomUUID()}`;
  let processed = 0;
  for (let i = 0; i < 25; i++) {
    try {
      const r = await tickOnce(workerId);
      if (r.processed === 0) break;
      processed += r.processed;
    } catch (e) {
      console.error("[tick] task failed", e);
    }
  }
  return Response.json({ ok: true, processed });
}

export const Route = createFileRoute("/api/public/hooks/tick")({
  server: {
    handlers: {
      GET: runTick,
      POST: runTick,
    },
  },
});
