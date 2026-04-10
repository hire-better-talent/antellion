import type { ClientQuestion } from "@antellion/core";

interface Props {
  questions: ClientQuestion[];
}

export function ClientQuestionsCard({ questions }: Props) {
  if (questions.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        No probing questions triggered — proceed with standard presentation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div
          key={i}
          className="rounded-md border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              {/* The question — bold and prominent */}
              <p className="text-sm font-semibold text-gray-900">
                &ldquo;{q.question}&rdquo;
              </p>

              {/* Purpose — operator context only */}
              <p className="mt-1.5 text-sm text-gray-500">{q.purpose}</p>

              {/* Natural transition to upsell */}
              <div className="mt-2 rounded-md bg-gray-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Natural transition
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {q.naturalTransition}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
