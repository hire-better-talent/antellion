---
name: continuous-phase1-5b-reportpm-updates
description: "Phase 1.5b targeted updates to reportpm Continuous specs (May 13, 2026). Forward Strategy rename, month 1 Baseline & Watchlist Briefing structure, buyer-facing severity labels locked, proof-account framing for first 1-2 clients."
metadata:
  type: project
---

Phase 1.5b updates landed in `docs/continuous/02-reportpm-spec.md` and `docs/continuous/05-reportpm-drift-watch-spec.md` on 2026-05-13 after founder sign-off on five Phase 1.5 gate decisions.

**Why:** Founder ratified five decisions at the Phase 1.5 sign-off gate after Phase 1.5 specs from architect / reportpm / coo / query-ops / growth landed. Four touch reportpm specs.

**How to apply:**

- **Buyer-facing rename.** All buyer-facing artifacts use "Forward Strategy Session" (close moment) and "Forward Strategy Brief" (close artifact). Internal shorthand "close session" acceptable. Phase 2 *engagement* tiers (Focused / Strategic / Enterprise) are unchanged — they are offer objects, not the close moment. Where "Phase 2" still appears in specs it refers to either development Phase 2 (the build sequence) or Phase 2 engagements as a body of work, not the close session.

- **Month 1 is a distinct artifact.** Net-new §9 in `02-reportpm-spec.md`: month 1 = **Founder-Signed Baseline & Watchlist Briefing**, structurally different from §§1–7 monthly readout. Six-section structure: Drift Watch carryforward, baseline confirmation, 5–8 named watch items with "what would / would not warrant action" framing, optional watchlist movement, optional calibration observations, first-Drift-Signal commitment line, "what the analyst will not do" closing paragraph. Month 1 founder time budget: 2.5–4 hours. Steady-state §§1–7 resumes month 2.

- **Buyer-facing severity labels locked.** Internal enum `HEADLINE | WATCH | SUPPRESSED_UNLESS_CORROBORATED` renders to buyers as **Drift Signal / Watch Item / Corroborated Background**. Only the rendered briefing uses buyer-facing labels; code, internal docs, and `ChangeEvent.severity` continue to use the enum. Drift Watch (Diagnostic) does not use these labels — they apply only to Continuous monthly readouts.

- **Proof-account framing.** Net-new §10 in `02-reportpm-spec.md`: first 1–2 Continuous clients get visibly more analyst voice in §1, spelled-out corroboration reasoning, explicit "Watch Item not Drift Signal" calls, founder-written stability framing, recommendation rationale paragraph. Quarterly "what I didn't escalate" paragraph in early accounts is the highest-leverage judgment-reference artifact. Transition to steady-state shape: clients 1–2 or month 4 of either engagement, whichever produces more usable reference material. Per-account founder decision, not a date trigger.

**Open questions remaining:**

- External-event annotation surface (depends on architect spec on operator review surface) — where does the founder enter <2pp external-event annotations.
- Drift Watch handoff if Continuous engagement begins >1 quarter after Diagnostic — depends on coo Forward Strategy Session procedure.
- Refresh-set surfacing escalation rules — depends on query-ops Refresh review checklist.
- Buyer routing of the email readout — defer until first 2–3 Continuous clients reveal whether role variance is real.

Related: [[project_continuous_phase1_5_reportpm_design]], [[project_assessment_spec]], [[project_report_blueprint_v2]]
