"use client";

import { useEffect, useState, useTransition } from "react";
import { triggerEngagementScan } from "@/app/(dashboard)/actions/diagnostic";

interface ClusterRow {
  id: string;
  name: string;
  intent: string | null;
  stage: string | null;
  reviewStatus: "DRAFT" | "APPROVED" | "NEEDS_REVISION" | "STALE";
  reviewedAt: string | null;
  reviewNotes: string | null;
  queries: { id: string }[];
}

interface Props {
  engagementId: string;
  clientId: string;
}

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  CONSIDERATION: "Consideration",
  EVALUATION: "Evaluation",
  COMMITMENT: "Commitment",
};

const STAGE_ORDER = ["DISCOVERY", "CONSIDERATION", "EVALUATION", "COMMITMENT"];

/**
 * Scan trigger panel for a Diagnostic engagement.
 *
 * Fetches available query clusters for the client, presents them as a
 * multi-select grouped by journey stage, and calls triggerEngagementScan
 * on submit. Requires at least 1 cluster selected.
 *
 * Visible on the engagement detail page when status is SCOPING or REVIEW
 * and no scan is currently running.
 */
export function TriggerScanPanel({ engagementId, clientId }: Props) {
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/query-clusters`)
      .then((r) => r.json())
      .then((data) => {
        if (data.clusters) {
          setClusters(data.clusters);
          setSelected(
            new Set(
              data.clusters
                .filter((cluster: ClusterRow) => cluster.reviewStatus === "APPROVED")
                .map((cluster: ClusterRow) => cluster.id),
            ),
          );
        } else {
          setFetchError(data.error ?? "Failed to load query clusters.");
        }
      })
      .catch(() => setFetchError("Network error loading query clusters."))
      .finally(() => setLoading(false));
  }, [clientId]);

  function toggleCluster(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleLaunch() {
    if (selected.size === 0) return;
    setActionError(null);
    startTransition(async () => {
      const result = await triggerEngagementScan(engagementId, Array.from(selected));
      if ("error" in result) {
        setActionError(result.error);
      } else {
        setLaunched(true);
        // Refresh the page to reflect SCANNING status
        window.location.reload();
      }
    });
  }

  if (launched) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        Scan launched. The page will refresh momentarily.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-5">
        <p className="text-sm text-gray-400">Loading query clusters...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {fetchError}
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-5 py-4">
        <p className="text-sm font-medium text-yellow-800">No query clusters available for this client.</p>
        <p className="text-xs text-yellow-700 mt-1">
          Create clusters under{" "}
          <a href="/queries" className="underline">
            Queries
          </a>{" "}
          before triggering a Diagnostic scan.
        </p>
      </div>
    );
  }

  // Group clusters by stage
  const grouped: Record<string, ClusterRow[]> = {};
  const unstaged: ClusterRow[] = [];

  for (const cluster of clusters) {
    if (cluster.stage) {
      grouped[cluster.stage] = grouped[cluster.stage] ?? [];
      grouped[cluster.stage]!.push(cluster);
    } else {
      unstaged.push(cluster);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Launch Scan</h3>
      <p className="text-xs text-gray-500 mb-4">
        Select the query clusters to include in this Diagnostic scan.
        The scan will run all selected queries across 4 models and 3 personas
        ({selected.size} cluster{selected.size !== 1 ? "s" : ""} selected,{" "}
        {clusters
          .filter((c) => selected.has(c.id))
          .reduce((sum, c) => sum + c.queries.length, 0)}{" "}
        active queries). Only approved clusters can launch a Diagnostic scan.
      </p>

      <div className="space-y-4 mb-5">
        {STAGE_ORDER.map((stage) => {
          const stageClusters = grouped[stage];
          if (!stageClusters?.length) return null;
          return (
            <div key={stage}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {STAGE_LABELS[stage] ?? stage}
              </p>
              <div className="space-y-1">
                {stageClusters.map((cluster) => (
                  <ClusterCheckbox
                    key={cluster.id}
                    cluster={cluster}
                    checked={selected.has(cluster.id)}
                    onChange={() => toggleCluster(cluster.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {unstaged.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Unassigned stage
            </p>
            <div className="space-y-1">
              {unstaged.map((cluster) => (
                <ClusterCheckbox
                  key={cluster.id}
                  cluster={cluster}
                  checked={selected.has(cluster.id)}
                  onChange={() => toggleCluster(cluster.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {actionError && (
        <p className="mb-3 text-xs text-red-600">{actionError}</p>
      )}

      <button
        type="button"
        onClick={handleLaunch}
        disabled={isPending || selected.size === 0}
        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Launching scan..." : `Launch scan (${selected.size} cluster${selected.size !== 1 ? "s" : ""})`}
      </button>
    </div>
  );
}

function ClusterCheckbox({
  cluster,
  checked,
  onChange,
}: {
  cluster: ClusterRow;
  checked: boolean;
  onChange: () => void;
}) {
  const reviewedAt = cluster.reviewedAt
    ? new Date(cluster.reviewedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors hover:border-gray-300 ${
        cluster.reviewStatus === "APPROVED"
          ? "border-green-100 bg-green-50/40"
          : "border-amber-100 bg-amber-50/40"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-snug text-gray-800">{cluster.name}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              cluster.reviewStatus === "APPROVED"
                ? "bg-green-100 text-green-700"
                : cluster.reviewStatus === "STALE"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {cluster.reviewStatus.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>
        {cluster.intent && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">
            {cluster.intent}
          </p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">
          {cluster.queries.length} active{" "}
          {cluster.queries.length === 1 ? "query" : "queries"}
          {reviewedAt ? `, reviewed ${reviewedAt}` : ""}
        </p>
        {cluster.reviewNotes && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            {cluster.reviewNotes}
          </p>
        )}
      </div>
    </label>
  );
}
