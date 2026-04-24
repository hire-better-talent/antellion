/**
 * Deterministic candidate-finding extractor for Diagnostic engagements.
 *
 * Input:  all ScanResult records for an engagement (with citations).
 * Output: 20-30 candidate Finding drafts covering the seven finding types
 *         defined in the Diagnostic spec.
 *
 * Rule-based only — no LLM calls. The refund guarantee depends on this
 * function being purely deterministic over persisted data.
 */

// ── Types ────────────────────────────────────────────────────

export type FindingCategoryType =
  | "ZERO_PRESENCE"
  | "COMPETITOR_DOMINANCE"
  | "SENTIMENT_DIVERGENCE"
  | "CITATION_MONOCULTURE"
  | "PERSONA_INVISIBILITY"
  | "NARRATIVE_INCONSISTENCY"
  | "ZERO_CITATION"
  | "CONTENT_GAP"
  | "COMPETITIVE_POSITIONING"
  | "EMPLOYER_BRAND"
  | "OTHER";

export interface ScanResultInput {
  id: string;
  queryId: string;
  queryText: string;
  stage: string | null;
  modelName: string | null;
  personaId: string | null;
  personaLabel: string | null;
  mentioned: boolean;
  visibilityScore: number | null;
  sentimentScore: number | null;
  response: string;
  citationDomains: string[];
  competitorMentions: Array<{ name: string; mentioned: boolean }>;
}

export interface CandidateFinding {
  /** Short, specific label for the issue */
  namedIssue: string;
  /** IDs of ScanResult records that evidence this finding */
  evidenceScanResultIds: string[];
  /** Snapshot of citation evidence */
  evidenceCitations: Array<{ domain: string; count: number }>;
  /** Classification */
  actionableCategory: FindingCategoryType;
  /** Optional contextual fields */
  personaId: string | null;
  modelName: string | null;
  stage: string | null;
  competitorName: string | null;
}

// ── Constants ─────────────────────────────────────────────────

/** Visibility score below which a result is considered "not visible" */
const INVISIBLE_THRESHOLD = 20;

/** Sentiment divergence: models differ by at least this much (on -1..1 scale) */
const SENTIMENT_DIVERGENCE_THRESHOLD = 0.5;

/** Citation monoculture: single domain accounts for >= this fraction */
const MONOCULTURE_FRACTION = 0.6;

/** Max findings to generate (avoids overwhelming the operator review queue) */
const MAX_FINDINGS = 30;

// ── Helpers ───────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const existing = map.get(k);
    if (existing) {
      existing.push(item);
    } else {
      map.set(k, [item]);
    }
  }
  return map;
}

function topCitationDomains(
  results: ScanResultInput[],
): Array<{ domain: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of results) {
    for (const d of r.citationDomains) {
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));
}

function allMentionedIn(results: ScanResultInput[], modelName: string): boolean {
  return results.filter((r) => r.modelName === modelName).every((r) => r.mentioned);
}

// ── Rule extractors ───────────────────────────────────────────

/**
 * Rule 1: Zero-presence queries.
 * A query where the client does not appear in ANY model or persona.
 */
function extractZeroPresenceFindings(
  byQuery: Map<string, ScanResultInput[]>,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const [queryId, results] of byQuery) {
    const queryText = results[0]?.queryText ?? queryId;
    const stage = results[0]?.stage ?? null;

    const allInvisible = results.every(
      (r) => !r.mentioned || (r.visibilityScore ?? 0) < INVISIBLE_THRESHOLD,
    );

    if (allInvisible && results.length >= 2) {
      findings.push({
        namedIssue: `Zero presence — absent from all ${results.length} model responses for query: "${queryText.slice(0, 100)}"`,
        evidenceScanResultIds: results.map((r) => r.id),
        evidenceCitations: topCitationDomains(results),
        actionableCategory: "ZERO_PRESENCE",
        personaId: null,
        modelName: null,
        stage,
        competitorName: null,
      });
    }
  }

  return findings;
}

