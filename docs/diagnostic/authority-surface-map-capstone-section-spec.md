# Capstone Aggregate Section Spec — Authority Surface Map

**Status:** Spec locked 2026-05-18. Section title and framing paragraph reconciled with client Diagnostic Report template per founder direction 2026-05-18 (split-header convention: bare "Authority Surface Map" for capstone/spec/internal; subtitle "Where Your Hiring Visibility Is Anchored" for client Diagnostic).
**Owner:** growth (this spec), reportpm (capstone section drafting), founder (corpus-sufficiency gate decision Jun 15)
**Publishes in:** Capstone — Post 22 — "The State of AI Employer Visibility — H1 2026 Benchmark Report" (Tuesday, June 30, 2026)
**Gated on:** Jun 15 corpus-sufficiency check (~250 scored responses across ≥12 sector-rotated companies). Fallback structure for July follow-up brief specified below.

---

## What this section answers

**Section title (locked — bare title per founder split-header convention 2026-05-18):**

> Authority Surface Map

(In running prose and internal references, the section is "Authority Surface Map" — same name as the client Diagnostic section, without the subtitle. The capstone's overall artifact title "State of AI Employer Visibility — H1 2026 Benchmark Report" provides the contextual frame. The headline question below provides the section-level context.)

**Headline question this section answers:**

> Across the companies in this benchmark, which of the twelve citation-source categories does AI's authority concentrate on, where is it thinnest, and what does that distribution look like company-by-company without naming the companies?

This is the **aggregate** treatment. Per-company authority scores stay in client deliverables by design. The capstone shows the pattern; the Diagnostic Report shows a company's seat in the pattern.

---

## Framing paragraph (locked — reportpm must mirror this language exactly in the Diagnostic Report section opener)

> The Authority Surface Map measures **authority depth across the AI-cited candidate-intent surfaces in the scored corpus** — not authority across the web. For each of the twelve surface categories AI synthesizes from when answering candidate-intent questions about a named employer, the Map records how dense the cited material is, how many distinct named voices contribute to it, and how recently it was written. The output is a per-category depth read in four tiers — Anchored, Present, Thin, Absent — and a set of Authority Deficit findings naming the surfaces where deliberate investment would move the score. This section reports the aggregate pattern across the H1 2026 corpus.

**Why this framing, verbatim:**

- "Authority depth across the AI-cited candidate-intent surfaces in the scored corpus" is the canonical phrase. RULE-02 lock.
- "Anchored / Present / Thin / Absent" is the display vocabulary. Architect rubric is the source of truth; reportpm display tiers were edited to match per the May 18 sign-off.
- "Deliberate investment would move the score" is the scoping language. Establishes that the Map is prescriptive about actionable surfaces, not descriptive about all-cited-surfaces.
- No comparative-without-replacement language. ST defense via methodology specificity, not critique of brand-side audits.

---

## Section structure — 2 charts + 1 table

### Chart 1: Surface-family authority distribution across the corpus

**What it shows:** for each of the five surface families (Employer-owned, Peer-reviewed, Specialist, Independent, Authoritative), the distribution of company-by-company depth tier across the corpus.

**Visual:** stacked horizontal bar chart, five rows (one per family), four-tier color band per row (Anchored / Present / Thin / Absent), labeled with company-counts and percentages.

**Headline finding the chart lands:** the family where the corpus is widest (Anchored or Present at >60%) and the family where the corpus is thinnest (Thin or Absent at >50%). Both findings stated in the body with the canonical phrase, no overclaim. Specifically named families, specifically named percentages.

**Compliance lock:**

- Percentages reported as observed across the H1 2026 corpus. No projection to "all employers."
- "Most companies are weak on X" is the narrative shape, not "most companies fail at X." Additive framing.

### Chart 2: The twelve-category heat map

**What it shows:** twelve rows (one per category), four columns (one per depth tier). Each cell shows the share of corpus companies at that depth tier for that category.

**Visual:** heat-mapped grid. Reader can scan vertically (which categories are widely Anchored, which are widely Absent) and horizontally (within a category, what the corpus distribution looks like).

**Headline finding:** the three categories where the corpus is most reliably Anchored, the three where it is most reliably Thin or Absent. Specifically named. The asymmetry between Employer-owned-Anchored and Specialist-Absent is the most likely headline finding given pre-corpus signal; framed as a pattern, not a critique.

**Compliance lock:**

- Numbers reported as percentages or shares (e.g., "16 of 25 companies scored Anchored on Careers Site"). No "should be" or "ought to" language.
- Glassdoor as singleton category appears on its own row, not aggregated into peer-review. The methodological note from Post 16 carries through.

### Table 1: Authority Deficit pattern — top recurring deficits across the corpus

**What it shows:** the most-cited Authority Deficit finding categories across the corpus, with corpus-frequency, the surface category they map to, and an example remediation category (drawn from the fixed enum).

**Columns:**

| Recurring Authority Deficit pattern | Surface category | % of corpus where it appears as a material finding | Example remediation category |
|---|---|---|---|
| (e.g.) Thin authorship density on Specialist surfaces for highest-volume hiring personas | #8/#9/#10 — Specialist family | (corpus %) | Functional-team content production |

**Five to seven rows.** Capped at the recurring patterns; not a full Authority Deficit catalogue. The full enum lives in the Diagnostic Report, not the capstone.

**Compliance lock:**

- Each row reads as a structural pattern, not a verdict on any company.
- Remediation column names categories of work, never specific vendors.

---

## Findings the section lands

The section lands three classes of finding:

1. **Where authority is structurally deepest across the corpus.** Names the surface family and the surface category. Likely candidate: Careers Site and Glassdoor are the two most-Anchored individual categories, but the specifics depend on corpus.
2. **Where authority is structurally thinnest.** Names the surface family and the surface category. Likely candidate: Specialist family — Compensation Specialist Platforms (#8) and Persona-Specific Community Platforms (#9) — are most often Thin or Absent. Frames the gap as where deliberate investment moves the score.
3. **The asymmetry pattern.** One Authority Deficit pattern that recurs across more than half the corpus, named specifically. This becomes the most-quotable finding of the capstone and the bridge into Posts #22/#25/#29 in the LinkedIn sequence.

**One finding the capstone deliberately does NOT land:** any per-company score, ranking, or callout. Aggregate-only by design.

---

## Corpus-sufficiency gate — Jun 15

**Trigger:** by Friday June 12, founder + architect confirm scored response count, sector rotation, and category-coverage of the H1 2026 corpus.

**Threshold for "go":**

- ≥ 250 scored responses across the corpus
- ≥ 12 distinct companies scored
- ≥ 6 sectors represented (revenue / engineering / customer success / operations / finance / industrial — the canonical six-sector rotation)
- All 12 surface categories observed in at least 4 companies (so per-category aggregate is meaningful, not anecdotal)

**Decision tree:**

- **All four met:** ship the full section in the June 30 capstone as specified above.
- **3 of 4 met (typically because one or two categories are under-observed):** ship the section with the under-observed categories called out by name in a "methodological note — small-n categories" callout, and either (a) collapse the under-observed categories into the family-level chart only, or (b) report n explicitly per category and let the reader weight accordingly. Decision belongs to reportpm + founder.
- **≤ 2 of 4 met:** drop the section from the June 30 capstone; ship the fallback in mid-July (see below).

---

## Fallback structure — "Authority Surface Map Methodology Brief" (Jul 14, if corpus short)

If the June 15 gate fails, the section becomes a standalone July follow-up brief. Specification:

**Title:** The Authority Surface Map: How We Measure Where AI's Authority on Your Hiring Story Sits
**Publishes:** Tuesday, July 14, 2026 (between Posts 24 and 25 in the sprint calendar — slots into the back end of Week 9; if that's tight, Tue Jul 21 in the post-sprint window)
**Format:** Long-form methodology brief, 1,800–2,200 words

**Sections:**

1. The taxonomy in one paragraph (forward-reference to Post 16 for full treatment)
2. The scoring rubric (density, voice diversity, recency) with examples
3. The four display tiers (Anchored / Present / Thin / Absent) with examples for each
4. **What a single-company authority profile looks like (illustrative, not corpus-aggregate)** — one sanitized illustrative profile, drawn from a willing reference customer or fully anonymized composite if no reference available
5. The Authority Deficit finding category — three-criteria definition (mirrors Post 18 structure), with examples
6. The forward question — what longitudinal observation of authority depth across the AI-cited surfaces adds that a point-in-time read cannot (this is the Continuous bridge, see §3 of `docs/continuous/03-growth-spec.md`)

**Compliance lock on the fallback:**

- Same canonical phrasing rule as the primary section
- No corpus-aggregate claims — the fallback is methodology, not benchmark
- No comparative-without-replacement
- One illustrative profile only, sanitized, no specific company name without explicit permission

**Why the fallback structure works:** if corpus is short, publishing a methodology brief is more honest than publishing aggregate findings with thin data. The methodology brief still establishes Antellion's hiring-specific scope and the Authority Surface Map vocabulary in public, accomplishes the Symphony Talent differentiation goal (methodology specificity is the differentiator), and primes the next capstone (H2 2026) for a stronger aggregate section.

---

## Cross-references

- `docs/diagnostic/authority-surface-map-taxonomy.md` — the locked twelve-category taxonomy (verbatim)
- `docs/blog/post-16-citation-source-taxonomy-brief.md` — Post 16 brief (descriptive, no scoring)
- `docs/continuous/03-growth-spec.md` — Continuous attach narrative, "photograph vs. time-lapse" bridge
- `.claude/agent-memory/.../project_authority_surface_map_decisions_may2026.md` — seven locked decisions
- `.claude/agent-memory/.../feedback_authority_depth_canonical_phrasing.md` — canonical phrasing rule

