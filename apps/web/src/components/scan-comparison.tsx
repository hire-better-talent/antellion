import { Card, CardHeader, CardBody, Badge } from "@antellion/ui";
import type { ScanComparisonResult } from "@antellion/core";

interface ScanComparisonProps {
  comparison: ScanComparisonResult;
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function sentimentLabel(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

export function ScanComparison({ comparison }: ScanComparisonProps) {
  const { entityMentions, citations } = comparison;

  if (comparison.completedQueries === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Mention comparison */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">
            Mention comparison
          </h3>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-6 py-2 text-left font-medium">Company</th>
                <th className="px-6 py-2 text-right font-medium">Count</th>
                <th className="px-6 py-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entityMentions.map((entity) => (
                <tr
                  key={entity.name}
                  className={entity.isClient ? "bg-brand-50/40" : ""}
                >
                  <td className="px-6 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          entity.isClient ? "bg-brand-600" : "bg-gray-400"
                        }`}
                      />
                      <span
                        className={
                          entity.isClient
                            ? "font-medium text-gray-900"
                            : "text-gray-700"
                        }
                      >
                        {entity.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-2 text-right text-gray-600">
                    {entity.mentionCount} / {comparison.completedQueries}
                  </td>
                  <td className="px-6 py-2 text-right">
                    <MentionBar rate={entity.mentionRate} isClient={entity.isClient} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Citation analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">
            Citation analysis
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {citations.totalDomains} domains across{" "}
            {comparison.completedQueries} results
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          {citations.gapDomains.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600">
                Citation gaps ({citations.gapDomains.length})
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Cite competitors but not your client
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {citations.gapDomains.map((d) => (
                  <Badge key={d} variant="danger">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {citations.sharedDomains.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600">
                Shared sources ({citations.sharedDomains.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {citations.sharedDomains.map((d) => (
                  <Badge key={d}>{d}</Badge>
                ))}
              </div>
            </div>
          )}

          {citations.clientExclusiveDomains.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-600">
                Client-exclusive ({citations.clientExclusiveDomains.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {citations.clientExclusiveDomains.map((d) => (
                  <Badge key={d} variant="success">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {citations.totalDomains === 0 && (
            <p className="text-sm text-gray-400">No citations recorded.</p>
          )}
        </CardBody>
      </Card>

      {/* Summary metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">
            Summary
          </h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <MetricRow
            label="Client mention rate"
            value={pct(comparison.clientMentionRate)}
            quality={
              comparison.clientMentionRate >= 0.7
                ? "good"
                : comparison.clientMentionRate >= 0.4
                  ? "mixed"
                  : "poor"
            }
          />
          <MetricRow
            label="Avg visibility"
            value={
              comparison.avgVisibilityScore != null
                ? String(comparison.avgVisibilityScore)
                : "—"
            }
            quality={
              comparison.avgVisibilityScore == null
                ? "neutral"
                : comparison.avgVisibilityScore >= 50
                  ? "good"
                  : comparison.avgVisibilityScore > 0
                    ? "mixed"
                    : "poor"
            }
          />
          <MetricRow
            label="Avg sentiment"
            value={
              comparison.avgSentimentScore != null
                ? sentimentLabel(comparison.avgSentimentScore)
                : "—"
            }
            quality={
              comparison.avgSentimentScore == null
                ? "neutral"
                : comparison.avgSentimentScore > 0
                  ? "good"
                  : comparison.avgSentimentScore < 0
                    ? "poor"
                    : "neutral"
            }
          />
          <MetricRow
            label="Citation gaps"
            value={String(citations.gapDomains.length)}
            quality={
              citations.gapDomains.length === 0
                ? "good"
                : citations.gapDomains.length <= 2
                  ? "mixed"
                  : "poor"
            }
          />
          <MetricRow
            label="Completion"
            value={`${comparison.completedQueries} / ${comparison.totalQueries}`}
            quality={
              comparison.completedQueries === comparison.totalQueries
                ? "good"
                : "neutral"
            }
          />

          {citations.domainFrequency.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500">
                Top cited domains
              </p>
              <div className="mt-1.5 space-y-1">
                {citations.domainFrequency.slice(0, 5).map((df) => (
                  <div
                    key={df.domain}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-700">{df.domain}</span>
                    <span className="text-gray-400">{df.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function MentionBar({
  rate,
  isClient,
}: {
  rate: number;
  isClient: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-gray-600">{pct(rate)}</span>
      <span className="inline-block h-1.5 w-16 rounded-full bg-gray-100">
        <span
          className={`block h-1.5 rounded-full ${
            isClient ? "bg-brand-600" : "bg-gray-400"
          }`}
          style={{ width: `${Math.round(rate * 100)}%` }}
        />
      </span>
    </span>
  );
}

function MetricRow({
  label,
  value,
  quality,
}: {
  label: string;
  value: string;
  quality: "good" | "mixed" | "poor" | "neutral";
}) {
  const colors = {
    good: "text-green-700",
    mixed: "text-yellow-700",
    poor: "text-red-700",
    neutral: "text-gray-900",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${colors[quality]}`}>
        {value}
      </span>
    </div>
  );
}