/**
 * Rule 2: Competitor dominance on own-name queries.
 * The query text includes the client name, but a competitor gets the narrative.
 * Detected by: client not mentioned but competitor mentioned in result.
 */
function extractCompetitorDominanceFindings(
  byQuery: Map<string, ScanResultInput[]>,
  clientName: string,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const clientLower = clientName.toLowerCase();

  for (const [queryId, results] of byQuery) {
    const queryText = results[0]?.queryText ?? queryId;
    const stage = results[0]?.stage ?? null;

    // Only apply to queries that include the client's name
    if (!queryText.toLowerCase().includes(clientLower)) continue;

    // Find results where client is absent but a competitor is dominant
    const dominanceInstances: Array<{ result: ScanResultInput; competitor: string }> = [];
    for (const r of results) {
      if (r.mentioned) continue;
      const dominantCompetitor = r.competitorMentions.find((c) => c.mentioned);
      if (dominantCompetitor) {
        dominanceInstances.push({ result: r, competitor: dominantCompetitor.name });
      }
    }

    if (dominanceInstances.length > 0) {
      // Group by competitor name to name the finding specifically
      const byCompetitor = groupBy(dominanceInstances, (d) => d.competitor);
      for (const [competitor, instances] of byCompetitor) {
        findings.push({
          namedIssue: `Competitor dominance — "${competitor}" appears instead of client in ${instances.length} response(s) for own-name query: "${queryText.slice(0, 80)}"`,
          evidenceScanResultIds: instances.map((i) => i.result.id),
          evidenceCitations: topCitationDomains(instances.map((i) => i.result)),
          actionableCategory: "COMPETITOR_DOMINANCE",
          personaId: instances[0]?.result.personaId ?? null,
          modelName: instances.length === 1 ? (instances[0]?.result.modelName ?? null) : null,
          stage,
          competitorName: competitor,
        });
      }
    }
  }

  return findings;
}

/**
 * Rule 3: Sentiment divergence across models.
 * Same query, materially different sentiment between two models.
 */
function extractSentimentDivergenceFindings(
  byQuery: Map<string, ScanResultInput[]>,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const [queryId, results] of byQuery) {
    const queryText = results[0]?.queryText ?? queryId;
    const stage = results[0]?.stage ?? null;

    // Collect scored results grouped by model
    const byModel = groupBy(results, (r) => r.modelName ?? "unknown");
    const modelSentiments: Array<{ model: string; sentiment: number; resultId: string }> = [];

    for (const [model, modelResults] of byModel) {
      const scored = modelResults.filter((r) => r.sentimentScore != null);
      if (scored.length === 0) continue;
      const avgSentiment = scored.reduce((s, r) => s + (r.sentimentScore ?? 0), 0) / scored.length;
      modelSentiments.push({ model, sentiment: avgSentiment, resultId: scored[0]!.id });
    }

    if (modelSentiments.length < 2) continue;

    const maxSentiment = Math.max(...modelSentiments.map((m) => m.sentiment));
    const minSentiment = Math.min(...modelSentiments.map((m) => m.sentiment));
    const divergence = maxSentiment - minSentiment;

    if (divergence >= SENTIMENT_DIVERGENCE_THRESHOLD) {
      const positiveModel = modelSentiments.find((m) => m.sentiment === maxSentiment);
      const negativeModel = modelSentiments.find((m) => m.sentiment === minSentiment);

      findings.push({
        namedIssue: `Sentiment divergence — ${positiveModel?.model} scores positive (${maxSentiment.toFixed(2)}) vs ${negativeModel?.model} negative (${minSentiment.toFixed(2)}) for: "${queryText.slice(0, 80)}"`,
        evidenceScanResultIds: modelSentiments.map((m) => m.resultId),
        evidenceCitations: topCitationDomains(
          results.filter((r) => modelSentiments.some((m) => m.resultId === r.id)),
        ),
        actionableCategory: "SENTIMENT_DIVERGENCE",
        personaId: null,
        modelName: null,
        stage,
        competitorName: null,
      });
    }
  }

  return findings;
}

