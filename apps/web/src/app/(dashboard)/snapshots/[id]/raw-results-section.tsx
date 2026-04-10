"use client";

import { useState } from "react";
import { Badge, Card, CardHeader, CardBody } from "@antellion/ui";

// ─── Types ────────────────────────────────────────────────────

interface ResultRow {
  id: string;
  queryId: string;
  response: string;
  mentioned: boolean;
  visibilityScore: number | null;
  sentimentScore: number | null;
  citations: { domain: string; url: string }[];
}

// We rely on the response text containing category markers embedded by the
// query generator (or we fall back to grouping all under "All Results" if
// category metadata is not available on the result row itself).
// The tab labels match the 4 snapshot categories; we show all results in a flat
// list within each tab. Since ScanResult does not carry a snapshotCategory field
// directly, we display tabs by result index-range if category info is absent.

interface TabDef {
  label: string;
  filter: (r: ResultRow, i: number) => boolean;
}

const TABS: TabDef[] = [
  { label: "Discovery (8)", filter: (_r, i) => i < 8 },
  { label: "Contrast (5)", filter: (_r, i) => i >= 8 && i < 13 },
  { label: "Reputation (4)", filter: (_r, i) => i >= 13 && i < 17 },
  { label: "Citations (3)", filter: (_r, i) => i >= 17 },
];

// ─── Expanded row ────────────────────────────────────────────

function ResultRowItem({ result }: { result: ResultRow }) {
  const [expanded, setExpanded] = useState(false);

  const sentimentVariant: "success" | "danger" | "default" =
    result.sentimentScore !== null && result.sentimentScore > 0
      ? "success"
      : result.sentimentScore !== null && result.sentimentScore < 0
        ? "danger"
        : "default";

  return (
    <div className="px-6 py-4 space-y-2">
      {/* Response excerpt + badges row */}
      <div className="flex items-start justify-between gap-4">
        <p className="flex-1 text-xs leading-snug text-gray-600 italic">
          &ldquo;{result.response.slice(0, 140)}
          {result.response.length > 140 ? "..." : ""}&rdquo;
        </p>
        <div className="shrink-0 flex items-center gap-2">
          <Badge variant={result.mentioned ? "success" : "default"}>
            {result.mentioned ? "Mentioned" : "Not mentioned"}
          </Badge>
        </div>
      </div>

      {/* Score row */}
      <div className="flex flex-wrap items-center gap-2">
        {result.visibilityScore !== null && (
          <span className="text-xs text-gray-500">
            Visibility: {result.visibilityScore}
          </span>
        )}
        {result.sentimentScore !== null && (
          <Badge variant={sentimentVariant}>
            Sentiment:{" "}
            {result.sentimentScore > 0 ? "+" : ""}
            {result.sentimentScore.toFixed(2)}
          </Badge>
        )}
        {result.citations.length > 0 && (
          <span className="text-xs text-gray-400">
            {result.citations.length} citation
            {result.citations.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Citations */}
      {result.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.citations.map((c) => (
            <span
              key={c.url}
              className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
            >
              {c.domain}
            </span>
          ))}
        </div>
      )}

      {/* Expandable full response */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {expanded ? "Collapse response" : "Expand full response"}
      </button>

      {expanded && (
        <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3 mt-1">
          <p className="text-xs leading-relaxed text-gray-600 whitespace-pre-wrap">
            {result.response}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────

interface RawResultsSectionProps {
  results: ResultRow[];
}

export function RawResultsSection({ results }: RawResultsSectionProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const activeResults = results.filter((r, i) =>
    TABS[activeTab]?.filter(r, i),
  );

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              All {results.length} Query Results
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Raw scan output organized by category
            </p>
          </div>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      </CardHeader>

      {open && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-6 gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === i
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results */}
          {activeResults.length === 0 ? (
            <CardBody>
              <p className="text-sm text-gray-400">
                No results in this category.
              </p>
            </CardBody>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeResults.map((result) => (
                <ResultRowItem key={result.id} result={result} />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
