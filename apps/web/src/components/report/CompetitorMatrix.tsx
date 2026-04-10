import { PositioningBadge, PositioningBadgePrint } from "./PositioningBadge";

interface CompetitorStageCell {
  stage: string;
  mentionRate: number;
  positioning: string;
}

interface CompetitorRow {
  name: string;
  stages: CompetitorStageCell[];
  overallRate: number;
  threatLevel: string; // "Primary", "Secondary", "Minimal"
}

interface CompetitorMatrixProps {
  client: string;
  clientStages: CompetitorStageCell[];
  clientOverallRate: number;
  competitors: CompetitorRow[];
  /** When true renders for print/export */
  printMode?: boolean;
}

const THREAT_COLORS: Record<string, string> = {
  Primary: "bg-red-50 text-red-700 border border-red-200",
  Secondary: "bg-amber-50 text-amber-700 border border-amber-200",
  Minimal: "bg-gray-100 text-gray-500 border border-gray-200",
};

const THREAT_PRINT_COLORS: Record<string, string> = {
  Primary: "border border-gray-500 text-gray-800 font-semibold",
  Secondary: "border border-gray-400 text-gray-700",
  Minimal: "border border-gray-200 text-gray-500",
};

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function rateTextClass(rate: number, printMode: boolean): string {
  if (printMode) return "font-semibold text-gray-900";
  if (rate >= 0.6) return "font-semibold text-green-700";
  if (rate >= 0.3) return "font-semibold text-amber-700";
  return "font-semibold text-red-700";
}

// Derive stage ordering from the first competitor's stage list (or client)
function deriveStageOrder(
  clientStages: CompetitorStageCell[],
): string[] {
  return clientStages.map((s) => s.stage);
}

export function CompetitorMatrix({
  client,
  clientStages,
  clientOverallRate,
  competitors,
  printMode = false,
}: CompetitorMatrixProps) {
  const stageOrder = deriveStageOrder(clientStages);
  const stageLabels: Record<string, string> = {
    DISCOVERY: "Discovery",
    CONSIDERATION: "Consideration",
    EVALUATION: "Evaluation",
    COMMITMENT: "Commitment",
  };
  const stageDescriptions: Record<string, string> = {
    DISCOVERY: "Does AI list them?",
    CONSIDERATION: "How does AI describe them?",
    EVALUATION: "How do they compare?",
    COMMITMENT: "Can candidates take action?",
  };

  // Sort competitors by threat level then by overall rate descending
  const threatOrder: Record<string, number> = {
    Primary: 0,
    Secondary: 1,
    Minimal: 2,
  };
  const sorted = [...competitors].sort((a, b) => {
    const tDiff =
      (threatOrder[a.threatLevel] ?? 3) - (threatOrder[b.threatLevel] ?? 3);
    if (tDiff !== 0) return tDiff;
    return b.overallRate - a.overallRate;
  });
  // Limit to top 8 competitors — showing 25 rows of zeros adds no value
  const MAX_COMPETITORS = 8;
  const displayed = sorted.slice(0, MAX_COMPETITORS);
  const hiddenCount = sorted.length - displayed.length;

  function renderCell(
    stageId: string,
    stages: CompetitorStageCell[],
    isClient: boolean,
  ) {
    const cell = stages.find((s) => s.stage === stageId);
    if (!cell) {
      return (
        <td
          key={stageId}
          className={`px-3 py-3 text-center text-gray-300 ${isClient ? "bg-blue-50/30" : ""}`}
        >
          —
        </td>
      );
    }
    return (
      <td
        key={stageId}
        className={`px-3 py-3 text-center ${isClient ? (printMode ? "bg-gray-50" : "bg-blue-50/40") : ""}`}
      >
        <div className="flex flex-col items-center gap-1">
          <span
            className={`text-sm tabular-nums ${rateTextClass(cell.mentionRate, printMode)}`}
          >
            {formatRate(cell.mentionRate)}
          </span>
          {printMode ? (
            <PositioningBadgePrint tier={cell.positioning} />
          ) : (
            <PositioningBadge tier={cell.positioning} size="sm" />
          )}
        </div>
      </td>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Competitor
            </th>
            {stageOrder.map((s) => (
              <th
                key={s}
                className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500"
              >
                <div className="uppercase tracking-wide">{stageLabels[s] ?? s}</div>
                <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                  {stageDescriptions[s] ?? ""}
                </div>
              </th>
            ))}
            <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              Overall
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Threat
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Client row — pinned at top, highlighted */}
          <tr
            className={`border-b border-gray-200 ${
              printMode ? "bg-gray-50" : "bg-blue-50/30"
            }`}
          >
            <td className="px-4 py-3 font-semibold text-gray-900">
              {client}
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                (you)
              </span>
            </td>
            {stageOrder.map((s) => renderCell(s, clientStages, true))}
            <td
              className={`px-3 py-3 text-center tabular-nums ${printMode ? "bg-gray-50" : "bg-blue-50/40"}`}
            >
              <span
                className={`text-sm ${rateTextClass(clientOverallRate, printMode)}`}
              >
                {formatRate(clientOverallRate)}
              </span>
            </td>
            <td
              className={`px-3 py-3 ${printMode ? "bg-gray-50" : "bg-blue-50/40"}`}
            >
              <span className="text-xs text-gray-400">—</span>
            </td>
          </tr>

          {/* Competitor rows */}
          {displayed.map((comp, i) => {
            const threatStyle = printMode
              ? (THREAT_PRINT_COLORS[comp.threatLevel] ??
                THREAT_PRINT_COLORS.Minimal)
              : (THREAT_COLORS[comp.threatLevel] ?? THREAT_COLORS.Minimal);

            return (
              <tr
                key={comp.name}
                className={`border-b border-gray-100 last:border-0 ${
                  i % 2 === 0 ? "" : "bg-gray-50/50"
                }`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {comp.name}
                </td>
                {stageOrder.map((s) =>
                  renderCell(s, comp.stages, false),
                )}
                <td className="px-3 py-3 text-center tabular-nums">
                  <span
                    className={`text-sm ${rateTextClass(comp.overallRate, printMode)}`}
                  >
                    {formatRate(comp.overallRate)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${threatStyle}`}
                  >
                    {comp.threatLevel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hiddenCount > 0 && (
        <p className="px-4 py-2 text-xs text-gray-400">
          + {hiddenCount} additional competitor{hiddenCount !== 1 ? "s" : ""} assessed with minimal or no AI visibility.
        </p>
      )}
    </div>
  );
}
