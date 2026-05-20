# Authority Surface Map — Canonical 12-Category Taxonomy

**Status:** Locked 2026-05-18 by founder sign-off.
**Source of truth for:** `packages/core/src/diagnostic/authority/surface-rules.ts` (domain→category mapping), blog Post 16 (citation taxonomy, ships 2026-05-26), Diagnostic Report § Authority Surface Map, capstone H1 2026 benchmark surface-distribution section.

**Premise:** the Authority Surface Map measures **actionable authority depth** — surfaces where a company can move the score through deliberate work. Passive reference surfaces (Wikipedia, Crunchbase, ZoomInfo) are excluded from the Map by design; they remain captured in the Citation Source Inventory section of the Diagnostic Report.

**Editorial line:**
- **Citation Source Inventory** = descriptive ("here is everything AI cited about you")
- **Authority Surface Map** = prescriptive ("here is where your authority is deep enough to influence the answer, and where it isn't")

---

## The 12 categories

### Employer-owned (4)

| # | Category | Definition | Example surfaces |
|---|---|---|---|
| 1 | **Careers Site** | Company-owned recruiting and employer surface on the primary domain | careers.[company].com, jobs.[company].com, /careers, /work-with-us, employee profile pages on the company domain |
| 2 | **Company Newsroom / Blog** | Company-owned corporate content surface | press releases, /newsroom, /blog, /insights, leadership announcements, ESG/values content |
| 3 | **Functional Team Content** | Team-specific public content on company-owned domain. Sector-agnostic — engineering blog, sales playbook, design blog, CS learning content, ops/safety content all fit. | engineering.[company].com, /engineering, /design, /research, /labs, /team-blogs |
| 4 | **Leadership Social Content** | Public content authored by named company leaders on non-company-owned platforms | LinkedIn executive posts, X/Twitter executive posts, leadership-authored Medium and Substack, founder podcast appearances, named-leader YouTube |

### Peer-reviewed (3)

| # | Category | Definition | Example surfaces |
|---|---|---|---|
| 5 | **Glassdoor** | Singleton category — Glassdoor is the dominant single citation source across sectors, scored separately to preserve signal | glassdoor.com |
| 6 | **Generalist Peer Review** | Cross-sector employee review platforms | comparably.com, indeed.com (review surfaces), kununu (European markets) |
| 7 | **Sector-Specific Peer Review** | Sector- or persona-tailored review platforms | builtin.com (tech), vault.com (finance, consulting, law), sector-tailored review platforms |

### Specialist (3)

| # | Category | Definition | Example surfaces |
|---|---|---|---|
| 8 | **Compensation Specialist Platforms** | Role-specific compensation data surfaces with active community contribution | levels.fyi, repvue.com, salary.com community boards, role-specific compensation data surfaces |
| 9 | **Persona-Specific Community Platforms** | Named professional communities and forums tied to specific candidate personas | teamblind.com, gainsight community, customer success network, pavilion, shrm communities, named professional forums |
| 10 | **Reddit & General Professional Forums** | Public professional discussion communities not tied to a single persona platform | reddit.com (r/cscareerquestions, r/sales, r/customersuccess, r/managers, sector-specific subreddits), news.ycombinator.com, lobste.rs |

### Independent (1)

| # | Category | Definition | Example surfaces |
|---|---|---|---|
| 11 | **Independent Voice Content** | Named-author independent content surfaces not on company-owned domains | substack newsletters (non-leadership authors), podcast transcripts, conference talk transcripts, named-author medium, named-author youtube |

### Authoritative (1)

| # | Category | Definition | Example surfaces |
|---|---|---|---|
| 12 | **Trade & Business Press** | Editorial press surfaces — national business press and sector-specific trade publications | bloomberg.com, reuters.com, wsj.com, ft.com, hr trade publications (TLNT, HR Brew, Recruiting Daily, SHRM articles), sector trade press, regional business journals |

---

## Out of scope (v1)

Captured in Citation Source Inventory but NOT scored in the Authority Surface Map:

