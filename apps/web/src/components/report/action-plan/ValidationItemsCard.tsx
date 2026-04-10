import type { ValidationItem } from "@antellion/core";

const categoryLabels: Record<ValidationItem["category"], string> = {
  mention_claim: "Mention claim",
  competitor_claim: "Competitor claim",
  citation_claim: "Citation claim",
  sample_size: "Sample size",
  stability: "Stability",
};

interface Props {
  items: ValidationItem[];
}

export function ValidationItemsCard({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        All findings have sufficient confidence — no manual validation needed before delivery.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-md border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            {/* Checkbox placeholder — manual workflow */}
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-amber-400 bg-white" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  VERIFY
                </span>
                <span className="inline-flex rounded bg-white px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-300">
                  {categoryLabels[item.category] ?? item.category}
                </span>
                {item.stage && (
                  <span className="inline-flex rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                    {item.stage}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-sm font-semibold text-gray-900">
                {item.finding}
              </p>

              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Why suspect
                </p>
                <p className="text-sm text-gray-700">{item.concern}</p>
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  How to check
                </p>
                <ol className="space-y-1">
                  {item.checkSteps.map((step, si) => (
                    <li key={si} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-800">
                        {si + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
