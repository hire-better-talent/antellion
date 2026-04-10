import { PositioningBadge, PositioningBadgePrint } from "./PositioningBadge";

export interface JourneyTableRow {
  stage: string;
  label: string;
  question: string;
  mentionRate: number;
  positioning: string;
  topCompetitor?: { name: string; mentionRate: number };
  gap?: number;
  status: string;
  confidence?: string;
  /** "visibility" = earned (Discovery/Evaluation); "positioning" = prompted (Consideration/Commitment) */
  metricType?: "visibility" | "positioning";
}

interface JourneyTableProps {
  stages: JourneyTableRow[];
  /** When true, renders print-optimised styles (borders instead of backgrounds) */
  printMode?: boolean;
}

function mentionRateClass(rate: number): string {
  if (rate >= 0.6) return "text-green-700 font-semibold";
  if (rate >= 0.3) return "text-amber-700 font-semibold";
  return "text-red-700 font-semibold";
}

function statusClass(status: string, printMode: boolean): string {
  const s = status.toLowerCase();
  if (printMode) {
    if (s === "strong") return "border border-gray-400 text-gray-700";
    if (s === "moderate") return "border border-gray-400 text-gray-700";
    return "border border-gray-500 text-gray-800 font-semibold";
  }
  if (s === "strong") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "moderate") return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-700 border border-red-200";
}

function gapClass(gap: number | undefined): string {
  if (gap === undefined) return "text-gray-500";
  if (gap >= 0) return "text-gray-600";
  if (gap <= -20) return "text-red-700 font-semibold";
  return "text-amber-700";
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatGap(gap: number): string {
  if (gap > 0) return `+${gap}pp`;
  if (gap < 0) return `${gap}pp`;
  return "—";
}

function confidenceDot(tier: string | undefined): string | null {
  if (!tier) return null;
  const t = tier.toUpperCase();
  if (t === "HIGH") return "text-green-500";
  if (t === "MEDIUM") return "text-amber-500";
  if (t === "LOW") return "text-red-400";
  return null;
}

export function JourneyTable({
  stages,
  printMode = false,
}: JourneyTableProps) {
  const showConfidence = stages.some((s) => s.confidence);
  const hasEarnedStages = stages.some((s) => s.metricType === "visibility");
  const hasPositioningStages = stages.some(
    (s) => s.metricType === "positioning",
  );
  const showMetricNote = hasEarnedStages && hasPositioningStages;

  return (
    <div>
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Stage
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Mention Rate
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Positioning
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Top Competitor
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Gap
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </th>
            {showConfidence && (
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Confidence
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {stages.map((row) => {
            const dotClass = confidenceDot(row.confidence);
            return (
              <tr
                key={row.stage}
                className="border-b border-gray-100 last:border-0"
              >
                {/* Stage + question */}
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.label}</div>
                  <div className="mt-0.5 text-xs text-gray-400 italic">
                    {row.question}
                  </div>
                </td>
                {/* Mention rate */}
                <td className="px-4 py-3 tabular-nums">
                  <span className={mentionRateClass(row.mentionRate)}>
                    {formatRate(row.mentionRate)}
                  </span>
                </td>
                {/* Positioning */}
                <td className="px-4 py-3">
                  {printMode ? (
                    <PositioningBadgePrint tier={row.positioning} />
                  ) : (
                    <PositioningBadge tier={row.positioning} />
                  )}
                </td>
                {/* Top competitor */}
                <td className="px-4 py-3 text-gray-600">
                  {row.topCompetitor ? (
                    <span>
                      {row.topCompetitor.name}{" "}
                      <span className="tabular-nums text-gray-400">
                        ({formatRate(row.topCompetitor.mentionRate)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                {/* Gap */}
                <td className={`px-4 py-3 tabular-nums ${gapClass(row.gap)}`}>
                  {row.gap !== undefined ? formatGap(row.gap) : "—"}
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusClass(row.status, printMode)}`}
                  >
                    {row.status}
                  </span>
                </td>
                {/* Confidence */}
                {showConfidence && (
                  <td className="px-4 py-3">
                    {row.confidence ? (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        {dotClass && (
                          <span className={`text-[10px] ${dotClass}`}>
                            ●
                          </span>
                        )}
                        {row.confidence.charAt(0) +
                          row.confidence.slice(1).toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {showMetricNote && (
      <p className="mt-2 text-xs text-gray-400 leading-relaxed">
        Discovery and Evaluation rates measure{" "}
        <span className="font-medium text-gray-500">earned visibility</span>
        {" "}— whether AI independently surfaces the company without being
        asked. Consideration and Commitment rates measure{" "}
        <span className="font-medium text-gray-500">positioning quality</span>
        {" "}— the company is named in the query, so appearance is expected;
        what matters is sentiment and how the company is described.
      </p>
    )}
    </div>
  );
}
