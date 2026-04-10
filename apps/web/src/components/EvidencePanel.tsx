"use client";

import { useState, useCallback } from "react";
import { getEvidenceByReport } from "@/app/(dashboard)/actions/evidence";
import type { EvidenceBySection } from "@/app/(dashboard)/actions/evidence";
import { EvidenceCard } from "./EvidenceCard";
import { EvidenceBadge } from "./EvidenceBadge";

interface EvidencePanelProps {
  reportId: string;
  sectionHeading: string;
  resultCount?: number;
}

type PanelState = "idle" | "loading" | "loaded" | "empty" | "error";

function buildSummary(items: EvidenceBySection["items"]): {
  queryCount: number;
  mentionCount: number;
  approvedCount: number;
  avgConfidence: number | null;
} {
  const queryCount = items.length;
  const mentionCount = 0; // not stored on EvidenceBySection items; omit if zero
  const approvedCount = items.filter((i) => i.status === "APPROVED").length;
  const scores = items
    .map((i) => i.confidenceScore)
    .filter((s): s is number => s !== null);
  const avgConfidence =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
  return { queryCount, mentionCount, approvedCount, avgConfidence };
}

function SummaryLine({
  items,
  confidence,
}: {
  items: EvidenceBySection["items"];
  confidence: EvidenceBySection["confidence"] | undefined;
}) {
  const { queryCount, approvedCount, avgConfidence } = buildSummary(items);
  const confScore =
    confidence !== undefined
      ? confidence.score / 100
      : avgConfidence;

  const parts: string[] = [];
  if (queryCount > 0) {
    parts.push(`${queryCount} quer${queryCount !== 1 ? "ies" : "y"} evaluated`);
  }
  if (approvedCount > 0) {
    parts.push(`${approvedCount} approved`);
  }

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300">·</span>}
          {p}
        </span>
      ))}
      {confScore !== null && (
        <span className="flex items-center gap-1.5">
          {parts.length > 0 && <span className="text-gray-300">·</span>}
          <EvidenceBadge confidenceScore={confScore} />
        </span>
      )}
    </div>
  );
}

export function EvidencePanel({
  reportId,
  sectionHeading,
  resultCount,
}: EvidencePanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EvidenceBySection["items"]>([]);
  const [sectionConfidence, setSectionConfidence] = useState<
    EvidenceBySection["confidence"] | undefined
  >(undefined);

  const load = useCallback(async () => {
    setPanelState("loading");
    try {
      const sections = await getEvidenceByReport(reportId);
      // Try exact match first, then partial match, then show all evidence
      const exactMatch = sections.find((s) => s.sectionHeading === sectionHeading);
      const partialMatch = !exactMatch
        ? sections.find((s) =>
            s.sectionHeading.toLowerCase().includes(sectionHeading.toLowerCase().split(" ")[0]) ||
            sectionHeading.toLowerCase().includes(s.sectionHeading.toLowerCase().split(" ")[0])
          )
        : undefined;
      const match = exactMatch ?? partialMatch;
      // If no match found, flatten all sections into one list (journey reports use different headings)
      const found = match?.items ?? (sections.length > 0 ? sections.flatMap((s) => s.items) : []);
      setItems(found);
      setSectionConfidence(match?.confidence);
      setPanelState(found.length > 0 ? "loaded" : "empty");
    } catch {
      setPanelState("error");
    }
  }, [reportId, sectionHeading]);

  async function handleToggle() {
    if (!open) {
      setOpen(true);
      if (panelState === "idle") {
        await load();
      }
    } else {
      setOpen(false);
    }
  }

  const triggerCount = resultCount !== undefined ? resultCount : items.length;
  const hasLoaded = panelState === "loaded" || panelState === "empty";

  return (
    <div className="mt-4 border-t border-gray-100 pt-2">
      {/* Trigger area — distinct background to catch the eye on a screen share */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full rounded-md bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span
            className="inline-block shrink-0 text-[10px] leading-none transition-transform text-gray-400"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
          <span className="font-medium">Evidence supporting this finding</span>
          {!hasLoaded && triggerCount > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">
                {triggerCount} result{triggerCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
          {!hasLoaded && sectionConfidence !== undefined && (
            <>
              <span className="text-gray-300">·</span>
              <EvidenceBadge confidenceScore={sectionConfidence.score / 100} />
            </>
          )}
        </div>

        {/* Summary stats — shown after first load */}
        {hasLoaded && items.length > 0 && (
          <div className="pl-4">
            <SummaryLine items={items} confidence={sectionConfidence} />
          </div>
        )}

        {hasLoaded && items.length === 0 && (
          <p className="mt-0.5 pl-4 text-xs text-gray-400">
            No evidence linked to this section
          </p>
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="mt-2 rounded-r border-l-2 border-blue-200 bg-gray-50 p-4">
          {panelState === "loading" && (
            <p className="text-xs text-gray-400">Loading evidence...</p>
          )}

          {panelState === "error" && (
            <p className="text-xs text-red-500">
              Failed to load evidence. Try again.
            </p>
          )}

          {panelState === "empty" && (
            <p className="text-xs text-gray-400">
              No evidence linked to this section yet.
            </p>
          )}

          {panelState === "loaded" && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Evidence — {sectionHeading}
              </p>
              {items.map((item) => (
                <EvidenceCard
                  key={item.id}
                  promptText={item.promptText}
                  queryText={item.queryText}
                  provider={item.provider}
                  modelName={item.modelName}
                  executedAt={item.executedAt}
                  status={item.status}
                  confidenceScore={item.confidenceScore}
                  evidenceRole={item.evidenceRole}
                  scanResultId={item.scanResultId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
