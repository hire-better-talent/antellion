/**
 * CrossSegmentSummaryBlock
 *
 * Renders the cross-segment executive overview when a report covers multiple
 * talent segments (e.g. Software Engineer, Retail Store Manager, Supply Chain).
 *
 * Shown before the per-segment section loop. Presents:
 *   - summaryNarrative (one-sentence executive finding)
 *   - segment comparison table (earned visibility, tier, top competitor, critical gaps)
 *   - common platform gaps (appear across all segments)
 *   - segment-specific gap counts
 *
 * Data source: meta.crossSegmentSummary + meta.segments
 */

import type { CrossSegmentSummary, SegmentData } from "./journey-types";

interface CrossSegmentSummaryBlockProps {
  crossSegment: CrossSegmentSummary;
  segments: SegmentData[];
  clientName: string;
  /** When true applies print-optimised styles */
  printMode?: boolean;
}

const TIER_LABELS: Record<string, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
  invisible: "Invisible",
};

const TIER_SCREEN_CLASS: Record<string, string> = {
  strong: "bg-green-50 text-green-700",
  moderate: "bg-blue-50 text-blue-700",
  weak: "bg-amber-50 text-amber-700",
  invisible: "bg-red-50 text-red-700",
};

const TIER_PRINT_CLASS: Record<string, string> = {
  strong: "border border-gray-400 text-gray-800 font-semibold",
  moderate: "border border-gray-400 text-gray-700",
  weak: "border border-gray-400 text-gray-700",
  invisible: "border border-gray-500 text-gray-800 font-bold",
};

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function tierBadge(tier: string, printMode: boolean): string {
  const key = tier.toLowerCase();
  const base = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";
  const color = printMode
    ? (TIER_PRINT_CLASS[key] ?? TIER_PRINT_CLASS.weak)
    : (TIER_SCREEN_CLASS[key] ?? TIER_SCREEN_CLASS.weak);
  return `${base} ${color}`;
}

function deriveTopCompetitor(segment: SegmentData): string {
  if (!segment.competitors || segment.competitors.length === 0) return "—";
  const primary =
    segment.competitors.find((c) => c.threatLevel === "Primary") ??
    segment.competitors[0];
  const discoveryStage = primary?.stages.find((s) => s.stage === "DISCOVERY");
  const rate = discoveryStage?.mentionRate ?? primary?.overallRate ?? 0;
  return `${primary.name} (${formatPct(rate)})`;
}

function deriveCriticalGaps(segment: SegmentData): string {
  const stages = segment.journeyAnalysis?.stages ?? [];
  const allGaps = Array.from(new Set(stages.flatMap((s) => s.gapDomains)));
  if (allGaps.length === 0) return "None identified";
  return `${allGaps.length} platform${allGaps.length !== 1 ? "s" : ""}`;
}

