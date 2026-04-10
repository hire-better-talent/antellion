import type { ScanComparisonResult } from "./scan-comparison";
import {
  classifySourceType,
  gapActionFor,
  mentionTier,
  sentimentWord,
} from "./report-composer";

// ─── Input / Output types ────────────────────────────────────

export interface SnapshotInput {
  clientName: string;
  clientDomain: string;
  industry?: string;
  scanComparison: ScanComparisonResult;
  competitors: { name: string; domain: string }[];
}

export interface SnapshotMetrics {
  mentionRate: number;
  mentionRateLabel: string;
  mentionTier: string;
  sentiment: string;
  queriesEvaluated: number;
  timesMentioned: number;
}

export interface SnapshotCompetitor {
  name: string;
  mentionRate: number;
  mentionRateLabel: string;
  gapPp: number;
  multiple: string;
}

export interface SnapshotCitationGap {
  domain: string;
  sourceType: string;
  action: string;
}

export interface VisibilitySnapshot {
  title: string;
  clientName: string;
  clientDomain: string;
  industry?: string;
  generatedAt: string;
  metrics: SnapshotMetrics;
  topCompetitor: SnapshotCompetitor | null;
  citationGaps: SnapshotCitationGap[];
  summary: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function pct(rate: number): string {
  const clamped = Math.max(0, Math.min(1, rate));
  return `${Math.round(clamped * 100)}%`;
}

function snapshotMultiple(competitorRate: number, clientRate: number): string {
  if (clientRate <= 0) return "significantly more visible";
  const ratio = competitorRate / clientRate;
  if (ratio <= 1.05) return "roughly equally visible";
  if (ratio >= 10) return `${Math.round(ratio)}x more visible`;
  return `${ratio.toFixed(1)}x more visible`;
}

// ─── Main composer ───────────────────────────────────────────

export function composeSnapshot(input: SnapshotInput): VisibilitySnapshot {
  const { clientName, clientDomain, industry, scanComparison: sc, competitors } = input;

  // ── Metrics ──────────────────────────────────────────────

  const clientEntity = sc.entityMentions.find((e) => e.isClient);
  const mentionRate = sc.clientMentionRate;
  const timesMentioned = clientEntity?.mentionCount ?? 0;
  const queriesEvaluated = sc.completedQueries;

  const tier = mentionTier(mentionRate);
  // Capitalize first letter for display
  const mentionTierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  const sentimentLabel = (() => {
    const word = sentimentWord(sc.avgSentimentScore);
    return word.charAt(0).toUpperCase() + word.slice(1);
  })();

  const metrics: SnapshotMetrics = {
    mentionRate,
    mentionRateLabel: pct(mentionRate),
    mentionTier: mentionTierLabel,
    sentiment: sentimentLabel,
    queriesEvaluated,
    timesMentioned,
  };

  // ── Top competitor ───────────────────────────────────────

  const topCompetitorEntity = sc.entityMentions
    .filter((e) => !e.isClient)
    .sort((a, b) => b.mentionRate - a.mentionRate)[0];

  let topCompetitorResult: SnapshotCompetitor | null = null;

  if (topCompetitorEntity) {
    const gapPp = Math.round((topCompetitorEntity.mentionRate - mentionRate) * 100);
    topCompetitorResult = {
      name: topCompetitorEntity.name,
      mentionRate: topCompetitorEntity.mentionRate,
      mentionRateLabel: pct(topCompetitorEntity.mentionRate),
      gapPp,
      multiple: snapshotMultiple(topCompetitorEntity.mentionRate, mentionRate),
    };
  }

  // ── Citation gaps (top 3) ────────────────────────────────

  const citationGaps: SnapshotCitationGap[] = sc.citations.gapDomains
    .slice(0, 3)
    .map((domain) => {
      const sourceType = classifySourceType(domain);
      return {
        domain,
        sourceType,
        action: gapActionFor(sourceType),
      };
    });

  // ── Summary ──────────────────────────────────────────────

  const mentionRateDesc = `${clientName} is mentioned in ${pct(mentionRate)} of evaluated queries — a ${mentionTierLabel.toLowerCase()} visibility signal.`;

  const competitorDesc = topCompetitorResult
    ? `The leading competitor, ${topCompetitorResult.name}, is ${topCompetitorResult.multiple} (${topCompetitorResult.mentionRateLabel} mention rate vs. ${pct(mentionRate)}).`
    : `No competitor benchmark data was available for this snapshot.`;

  const gapCount = sc.citations.gapDomains.length;
  const gapDesc =
    gapCount > 0
      ? `${gapCount} citation source${gapCount === 1 ? " was" : "s were"} identified where competitors appear but ${clientName} does not.`
      : `No citation gaps were identified in this snapshot.`;

  const upsell = `A full AI Employer Visibility Assessment would evaluate ${clientName} across 30-50 queries, analyze all competitors, and produce a prioritized remediation plan.`;

  const summary = [mentionRateDesc, competitorDesc, gapDesc, upsell].join(" ");

  // ── Assemble ─────────────────────────────────────────────

  return {
    title: `AI Visibility Snapshot: ${clientName}`,
    clientName,
    clientDomain,
    industry,
    generatedAt: new Date().toISOString(),
    metrics,
    topCompetitor: topCompetitorResult,
    citationGaps,
    summary,
  };
}
