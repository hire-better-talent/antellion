import { BRAND_TOKENS } from "@antellion/core";

interface RecommendationCardProps {
  id: string;
  stage: string;
  priority: string;
  title: string;
  summary: string;
  whyItMatters: string;
  targetPlatforms: string[];
  actions: string[];
  evidenceBasis: string;
  expectedImpact: string;
  effort: string;
  timeframe: string;
  /** Sequencing: why this action is urgent right now */
  whyNow?: string;
  /** Sequencing: what action should be completed before this one */
  doBefore?: string;
  /** Sequencing: what action should follow this one */
  doAfter?: string;
  /** When true renders for print/export */
  printMode?: boolean;
}

const PRIORITY_SCREEN: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-700 border border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border border-orange-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  LOW: "bg-gray-100 text-gray-600 border border-gray-200",
};

const PRIORITY_PRINT: Record<string, string> = {
  CRITICAL: "border border-gray-500 text-gray-800 font-bold",
  HIGH: "border border-gray-400 text-gray-800 font-semibold",
  MEDIUM: "border border-gray-300 text-gray-700",
  LOW: "border border-gray-200 text-gray-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  CONSIDERATION: "Consideration",
  EVALUATION: "Evaluation",
  COMMITMENT: "Commitment",
};

const EFFORT_LABELS: Record<string, string> = {
  LOW: "Low effort",
  MEDIUM: "Medium effort",
  HIGH: "High effort",
};

export function RecommendationCard({
  stage,
  priority,
  title,
  summary,
  whyItMatters,
  targetPlatforms,
  actions,
  evidenceBasis,
  expectedImpact,
  effort,
  timeframe,
  whyNow,
  doBefore,
  doAfter,
  printMode = false,
}: RecommendationCardProps) {
  const priorityStyle = printMode
    ? (PRIORITY_PRINT[priority] ?? PRIORITY_PRINT.MEDIUM)
    : (PRIORITY_SCREEN[priority] ?? PRIORITY_SCREEN.MEDIUM);
  const priorityLabel = PRIORITY_LABELS[priority] ?? priority;
  const stageLabel = STAGE_LABELS[stage] ?? stage;
  const effortLabel = EFFORT_LABELS[effort] ?? effort;

  const hasSequencing = whyNow || doBefore || doAfter;

  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: `1px solid ${BRAND_TOKENS.reportBorder}`,
        backgroundColor: BRAND_TOKENS.reportBg,
      }}
    >
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${BRAND_TOKENS.accentPrimary}14`,
            color: BRAND_TOKENS.accentPrimary,
          }}
        >
          {stageLabel}
        </span>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${priorityStyle}`}
        >
          {priorityLabel}
        </span>
      </div>

      {/* Title */}
      <h4 className="mt-3 text-base font-semibold" style={{ color: BRAND_TOKENS.reportText }}>{title}</h4>

      {/* Summary */}
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{summary}</p>

      {/* Why it matters */}
      <div
        className="mt-4 rounded px-4 py-3 text-sm text-gray-700"
        style={{
          border: `1px solid ${BRAND_TOKENS.reportBorder}`,
          backgroundColor: BRAND_TOKENS.reportSurface,
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: BRAND_TOKENS.accentPrimary }}
        >
          Why this matters
        </p>
        <p className="mt-1.5 leading-relaxed">{whyItMatters}</p>
      </div>

      {/* Sequencing block */}
      {hasSequencing && (
        <div
          className="mt-3 rounded px-4 py-3 text-sm"
          style={{
            borderLeft: `2px solid ${BRAND_TOKENS.accentPrimary}33`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            Sequencing
          </p>
          <div className="mt-2 space-y-1.5">
            {whyNow && (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-800">Why now: </span>
                {whyNow}
              </p>
            )}
            {doBefore && (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-800">Before this: </span>
                {doBefore}
              </p>
            )}
            {doAfter && (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-800">After this: </span>
                {doAfter}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="mt-4">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            Actions
          </p>
          <ol className="mt-2 space-y-1.5">
            {actions.map((action, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-gray-700"
              >
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    border: `1px solid ${BRAND_TOKENS.accentPrimary}33`,
                    color: BRAND_TOKENS.accentPrimary,
                  }}
                >
                  {i + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Platform pills */}
      {targetPlatforms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {targetPlatforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
              style={{
                backgroundColor: `${BRAND_TOKENS.accentPrimary}14`,
                color: BRAND_TOKENS.accentPrimary,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Footer metadata */}
      <div
        className="mt-4 flex flex-wrap gap-5 pt-4 text-xs text-gray-500"
        style={{ borderTop: `1px solid ${BRAND_TOKENS.reportBorder}` }}
      >
        {expectedImpact && (
          <div>
            <span className="font-medium text-gray-600">Impact: </span>
            {expectedImpact}
          </div>
        )}
        {effort && (
          <div>
            <span className="font-medium text-gray-600">Effort: </span>
            {effortLabel}
          </div>
        )}
        {timeframe && (
          <div>
            <span className="font-medium text-gray-600">Timeframe: </span>
            {timeframe}
          </div>
        )}
      </div>

      {/* Evidence basis */}
      {evidenceBasis && (
        <p className="mt-3 text-xs text-gray-400">
          <span className="font-medium">Evidence: </span>
          {evidenceBasis}
        </p>
      )}
    </div>
  );
}
