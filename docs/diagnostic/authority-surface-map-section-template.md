# Authority Surface Map — Diagnostic Report Section Template

**Status:** Locked 2026-05-18. Section template canonical for AI Visibility Diagnostic deliveries.
**Section position:** Between Citation Source Inventory and Findings Brief.
**Source of truth for taxonomy, scoring, caps, and phrasing:** `docs/diagnostic/authority-surface-map-taxonomy.md`. Do not re-derive any of those here.
**Data model:** `AuthoritySurfaceScore`, `AuthorityPeerSnapshot` (Prisma), `SurfaceCategory` enum, `RUBRIC_VERSION` string (live as of migration `20260519020135_authority_surface_map`).

This document is the canonical client-deliverable section template. Render-layer rules (cap discipline, finding routing, distinction rule) are written into it and must be enforced at render — the data model persists every score and every candidate finding.

---

## 1. Section title (locked — do not edit)

> **Authority Surface Map: Where Your Hiring Visibility Is Anchored**

This title is shared verbatim with the growth sales walkthrough and the H1 2026 capstone aggregate section. If this language ever changes, both must change together.

---

## 2. Top-of-section framing paragraph (locked 2026-05-18 by founder)

Render verbatim. Substitute `{ClientName}` only. No other parameterization.

> The Authority Surface Map measures authority depth across the AI-cited candidate-intent surfaces in the scored corpus — not authority across the web. We score twelve citation-source categories grouped into five families on three sub-components: density of cited material, distinct named voices, and recency of cited material. The headline is not whether {ClientName} appears on each surface, but whether the appearance is deep enough to move a candidate's decision. Each surface receives one of four labels: **Anchored**, **Present**, **Thin**, or **Absent**. The findings that follow are filed at the most specific layer where the issue lives — surface, then persona, then corpus — so each one has exactly one owner.

**Why this paragraph (locked):** opens with the canonical scope phrase ("authority across the AI-cited candidate-intent surfaces in the scored corpus") — RULE-02 lock. Establishes the unit of analysis (12 categories, 5 families, 3 sub-components). Pre-empts the most common buyer question ("why does this finding live here and not somewhere else?") with the surface > persona > corpus distinction rule.

This paragraph is canonical for the client Diagnostic Report only. The capstone aggregate section has its own framing (see `authority-surface-map-capstone-section-spec.md` § Framing paragraph) — it cannot use `{ClientName}` because it reports cross-company patterns.

---

## 3. "How to read this" sidebar (single appearance, top-right of section)

Render exactly three lines. Do not expand. Do not repeat anywhere else in the report.

> **How to read this**
> - **Anchored / Present / Thin / Absent** describe authority depth on the surface — density, distinct voices, and recency combined.
> - Scoring is over the AI-cited candidate-intent surfaces in the scored corpus, not the open web.
> - A surface labeled **Absent** is not necessarily a problem; it's a problem when the surface is one candidates rely on for this persona.

---

## 4. The twelve-row surface table

Single table. One row per scored surface. Rendered in this fixed order (matches the taxonomy doc and the `SurfaceCategory` enum order).

### Columns (left to right)

| Column | Source | Width hint | Notes |
|---|---|---|---|
| **Surface** | `SURFACE_CATEGORY_DISPLAY[category]` | 22% | Use display labels exactly as defined in `surface-rules.ts`. |
| **Family** | `SURFACE_CATEGORY_GROUP[category]`, formatted | 12% | Render as "Employer-owned", "Peer-reviewed", "Specialist", "Independent", "Authoritative". Group rows visually by family with a thin separator. |
| **Depth label** | `displayLabelFromScore(combined)` | 10% | Anchored / Present / Thin / Absent. Use a single muted color chip — no traffic-light palette. |
| **Citations (recency-weighted)** | `densityWeightedCount`, 1 decimal | 12% | Shown as the number, not the band. Gives the analyst something to point at on a call. |
| **Distinct voices** | `distinctVoiceCount` | 10% | Integer. Empty cell if zero (visually quieter than "0"). |
| **Most recent** | derived from `monthsSinceMostRecent` | 12% | Render as "3 mo", "18 mo", "—" if none. |
| **Peer band** | from `AuthorityPeerSnapshot` aggregated for the engagement | 12% | Show the peer median depth label, e.g., "Median: Present". Skip column if no peer snapshots exist for the engagement (do not render an empty column). |
| **Gap vs. peers** | derived | 10% | One of: "Above peer band", "At peer band", "Below peer band", "—". |

