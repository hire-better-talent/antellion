// Load environment variables from the root .env before importing anything
// that reads process.env (e.g. database client, OpenAI client).
import { config } from "dotenv";
config({ path: "../../.env" });

import { prisma } from "@antellion/db";
import { executeScan } from "./scan-worker";

// ── Safety: prevent concurrent execution of the same scan ───

const inProgress = new Set<string>();

// ── Polling ──────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;

/**
 * Find the oldest RUNNING scan with `metadata.automated = true` that is not
 * already being executed by this worker process, then run it.
 *
 * We filter for `automated: true` in metadata so that manually-operated
 * scans (where the operator is recording responses by hand) are never
 * picked up by the worker.
 *
 * Prisma does not support JSON path filters on all databases uniformly, so
 * we fetch a small batch of RUNNING scans and filter in application code.
 * The set of RUNNING automated scans is always small (typically 0–2), so
 * the extra data transfer is negligible.
 */
async function pollOnce(): Promise<void> {
  let candidates;
  try {
    candidates = await prisma.scanRun.findMany({
      where: { status: "RUNNING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, metadata: true },
      take: 10,
    });
  } catch (err) {
    console.error("Poll error (DB read):", err);
    return;
  }

  // Filter to automated scans not already in-flight in this process
  const automated = candidates.filter((s) => {
    const meta = s.metadata as { automated?: boolean } | null;
    return meta?.automated === true && !inProgress.has(s.id);
  });

  if (automated.length === 0) return;

  const scan = automated[0]!;

  // Best-effort in-process guard: mark as in-flight before the async work.
  // The real duplicate-result protection is the @@unique([scanRunId, queryId])
  // constraint on ScanResult — that makes duplicates impossible at the DB level
  // regardless of how many worker processes are running.
  inProgress.add(scan.id);

  console.log(`Found automated scan ${scan.id} — starting execution...`);

  try {
    await executeScan(scan.id);
    console.log(`Scan ${scan.id} complete.`);
  } catch (err) {
    console.error(`Scan ${scan.id} failed:`, err);

    // Mark the scan FAILED so it doesn't get re-queued on the next poll
    try {
      await prisma.scanRun.update({
        where: { id: scan.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });

      await prisma.transitionLog.create({
        data: {
          entityType: "SCAN_RUN",
          entityId: scan.id,
          fromStatus: "RUNNING",
          toStatus: "FAILED",
          action: "automatedScanFailed",
          actorId: null,
          note: err instanceof Error ? err.message : String(err),
        },
      });
    } catch (updateErr) {
      console.error(`Could not mark scan ${scan.id} as FAILED:`, updateErr);
    }
  } finally {
    inProgress.delete(scan.id);
  }
}

// ── Entry point ──────────────────────────────────────────────

async function main() {
  console.log("Antellion job worker starting...");

  await prisma.$connect();
  console.log("Database connected. Polling for automated scans every 5s...");

  // Run immediately on startup, then on the interval
  void pollOnce();
  setInterval(() => {
    void pollOnce();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