/**
 * Rule 4: Citation monoculture.
 * Citations are concentrated in a single domain across many results.
 * Signals dependency on one platform that carries high sentiment risk.
 */
function extractCitationMonocultureFindings(
  allResults: ScanResultInput[],
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  // Aggregate citation domain frequency across all results
  const domainCounts = new Map<string, { count: number; resultIds: string[] }>();
  let totalCitations = 0;

  for (const result of allResults) {
    for (const domain of result.citationDomains) {
      const existing = domainCounts.get(domain);
      if (existing) {
        existing.count++;
        if (!existing.resultIds.includes(result.id)) {
          existing.resultIds.push(result.id);
        }
      } else {
        domainCounts.set(domain, { count: 1, resultIds: [result.id] });
      }
      totalCitations++;
    }
  }

  if (totalCitations < 5) return findings; // too few citations to make this meaningful

  for (const [domain, { count, resultIds }] of domainCounts) {
    const fraction = count / totalCitations;
    if (fraction >= MONOCULTURE_FRACTION) {
      findings.push({
        namedIssue: `Citation monoculture — ${domain} accounts for ${Math.round(fraction * 100)}% of all citations (${count}/${totalCitations}). Single-platform dependency creates concentrated sentiment risk.`,
        evidenceScanResultIds: resultIds.slice(0, 10), // cap evidence pointers
        evidenceCitations: [{ domain, count }],
        actionableCategory: "CITATION_MONOCULTURE",
        personaId: null,
        modelName: null,
        stage: null,
        competitorName: null,
      });
    }
  }

  return findings;
}

/**
 * Rule 5: Persona-specific invisibility.
 * Company is visible for some personas but absent for others on the same query.
 */
function extractPersonaInvisibilityFindings(
  byQuery: Map<string, ScanResultInput[]>,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const [queryId, results] of byQuery) {
    const queryText = results[0]?.queryText ?? queryId;
    const stage = results[0]?.stage ?? null;

    const byPersona = groupBy(results, (r) => r.personaId ?? "none");
    if (byPersona.size < 2) continue; // need at least 2 personas to compare

    const visiblePersonas: string[] = [];
    const invisiblePersonas: Array<{ id: string; label: string; resultIds: string[] }> = [];

    for (const [personaId, personaResults] of byPersona) {
      if (personaId === "none") continue;
      const anyVisible = personaResults.some((r) => r.mentioned);
      const label = personaResults[0]?.personaLabel ?? personaId;
      if (anyVisible) {
        visiblePersonas.push(label);
      } else {
        invisiblePersonas.push({ id: personaId, label, resultIds: personaResults.map((r) => r.id) });
      }
    }

    if (visiblePersonas.length > 0 && invisiblePersonas.length > 0) {
      for (const invisible of invisiblePersonas) {
        findings.push({
          namedIssue: `Persona-specific invisibility — company is visible for "${visiblePersonas.join(", ")}" but absent for "${invisible.label}" on query: "${queryText.slice(0, 80)}"`,
          evidenceScanResultIds: invisible.resultIds,
          evidenceCitations: topCitationDomains(
            results.filter((r) => r.personaId === invisible.id),
          ),
          actionableCategory: "PERSONA_INVISIBILITY",
          personaId: invisible.id,
          modelName: null,
          stage,
          competitorName: null,
        });
      }
    }
  }

  return findings;
}

/**
 * Rule 6: Narrative inconsistency across models.
 * Materially different characterizations for the same query across models.
 * Approximated by: one model mentions client, another does not (binary split).
 */
