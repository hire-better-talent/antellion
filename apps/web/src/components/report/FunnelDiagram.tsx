export interface FunnelStage {
  label: string;
  rate: number; // 0-1
  status: "strong" | "moderate" | "critical";
}

interface FunnelDiagramProps {
  stages: FunnelStage[];
  throughput: number; // 0-1
  criticalStageLabel?: string;
  /** When true renders without colour classes (for print) */
  printMode?: boolean;
}

function stageBarClass(
  status: FunnelStage["status"],
  printMode: boolean,
): string {
  if (printMode) return "border border-gray-400 bg-white text-gray-800";
  if (status === "strong") return "bg-green-100 border border-green-300 text-green-800";
  if (status === "moderate") return "bg-amber-50 border border-amber-300 text-amber-800";
  return "bg-red-50 border border-red-300 text-red-800";
}

function stageRateClass(
  status: FunnelStage["status"],
  printMode: boolean,
): string {
  if (printMode) return "font-bold text-gray-900";
  if (status === "strong") return "font-bold text-green-700";
  if (status === "moderate") return "font-bold text-amber-700";
  return "font-bold text-red-700";
}

function arrowClass(
  status: FunnelStage["status"],
  printMode: boolean,
): string {
  if (printMode) return "text-gray-400";
  if (status === "critical") return "text-red-400";
  return "text-gray-300";
}

export function FunnelDiagram({
  stages,
  throughput,
  criticalStageLabel,
  printMode = false,
}: FunnelDiagramProps) {
  const throughputPct = Math.round(throughput * 100);
  const criticalStageIndex = stages.findIndex((s) => s.status === "critical");

  return (
    <div className="space-y-4">
      {/* Stage flow row */}
      <div className="flex flex-wrap items-center gap-1">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          const isCritical = stage.status === "critical";

          return (
            <div key={stage.label} className="flex items-center gap-1">
              {/* Stage pill */}
              <div
                className={`flex flex-col items-center rounded px-3 py-2 text-center ${stageBarClass(stage.status, printMode)}`}
                style={{ minWidth: "100px" }}
              >
                <span className="text-xs font-medium">{stage.label}</span>
                <span
                  className={`mt-0.5 text-sm tabular-nums ${stageRateClass(stage.status, printMode)}`}
                >
                  {Math.round(stage.rate * 100)}%
                </span>
              </div>

              {/* Arrow between stages */}
              {!isLast && (
                <span
                  className={`text-lg font-light leading-none ${arrowClass(stages[i + 1]?.status ?? "strong", printMode)}`}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Critical break indicator */}
      {criticalStageIndex >= 0 && (
        <div className="flex items-start gap-2">
          {/* Offset arrow to align under the critical stage approximately */}
          <div
            className="shrink-0 text-xs"
            style={{
              paddingLeft: `${criticalStageIndex * 116}px`,
            }}
          >
            <span
              className={printMode ? "text-gray-600" : "text-red-600"}
            >
              ↑ Pipeline break
              {criticalStageLabel ? ` at ${criticalStageLabel}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Throughput summary */}
      <div
        className={`rounded border px-4 py-3 text-sm ${
          printMode
            ? "border-gray-300 bg-white text-gray-800"
            : throughputPct < 10
              ? "border-red-200 bg-red-50 text-red-800"
              : throughputPct < 25
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        <span className="font-medium">Estimated throughput: </span>
        <span className="tabular-nums font-bold">~{throughputPct}%</span>
        <span className="ml-1 text-xs opacity-75">
          of AI-researching candidates complete the full journey
        </span>
      </div>
    </div>
  );
}
