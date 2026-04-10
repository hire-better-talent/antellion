// ── Assessment Readiness Check ─────────────────────────────────────
//
// Pure function that evaluates whether assessment data is sufficient to
// produce a credible report. Returns prioritized warnings with
// suggested actions so the operator can decide whether to proceed or
// fill data gaps first.

// ── Thresholds ──────────────────────────────────────────────────────

/** Minimum number of Discovery-stage queries for credible Discovery findings. */
export const MIN_DISCOVERY_QUERIES = 10;

/** Minimum number of Evaluation-stage queries for credible competitive analysis. */
export const MIN_EVALUATION_QUERIES = 8;

/** Minimum total approved results for a premium-grade report. */
export const MIN_TOTAL_RESULTS = 50;

/** Minimum citation rate (fraction) before citation analysis becomes unreliable. */
export const MIN_READINESS_CITATION_RATE = 0.1;

// ── Types ───────────────────────────────────────────────────────────

export type ReadinessSeverity = "critical" | "warning" | "info";

export type ReadinessActionType =
  | "generate_queries"
  | "add_competitors"
  | "run_scan"
  | "verify_citations"
  | "add_role_variant";

export interface SuggestedAction {
  label: string;
  href?: string;
  actionType: ReadinessActionType;
}

export interface ReadinessWarning {
  severity: ReadinessSeverity;
  title: string;
  description: string;
  suggestedAction: SuggestedAction;
}

export interface ReadinessInput {
  discoveryQueryCount: number;
  evaluationQueryCount: number;
  totalApprovedResults: number;
  competitorCount: number;
  /** Fraction of results that have at least one citation (0-1). */
  citationRate: number;
  scanCount: number;
  hasNicheKeywords: boolean;
  /** Map from stage name to the count of approved results in that stage. */
  stageDistribution: Record<string, number>;
}

/** Severity rank used for sorting: lower number = higher severity. */
const SEVERITY_RANK: Record<ReadinessSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ── Core function ───────────────────────────────────────────────────

/**
 * Evaluate assessment data readiness and return warnings sorted by severity.
 *
 * The `clientId` parameter is optional — when provided, suggested action
 * hrefs include the client ID so the operator lands on the right page.
 */
export function assessReadiness(
  input: ReadinessInput,
  clientId?: string,
): ReadinessWarning[] {
  const warnings: ReadinessWarning[] = [];

  // 1. Discovery coverage
  if (input.discoveryQueryCount < MIN_DISCOVERY_QUERIES) {
    warnings.push({
      severity: "critical",
      title: "Discovery data is thin",
      description:
        "The report's Discovery section will have limited findings. " +
        `Only ${input.discoveryQueryCount} Discovery queries are available (minimum recommended: ${MIN_DISCOVERY_QUERIES}).`,
      suggestedAction: {
        label: "Generate additional broad Discovery queries",
        href: clientId
          ? `/queries/generate?clientId=${clientId}`
          : undefined,
        actionType: "generate_queries",
      },
    });
  }

  // 2. Evaluation coverage
  if (input.evaluationQueryCount < MIN_EVALUATION_QUERIES) {
    warnings.push({
      severity: "critical",
      title: "Evaluation data is limited",
      description:
        "Competitive comparison analysis will be weak. " +
        `Only ${input.evaluationQueryCount} Evaluation queries are available (minimum recommended: ${MIN_EVALUATION_QUERIES}).`,
      suggestedAction: {
        label: "Add competitor comparison queries",
        href: clientId
          ? `/queries/generate?clientId=${clientId}`
          : undefined,
        actionType: "generate_queries",
      },
    });
  }

  // 3. Total approved results
  if (input.totalApprovedResults < MIN_TOTAL_RESULTS) {
    warnings.push({
      severity: "warning",
      title: "Approved result count is low",
      description:
        `Total approved results (${input.totalApprovedResults}) may be insufficient for a premium report. ` +
        "Most sections will show low-confidence findings.",
      suggestedAction: {
        label: "Run additional scan with more queries",
        href: clientId
          ? `/scans/new?clientId=${clientId}`
          : undefined,
        actionType: "run_scan",
      },
    });
  }

  // 4. No competitors
  if (input.competitorCount === 0) {
    warnings.push({
      severity: "critical",
      title: "No competitors configured",
      description:
        "The report will lack competitive analysis entirely. " +
        "Competitive positioning, threat levels, and gap analysis will be absent.",
      suggestedAction: {
        label: "Add competitors from Discovery scan",
        href: clientId ? `/clients/${clientId}` : undefined,
        actionType: "add_competitors",
      },
    });
  }

  // 5. Low citation rate
  if (input.citationRate < MIN_READINESS_CITATION_RATE) {
    const pct = Math.round(input.citationRate * 100);
    warnings.push({
      severity: "warning",
      title: "Very few citations detected",
      description:
        `Only ${pct}% of results have citations. ` +
        "Citation analysis and platform-specific recommendations will be limited.",
      suggestedAction: {
        label: "Verify web search is enabled on scan settings",
        actionType: "verify_citations",
      },
    });
  }

  // 6. Single scan
  if (input.scanCount === 1) {
    warnings.push({
      severity: "info",
      title: "Single scan assessment",
      description:
        "Assessment based on a single scan. A second scan adds validation and increases confidence scores.",
      suggestedAction: {
        label: "Run additional scan",
        href: clientId
          ? `/scans/new?clientId=${clientId}`
          : undefined,
        actionType: "run_scan",
      },
    });
  }

  // 7. No niche keywords
  if (!input.hasNicheKeywords) {
    warnings.push({
      severity: "info",
      title: "No niche keywords configured",
      description:
        "Visibility boundary analysis will not be available. " +
        "Niche keywords help determine at what specificity level the company appears.",
      suggestedAction: {
        label: "Add niche keywords to client profile",
        href: clientId ? `/clients/${clientId}/edit` : undefined,
        actionType: "add_role_variant",
      },
    });
  }

  // 8. Missing stage coverage
  const expectedStages = ["DISCOVERY", "CONSIDERATION", "EVALUATION", "COMMITMENT"];
  for (const stage of expectedStages) {
    const count = input.stageDistribution[stage] ?? 0;
    if (count === 0) {
      const stageLower = stage.charAt(0) + stage.slice(1).toLowerCase();
      warnings.push({
        severity: "warning",
        title: `No results for ${stageLower} stage`,
        description:
          `The ${stageLower} section will be empty in the report. ` +
          "Consider generating queries or running scans that cover this stage.",
        suggestedAction: {
          label: `Generate ${stageLower} queries`,
          href: clientId
            ? `/queries/generate?clientId=${clientId}`
            : undefined,
          actionType: "generate_queries",
        },
      });
    }
  }

  // Sort by severity: critical first, then warning, then info
  warnings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return warnings;
}
