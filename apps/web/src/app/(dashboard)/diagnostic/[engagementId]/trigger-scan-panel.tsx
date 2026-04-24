"use client";

import { useEffect, useState, useTransition } from "react";
import { triggerEngagementScan } from "@/app/(dashboard)/actions/diagnostic";

interface ClusterRow {
  id: string;
  name: string;
  intent: string | null;
  stage: string | null;
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
          // Pre-select all clusters if there are few enough
          if (data.clusters.length > 0 && data.clusters.length <= 10) {
            setSelected(new Set(data.clusters.map((c: ClusterRow) => c.id)));
          }
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
        active queries).
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
                  <label
                    key={cluster.id}
                    className="flex items-start gap-3 cursor-pointer rounded-md border border-gray-100 px-3 py-2 hover:border-gray-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(cluster.id)}
                      onChange={() => toggleCluster(cluster.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{cluster.name}</p>
                      {cluster.intent && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cluster.intent}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cluster.queries.length} active{" "}
                        {cluster.queries.length === 1 ? "query" : "queries"}
                      </p>
                    </div>
                  </label>
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
                <label
                  key={cluster.id}
                  className="flex items-start gap-3 cursor-pointer rounded-md border border-gray-100 px-3 py-2 hover:border-gray-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(cluster.id)}
                    onChange={() => toggleCluster(cluster.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{cluster.name}</p>
                    {cluster.intent && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cluster.intent}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cluster.queries.length} active{" "}
                      {cluster.queries.length === 1 ? "query" : "queries"}
                    </p>
                  </div>
                </label>
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
