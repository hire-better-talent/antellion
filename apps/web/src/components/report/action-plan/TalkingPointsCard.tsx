import type { TalkingPoint } from "@antellion/core";

interface Props {
  points: TalkingPoint[];
}

export function TalkingPointsCard({ points }: Props) {
  if (points.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        No high-confidence talking points computed — review the full report for narrative leads.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {points.map((point, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-md border border-gray-200 bg-white p-4"
        >
          {/* Lead number */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
            {i + 1}
          </div>

          <div className="min-w-0 flex-1">
            {/* The number to memorize */}
            <p className="text-base font-semibold text-gray-900">
              {point.leadNumber}
            </p>

            {/* Narrative headline */}
            <p className="mt-1 text-sm leading-relaxed text-gray-700">
              {point.headline}
            </p>

            {/* Supporting context */}
            {point.context && (
              <p className="mt-2 text-sm text-gray-500">{point.context}</p>
            )}

            {/* Quotable text — if available */}
            {point.quotableText && (
              <blockquote className="mt-3 border-l-2 border-gray-300 pl-3 text-sm italic text-gray-600">
                "{point.quotableText}"
              </blockquote>
            )}

            {/* Compelling score — internal signal only */}
            <p className="mt-2 text-xs text-gray-400">
              Compelling score:{" "}
              <span className="font-medium text-gray-500">
                {(point.compellingScore * 100).toFixed(0)}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
