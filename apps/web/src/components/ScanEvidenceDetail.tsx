import { EvidenceBadge } from "./EvidenceBadge";
import { formatDateTime } from "@/lib/format";

export interface ScanEvidenceDetailData {
  id: string;
  version: number;
  status: string;
  provider: string;
  modelName: string;
  temperature: number | null;
  executedAt: Date;
  confidenceScore: number | null;
  promptText: string;
  rawResponse: string | null;
  extractedSources: unknown;
  analystNotes: string | null;
  approvedAt: Date | null;
  approvedBy: { name: string | null; email: string } | null;
  scanResult: {
    query: { text: string } | null;
  };
}

interface ScanEvidenceDetailProps {
  evidence: ScanEvidenceDetailData | null;
}

const RESPONSE_PREVIEW_LENGTH = 200;

const evidenceStatusClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  SUPERSEDED: "bg-gray-50 text-gray-400",
};

export function ScanEvidenceDetail({ evidence }: ScanEvidenceDetailProps) {
  if (!evidence) return null;

  const statusClass =
    evidenceStatusClass[evidence.status] ?? evidenceStatusClass.DRAFT;

  const sources = (
    evidence.extractedSources as { domain: string; url: string }[] | null
  ) ?? [];

  const queryText = evidence.scanResult.query?.text ?? null;

  const responseText = evidence.rawResponse?.trim() ?? null;
  const responsePreview =
    responseText && responseText.length > RESPONSE_PREVIEW_LENGTH
      ? responseText.slice(0, RESPONSE_PREVIEW_LENGTH).trimEnd() + "..."
      : responseText;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Evidence record
      </p>

      <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-4 text-sm space-y-3">

        {/* Query — most prominent element */}
        {queryText && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Query evaluated</p>
            <p className="font-medium text-gray-900">{queryText}</p>
          </div>
        )}

        {/* Response preview */}
        {responsePreview && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">AI response</p>
            <p className="italic text-gray-600 leading-relaxed">
              &ldquo;{responsePreview}&rdquo;
            </p>
          </div>
        )}

        {/* Key metrics row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {evidence.status}
          </span>
          <EvidenceBadge confidenceScore={evidence.confidenceScore} />
          {sources.length > 0 && (
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {sources.length} source{sources.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs text-gray-400">v{evidence.version}</span>
        </div>

        {/* Approval note */}
        {evidence.status === "APPROVED" && evidence.approvedAt && (
          <p className="text-xs text-gray-500">
            Approved {formatDateTime(evidence.approvedAt)}
            {evidence.approvedBy && (
              <> by {evidence.approvedBy.name || evidence.approvedBy.email}</>
            )}
          </p>
        )}

        {/* Full record — hidden behind a details toggle */}
        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-gray-500 hover:text-gray-700 list-none flex items-center gap-1">
            <span className="inline-block transition-transform group-open:rotate-90 text-[10px]">
              ▶
            </span>
            Show full evidence record
          </summary>

          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
            {/* Provenance */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span>
                <span className="font-medium text-gray-700">Provider:</span>{" "}
                {evidence.provider} / {evidence.modelName}
                {evidence.temperature !== null && (
                  <span className="text-gray-400"> (temp {evidence.temperature})</span>
                )}
              </span>
              <span>
                <span className="font-medium text-gray-700">Executed:</span>{" "}
                {formatDateTime(evidence.executedAt)}
              </span>
            </div>

            {/* Full prompt */}
            <div>
              <p className="text-xs font-medium text-gray-500">Prompt</p>
              <pre className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700">
                {evidence.promptText}
              </pre>
            </div>

            {/* Full raw response */}
            {evidence.rawResponse && (
              <div>
                <p className="text-xs font-medium text-gray-500">Full response</p>
                <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700">
                  {evidence.rawResponse}
                </pre>
              </div>
            )}

            {/* All sources */}
            {sources.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500">Sources</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                    >
                      {src.domain}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Analyst notes */}
            {evidence.analystNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500">Analyst notes</p>
                <p className="mt-1 text-xs text-gray-700">{evidence.analystNotes}</p>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
