/**
 * StabilityBadge
 *
 * Inline badge displaying the stability classification of a query or stage.
 * Used in the Assessment Confidence callout and per-stage stability summaries.
 *
 * Stability types:
 *   STABLE_PRESENCE  — mentioned consistently across multiple scan passes
 *   VOLATILE_PRESENCE — mentioned inconsistently
 *   STABLE_ABSENCE   — never mentioned across multiple scan passes
 *   UNVALIDATED      — only one scan run; no cross-run evidence
 */

export type StabilityClassification =
  | "STABLE_PRESENCE"
  | "VOLATILE_PRESENCE"
  | "STABLE_ABSENCE"
  | "UNVALIDATED";

interface StabilityBadgeProps {
  stability: StabilityClassification | string;
  /**
   * Compact variant for inline use inside metric rows.
   * Slightly smaller padding; same color semantics.
   */
  compact?: boolean;
  /**
   * Print-safe mode: replaces color backgrounds with bordered variants
   * that survive PDF rendering.
   */
  printMode?: boolean;
}

interface BadgeConfig {
  label: string;
  screenClass: string;
  printClass: string;
}

const STABILITY_CONFIG: Record<string, BadgeConfig> = {
  STABLE_PRESENCE: {
    label: "Stable",
    screenClass: "bg-green-50 text-green-700",
    printClass: "border border-green-400 text-green-800",
  },
  VOLATILE_PRESENCE: {
    label: "Volatile",
    screenClass: "bg-amber-50 text-amber-700",
    printClass: "border border-amber-400 text-amber-800",
  },
  STABLE_ABSENCE: {
    label: "Absent",
    screenClass: "bg-red-50 text-red-700",
    printClass: "border border-red-400 text-red-800",
  },
  UNVALIDATED: {
    label: "Unvalidated",
    screenClass: "bg-gray-100 text-gray-500",
    printClass: "border border-gray-300 text-gray-500",
  },
};

export function StabilityBadge({
  stability,
  compact = false,
  printMode = false,
}: StabilityBadgeProps) {
  // Don't render anything for UNVALIDATED — it adds noise without signal
  if (stability === "UNVALIDATED") return null;

  const config = STABILITY_CONFIG[stability] ?? STABILITY_CONFIG.UNVALIDATED;
  const colorClass = printMode ? config.printClass : config.screenClass;
  const sizeClass = compact
    ? "px-1.5 py-0 text-[10px]"
    : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${sizeClass} ${colorClass}`}
    >
      {config.label}
    </span>
  );
}

/**
 * StabilityCount
 *
 * Renders a count with its associated stability label and color.
 * Used in the Assessment Confidence distribution row.
 */
interface StabilityCountProps {
  stability: StabilityClassification | string;
  count: number;
  printMode?: boolean;
}

const STABILITY_COUNT_CONFIG: Record<
  string,
  { label: string; colorClass: string; printColorClass: string }
> = {
  STABLE_PRESENCE: {
    label: "Stable presence",
    colorClass: "text-green-700",
    printColorClass: "text-gray-900",
  },
  VOLATILE_PRESENCE: {
    label: "Volatile",
    colorClass: "text-amber-700",
    printColorClass: "text-gray-700",
  },
  STABLE_ABSENCE: {
    label: "Stable absence",
    colorClass: "text-red-700",
    printColorClass: "text-gray-900",
  },
  UNVALIDATED: {
    label: "Unvalidated",
    colorClass: "text-gray-400",
    printColorClass: "text-gray-500",
  },
};

export function StabilityCount({
  stability,
  count,
  printMode = false,
}: StabilityCountProps) {
  const config =
    STABILITY_COUNT_CONFIG[stability] ?? STABILITY_COUNT_CONFIG.UNVALIDATED;
  const colorClass = printMode ? config.printColorClass : config.colorClass;

  return (
    <span className="text-sm">
      <span className={`font-semibold ${colorClass}`}>{count}</span>
      <span className="ml-1 text-gray-500">{config.label}</span>
    </span>
  );
}