- **Reference Sites:** Wikipedia, Crunchbase, ZoomInfo, factual-reference surfaces. Routes to `REFERENCE_SITE_UNMAPPED` bucket in `surface-rules.ts`.
- **Paid placement:** LinkedIn sponsored job posts, sponsored Indeed listings, paid Reddit promotions. Not synthesis surfaces.
- **Private communities:** Slack workspaces, Discord servers, internal forums. Not AI-readable.
- **Podcast/video without transcripts:** if AI cannot synthesize, the surface is not in the corpus. Podcast transcripts and conference talks WITH transcripts route to #11; without transcripts they're inventoried but not Map-scored.

---

## Scoring rubric (locked 2026-05-18)

Internal: 0–4 on each of three sub-components per category:

| Sub-component | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| **Density** (distinct cited pieces, recency-weighted: ≤12mo = 1.0, 12–24mo = 0.6, 24–36mo = 0.3, >36mo = 0.1) | 0 | 0 < w ≤ 1 | 1 < w ≤ 3 | 3 < w ≤ 8 | > 8 |
| **Voice diversity** (distinct named human voices) | 0 | 1 | 2–3 | 4–6 | ≥ 7 |
| **Recency** (months since most-recent cited piece) | none | > 36 | 24–36 | 12–24 | ≤ 12 |

**Combined score:** `round( (density × 0.5) + (voice × 0.3) + (recency × 0.2) )` → integer 0–4.

**Display:** 4-tier labels in client report.

| Combined score | Display label |
|---|---|
| 0 | Absent |
| 1 | Thin |
| 2–3 | Present |
| 4 | Anchored |

**Required audit field:** `voiceAudit` (JSON) — every voice-diversity score logs the named voices that produced it. Elevated from optional to REQUIRED per founder direction 2026-05-18 for inter-rater defensibility.

---

## Authority Deficit findings

- **Cap:** max 4 Authority Deficit findings in-section per Diagnostic.
- **Findings Brief:** top 3 by leverage score travel to the executive Findings Brief.
- **Material finding qualification:** must name specific surface, quantify the depth gap vs. peer band or absolute floor, and select a remediation category from the fixed enum. Counts toward WYMB 10-finding minimum via `FindingCategory.AUTHORITY_DEFICIT` enum extension.

---

## Canonical phrasing for public artifacts

**Use:** "authority across the AI-cited candidate-intent surfaces in the scored corpus."

**Do NOT use:** "authority across the web," "web-wide authority," "your AI authority" without scoping qualifier.

See `.claude/agent-memory/.../feedback_authority_depth_canonical_phrasing.md`.

---

## Section header convention (locked 2026-05-18)

| Artifact | Section header |
|---|---|
| Client Diagnostic Report | **Authority Surface Map: Where Your Hiring Visibility Is Anchored** |
| Capstone aggregate section | **Authority Surface Map** (bare — capstone overall title provides context) |
| Spec docs, internal references, prose mentions | **Authority Surface Map** (bare) |

---

## Locked framing paragraph — client Diagnostic Report section opener

Render verbatim in `docs/diagnostic/authority-surface-map-section-template.md` § 2 and mirrored in the sales walkthrough's section-opening reference block. Substitute `{ClientName}` only.

> The Authority Surface Map measures authority depth across the AI-cited candidate-intent surfaces in the scored corpus — not authority across the web. We score twelve citation-source categories grouped into five families on three sub-components: density of cited material, distinct named voices, and recency of cited material. The headline is not whether {ClientName} appears on each surface, but whether the appearance is deep enough to move a candidate's decision. Each surface receives one of four labels: **Anchored**, **Present**, **Thin**, or **Absent**. The findings that follow are filed at the most specific layer where the issue lives — surface, then persona, then corpus — so each one has exactly one owner.

The capstone aggregate section has parallel framing in `docs/diagnostic/authority-surface-map-capstone-section-spec.md` § Framing paragraph — same canonical phrase, no `{ClientName}` (cross-company aggregate).

---

## Cross-references

- `.claude/agent-memory/.../project_authority_surface_map_decisions_may2026.md` — seven locked decisions, two risk mitigations, three time-bound gates
- `docs/60-day-content-sprint-may-jul-2026.md` § Post 16 — public taxonomy article (May 26)
- `packages/core/src/diagnostic/authority/surface-rules.ts` — domain→category implementation (to build)
- `packages/db/prisma/schema.prisma` — `AuthoritySurfaceScore`, `AuthorityPeerSnapshot`, `FindingCategory.AUTHORITY_DEFICIT` (migration pending)
