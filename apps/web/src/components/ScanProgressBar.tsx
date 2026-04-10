"use client";

import { useState, useEffect, useCallback } from "react";

interface ScanProgressBarProps {
  scanId: string;
  initialResultCount: number;
  queryCount: number;
  /** When true, poll for updates. When false, static display. */
  polling?: boolean;
  /** Poll interval in ms. Default 3000. */
  pollIntervalMs?: number;
}

export function ScanProgressBar({
  scanId,
  initialResultCount,
  queryCount,
  polling = false,
  pollIntervalMs = 3000,
}: ScanProgressBarProps) {
  const [resultCount, setResultCount] = useState(initialResultCount);
  const [status, setStatus] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/scans/${scanId}/progress`);
      if (!res.ok) return;
      const data = await res.json();
      setResultCount(data.resultCount ?? resultCount);
      if (data.status && data.status !== "RUNNING") {
        setStatus(data.status);
      }
    } catch {
      // Silently ignore poll failures
    }
  }, [scanId, resultCount]);

  useEffect(() => {
    if (!polling || status) return;
    const interval = setInterval(poll, pollIntervalMs);
    return () => clearInterval(interval);
  }, [polling, poll, pollIntervalMs, status]);

  // Auto-reload page when scan completes
  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") {
      window.location.reload();
    }
  }, [status]);

  const pct = queryCount > 0 ? Math.round((resultCount / queryCount) * 100) : 0;
  const isComplete = resultCount >= queryCount;

  return (
    <div className="space-y-1.5">
      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          <span className="font-medium tabular-nums text-gray-900">
            {resultCount}
          </span>{" "}
          / {queryCount} queries completed
        </span>
        <span className="tabular-nums font-medium text-gray-500">{pct}%</span>
      </div>

      {/* Polling indicator */}
      {polling && !status && (
        <p className="flex items-center gap-1.5 text-xs text-blue-600">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
          Auto-scan in progress — updating live
        </p>
      )}
    </div>
  );
}
