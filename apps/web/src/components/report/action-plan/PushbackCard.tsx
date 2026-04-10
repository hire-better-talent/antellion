import type { PushbackPrediction } from "@antellion/core";

interface Props {
  predictions: PushbackPrediction[];
}

export function PushbackCard({ predictions }: Props) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        No predicted objections — proceed with standard presentation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {predictions.map((pred, i) => (
        <div
          key={i}
          className="rounded-md border border-gray-200 bg-white p-4"
        >
          {/* Anticipated objection — styled as a quote block */}
          <div className="rounded-md bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Anticipated objection
            </p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              &ldquo;{pred.anticipatedObjection}&rdquo;
            </p>
          </div>

          {/* Prepared response */}
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Prepared response
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              {pred.preparedResponse}
            </p>
          </div>

          {/* Supporting evidence to point to */}
          <div className="mt-3 rounded-md bg-blue-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Point to
            </p>
            <p className="mt-0.5 text-xs text-blue-800">
              {pred.supportingEvidence}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
