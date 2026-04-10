interface PositioningBadgeProps {
  tier: string;
  size?: "sm" | "md";
}

const TIER_STYLES: Record<string, string> = {
  CHAMPION: "bg-green-50 text-green-700 border border-green-200",
  CONTENDER: "bg-blue-50 text-blue-700 border border-blue-200",
  PERIPHERAL: "bg-gray-100 text-gray-600 border border-gray-200",
  CAUTIONARY: "bg-amber-50 text-amber-700 border border-amber-200",
  INVISIBLE: "bg-red-50 text-red-700 border border-red-200",
};

const TIER_LABELS: Record<string, string> = {
  CHAMPION: "Champion",
  CONTENDER: "Contender",
  PERIPHERAL: "Peripheral",
  CAUTIONARY: "Cautionary",
  INVISIBLE: "Invisible",
};

// Print-safe border-only variants (no background color dependency)
const TIER_PRINT_STYLES: Record<string, string> = {
  CHAMPION: "border border-gray-400 text-gray-700",
  CONTENDER: "border border-gray-400 text-gray-700",
  PERIPHERAL: "border border-gray-300 text-gray-500",
  CAUTIONARY: "border border-gray-400 text-gray-700",
  INVISIBLE: "border border-gray-500 text-gray-800 font-semibold",
};

export function PositioningBadge({
  tier,
  size = "sm",
}: PositioningBadgeProps) {
  const normalised = tier.toUpperCase();
  const screenStyles = TIER_STYLES[normalised] ?? TIER_STYLES.PERIPHERAL;
  const label = TIER_LABELS[normalised] ?? tier;
  const px = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded text-xs font-medium ${px} ${screenStyles}`}
    >
      {label}
    </span>
  );
}

// Print variant — used in export page where background colors may not render
export function PositioningBadgePrint({ tier }: { tier: string }) {
  const normalised = tier.toUpperCase();
  const printStyles =
    TIER_PRINT_STYLES[normalised] ?? TIER_PRINT_STYLES.PERIPHERAL;
  const label = TIER_LABELS[normalised] ?? tier;

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${printStyles}`}
    >
      {label}
    </span>
  );
}
