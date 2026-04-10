import { Card, CardHeader } from "@antellion/ui";

interface QACheck {
  checkKey: string;
  category: string;
  severity: string;
  outcome: string;
  detail: string | null;
  expected: string | null;
  actual: string | null;
}

interface QACheckListProps {
  checks: QACheck[];
}

const outcomeIcon: Record<string, { symbol: string; color: string }> = {
  PASS: { symbol: "\u2713", color: "text-green-600" },
  FAIL: { symbol: "\u2717", color: "text-red-600" },
  WARNING: { symbol: "\u26A0", color: "text-yellow-600" },
  SKIPPED: { symbol: "\u2014", color: "text-gray-400" },
};

const outcomeBorder: Record<string, string> = {
  PASS: "border-l-green-400",
  FAIL: "border-l-red-500",
  WARNING: "border-l-yellow-400",
  SKIPPED: "border-l-gray-300",
};

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByCategory(checks: QACheck[]): Record<string, QACheck[]> {
  const groups: Record<string, QACheck[]> = {};
  for (const check of checks) {
    const cat = check.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(check);
  }
  return groups;
}

export function QACheckList({ checks }: QACheckListProps) {
  const grouped = groupByCategory(checks);
  const categories = Object.keys(grouped);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-gray-500">No check results available.</p>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {humanizeKey(category)}
            </h3>
          </CardHeader>
          <div>
            {grouped[category].map((check) => {
              const icon = outcomeIcon[check.outcome] ?? outcomeIcon.SKIPPED;
              const border = outcomeBorder[check.outcome] ?? outcomeBorder.SKIPPED;
              const showExpectedActual =
                (check.outcome === "FAIL" || check.outcome === "WARNING") &&
                (check.expected || check.actual);

              return (
                <div
                  key={check.checkKey}
                  className={`border-l-4 ${border} px-6 py-3 ${check.outcome === "FAIL" ? "bg-red-50/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-sm font-bold ${icon.color}`}>
                      {icon.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {humanizeKey(check.checkKey)}
                        </span>
                        {check.severity === "BLOCKING" && (
                          <span className="inline-flex rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold uppercase text-red-700">
                            Blocking
                          </span>
                        )}
                      </div>
                      {check.detail && (
                        <p className="mt-0.5 text-sm text-gray-600">
                          {check.detail}
                        </p>
                      )}
                      {showExpectedActual && (
                        <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                          {check.expected && (
                            <p>
                              <span className="font-medium">Expected:</span>{" "}
                              {check.expected}
                            </p>
                          )}
                          {check.actual && (
                            <p>
                              <span className="font-medium">Actual:</span>{" "}
                              {check.actual}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
