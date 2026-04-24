"use client";

import { useEffect, useState, useTransition } from "react";
import { approveFinding, rejectFinding, updateFindingNarrative } from "@/app/(dashboard)/actions/diagnostic";

interface FindingRow {
  id: string;
  index: number;
  namedIssue: string;
  narrative: string | null;
  actionableCategory: string;
  stage: string | null;
  modelName: string | null;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  evidenceScanResultIds: string[];
  evidenceCitations: Array<{ domain: string; count: number }> | null;
}

interface Props {
  params: { engagementId: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  ZERO_PRESENCE: "Zero presence",
  COMPETITOR_DOMINANCE: "Competitor dominance",
  SENTIMENT_DIVERGENCE: "Sentiment divergence",
  CITATION_MONOCULTURE: "Citation monoculture",
  PERSONA_INVISIBILITY: "Persona invisibility",
  NARRATIVE_INCONSISTENCY: "Narrative inconsistency",
  ZERO_CITATION: "Zero citation",
  CONTENT_GAP: "Content gap",
  COMPETITIVE_POSITIONING: "Competitive positioning",
  EMPLOYER_BRAND: "Employer brand",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-gray-500 bg-gray-50",
  APPROVED: "text-green-700 bg-green-50",
  REJECTED: "text-red-600 bg-red-50",
};

// This is a server-component-friendly page.
// We use a thin client shell that fetches via a route handler.
// For launch: findings are fetched via a simple fetch to the API route below.

export default function FindingsPage({ params }: Props) {
  const { engagementId } = params;
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [narrativeMap, setNarrativeMap] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/diagnostic/${engagementId}/findings`)
      .then((r) => r.json())
      .then((data) => {
        if (data.findings) {
          setFindings(data.findings);
          const narratives: Record<string, string> = {};
          for (const f of data.findings as FindingRow[]) {
            narratives[f.id] = f.narrative ?? "";
          }
          setNarrativeMap(narratives);
        } else {
          setError(data.error ?? "Failed to load findings.");
        }
      })
      .catch(() => setError("Network error loading findings."))
      .finally(() => setLoading(false));
  }, [engagementId]);

  function handleApprove(findingId: string) {
    const narrative = narrativeMap[findingId];
    if (!narrative?.trim()) {
      setMessage("Write a narrative before approving.");
      return;
    }
    setMessage(null);
    const formData = new FormData();
    formData.set("findingId", findingId);
    formData.set("narrative", narrative);

    startTransition(async () => {
      const result = await approveFinding(null, formData);
      if (result?.message) {
        setMessage(result.message);
      } else {
        setFindings((prev) =>
          prev.map((f) => (f.id === findingId ? { ...f, status: "APPROVED" as const, narrative } : f)),
        );
      }
    });
  }

  function handleReject(findingId: string) {
    setMessage(null);
    const formData = new FormData();
    formData.set("findingId", findingId);

    startTransition(async () => {
      const result = await rejectFinding(null, formData);
      if (result?.message) {
        setMessage(result.message);
      } else {
        setFindings((prev) =>
          prev.map((f) => (f.id === findingId ? { ...f, status: "REJECTED" as const } : f)),
        );
      }
    });
  }

  const draftFindings = findings.filter((f) => f.status === "DRAFT");
  const approvedFindings = findings.filter((f) => f.status === "APPROVED");
  const rejectedFindings = findings.filter((f) => f.status === "REJECTED");

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a href={`/diagnostic/${engagementId}`} className="text-sm text-gray-400 hover:text-gray-600">
              Engagement
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">Findings Review</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finding Review</h1>
        </div>
        <div className="text-sm text-gray-500">
          {approvedFindings.length}/10 approved
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          {message}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">Loading findings...</div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && findings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>No candidate findings have been generated yet.</p>
          <p className="text-xs mt-2">Run the scan and then use the "Extract Findings" action from the engagement page.</p>
        </div>
      )}

      {/* Draft findings */}
      {draftFindings.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Draft ({draftFindings.length})
          </h2>
          <div className="space-y-4">
            {draftFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                narrative={narrativeMap[finding.id] ?? ""}
                onNarrativeChange={(v) =>
                  setNarrativeMap((prev) => ({ ...prev, [finding.id]: v }))
                }
                onApprove={() => handleApprove(finding.id)}
                onReject={() => handleReject(finding.id)}
                isActive={activeId === finding.id}
                onToggle={() => setActiveId((prev) => (prev === finding.id ? null : finding.id))}
                disabled={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved findings */}
      {approvedFindings.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Approved ({approvedFindings.length})
          </h2>
          <div className="space-y-2">
            {approvedFindings.map((finding) => (
              <div
                key={finding.id}
                className="border border-green-200 bg-green-50 rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">#{finding.index}</span>
                  <span className="text-sm text-gray-800">{finding.namedIssue}</span>
                </div>
                {finding.narrative && (
                  <p className="text-xs text-gray-500 mt-1 ml-6 line-clamp-2">{finding.narrative}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected findings */}
      {rejectedFindings.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Rejected ({rejectedFindings.length})
          </h2>
          <div className="space-y-2">
            {rejectedFindings.map((finding) => (
              <div key={finding.id} className="border border-gray-100 rounded-md px-4 py-3 opacity-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">#{finding.index}</span>
                  <span className="text-sm text-gray-500 line-through">{finding.namedIssue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FindingCard({
  finding,
  narrative,
  onNarrativeChange,
  onApprove,
  onReject,
  isActive,
  onToggle,
  disabled,
}: {
  finding: FindingRow;
  narrative: string;
  onNarrativeChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  isActive: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-gray-400">#{finding.index}</span>
              <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                {CATEGORY_LABELS[finding.actionableCategory] ?? finding.actionableCategory}
              </span>
              {finding.stage && (
                <span className="text-xs text-blue-600">{finding.stage}</span>
              )}
              {finding.modelName && (
                <span className="text-xs text-purple-600">{finding.modelName}</span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 leading-snug">{finding.namedIssue}</p>
          </div>
          <span className="text-gray-400 shrink-0">{isActive ? "−" : "+"}</span>
        </div>
      </button>

      {isActive && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          {/* Evidence citations */}
          {(finding.evidenceCitations ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Citation sources in evidence:</p>
              <div className="flex flex-wrap gap-1">
                {(finding.evidenceCitations ?? []).map((c) => (
                  <span
                    key={c.domain}
                    className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600"
                  >
                    {c.domain} ({c.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Evidence count */}
          <p className="text-xs text-gray-500">
            {finding.evidenceScanResultIds.length} response{finding.evidenceScanResultIds.length !== 1 ? "s" : ""} in evidence
          </p>

          {/* Narrative */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Analyst narrative (required to approve)
            </label>
            <textarea
              value={narrative}
              onChange={(e) => onNarrativeChange(e.target.value)}
              rows={5}
              placeholder="Write the finding narrative here. Reference specific query IDs, model names, and citation sources. This will appear in the delivered report."
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y"
            />
          </div>

          {/* 3-criteria check */}
          <div className="text-xs text-gray-500 space-y-0.5">
            <p className="font-medium text-gray-700">Materiality criteria:</p>
            <p>
              {finding.namedIssue ? "Y" : "N"} — Named issue present
            </p>
            <p>
              {finding.evidenceScanResultIds.length > 0 ? "Y" : "N"} — Data evidence ({finding.evidenceScanResultIds.length} responses)
            </p>
            <p>
              {finding.actionableCategory ? "Y" : "N"} — Actionable category ({CATEGORY_LABELS[finding.actionableCategory] ?? finding.actionableCategory})
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onApprove}
              disabled={disabled || !narrative.trim()}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={disabled}
              className="inline-flex items-center rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