### Row presentation

- Group rows by family. Render a small family header row (e.g., "Employer-owned (4)") above each block.
- Within a family, keep the taxonomy order — do not sort by score. Buyers learn the surface vocabulary faster when the order is stable.
- Render the score chip with the four labels only. Do not expose the 0–4 integer or the sub-component scores in this table. Sub-component detail lives in the audit appendix, gated behind an "open detail" affordance for the on-call walkthrough.
- For `NEEDS_CLASSIFICATION` queue items: do **not** render in this section. Surface them in the analyst-only operations view and footnote the report with the count of unclassified citations so the buyer understands the score's confidence floor.

### Footer line (small print under the table)

> Scored under rubric v{RUBRIC_VERSION}. {N_citations} citations across the scored corpus; {N_unclassified} surfaces pending classification ({pct}% of corpus). Peer band derived from {N_peers} comparison companies, snapshotted {peerSnapshotDate}.

If `N_unclassified` is zero, drop that clause. Never hide the unclassified count when it is non-zero — it is the inter-rater defensibility surface.

---

## 5. Leverage callout box (after the table, before Authority Deficits)

A single boxed callout that names the highest-leverage *positive* finding for the engagement — the surface where the client is Anchored or comfortably Present and can press the advantage. Optional: render only if at least one surface is Anchored, OR Present with depth >= peer median and recency <= 12 months. Otherwise omit the box. Do not invent a leverage callout to fill space.

**Structure (4 fields, rendered as a single readable paragraph):**

> **Highest-leverage surface: {Surface display name}.**
> **Why this is leverage:** one sentence naming the depth advantage in concrete terms (recency-weighted citation count, distinct named voices, peer comparison).
> **How candidates encounter it:** one sentence naming the candidate-intent journey where this surface shows up (research, comparison, post-offer due diligence).
> **What to keep doing:** one sentence — the operating behavior that produced this depth, so it doesn't quietly stop.

The leverage box is a counter to the report reading like a list of problems. It also gives the on-call walkthrough a clean place to start before depth gaps.

---

## 6. Authority Deficits — in-section findings

### Cap discipline (render-layer)

