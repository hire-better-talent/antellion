/**
 * EffortImpactMatrix
 *
 * 2x2 grid classifying recommendations by effort and impact. Renders in the
 * Recommended Actions section above individual recommendation cards.
 *
 * Quadrants:
 *   Quick Wins     — low effort + high impact  (top-left)
 *   Strategic       — high effort + high impact (top-right)
 *   Easy Fills      — low effort + low impact   (bottom-left)
 *   Consider Later  — high effort + low impact  (bottom-right)
 *
 * Classification logic:
 *   Impact: CRITICAL or HIGH priority -> high impact; else low
 *   Effort: timeframe <= 30 days OR effort == "LOW" -> low effort; else high
 *
 * P3d — see docs/development-plan.md Priority 3.
 */

interface Recommendation {
  id: string;
  title: string;
  stage: string;
  priority: string;
  effort: string;
  timeframe: string;
  targetPlatforms: string[];
}

interface EffortImpactMatrixProps {
  recommendations: Recommendation[];
  printMode?: boolean;
}

// ─── Classification ──────────────────────────────────────────

type Quadrant = "quick-wins" | "strategic" | "easy-fills" | "consider-later";

interface ClassifiedRec {
  rec: Recommendation;
  quadrant: Quadrant;
}

function isHighImpact(priority: string): boolean {
  const p = priority.toUpperCase();
  return p === "CRITICAL" || p === "HIGH";
}

function isLowEffort(effort: string, timeframe: string): boolean {
  const e = effort.toUpperCase();
  if (e === "LOW") return true;

  // Parse timeframe — look for patterns like "0-30 days", "30 days", "2 weeks"
  const tf = timeframe.toLowerCase();
  const daysMatch = tf.match(/(\d+)\s*days?/);
  if (daysMatch) {
    // For ranges like "0-30 days", grab the last number
    const numbers = tf.match(/\d+/g);
    if (numbers) {
      const maxDays = Math.max(...numbers.map(Number));
      if (maxDays <= 30) return true;
    }
  }
  const weeksMatch = tf.match(/(\d+)\s*weeks?/);
  if (weeksMatch) {
    const weeks = Number(weeksMatch[1]);
    if (weeks <= 4) return true;
  }

  return false;
}

function classifyRecommendation(rec: Recommendation): Quadrant {
  const highImpact = isHighImpact(rec.priority);
  const lowEffort = isLowEffort(rec.effort, rec.timeframe);

  if (highImpact && lowEffort) return "quick-wins";
  if (highImpact && !lowEffort) return "strategic";
  if (!highImpact && lowEffort) return "easy-fills";
  return "consider-later";
}

// ─── Quadrant metadata ───────────────────────────────────────

interface QuadrantMeta {
  key: Quadrant;
  label: string;
  description: string;
  screenBg: string;
  screenBorder: string;
  printBorder: string;
  headerColor: string;
}

const QUADRANTS: QuadrantMeta[] = [
  {
    key: "quick-wins",
    label: "Quick Wins",
    description: "High impact, low effort",
    screenBg: "bg-green-50/50",
    screenBorder: "border-green-200",
    printBorder: "border-gray-400",
    headerColor: "text-green-800",
  },
  {
    key: "strategic",
    label: "Strategic",
    description: "High impact, high effort",
    screenBg: "bg-blue-50/50",
    screenBorder: "border-blue-200",
    printBorder: "border-gray-400",
    headerColor: "text-blue-800",
  },
  {
    key: "easy-fills",
    label: "Easy Fills",
    description: "Low impact, low effort",
    screenBg: "bg-gray-50",
    screenBorder: "border-gray-200",
    printBorder: "border-gray-300",
    headerColor: "text-gray-700",
  },
  {
    key: "consider-later",
    label: "Consider Later",
    description: "Low impact, high effort",
    screenBg: "bg-gray-50",
    screenBorder: "border-gray-200",
    printBorder: "border-gray-200",
    headerColor: "text-gray-600",
  },
];

// ─── Stage badge ─────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  CONSIDERATION: "Consideration",
  EVALUATION: "Evaluation",
  COMMITMENT: "Commitment",
};

const STAGE_SCREEN_COLORS: Record<string, string> = {
  DISCOVERY: "bg-purple-50 text-purple-700 border border-purple-200",
  CONSIDERATION: "bg-sky-50 text-sky-700 border border-sky-200",
  EVALUATION: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  COMMITMENT: "bg-teal-50 text-teal-700 border border-teal-200",
};

const STAGE_PRINT_COLORS: Record<string, string> = {
  DISCOVERY: "border border-gray-400 text-gray-700",
  CONSIDERATION: "border border-gray-300 text-gray-700",
  EVALUATION: "border border-gray-400 text-gray-700",
  COMMITMENT: "border border-gray-300 text-gray-700",
};

