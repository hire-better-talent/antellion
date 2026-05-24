---
name: continuous-phase1-5-reportpm-design
description: "Phase 1.5 reportpm design decisions for Continuous SKU and Diagnostic Drift Watch — May 13, 2026. Threshold presentation tiers, agent-writable/founder-signable structure, Drift Watch as Diagnostic on-ramp."
metadata:
  type: project
---

Phase 1.5 reportpm shipped two coordinated specs under the four Phase 1 gate decisions ratified by founder.

**Why:** Continuous Phase 0 had open questions on thresholds, query continuity, and how the deliverable bridges from Diagnostic. Founder ratified $9,500/mo retainer pricing, Phase 2-attached close path, hybrid Core/Refresh queries, and reuse of Diagnostic 5pp/2pp thresholds with Continuous-specific presentation. This forced two artifacts: a new Drift Watch section in the Diagnostic report (the conceptual on-ramp) and threshold-tier revisions to the Continuous deliverable spec.

**How to apply:**

- **Drift Watch (Diagnostic-side, `docs/continuous/05-reportpm-drift-watch-spec.md`)** is the methodological on-ramp that must ship before any Continuous is sold. Three admissible classes of "could move": cross-model variance (observed today), recent positioning shifts (citation-source recency), competitive volatility (structural fragility of competitor frame). Forward-looking but never predictive. Computed against the same Core 40 that Continuous will later monitor — methodological continuity is the commercial moat. Placed second-to-last in the report, before Recommended Actions. ~10–15% of report length.
- **Drift Watch vs Drift Signal** is a load-bearing distinction. Drift Watch = forward-looking from single baseline. Drift Signal = observed change between two scans (Continuous monthly). Both will appear in artifacts; tone must differ.
- **Threshold tiers (Continuous-side, `docs/continuous/02-reportpm-spec.md` §1A)** map ≥5pp / 2–5pp / <2pp to specific sections. Headline only from ≥5pp. <2pp surfaces only via multi-query/multi-model corroboration (agent-surfaced) or external-event annotation (founder-only). The corroboration rule is the second-most important founder-review control after headline selection.
- **Empty-signal experience (§3A)** is fully specified: §1 defaults to stability-as-finding, §7 always carries material, length scales down in quiet months. Watch-list bodies are not required to have content — §7 is.
- **Agent-writable / founder-signable structure (§8)** codifies what the agent drafts mechanically vs what only the founder does interpretively. Headline selection from multiple ≥5pp candidates, external-event annotation, suppression, tone, and stability framing are founder-only. Movement tracker, drift signal skeleton, and recommendation drafts are agent-mechanical.

**Cross-spec dependencies still open:** architect must expose cross-model variance as first-class for Drift Watch §3.1; query-ops Core 40 freeze must complete during Diagnostic delivery; growth Phase 2 close script must reference Drift Watch by name with aligned phrasing; coo needs Drift Watch QA checklist before Diagnostic delivery.

**Constraint that shaped the spec:** "Founder-led intelligence service, agent-assisted production" — every section is structured to be writable by an agent and signable by a founder. Mechanical layer is invisible infrastructure; interpretive layer is where the founder's voice lives. Buyers are paying for the interpretive layer.

Related: [[project_continuous_phase1_gate_decisions_may2026]], [[project_continuous_operating_model_may2026]], [[project_report_blueprint_v2]], [[project_assessment_spec]]
