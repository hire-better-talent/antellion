import type { RedFlag, RedFlagSeverity } from "@antellion/core";

// Severity badge styles
const severityStyles: Record<
  RedFlagSeverity,
  { badge: string; border: string; bg: string }
> = {
  critical: {
    badge: "bg-red-100 text-red-800",
    border: "border-l-4 border-l-red-500",
    bg: "bg-white",
  },
  major: {
    badge: "bg-orange-100 text-orange-800",
    border: "border-l-4 border-l-orange-400",
    bg: "bg-white",
  },
  advisory: {
    badge: "bg-yellow-100 text-yellow-800",
    border: "border-l-2 border-l-yellow-400",
    bg: "bg-white",
  },
};

const severityLabels: Record<RedFlagSeverity, string> = {
  critical: "CRITICAL",
  major: "MAJOR",
  advisory: "ADVISORY",
};

interface Props {
  redFlags: RedFlag[];
}

export function RedFlagsCard({ redFlags }: Props) {
  if (redFlags.length === 0) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        No quality concerns detected — report is ready to deliver as-is.
      </div>
    );
  }

  // Backend already sorts critical > major > advisory.
  // Render in the order received.
  return (
    <div className="space-y-3">
      {redFlags.map((flag, i) => {
        const styles = severityStyles[flag.severity];
        return (
          <div
            key={i}
            className={`rounded-md border border-gray-200 p-4 ${styles.border} ${styles.bg}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${styles.badge}`}
              >
                {severityLabels[flag.severity]}
              </span>
              {flag.affectedSection && (
                <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {flag.affectedSection}
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm font-semibold text-gray-900">
              {flag.concern}
            </p>

            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Implication
              </p>
              <p className="text-sm text-gray-700">{flag.implication}</p>
            </div>

            <div className="mt-2 rounded-md bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Mitigation
              </p>
              <p className="mt-0.5 text-sm text-gray-700">{flag.mitigation}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
