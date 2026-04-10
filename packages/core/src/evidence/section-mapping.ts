// ── Section constants ──

export const SECTION_VISIBILITY = "Visibility Analysis";
export const SECTION_COMPETITOR = "Competitor Analysis";
export const SECTION_CITATIONS = "Citation Patterns";

// ── Minimal shape of a scan result needed for section mapping ──

export interface ScanResultForMapping {
  id: string;
  mentioned: boolean;
  competitorId: string | null;
  citations: { domain: string | null }[];
}

// ── Output ──

export interface EvidenceSectionAssignment {
  /** The ScanEvidence ID (not the ScanResult ID). */
  evidenceId: string;
  sectionHeading: string;
  sortOrder: number;
}

/**
 * Deterministically assigns evidence records to report sections based on
 * the nature of the corresponding scan result data.
 * Each result can produce multiple assignments (e.g., a result with a
 * competitor AND citations maps to both Competitor Analysis and Citation Patterns).
 *
 * Rules:
 *   - All results -> Visibility Analysis
 *   - Results with a competitorId -> Competitor Analysis
 *   - Results with citations -> Citation Patterns
 *
 * The evidenceIds and results arrays are parallel: evidenceIds[i] is the
 * ScanEvidence ID for results[i].
 */
export function mapEvidenceToSections(
  evidenceIds: string[],
  results: ScanResultForMapping[],
): EvidenceSectionAssignment[] {
  const assignments: EvidenceSectionAssignment[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const evidenceId = evidenceIds[i];

    if (!result || !evidenceId) continue;

    // All results contribute to Visibility Analysis
    assignments.push({
      evidenceId,
      sectionHeading: SECTION_VISIBILITY,
      sortOrder: i,
    });

    // Competitor results contribute to Competitor Analysis
    if (result.competitorId !== null) {
      assignments.push({
        evidenceId,
        sectionHeading: SECTION_COMPETITOR,
        sortOrder: i,
      });
    }

    // Results with citations contribute to Citation Patterns
    if (result.citations.length > 0) {
      assignments.push({
        evidenceId,
        sectionHeading: SECTION_CITATIONS,
        sortOrder: i,
      });
    }
  }

  return assignments;
}
