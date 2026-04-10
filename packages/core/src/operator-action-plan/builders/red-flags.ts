// ── Operator Action Plan — Red Flag Builder ──────────────────
//
// Classifies quality concerns by severity and returns them sorted
// critical > major > advisory. Each red flag tells the operator
// exactly what to do about the concern before or during delivery.
//
// Severity classification:
//   critical  — delete or heavily caveat before sending
//   major     — verbal qualification during walkthrough warranted
//   advisory  — prepare an answer; do not volunteer unless client raises it

import type { ReportMetadata, TriggerFlags, RedFlag, RedFlagSeverity } from "../types";
import { TRIGGER_THRESHOLDS } from "../config";

const SEVERITY_ORDER: Record<RedFlagSeverity, number> = {
  critical: 0,
  major: 1,
  advisory: 2,
};

function makeFlag(
  severity: RedFlagSeverity,
  concern: string,
  implication: string,
  mitigation: string,
  affectedSection?: string,
): RedFlag {
  const flag: RedFlag = { severity, concern, implication, mitigation };
  if (affectedSection !== undefined) {
    flag.affectedSection = affectedSection;
  }
  return flag;
}

/**
 * Build the red flag list from report metadata.
 * Output is sorted critical > major > advisory.
 */
export function buildRedFlags(
  meta: ReportMetadata,
  _flags: TriggerFlags,
): RedFlag[] {
  const flags: RedFlag[] = [];
  const stages = meta.journeyAnalysis?.stages ?? [];
  const multiRun = meta.multiRunAnalysis;
  const readinessWarnings = meta.readinessWarnings ?? [];
  const overallSourcedRate = meta.overallSourcedRate ?? 1;
  const overallConfidence = meta.confidence?.overall;
  const perSectionConfidence = meta.confidence?.perSection ?? {};

  // ── CRITICAL: zero sourced results for any stage ──────────

  for (const stage of stages) {
    if (stage.sourcedRate === 0 && stage.mentionRate > 0) {
      flags.push(
        makeFlag(
          "critical",
          `${stage.stage} stage has zero sourced results — all findings are from AI parametric memory`,
          `The ${stage.stage} subsection relies entirely on AI recall, not indexed sources. Presenting quantified claims from this stage as findings in a client meeting is not defensible — the numbers have no grounded basis.`,
          `Delete or heavily caveat the ${stage.stage} subsection before sending. In the meeting, do not present ${stage.stage} as a quantified finding. Describe the absence of indexed data as the finding.`,
          stage.stage,
        ),
      );
    }
  }

  // ── CRITICAL: zero total results for any stage ────────────

  for (const stage of stages) {
    if (stage.mentionRate === 0 && stage.sourcedRate === 0) {
      // Check whether this is a true zero or just low
      // positioning === "INVISIBLE" combined with zero sourced = no data at all
      if (stage.positioning === "INVISIBLE") {
        flags.push(
          makeFlag(
            "critical",
            `${stage.stage} section has no meaningful results — AI returned nothing for this stage`,
            `The ${stage.stage} section of the report cannot support any finding. A section that leads with zero data is a credibility risk, not an insight.`,
            `Remove or replace the ${stage.stage} section with a note that this stage had insufficient data to analyze. Do not present it as a finding of absence without making the sample limitation explicit.`,
            stage.stage,
          ),
        );
      }
    }
  }

  // ── CRITICAL: overall confidence LOW ─────────────────────

  if (overallConfidence?.tier === "LOW") {
    flags.push(
      makeFlag(
        "critical",
        `Overall confidence is LOW (score: ${Math.round(overallConfidence.score)})`,
        "The report's findings are based on thin, inconsistent, or poorly-sourced data overall. Presenting this report without qualification risks credibility damage if the client runs even a basic sanity check.",
        "Review every quantified claim in the report. Downplay specific numbers; lead with directional findings and the competitive framing. Consider whether the report is ready to deliver or requires an additional scan run.",
      ),
    );
  }

  // ── CRITICAL: readiness warnings of severity "critical" ──

  for (const warning of readinessWarnings) {
    if (warning.severity !== "critical") continue;
    flags.push(
      makeFlag(
        "critical",
        `Readiness warning: ${warning.title}`,
        warning.description,
        "Address the data gap before delivery if possible. If not, verbally qualify the affected section in the meeting and note the limitation in the report introduction.",
      ),
    );
  }

  // ── MAJOR: thin sample but non-zero ──────────────────────

  const totalQueries = multiRun?.totalQueries ?? 0;
  if (
    totalQueries > 0 &&
    totalQueries < TRIGGER_THRESHOLDS.LOW_SAMPLE_SIZE
  ) {
    flags.push(
      makeFlag(
        "major",
        `Total sample is thin: ${totalQueries} queries (threshold: ${TRIGGER_THRESHOLDS.LOW_SAMPLE_SIZE})`,
        "Findings based on fewer than 20 queries are more vulnerable to statistical noise. A client who re-runs the same queries manually might see meaningfully different numbers.",
        `In the meeting, qualify thin-sample findings verbally: "Our Discovery sample on this was ${totalQueries} queries — directionally clear, but we'd validate with a second run before treating the percentage as a hard number."`,
      ),
    );
  }

  // ── MAJOR: single scan run (multi-run confidence penalty) ─

  if ((multiRun?.effectiveScanRunCount ?? 1) <= 1) {
    flags.push(
      makeFlag(
        "major",
        "Single-run report — cross-run validation not yet available",
        "Without a second scan run, every finding is UNVALIDATED by stability classification. This means volatile queries cannot be distinguished from stable ones, and the confidence scores carry a single-scan penalty.",
        "Qualify verbally when discussing specific percentages: 'This is a single-run finding — we haven't yet confirmed stability across multiple runs.' Offer a re-scan as a validation step or roll it into the monitoring upsell.",
      ),
    );
  }

  // ── MAJOR: per-section confidence LOW ────────────────────

  for (const [section, confidence] of Object.entries(perSectionConfidence)) {
    if (confidence.tier !== "LOW") continue;
    flags.push(
      makeFlag(
        "major",
        `${section} section confidence is LOW (score: ${Math.round(confidence.score)})`,
        `The ${section} section findings are based on thin or inconsistent data. Leading with these findings creates risk if the client probes the underlying sample.`,
        `Qualify the ${section} section verbally during the walkthrough. Lead with the competitive framing rather than the specific percentage. Offer to re-validate with an additional scan run.`,
        section,
      ),
    );
  }

  // ── MAJOR: stage-level sourced rate < 0.3 ────────────────

  for (const stage of stages) {
    // Already flagged as critical if sourcedRate === 0; skip here
    if (stage.sourcedRate === 0) continue;
    if (stage.sourcedRate >= 0.3) continue;
    const pct = Math.round(stage.sourcedRate * 100);
    flags.push(
      makeFlag(
        "major",
        `${stage.stage} sourced rate is ${pct}% — AI is drawing primarily from memory`,
        `Low sourcing at the ${stage.stage} stage means AI responses cite fewer indexed sources, making the findings harder to ground in verifiable content. Clients who check "what sources did you use?" will find limited answers.`,
        `Qualify ${stage.stage} findings with the sourcing note. In the meeting, frame the low sourced rate as a finding in itself: "AI has almost nothing indexed to draw from, which is consistent with the gap domains we see."`,
        stage.stage,
      ),
    );
  }

  // ── MAJOR: high volatile presence ────────────────────────

  if (multiRun) {
    const volatileCount = multiRun.stabilityDistribution.VOLATILE_PRESENCE;
    const total = multiRun.totalQueries;
    if (total > 0 && volatileCount / total > TRIGGER_THRESHOLDS.HIGH_VOLATILITY_RATE) {
      const pct = Math.round((volatileCount / total) * 100);
      flags.push(
        makeFlag(
          "major",
          `${pct}% of queries show VOLATILE_PRESENCE (${volatileCount} of ${total} total)`,
          "More than 30% of queries showed inconsistent client mentions between runs. A client who re-runs queries manually may see different numbers than what the report shows.",
          "In the meeting, acknowledge the volatility finding proactively if asked about methodology. Position it as a reason to add quarterly monitoring rather than a weakness of the current report.",
        ),
      );
    }
  }

  // ── ADVISORY: global sourced rate 0.3–0.5 ────────────────

  if (overallSourcedRate >= 0.3 && overallSourcedRate < 0.5) {
    const pct = Math.round(overallSourcedRate * 100);
    flags.push(
      makeFlag(
        "advisory",
        `Overall sourced rate is ${pct}% — below ideal but not critical`,
        "A sourced rate under 50% means AI is drawing on parametric memory for a significant share of responses. This is a data quality note, not a fatal flaw, but it is the most common methodology objection.",
        "Prepare the sourcing pushback response (Section C) before the meeting. Do not volunteer this number; respond to it if asked.",
      ),
    );
  }

  // ── ADVISORY: readiness warnings of severity "warning" ───

  for (const warning of readinessWarnings) {
    if (warning.severity !== "warning") continue;
    flags.push(
      makeFlag(
        "advisory",
        `Data note: ${warning.title}`,
        warning.description,
        "Prepare a brief response if the client raises this. Do not lead with it.",
      ),
    );
  }

  // ── ADVISORY: missing baseline data (first assessment) ───

  const scanRunCount = meta.scanRunIds?.length ?? 1;
  if (scanRunCount <= 1) {
    flags.push(
      makeFlag(
        "advisory",
        "No prior baseline — no before/after comparison available",
        "This is a first assessment for this client. The report cannot show whether visibility has improved or declined; it can only show the current state. Clients sometimes expect trend data.",
        "If the client asks 'compared to what?', frame this as the baseline: 'This is the starting point. The value is in comparing future scans to this one — which is exactly what the monitoring engagement does.'",
      ),
    );
  }

  // ── ADVISORY: low overall confidence (MEDIUM, not LOW) ───

  if (overallConfidence?.tier === "MEDIUM" && overallConfidence.score < 50) {
    flags.push(
      makeFlag(
        "advisory",
        `Overall confidence score is ${Math.round(overallConfidence.score)} — on the lower end of MEDIUM`,
        "The report findings are defensible but not strongly validated. Specific numbers may move if the scan is re-run.",
        "Prepare to discuss methodology if pressed. Position the confidence scoring system as evidence of rigor, not a disclaimer.",
      ),
    );
  }

  // ── Sort and return ───────────────────────────────────────

  flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return flags;
}
