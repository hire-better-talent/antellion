import { PositioningBadge, PositioningBadgePrint } from "./PositioningBadge";

interface StageCardProps {
  stage: string;
  label: string;
  description: string;
  mentionRate: number;
  positioning: string;
  narrative: string;
  competitorCallout?: string;
  citationContext?: string;
  confidence?: string;
  /** "visibility" = earned (Discovery/Evaluation), "positioning" = prompted (Consideration/Commitment) */
  metricType?: "visibility" | "positioning";
  avgSentiment?: number;
  /** When true renders for print/export */
  printMode?: boolean;
}

function mentionRateClass(rate: number, printMode: boolean): string {
  if (printMode) return "font-bold text-gray-900";
  if (rate >= 0.6) return "font-bold text-green-700";
  if (rate >= 0.3) return "font-bold text-amber-700";
  return "font-bold text-red-700";
}

function positioningQualityLabel(positioning: string): string {
  switch (positioning) {
    case "CHAMPION": return "Strong — AI recommends the company";
    case "CONTENDER": return "Adequate — AI includes but does not feature";
    case "PERIPHERAL": return "Weak — AI mentions in passing only";
    case "CAUTIONARY": return "Negative — AI includes warnings";
    case "INVISIBLE": return "Absent — AI does not mention";
    default: return positioning;
  }
}

function positioningQualityClass(positioning: string, printMode: boolean): string {
  if (printMode) return "font-bold text-gray-900";
  switch (positioning) {
    case "CHAMPION": return "font-bold text-green-700";
    case "CONTENDER": return "font-bold text-blue-700";
    case "PERIPHERAL": return "font-bold text-amber-700";
    case "CAUTIONARY": return "font-bold text-red-700";
    case "INVISIBLE": return "font-bold text-red-700";
    default: return "font-bold text-gray-700";
  }
}

function confidenceLabel(tier: string | undefined): string | null {
  if (!tier) return null;
  const t = tier.toUpperCase();
  if (t === "HIGH") return "High confidence";
  if (t === "MEDIUM") return "Medium confidence";
  if (t === "LOW") return "Low confidence";
  return null;
}

export function StageCard({
  label,
  description,
  mentionRate,
  positioning,
  narrative,
  competitorCallout,
  citationContext,
  confidence,
  metricType,
  printMode = false,
}: StageCardProps) {
  const isPositioningStage = metricType === "positioning";
  const rateLabel = `${Math.round(mentionRate * 100)}%`;
  const confLabel = confidenceLabel(confidence);

  return (
    <div
      className={`rounded-lg border p-5 ${
        printMode ? "border-gray-200 bg-white" : "border-gray-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-gray-900">{label}</h4>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
      </div>

      {/* Metric row — different for visibility vs positioning stages */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {isPositioningStage ? (
          <>
            <span>
              <span className="text-gray-500">Positioning quality: </span>
              <span className={positioningQualityClass(positioning, printMode)}>
                {positioningQualityLabel(positioning)}
              </span>
            </span>
            <span className="text-gray-200">|</span>
            <span className="text-xs text-gray-400">
              Mention rate ({rateLabel}) is expected — query names the company
            </span>
          </>
        ) : (
          <>
            <span>
              <span className="text-gray-500">Earned mention rate: </span>
              <span className={mentionRateClass(mentionRate, printMode)}>
                {rateLabel}
              </span>
            </span>
            <span className="text-gray-200">|</span>
            {printMode ? (
              <PositioningBadgePrint tier={positioning} />
            ) : (
              <PositioningBadge tier={positioning} />
            )}
          </>
        )}
        {confLabel && (
          <>
            <span className="text-gray-200">|</span>
            <span className="text-xs text-gray-400">{confLabel}</span>
          </>
        )}
      </div>

      {/* Narrative */}
      <p className="mt-4 text-sm leading-relaxed text-gray-700">{narrative}</p>

      {/* Competitor callout */}
      {competitorCallout && (
        <div
          className={`mt-4 rounded border-l-2 px-4 py-3 text-sm ${
            printMode
              ? "border-gray-400 bg-white text-gray-700"
              : "border-gray-300 bg-gray-50 text-gray-700"
          }`}
        >
          {competitorCallout}
        </div>
      )}

      {/* Citation context */}
      {citationContext && (
        <p className="mt-3 text-xs text-gray-400">{citationContext}</p>
      )}
    </div>
  );
}