- **Maximum 4 Authority Deficit findings rendered in this section.** Selected by leverage score (the engagement's `findings` table holds all candidate findings; the renderer filters to the top 4).
- **Top 3 by leverage score travel to the Findings Brief** at the front of the report.
- If fewer than 4 material Authority Deficits exist, render only the material ones. Do not pad. Sub-material observations route to the analyst appendix.
- Material-finding qualification (all three required): specific named surface from the 12 categories, cited data evidence (citation count, voice count, recency, or peer gap), and an actionable category from the `FindingCategory` enum.

### Distinction rule — where a finding lives

A single finding has exactly one home. The render pipeline applies "surface beats persona beats corpus" — file at the most specific layer the finding lives at.

| If the issue is… | File it as… |
|---|---|
| Thin or absent depth on a named surface (e.g., Glassdoor, Persona-Specific Community Platforms) | **Authority Deficit** (this section) |
| One candidate persona is invisible to the model across multiple surfaces | **Persona Invisibility** (persona section) |
| The corpus is dominated by one or two citation sources across the engagement as a whole | **Citation Monoculture** (Citation Source Inventory section) |

Tie-break: when an issue could plausibly live at two layers, file at the more specific (surface > persona > corpus). One finding, one home. The Findings Brief shows where each finding lives via the section tag, so a buyer can navigate back to its full form.

### Authority Deficit finding template

Every Authority Deficit finding renders with the following fields **in this fixed order**. The data lives in the `Finding` table with `category = AUTHORITY_DEFICIT`; the renderer enforces the order and the canonical phrasing.

1. **Finding title** — sentence-form, names the surface and the gap shape. Example: "Glassdoor depth is thin against the peer band." No clever titles, no metaphors.
2. **Surface** — display label of the affected `SurfaceCategory`. One surface per finding. (If two surfaces share the same root cause, render two findings or roll up to the persona/corpus layer per the distinction rule.)
3. **Current depth** — depth label + the recency-weighted citation count + distinct voice count. Example: "Thin. 1.2 recency-weighted citations across 1 distinct voice over the last 12 months."
4. **Peer band** — median peer label + the gap shape. Example: "Peer median: Present. The client is one full depth band below the peer median on this surface."
5. **Why it matters to candidates** — one or two sentences. Plain language. Names the candidate-intent moment where the surface shows up. Avoid jargon. Never reference "the web" or "AI authority" without the scoping qualifier.
6. **Recommended action** — concrete, attributable to a named function (Talent Brand, Recruiting Ops, Comms, Engineering Marketing, etc.). One action per finding. No bundles.
7. **Priority** — one of: Now (this quarter), Next (next quarter), Watch (track, do not invest yet). Driven by leverage score band.
8. **Effort** — one of: Low (weeks, existing team), Medium (one quarter, cross-functional), High (multi-quarter or net-new capability).
9. **Confidence** — one of: High, Moderate, Low. Driven by `voiceAudit` density and corpus coverage. Visible to the buyer; not buried.
10. **Evidence (audit hover/footnote)** — link to the audit appendix entry with the citation list and the `voiceAudit` named voices. Required on every finding; the section will not render a finding without it.

**Required phrasing rule on every Authority Deficit finding:** when the report describes the scope of the measurement, use *"authority across the AI-cited candidate-intent surfaces in the scored corpus."* Never substitute "the web," "AI authority," or unscoped variants. Render the canonical phrase once per section in the framing paragraph and once in any finding where the scope question is in play.

---

## 7. Worked examples

Two worked examples below illustrate the template. Both pass the three-criteria material-finding test (named surface, cited evidence, actionable category) and use the canonical phrasing rule. Sector-rotated — one financial services positive-leverage callout, one healthcare deficit-flagging finding.

### Example A — Positive-leverage callout (Financial services, asset manager)

> **Highest-leverage surface: Trade & Business Press.**
> **Why this is leverage:** Bloomberg, Reuters, and Pensions & Investments have published 11 distinct cited pieces about the firm's investment leadership and culture over the last 12 months, with 7 distinct named voices including the CIO and three sector heads. The peer median on this surface is Present; the firm is Anchored — one full depth band above the comparison set.
> **How candidates encounter it:** when an investment-management candidate uses an AI model to research firms ahead of a final-round decision, trade press citations carry disproportionate weight in the synthesized answer for senior roles. This is the surface that gets quoted in "what is it like to work there" responses for buy-side roles.
> **What to keep doing:** the quarterly cadence of named-voice editorial commentary from the CIO and sector heads is what produced this depth. If that cadence drops, the depth will erode within two recency bands.

### Example B — Deficit-flagging finding (Healthcare delivery, regional health system)

1. **Finding title:** Persona-Specific Community Platforms show no observed depth for clinical leadership candidates.
2. **Surface:** Persona-Specific Community Platforms.
3. **Current depth:** Absent. 0 recency-weighted citations, 0 distinct voices observed across the scored corpus.
4. **Peer band:** Peer median: Present. Three of five comparison health systems have Present-or-better depth on this surface, driven by named clinical leaders posting in nursing leadership and physician executive communities.
5. **Why it matters to candidates:** clinical leadership candidates — nurse executives, physician leaders, service-line directors — research employers through named professional communities before engaging with recruiters. When the system has no presence in these communities, the AI model substitutes generic descriptions or peer-system citations, and the candidate's first impression is shaped by competitors. This is the single largest deficit in authority across the AI-cited candidate-intent surfaces in the scored corpus for clinical leadership personas.
6. **Recommended action:** Talent Brand to sponsor a named-voice content cadence from two clinical executives in one nurse-leadership community and one physician-executive community, starting Q3, four pieces per quarter per voice for two quarters.
7. **Priority:** Now.
8. **Effort:** Medium.
9. **Confidence:** High.
10. **Evidence:** Audit appendix entry A-7 — citation list, peer-comparison snapshot, named voices observed in peer corpus.

---

## 8. Findings Brief integration block

The Findings Brief at the front of the report aggregates the top findings across the whole Diagnostic. The Authority Surface Map's contribution:

- **Top 3 Authority Deficit findings by leverage score** travel to the Brief, regardless of whether the in-section cap allowed 4.
- **One leverage callout** travels to the Brief if it was rendered (Section 5). It appears under "What to keep doing" in the Brief, not under "What to fix."
- **The section tag on each Brief item** is "Authority Deficit" so the buyer can navigate back to this section's full-form entry.
- **The Brief's surface-level line** for this section reads: *"Authority depth across the 12 scored surfaces: {N_anchored} Anchored · {N_present} Present · {N_thin} Thin · {N_absent} Absent."* This is the only place the four-tier counts roll up to a single line.

The Brief never invents a finding the section does not contain. The section never contains a finding the Brief cannot route to.

---

## 9. Analyst review-call walkthrough opening (3–5 sentences)

Read aloud at the start of the section's walkthrough on the analyst review call. Plain language, CHRO-facing, lands the *actionable authority depth* framing without comparative-without-replacement framing.

> When a candidate asks an AI model where to work, the model assembles its answer from a specific set of citation surfaces — peer-review platforms, named professional communities, trade press, careers pages, and a few others. Some of those surfaces are ones you can build authority on through deliberate work; others are reference sources that just are what they are. The Authority Surface Map looks only at the surfaces where deliberate work moves the score, scores depth on each one, and shows where {ClientName}'s depth is enough to influence the answer for your candidates and where it is not. Each surface lands in one of four bands — Anchored, Present, Thin, Absent — and the findings that follow tell you which surfaces are doing the work, which ones need investment, and which to leave alone for now. We'll walk the table once, stop at the highest-leverage surface, and then look at the four deficits we'd act on this year.

---

## 10. Render order (within the section)

1. Section title.
2. Framing paragraph.
3. "How to read this" sidebar (top-right, parallel to framing paragraph).
4. Twelve-row surface table, grouped by family.
5. Table footer with rubric version, citation count, unclassified count, peer snapshot date.
6. Leverage callout box (only if a qualifying surface exists).
7. Authority Deficit findings, max 4, in leverage-score order.
8. Section close: one-sentence pointer to the persona section if any deficit was reclassified up to Persona Invisibility, and one-sentence pointer to Citation Source Inventory if any deficit was reclassified up to Citation Monoculture. Quiet line, no fanfare.

---

## 11. What the analyst produces (data-shape notes)

For each engagement, the section reads from:

- `AuthoritySurfaceScore[]` — one row per scored category for the engagement. Render the table from these.
- `AuthorityPeerSnapshot[]` — peer rows under the same `rubricVersion`. Aggregate to peer-median depth label per surface for the table's "Peer band" column.
- `Finding[]` where `category = AUTHORITY_DEFICIT` and `engagementId` matches — candidate Authority Deficit findings. Renderer filters to top 4 by leverage score.
- `RUBRIC_VERSION` from `packages/core/src/diagnostic/authority/score.ts` — printed in the footer.

Every score row carries a `voiceAudit` JSON column. The audit appendix renders the named voices behind each score; the section itself does not. If `voiceAudit.observations` is missing on a row that should be scored, the renderer must fail loudly and not render the section — defense-in-depth around inter-rater defensibility.

---

## 12. Cross-references

- Taxonomy and scoring rubric: `docs/diagnostic/authority-surface-map-taxonomy.md`
- Decisions and risk mitigations: `.claude/agent-memory/.../project_authority_surface_map_decisions_may2026.md`
- Classifier: `packages/core/src/diagnostic/authority/surface-rules.ts`
- Scoring: `packages/core/src/diagnostic/authority/score.ts`
- Data model: `packages/db/prisma/schema.prisma` (`AuthoritySurfaceScore`, `AuthorityPeerSnapshot`, `SurfaceCategory`, `FindingCategory.AUTHORITY_DEFICIT`)
- Sales walkthrough and capstone aggregate copy (growth-owned, must match Section 1 and Section 2 verbatim).
