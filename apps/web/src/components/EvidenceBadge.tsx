interface EvidenceBadgeProps {
  confidenceScore: number | null;
  size?: "sm" | "md";
}

export function EvidenceBadge({ confidenceScore, size = "sm" }: EvidenceBadgeProps) {
  if (confidenceScore === null) return null;

  let label: string;
  let className: string;

  if (confidenceScore >= 0.7) {
    label = "HIGH";
    className = "bg-green-50 text-green-700";
  } else if (confidenceScore >= 0.4) {
    label = "MEDIUM";
    className = "bg-yellow-50 text-yellow-700";
  } else {
    label = "LOW";
    className = "bg-red-50 text-red-700";
  }

  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${sizeClass} ${className}`}
    >
      {label} · {Math.round(confidenceScore * 100)}%
    </span>
  );
}
