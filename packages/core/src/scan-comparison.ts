// ─── Input types ────────────────────────────────────────────

export interface ScanResultData {
  mentioned: boolean;
  visibilityScore: number | null;
  sentimentScore: number | null;
  metadata: unknown;
  citations: { domain: string | null }[];
}

interface CompetitorMentionEntry {
  name: string;
  domain: string;
  mentioned: boolean;
}

// ─── Output types ───────────────────────────────────────────

export interface EntityMentionStats {
  name: string;
  isClient: boolean;
  mentionCount: number;
  mentionRate: number;
}

export interface DomainFrequency {
  domain: string;
  count: number;
}

export interface CitationAnalysis {
  totalDomains: number;
  /** Domains cited only in responses where the client was mentioned. */
  clientExclusiveDomains: string[];
  /** Domains cited only in responses where the client was NOT mentioned (gaps). */
  gapDomains: string[];
  /** Domains cited in both client-present and client-absent responses. */
  sharedDomains: string[];
  /** All domains sorted by frequency descending. */
  domainFrequency: DomainFrequency[];
}

export interface ScanComparisonResult {
  totalQueries: number;
  completedQueries: number;
  clientMentionRate: number;
  avgVisibilityScore: number | null;
  avgSentimentScore: number | null;
  entityMentions: EntityMentionStats[];
  citations: CitationAnalysis;
}

// ─── Helpers ────────────────────────────────────────────────

function extractCompetitorMentions(
  metadata: unknown,
): CompetitorMentionEntry[] {
  if (
    metadata == null ||
    typeof metadata !== "object" ||
    !("competitorMentions" in metadata) ||
    !Array.isArray((metadata as Record<string, unknown>).competitorMentions)
  ) {
    return [];
  }

  return (metadata as { competitorMentions: CompetitorMentionEntry[] })
    .competitorMentions;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

// ─── Mention computation ────────────────────────────────────

function computeMentions(
  clientName: string,
  results: ScanResultData[],
): EntityMentionStats[] {
  if (results.length === 0) return [];

  const total = results.length;

  // Client stats
  const clientMentions = results.filter((r) => r.mentioned).length;
  const stats: EntityMentionStats[] = [
    {
      name: clientName,
      isClient: true,
      mentionCount: clientMentions,
      mentionRate: total > 0 ? clientMentions / total : 0,
    },
  ];

  // Aggregate competitor mentions across all results
  const competitorTotals = new Map<string, { count: number; domain: string }>();

  for (const result of results) {
    const mentions = extractCompetitorMentions(result.metadata);
    for (const m of mentions) {
      const existing = competitorTotals.get(m.name) ?? {
        count: 0,
        domain: m.domain,
      };
      if (m.mentioned) existing.count++;
      competitorTotals.set(m.name, existing);
    }
  }

  // Sort competitors by mention count descending
  const sortedCompetitors = [...competitorTotals.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );

  for (const [name, data] of sortedCompetitors) {
    stats.push({
      name,
      isClient: false,
      mentionCount: data.count,
      mentionRate: total > 0 ? data.count / total : 0,
    });
  }

  return stats;
}

// ─── Citation computation ───────────────────────────────────

function computeCitations(results: ScanResultData[]): CitationAnalysis {
  const clientPresentDomains = new Set<string>();
  const clientAbsentDomains = new Set<string>();
  const domainCounts = new Map<string, number>();

  for (const result of results) {
    const domains = result.citations
      .map((c) => c.domain)
      .filter((d): d is string => d != null && d.length > 0);

    for (const domain of domains) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);

      if (result.mentioned) {
        clientPresentDomains.add(domain);
      } else {
        clientAbsentDomains.add(domain);
      }
    }
  }

  const shared: string[] = [];
  const clientExclusive: string[] = [];
  const gaps: string[] = [];

  const allDomains = new Set([
    ...clientPresentDomains,
    ...clientAbsentDomains,
  ]);

  for (const domain of allDomains) {
    const inPresent = clientPresentDomains.has(domain);
    const inAbsent = clientAbsentDomains.has(domain);

    if (inPresent && inAbsent) {
      shared.push(domain);
    } else if (inPresent) {
      clientExclusive.push(domain);
    } else {
      gaps.push(domain);
    }
  }

  const domainFrequency = [...domainCounts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDomains: allDomains.size,
    clientExclusiveDomains: clientExclusive.sort(),
    gapDomains: gaps.sort(),
    sharedDomains: shared.sort(),
    domainFrequency,
  };
}

// ─── Orchestrator ───────────────────────────────────────────

export function computeScanComparison(
  clientName: string,
  results: ScanResultData[],
  totalQueries: number,
): ScanComparisonResult {
  const completedQueries = results.length;

  const clientMentioned = results.filter((r) => r.mentioned);
  const clientMentionRate =
    completedQueries > 0 ? clientMentioned.length / completedQueries : 0;

  const visScores = results
    .map((r) => r.visibilityScore)
    .filter((v): v is number => v != null);
  const sentScores = results
    .map((r) => r.sentimentScore)
    .filter((v): v is number => v != null);

  return {
    totalQueries,
    completedQueries,
    clientMentionRate,
    avgVisibilityScore: avg(visScores),
    avgSentimentScore: avg(sentScores),
    entityMentions: computeMentions(clientName, results),
    citations: computeCitations(results),
  };
}
