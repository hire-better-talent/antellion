/**
 * BaselineComparisonSection
 *
 * Renders a "Progress Since Last Assessment" section showing before/after
 * comparison of key metrics. Displayed after the Baseline Metrics table
 * when a previous assessment baseline exists for this client.
 *
 * Design: clean table with directional indicators. Print-friendly.
 */

import type { BaselineComparisonData, BaselineMetricChange } from "./journey-types";

// ─── Helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMetricValue(
  value: number | string | null,
  metric: string,
): string {
  if (value === null) return "--";
  if (typeof value === "string") return value;

  // Rate metrics (0-1 scale) -> percentage display
  if (
    metric === "earnedVisibilityRate" ||
    metric === "discoveryMentionRate" ||
    metric === "evaluationMentionRate" ||
    metric === "considerationMentionRate" ||
    metric === "commitmentMentionRate" ||
    metric === "overallMentionRate"
  ) {
    return `${Math.round(value * 100)}%`;
  }

  // Competitor gap is already in pp
  if (metric === "competitorGapPp") {
    return `${value > 0 ? "+" : ""}${value}pp`;
  }

  // Integer counts
  if (metric === "totalGapDomains") {
    return String(value);
  }

  return String(value);
}

function formatChangePp(change: BaselineMetricChange): string {
  if (change.metric === "overallPositioning") {
    // Positioning uses labels, not pp
    if (change.changeDirection === "improved") return "Improved";
    if (change.changeDirection === "declined") return "Declined";
    return "--";
  }

  if (change.changePp == null) return "--";

  if (change.metric === "totalGapDomains") {
    // For gap counts, show as closed/opened
    if (change.changePp < 0) return `${Math.abs(change.changePp)} closed`;
    if (change.changePp > 0) return `+${change.changePp} new`;
    return "--";
  }

  // Rate-based changes in pp
  const sign = change.changePp > 0 ? "+" : "";
  return `${sign}${change.changePp}pp`;
}

function directionArrow(direction: BaselineMetricChange["changeDirection"]): string {
  switch (direction) {
    case "improved":
      return "\u2191"; // up arrow
    case "declined":
      return "\u2193"; // down arrow
    case "new":
      return "\u2022"; // bullet
    case "unchanged":
      return "--";
  }
}

function changeColorClass(
  change: BaselineMetricChange,
  printMode: boolean,
): string {
  if (printMode) {
    switch (change.changeDirection) {
      case "improved":
        return "font-semibold text-gray-900";
      case "declined":
        return "font-semibold text-gray-700";
      default:
        return "text-gray-500";
    }
  }

  switch (change.changeDirection) {
    case "improved":
      return "font-semibold text-green-700";
    case "declined":
      return "font-semibold text-red-700";
    case "new":
      return "text-blue-600";
    default:
      return "text-gray-400";
  }
}

function significanceBadgeClass(
  significance: BaselineMetricChange["significance"],
  printMode: boolean,
): string {
  if (printMode) {
    switch (significance) {
      case "meaningful":
        return "bg-gray-100 text-gray-800 border border-gray-300";
      case "marginal":
        return "bg-gray-50 text-gray-600 border border-gray-200";
      default:
        return "bg-white text-gray-400 border border-gray-100";
    }
  }

  switch (significance) {
    case "meaningful":
      return "bg-green-50 text-green-700";
    case "marginal":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-gray-50 text-gray-400";
  }
}

function overallDirectionLabel(
  direction: BaselineComparisonData["overallDirection"],
): string {
  switch (direction) {
    case "improved":
      return "Overall trajectory: Improving";
    case "declined":
      return "Overall trajectory: Declining";
    case "mixed":
      return "Overall trajectory: Mixed";
    case "unchanged":
      return "Overall trajectory: Stable";
  }
}

function overallDirectionClass(
  direction: BaselineComparisonData["overallDirection"],
  printMode: boolean,
): string {
  if (printMode) return "text-gray-900 font-semibold";

  switch (direction) {
    case "improved":
      return "text-green-700 font-semibold";
    case "declined":
      return "text-red-700 font-semibold";
    case "mixed":
      return "text-amber-700 font-semibold";
    case "unchanged":
      return "text-gray-600 font-semibold";
  }
}

// Metrics to display, in order. Filters to only those present in changes.
const DISPLAY_ORDER = [
  "earnedVisibilityRate",
  "discoveryMentionRate",
  "evaluationMentionRate",
  "considerationMentionRate",
  "commitmentMentionRate",
  "overallMentionRate",
  "competitorGapPp",
  "totalGapDomains",
  "overallPositioning",
];

// ─── Component ──────────────────────────────────────────────

interface BaselineComparisonSectionProps {
  comparison: BaselineComparisonData;
  printMode: boolean;
}

export function BaselineComparisonSection({
  comparison,
  printMode,
}: BaselineComparisonSectionProps) {
  const { previous, current, daysBetween, changes, summary, overallDirection } =
    comparison;

  // Order changes by display order, filtering out any not in the list
  const orderedChanges = DISPLAY_ORDER
    .map((metric) => changes.find((c) => c.metric === metric))
    .filter((c): c is BaselineMetricChange => c != null);

  // Skip changes that are purely "unchanged" with no interesting data
  const visibleChanges = orderedChanges.filter(
    (c) => c.changeDirection !== "unchanged" || c.significance !== "unchanged",
  );

  if (visibleChanges.length === 0) return null;

  return (
    <div className={printMode ? "mt-12 page-break" : "space-y-4"}>
      {printMode ? (
        <h2 className="text-xl font-bold text-gray-900">
          Progress Since Last Assessment
        </h2>
      ) : (
        <h2 className="text-lg font-semibold text-gray-900">
          Progress Since Last Assessment
        </h2>
      )}

      {/* Date range */}
      <p className="mt-1 text-sm text-gray-500">
        {formatDate(previous.assessmentDate)} &rarr;{" "}
        {formatDate(current.assessmentDate)}{" "}
        ({daysBetween} day{daysBetween !== 1 ? "s" : ""})
      </p>

      {/* Overall direction badge */}
      <div className="mt-3">
        <span
          className={`inline-flex items-center rounded px-2.5 py-1 text-sm ${overallDirectionClass(overallDirection, printMode)}`}
        >
          {overallDirectionLabel(overallDirection)}
        </span>
      </div>

      {/* Comparison table */}
      <div className={`${printMode ? "mt-4" : "mt-3"} overflow-x-auto rounded border border-gray-200`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Metric
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Previous
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Current
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Change
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleChanges.map((change) => (
              <tr
                key={change.metric}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {change.label}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatMetricValue(change.previous, change.metric)}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-700">
                  {formatMetricValue(change.current, change.metric)}
                </td>
                <td
                  className={`px-4 py-3 ${changeColorClass(change, printMode)}`}
                >
                  {formatChangePp(change)}{" "}
                  {directionArrow(change.changeDirection)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${significanceBadgeClass(change.significance, printMode)}`}
                  >
                    {change.significance}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrative summary */}
      <div
        className={`mt-4 rounded-lg border p-4 ${
          printMode
            ? "border-gray-200 bg-white"
            : "border-blue-100 bg-blue-50/30"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            printMode ? "text-gray-500" : "text-blue-600"
          }`}
        >
          Assessment Summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{summary}</p>
      </div>
    </div>
  );
}
