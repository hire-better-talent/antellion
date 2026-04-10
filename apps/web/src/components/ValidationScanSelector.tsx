"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createValidationScan } from "@/app/(dashboard)/actions/scans";

interface QueryOption {
  id: string;
  text: string;
  clusterName: string;
  hasResult: boolean;
  mentioned: boolean | null;
  signalTier: string | null;
}

interface ValidationScanSelectorProps {
  scanId: string;
  scanStatus: string;
  queries: QueryOption[];
}

export function ValidationScanSelector({
  scanId,
  scanStatus,
  queries,
}: ValidationScanSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  if (scanStatus !== "COMPLETED") return null;
  if (queries.length === 0) return null;

  function enterSelectionMode() {
    setSelecting(true);
    setSelected(new Set());
    setError(null);
  }

  function cancelSelectionMode() {
    setSelecting(false);
    setSelected(new Set());
    setError(null);
  }

  function toggleQuery(id: string) {
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

  function applyFilter(filter: "not-mentioned" | "low-zero-signal") {
    const ids = queries
      .filter((q) => {
        if (filter === "not-mentioned") return q.mentioned === false;
        if (filter === "low-zero-signal")
          return q.signalTier === "low" || q.signalTier === "zero";
        return false;
      })
      .map((q) => q.id);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(queries.map((q) => q.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  function handleSubmit() {
    setError(null);
    const queryIds = Array.from(selected);
    startTransition(async () => {
      const result = await createValidationScan(scanId, queryIds);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/scans/${result.scanId}`);
      }
    });
  }

  const selectedCount = selected.size;
  const overLimit = selectedCount > 50;
  const canSubmit = selectedCount > 0 && !overLimit && !isPending;

  if (!selecting) {
    return (
      <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Validation re-run</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Select specific queries to re-run as a targeted validation scan.
          </p>
        </div>
        <button
          type="button"
          onClick={enterSelectionMode}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Select queries for validation
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount === 0
              ? "No queries selected"
              : selectedCount === 1
                ? "1 query selected"
                : `${selectedCount} queries selected`}
          </span>
          {overLimit && (
            <span className="text-xs font-medium text-red-600">
              Maximum 50 queries per validation scan
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick pre-select filters */}
          <span className="text-xs text-gray-400">Pre-select:</span>
          <button
            type="button"
            onClick={() => applyFilter("not-mentioned")}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Not mentioned
          </button>
          <button
            type="button"
            onClick={() => applyFilter("low-zero-signal")}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Low / zero signal
          </button>
          <span className="text-gray-200">|</span>
          <button
            type="button"
            onClick={selectAll}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            All
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            None
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2.5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Query list */}
      <div className="divide-y divide-gray-50">
        {queries.map((query) => {
          const isChecked = selected.has(query.id);
          return (
            <label
              key={query.id}
              className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleQuery(query.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{query.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="text-xs text-gray-400">
                    {query.clusterName}
                  </span>
                  {query.hasResult ? (
                    <>
                      <span
                        className={`text-xs ${
                          query.mentioned
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {query.mentioned ? "Mentioned" : "Not mentioned"}
                      </span>
                      {query.signalTier && (
                        <span
                          className={`text-xs ${
                            query.signalTier === "high"
                              ? "text-green-600"
                              : query.signalTier === "medium"
                                ? "text-amber-600"
                                : query.signalTier === "low"
                                  ? "text-orange-600"
                                  : "text-gray-400"
                          }`}
                        >
                          {query.signalTier === "high"
                            ? "High signal"
                            : query.signalTier === "medium"
                              ? "Medium signal"
                              : query.signalTier === "low"
                                ? "Low signal"
                                : "Zero signal"}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">No result</span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={cancelSelectionMode}
          disabled={isPending}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {isPending
            ? "Creating..."
            : `Create Validation Scan${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