function extractNarrativeInconsistencyFindings(
  byQuery: Map<string, ScanResultInput[]>,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const [queryId, results] of byQuery) {
    const queryText = results[0]?.queryText ?? queryId;
    const stage = results[0]?.stage ?? null;

    const byModel = groupBy(results, (r) => r.modelName ?? "unknown");
    if (byModel.size < 2) continue;

    const modelVisibility: Array<{ model: string; mentioned: boolean; resultId: string }> = [];
    for (const [model, modelResults] of byModel) {
      const anyMentioned = modelResults.some((r) => r.mentioned);
      modelVisibility.push({ model, mentioned: anyMentioned, resultId: modelResults[0]!.id });
    }

    const mentionedModels = modelVisibility.filter((m) => m.mentioned);
    const absentModels = modelVisibility.filter((m) => !m.mentioned);

    // Only flag if the split is meaningful (not all same, not trivially few results)
    if (mentionedModels.length > 0 && absentModels.length > 0 && modelVisibility.length >= 3) {
      findings.push({
        namedIssue: `Narrative inconsistency — company appears in ${mentionedModels.map((m) => m.model).join(", ")} but not in ${absentModels.map((m) => m.model).join(", ")} for query: "${queryText.slice(0, 80)}"`,
        evidenceScanResultIds: modelVisibility.map((m) => m.resultId),
        evidenceCitations: topCitationDomains(results),
        actionableCategory: "NARRATIVE_INCONSISTENCY",
        personaId: null,
        modelName: null,
        stage,
        competitorName: null,
      });
    }
  }

  return findings;
}

/**
 * Rule 7: Zero-citation queries.
 * AI provides a narrative but cites nothing — response is ungrounded.
 */
function extractZeroCitationFindings(
  byQuery: Map<string, ScanResultInput[]>,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const [queryId, results] of byQuery) {
    const queryText = results[0]?.queryText ?? queryId;
    const stage = results[0]?.stage ?? null;

    // Flag queries where all results have responses but zero citations
    const withResponse = results.filter((r) => r.response.length > 100);
    if (withResponse.length === 0) continue;

    const zeroCitationResults = withResponse.filter((r) => r.citationDomains.length === 0);
    if (zeroCitationResults.length === withResponse.length && withResponse.length >= 2) {
      findings.push({
        namedIssue: `Zero-citation responses — ${withResponse.length} model responses for "${queryText.slice(0, 80)}" contain narrative but cite no sources`,
        evidenceScanResultIds: zeroCitationResults.map((r) => r.id),
        evidenceCitations: [],
        actionableCategory: "ZERO_CITATION",
        personaId: null,
        modelName: null,
        stage,
        competitorName: null,
      });
    }
  }

  return findings;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Extract candidate findings from all ScanResult records for an engagement.
 *
 * Returns up to MAX_FINDINGS candidate findings, prioritized by signal
 * strength (zero-presence and competitor-dominance first).
 *
 * All findings have status=DRAFT. The operator reviews, writes narrative,
 * and approves/rejects in the dashboard.
 */
export function extractCandidateFindings(
  results: ScanResultInput[],
  clientName: string,
): CandidateFinding[] {
  if (results.length === 0) return [];

  // Group by query for query-level rules
  const byQuery = groupBy(results, (r) => r.queryId);

  const allFindings: CandidateFinding[] = [
    // Priority ordering: most actionable first
    ...extractZeroPresenceFindings(byQuery),
    ...extractCompetitorDominanceFindings(byQuery, clientName),
    ...extractSentimentDivergenceFindings(byQuery),
    ...extractPersonaInvisibilityFindings(byQuery),
    ...extractNarrativeInconsistencyFindings(byQuery),
    ...extractCitationMonocultureFindings(results),
    ...extractZeroCitationFindings(byQuery),
  ];

  // Deduplicate: if two findings of the same category have exactly the same
  // evidence set, keep the first. Different categories can share evidence (a
  // query can be both zero-presence AND trigger competitor-dominance).
  const seenCategoryEvidenceKeys = new Set<string>();
  const deduped: CandidateFinding[] = [];
  for (const finding of allFindings) {
    const key = `${finding.actionableCategory}::${[...finding.evidenceScanResultIds].sort().join(",")}`;
    if (!seenCategoryEvidenceKeys.has(key)) {
      seenCategoryEvidenceKeys.add(key);
      deduped.push(finding);
    }
  }

  return deduped.slice(0, MAX_FINDINGS);
}