export function CrossSegmentSummaryBlock({
  crossSegment,
  segments,
  clientName,
  printMode = false,
}: CrossSegmentSummaryBlockProps) {
  const containerClass = printMode
    ? "rounded-lg border-2 border-gray-400 bg-white p-6 break-inside-avoid"
    : "rounded-lg border border-gray-300 bg-gray-50 p-6";

  const tableWrapClass = printMode
    ? "overflow-x-auto rounded border border-gray-300"
    : "overflow-x-auto rounded border border-gray-200";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          className={`font-bold text-gray-900 ${printMode ? "text-xl" : "text-lg"}`}
        >
          Cross-Segment Overview
        </h2>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {clientName} — {crossSegment.segmentCount} segments
        </span>
      </div>

      {/* Executive narrative */}
      <p
        className={`mb-5 text-sm leading-relaxed ${printMode ? "text-gray-700" : "text-gray-700"}`}
      >
        {crossSegment.summaryNarrative}
      </p>

      {/* Segment comparison table */}
      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead>
            <tr
              className={`border-b ${printMode ? "border-gray-300 bg-gray-50" : "border-gray-200 bg-gray-50"}`}
            >
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Segment
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Earned Discovery
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Visibility Tier
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Top Competitor
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Platform Gaps
              </th>
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, i) => {
              const tier =
                seg.journeyAnalysis?.earnedVisibilityTier ?? "invisible";
              const earnedRate =
                seg.journeyAnalysis?.earnedVisibilityRate ??
                seg.journeyAnalysis?.stages?.find(
                  (s) => s.stage === "DISCOVERY",
                )?.mentionRate ??
                0;
              const topCompetitor = deriveTopCompetitor(seg);
              const criticalGaps = deriveCriticalGaps(seg);

              const isStrongest =
                crossSegment.strongestSegment.name === seg.name;
              const isWeakest = crossSegment.weakestSegment.name === seg.name;

              return (
                <tr
                  key={seg.name}
                  className={`border-b last:border-0 ${
                    printMode
                      ? i % 2 === 0
                        ? "border-gray-200 bg-white"
                        : "border-gray-200 bg-gray-50"
                      : i % 2 === 0
                        ? "border-gray-100"
                        : "border-gray-100 bg-gray-50/40"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      {seg.name}
                    </span>
                    {(isStrongest || isWeakest) && (
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          printMode
                            ? "border border-gray-300 text-gray-600"
                            : isStrongest
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isStrongest ? "Strongest" : "Weakest"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <span
                      className={`font-semibold ${
                        printMode
                          ? "text-gray-900"
                          : earnedRate >= 0.3
                            ? "text-green-700"
                            : earnedRate >= 0.1
                              ? "text-amber-700"
                              : "text-red-700"
                      }`}
                    >
                      {formatPct(earnedRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={tierBadge(tier, printMode)}>
                      {TIER_LABELS[tier.toLowerCase()] ?? tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{topCompetitor}</td>
                  <td className="px-4 py-3 text-gray-700">{criticalGaps}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Key findings */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {/* Common gaps */}
        {crossSegment.commonGaps.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Common platform gaps (all segments)
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {crossSegment.commonGaps.map((gap) => (
                <span
                  key={gap}
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    printMode
                      ? "border border-gray-400 text-gray-800"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {gap}
                </span>
              ))}
            </div>
            <p
              className={`mt-2 text-xs ${printMode ? "text-gray-600" : "text-gray-500"}`}
            >
              These {crossSegment.commonGaps.length} platform
              {crossSegment.commonGaps.length !== 1 ? "s are" : " is"} citation
              gaps across every segment — closing them improves all talent
              markets simultaneously.
            </p>
          </div>
        )}

        {/* Segment-specific gaps summary */}
        {crossSegment.segmentSpecificGaps.some((sg) => sg.gaps.length > 0) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Segment-specific gaps
            </p>
            <ul className="mt-2 space-y-1.5">
              {crossSegment.segmentSpecificGaps
                .filter((sg) => sg.gaps.length > 0)
                .map((sg) => (
                  <li key={sg.segment} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-800">
                      {sg.segment}:{" "}
                    </span>
                    {sg.gaps.slice(0, 3).join(", ")}
                    {sg.gaps.length > 3 && (
                      <span className="text-gray-400">
                        {" "}
                        +{sg.gaps.length - 3} more
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* Strongest / weakest summary line */}
      <div
        className={`mt-5 rounded border p-4 text-sm ${
          printMode ? "border-gray-200 bg-white" : "border-gray-100 bg-white"
        }`}
      >
        <div className="space-y-1.5">
          <p className="text-gray-700">
            <span className="font-semibold text-gray-800">
              Strongest segment:{" "}
            </span>
            {crossSegment.strongestSegment.name} at{" "}
            {formatPct(crossSegment.strongestSegment.earnedVisibilityRate)}{" "}
            earned discovery (
            {TIER_LABELS[
              crossSegment.strongestSegment.earnedVisibilityTier.toLowerCase()
            ] ?? crossSegment.strongestSegment.earnedVisibilityTier}
            )
          </p>
          <p className="text-gray-700">
            <span className="font-semibold text-gray-800">
              Weakest segment:{" "}
            </span>
            {crossSegment.weakestSegment.name} at{" "}
            {formatPct(crossSegment.weakestSegment.earnedVisibilityRate)}{" "}
            earned discovery (
            {TIER_LABELS[
              crossSegment.weakestSegment.earnedVisibilityTier.toLowerCase()
            ] ?? crossSegment.weakestSegment.earnedVisibilityTier}
            ) — requires the most immediate attention.
          </p>
        </div>
      </div>
    </div>
  );
}
