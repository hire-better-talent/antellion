"use client";

import { useState } from "react";
import { EvidenceBadge } from "./EvidenceBadge";
import { formatDateTime } from "@/lib/format";

interface EvidenceCardProps {
  promptText: string;
  queryText: string | null;
  provider: string;
  modelName: string;
  executedAt: Date | string;
  status: string;
  confidenceScore: number | null;
  evidenceRole: string | null;
  rawResponse?: string;
  extractedSources?: { domain: string; url: string }[] | null;
  scanResultId: string;
}

const PREVIEW_LENGTH = 150;

const evidenceStatusClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  SUPERSEDED: "bg-gray-50 text-gray-400",
};

const evidenceRoleLabel: Record<string, string> = {
  primary: "Primary",
  supporting: "Supporting",
  counter: "Counter",
};

export function EvidenceCard({
  promptText,
  queryText,
  provider,
  modelName,
  executedAt,
  status,
  confidenceScore,
  evidenceRole,
  rawResponse,
  extractedSources,
}: EvidenceCardProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);

  const executedDate =
    typeof executedAt === "string" ? new Date(executedAt) : executedAt;

  const statusClass =
    evidenceStatusClass[status] ?? evidenceStatusClass.DRAFT;

  // Build the always-visible response preview
  const responsePreview =
    rawResponse && rawResponse.trim().length > 0
      ? rawResponse.trim().length > PREVIEW_LENGTH
        ? rawResponse.trim().slice(0, PREVIEW_LENGTH).trimEnd() + "..."
        : rawResponse.trim()
      : null;
  const hasFullResponse = rawResponse && rawResponse.trim().length > PREVIEW_LENGTH;

  return (
    <div className="rounded border border-gray-200 bg-white p-4 text-sm">
      {/* Top row: query + badges */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-medium text-gray-900">
          {queryText ?? "Query not available"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {status}
          </span>
          {evidenceRole && (
            <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {evidenceRoleLabel[evidenceRole] ?? evidenceRole}
            </span>
          )}
          <EvidenceBadge confidenceScore={confidenceScore} />
        </div>
      </div>

      {/* Response preview — always visible when available */}
      {responsePreview && (
        <div className="mt-2.5">
          <p className="text-sm italic text-gray-500 leading-relaxed">
            &ldquo;{responsePreview}&rdquo;
          </p>
          {hasFullResponse && (
            <button
              type="button"
              onClick={() => setResponseOpen((v) => !v)}
              className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <span
                className="inline-block transition-transform"
                style={{
                  transform: responseOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                ▶
              </span>
              {responseOpen ? "Collapse full response" : "View full response"}
            </button>
          )}
          {responseOpen && hasFullResponse && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700">
              {rawResponse}
            </pre>
          )}
        </div>
      )}

      {/* Provenance row */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>
          <span className="font-medium text-gray-600">Provider:</span>{" "}
          {provider} / {modelName}
        </span>
        <span>
          <span className="font-medium text-gray-600">Executed:</span>{" "}
          {formatDateTime(executedDate)}
        </span>
      </div>

      {/* Prompt toggle */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setPromptOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <span
            className="inline-block transition-transform"
            style={{ transform: promptOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
          Prompt
        </button>
        {promptOpen && (
          <pre className="mt-2 whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700">
            {promptText}
          </pre>
        )}
      </div>

      {/* Raw response toggle — only shown when there's no preview (short responses) or as a secondary fallback */}
      {rawResponse && !responsePreview && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setResponseOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <span
              className="inline-block transition-transform"
              style={{
                transform: responseOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▶
            </span>
            Raw response
          </button>
          {responseOpen && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700">
              {rawResponse}
            </pre>
          )}
        </div>
      )}

      {/* Sources */}
      {extractedSources && extractedSources.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">Sources</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {extractedSources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
              >
                {src.domain}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
