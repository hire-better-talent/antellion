interface StatusPipelineProps {
  steps: string[];
  currentStep: string;
  variant?: "compact" | "full";
}

function labelFor(step: string): string {
  return step
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusPipeline({
  steps,
  currentStep,
  variant = "full",
}: StatusPipelineProps) {
  const currentIndex = steps.indexOf(currentStep);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {steps.map((step, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                    isCurrent
                      ? "bg-brand-600"
                      : isPast
                        ? "bg-gray-400"
                        : "border border-gray-300 bg-white"
                  }`}
                />
                <span
                  className={`whitespace-nowrap text-xs ${
                    isCurrent
                      ? "font-medium text-gray-900"
                      : isPast
                        ? "text-gray-400"
                        : "text-gray-400"
                  }`}
                >
                  {labelFor(step)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className="shrink-0 text-gray-300">→</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {steps.map((step, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-3 w-3 shrink-0 rounded-full ${
                  isCurrent
                    ? "bg-brand-600 ring-2 ring-brand-200"
                    : isPast
                      ? "bg-gray-400"
                      : "border-2 border-gray-300 bg-white"
                }`}
              />
              <span
                className={`whitespace-nowrap text-sm ${
                  isCurrent
                    ? "font-semibold text-gray-900"
                    : isPast
                      ? "text-gray-400"
                      : "text-gray-400"
                }`}
              >
                {labelFor(step)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="shrink-0 text-gray-300 text-sm">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
