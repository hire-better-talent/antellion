/**
 * CompetitorComparisonTable
 *
 * Dense, scannable comparison table focused on earned visibility stages
 * (Discovery + Evaluation). Renders in the Competitive Evaluation section
 * alongside the existing CompetitorMatrix.
 *
 * Design:
 * - Client row pinned at top, highlighted
 * - Color-coded rates: green >= 50%, amber 20-49%, red < 20%
 * - Max 8 competitors, sorted by threat then overall rate
 * - Print-friendly (no background-color dependency)
 *
 * P3c — see docs/development-plan.md Priority 3.
 */

interface CompetitorEntry {
  name: string;
  discoveryRate: number;
  evaluationRate: number;
  overallRate: number;
  sentiment: string;
  threatLevel: string;
}

interface CompetitorComparisonTableProps {
  clientName: string;
  clientDiscoveryRate: number;
  clientEvaluationRate: number;
  clientOverallRate: number;
  clientSentiment: string;
  competitors: CompetitorEntry[];
  printMode?: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const MAX_COMPETITORS = 8;

const THREAT_SCREEN: Record<string, string> = {
  Primary: "bg-red-50 text-red-700 border border-red-200",
  Secondary: "bg-amber-50 text-amber-700 border border-amber-200",
  Minimal: "bg-gray-100 text-gray-500 border border-gray-200",
};

const THREAT_PRINT: Record<string, string> = {
  Primary: "border border-gray-500 text-gray-800 font-semibold",
  Secondary: "border border-gray-400 text-gray-700",
  Minimal: "border border-gray-200 text-gray-500",
};

const SENTIMENT_SCREEN: Record<string, string> = {
  positive: "text-green-700",
  neutral: "text-gray-600",
  negative: "text-red-700",
  mixed: "text-amber-700",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  mixed: "Mixed",
};

// ─── Helpers ─────────────────────────────────────────────────

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function rateColorClass(rate: number, printMode: boolean): string {
  if (printMode) return "font-semibold text-gray-900";
  if (rate >= 0.5) return "font-semibold text-green-700";
  if (rate >= 0.2) return "font-semibold text-amber-700";
  return "font-semibold text-red-700";
}

function sortCompetitors(competitors: CompetitorEntry[]): CompetitorEntry[] {
  const threatOrder: Record<string, number> = {
    Primary: 0,
    Secondary: 1,
    Minimal: 2,
  };
  return [...competitors].sort((a, b) => {
    const tDiff =
      (threatOrder[a.threatLevel] ?? 3) - (threatOrder[b.threatLevel] ?? 3);
    if (tDiff !== 0) return tDiff;
    return b.overallRate - a.overallRate;
  });
}

// ─── Component ───────────────────────────────────────────────

export function CompetitorComparisonTable({
  clientName,
  clientDiscoveryRate,
  clientEvaluationRate,
  clientOverallRate,
  clientSentiment,
  competitors,
  printMode = false,
}: CompetitorComparisonTableProps) {
  const sorted = sortCompetitors(competitors);
  const displayed = sorted.slice(0, MAX_COMPETITORS);
  const hiddenCount = sorted.length - displayed.length;

  const clientRowBg = printMode ? "bg-gray-50" : "bg-blue-50/30";
  const clientCellBg = printMode ? "bg-gray-50" : "bg-blue-50/40";

  function RateCell({
    rate,
    isClient,
  }: {
    rate: number;
    isClient: boolean;
  }) {
    return (
      <td
        className={`px-3 py-3 text-center tabular-nums ${isClient ? clientCellBg : ""}`}
      >
        <span className={`text-sm ${rateColorClass(rate, printMode)}`}>
          {formatRate(rate)}
        </span>
      </td>
    );
  }

  function SentimentCell({
    sentiment,
    isClient,
  }: {
    sentiment: string;
    isClient: boolean;
  }) {
    const normalized = sentiment.toLowerCase();
    const colorClass = printMode
      ? "text-gray-900"
      : (SENTIMENT_SCREEN[normalized] ?? "text-gray-600");
    const label = SENTIMENT_LABELS[normalized] ?? sentiment;
    return (
      <td
        className={`px-3 py-3 text-center text-sm ${isClient ? clientCellBg : ""}`}
      >
        <span className={colorClass}>{label}</span>
      </td>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Company
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">
              <div className="uppercase tracking-wide">Discovery</div>
              <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                Earned visibility
              </div>
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">
              <div className="uppercase tracking-wide">Evaluation</div>
              <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                Competitive comparison
              </div>
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">
              <div className="uppercase tracking-wide">Overall</div>
              <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                Earned stages
              </div>
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              Sentiment
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Threat
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Client row — pinned at top */}
          <tr className={`border-b border-gray-200 ${clientRowBg}`}>
            <td className={`px-4 py-3 font-semibold text-gray-900 ${clientCellBg}`}>
              {clientName}
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                (you)
              </span>
            </td>
            <RateCell rate={clientDiscoveryRate} isClient />
            <RateCell rate={clientEvaluationRate} isClient />
            <RateCell rate={clientOverallRate} isClient />
            <SentimentCell sentiment={clientSentiment} isClient />
            <td className={`px-3 py-3 ${clientCellBg}`}>
              <span className="text-xs text-gray-400">&mdash;</span>
            </td>
          </tr>

          {/* Competitor rows */}
          {displayed.map((comp, i) => {
            const threatStyle = printMode
              ? (THREAT_PRINT[comp.threatLevel] ?? THREAT_PRINT.Minimal)
              : (THREAT_SCREEN[comp.threatLevel] ?? THREAT_SCREEN.Minimal);

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
                <RateCell rate={comp.discoveryRate} isClient={false} />
                <RateCell rate={comp.evaluationRate} isClient={false} />
                <RateCell rate={comp.overallRate} isClient={false} />
                <SentimentCell sentiment={comp.sentiment} isClient={false} />
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
          + {hiddenCount} additional competitor{hiddenCount !== 1 ? "s" : ""}{" "}
          assessed with minimal or no AI visibility.
        </p>
      )}
    </div>
  );
}