// ─── Screen mode: 2x2 grid ──────────────────────────────────

function QuadrantCard({
  meta,
  items,
  printMode,
}: {
  meta: QuadrantMeta;
  items: Recommendation[];
  printMode: boolean;
}) {
  const borderClass = printMode ? meta.printBorder : meta.screenBorder;
  const bgClass = printMode ? "bg-white" : meta.screenBg;
  const headerTextColor = printMode ? "text-gray-900" : meta.headerColor;

  return (
    <div
      className={`rounded-lg border p-4 ${borderClass} ${bgClass}`}
    >
      <div className="mb-3">
        <p className={`text-sm font-semibold ${headerTextColor}`}>
          {meta.label}
        </p>
        <p className="text-xs text-gray-500">{meta.description}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-gray-400">
          No recommendations in this quadrant
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((rec) => {
            const stageLabel = STAGE_LABELS[rec.stage] ?? rec.stage;
            const stageStyle = printMode
              ? (STAGE_PRINT_COLORS[rec.stage] ?? STAGE_PRINT_COLORS.DISCOVERY)
              : (STAGE_SCREEN_COLORS[rec.stage] ?? STAGE_SCREEN_COLORS.DISCOVERY);

            return (
              <li key={rec.id} className="text-sm">
                <p className="font-medium text-gray-900 leading-snug">
                  {rec.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${stageStyle}`}
                  >
                    {stageLabel}
                  </span>
                  {rec.targetPlatforms.slice(0, 3).map((platform) => (
                    <span
                      key={platform}
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        printMode
                          ? "border border-gray-200 text-gray-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Print mode: structured table ────────────────────────────

function PrintTable({ classified }: { classified: ClassifiedRec[] }) {
  const quadrantLabels: Record<Quadrant, string> = {
    "quick-wins": "Quick Win",
    strategic: "Strategic",
    "easy-fills": "Easy Fill",
    "consider-later": "Consider Later",
  };

  // Sort: quick-wins first, then strategic, easy-fills, consider-later
  const order: Quadrant[] = ["quick-wins", "strategic", "easy-fills", "consider-later"];
  const sorted = [...classified].sort(
    (a, b) => order.indexOf(a.quadrant) - order.indexOf(b.quadrant),
  );

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Recommendation
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Stage
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Platforms
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Classification
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.rec.id}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="px-4 py-2.5 font-medium text-gray-900">
                {item.rec.title}
              </td>
              <td className="px-3 py-2.5 text-gray-700">
                {STAGE_LABELS[item.rec.stage] ?? item.rec.stage}
              </td>
              <td className="px-3 py-2.5 text-gray-700">
                {item.rec.targetPlatforms.slice(0, 3).join(", ") || "\u2014"}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    item.quadrant === "quick-wins"
                      ? "border border-gray-500 text-gray-800 font-semibold"
                      : item.quadrant === "strategic"
                        ? "border border-gray-400 text-gray-700"
                        : "border border-gray-200 text-gray-500"
                  }`}
                >
                  {quadrantLabels[item.quadrant]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export function EffortImpactMatrix({
  recommendations,
  printMode = false,
}: EffortImpactMatrixProps) {
  if (recommendations.length === 0) return null;

  const classified: ClassifiedRec[] = recommendations.map((rec) => ({
    rec,
    quadrant: classifyRecommendation(rec),
  }));

  const byQuadrant = (q: Quadrant) =>
    classified.filter((c) => c.quadrant === q).map((c) => c.rec);

  const quickWins = byQuadrant("quick-wins");
  const strategic = byQuadrant("strategic");
  const easyFills = byQuadrant("easy-fills");
  const considerLater = byQuadrant("consider-later");

  if (printMode) {
    return (
      <div className="mb-6 break-inside-avoid">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Effort / Impact Classification
        </p>
        <PrintTable classified={classified} />
        {quickWins.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {quickWins.length} quick win{quickWins.length !== 1 ? "s" : ""}{" "}
            identified &mdash; high impact actions achievable within 30 days.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Effort / Impact Classification
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((meta) => {
          const items =
            meta.key === "quick-wins"
              ? quickWins
              : meta.key === "strategic"
                ? strategic
                : meta.key === "easy-fills"
                  ? easyFills
                  : considerLater;

          return (
            <QuadrantCard
              key={meta.key}
              meta={meta}
              items={items}
              printMode={printMode}
            />
          );
        })}
      </div>
      {quickWins.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {quickWins.length} quick win{quickWins.length !== 1 ? "s" : ""}{" "}
          identified &mdash; high impact actions achievable within 30 days.
        </p>
      )}
    </div>
  );
}
