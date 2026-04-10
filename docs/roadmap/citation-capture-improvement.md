# Roadmap: Citation Capture Improvement

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-30
**Priority:** Medium (blocks scan throughput and data quality)

---

## The Problem

Operators recording manual scan results must enter cited domains into a plain textarea. The current parser (`parseCitedDomains` in `packages/core/src/scan-analysis.ts`) splits on commas and newlines, strips protocols and `www.`, and deduplicates. This works for clean, pre-formatted input but fails the real workflow:

1. **AI responses cite sources in wildly varying formats.** ChatGPT may produce a numbered list of full URLs, inline hyperlinks in markdown, a trailing "Sources:" block, or prose references like "according to Glassdoor." The operator has to manually normalize all of these before pasting.

2. **The current field gives no feedback.** The operator types or pastes text, submits the form, and hopes. There is no preview of what domains were actually extracted. Mistakes are silent -- a malformed URL or forgotten comma produces fewer citations than expected, which directly degrades visibility scores and citation coverage metrics that feed into reports and confidence scoring.

3. **Copy-paste from AI responses is multi-step.** The operator reads the AI response, identifies cited sources, switches to the citation field, types or reformats them. For scans with 30+ queries this compounds into significant friction.

The `CitationSource` model stores both `url` and `domain` fields, but the current flow only ever populates `domain` (extracted from the raw input) and synthesizes a placeholder `url` (`https://{domain}`). The `title` and `sourceType` fields are effectively unused for manual entry. This means downstream report logic that could distinguish review sites from career pages has no signal to work with.

---

## Requirements

### R1: Free-form paste support

The citation input must accept any of the following without requiring the operator to reformat:

- Full URLs: `https://www.glassdoor.com/Reviews/Acme-Reviews-E12345.html`
- Bare domains: `glassdoor.com`
- Numbered lists: `1. glassdoor.com 2. indeed.com`
- Bulleted lists (markdown or unicode): `- glassdoor.com` / `* indeed.com`
- One per line
- Comma-separated
- Mixed blocks of text containing URLs among prose

The extraction logic must be deterministic, not LLM-dependent. It should run client-side for instant feedback and be re-validated server-side through the same core function.

### R2: URL normalization

Given a full URL, the system must extract the bare domain:

| Input | Extracted domain |
|---|---|
| `https://www.glassdoor.com/Reviews/Acme-Reviews-E12345.html` | `glassdoor.com` |
| `http://levels.fyi/company/acme` | `levels.fyi` |
| `www.linkedin.com/company/acme` | `linkedin.com` |
| `indeed.com` | `indeed.com` |
| `https://blog.techcrunch.com/2026/03/best-employers` | `blog.techcrunch.com` |

Preserve subdomain when it is not `www`. Strip protocol, path, query params, fragment. Lowercase.

### R3: Preview before save

After the operator pastes or types into the citation field, the parsed domains must appear immediately as removable pill/tag elements below the textarea. The operator can:

- See exactly which domains will be saved
- Remove incorrect extractions by clicking a dismiss control on the pill
- Manually add a domain that the parser missed

This preview must update on every input change (debounced, not on submit).

### R4: Auto-extraction from response text

When the operator has already pasted an AI response into the response textarea, the system should offer a one-click "Extract citations from response" action. This parses the response text for:

- Explicit URLs (regex-based)
- Domain-like tokens (e.g., `glassdoor.com`, `levels.fyi`)
- Known platform name references ("according to Glassdoor", "data from LinkedIn")

Extracted candidates appear as suggested pills distinct from confirmed pills. The operator confirms or dismisses each suggestion. No suggestion is auto-accepted.

This requires a known-platform dictionary. Start with the platforms relevant to employer visibility: Glassdoor, Indeed, LinkedIn, Levels.fyi, Blind, Comparably, Builtin, Wellfound, Payscale, Salary.com, Kununu, RepVue. The dictionary should be a data structure in `packages/core`, not hardcoded in UI.

---

## Implementation Approach

### Phase 1: Smart textarea with real-time preview

**Scope:** Replace the current plain textarea with a component that parses on input and displays pill previews.

**Backend (`packages/core`):**
- Refactor `parseCitedDomains` into a richer `extractCitationsFromText(input: string): ExtractedCitation[]` function. Each result carries `{ raw: string; domain: string; fullUrl?: string }`.
- The function must handle all formats listed in R1. The core parsing logic: split on newlines, then for each line strip list markers (`1.`, `-`, `*`, `[n]`), split remaining on commas/spaces, test each token against a URL/domain regex.
- Domain regex: match tokens containing a dot where the TLD-like segment is 2-63 chars of alpha. This avoids false positives on sentence-ending periods or abbreviations.
- URL regex: match `https?://...` and capture the full URL for storage in `CitationSource.url`.
- The function must be importable from `@antellion/core` so the server action re-validates using the same logic. No parsing divergence between client and server.

**Frontend (`apps/web`):**
- New `CitationInput` component (client component). Contains a textarea and a pill display area.
- On input change (debounced 200ms), calls `extractCitationsFromText` and renders pills.
- Each pill shows the normalized domain and has a dismiss button.
- A manual "Add domain" input allows typing a domain not captured by the parser.
- The form submits the final list of confirmed domains as a JSON array in a hidden field, replacing the raw string field.
- Update the `RecordResultForm` to use `CitationInput` instead of `FormTextarea` for the citations field.

**Server action (`apps/web/src/app/(dashboard)/actions/scans.ts`):**
- Accept the submitted domain list (JSON array of strings).
- Re-run `extractCitationsFromText` on each entry as a sanity check, or accept pre-normalized domains directly since the client already ran extraction.
- Schema change: `ManualScanResultSchema.citedDomains` shifts from `z.string().optional()` to `z.array(z.string()).optional()`. The server action maps this directly to `CitationSource` records.
- Populate `CitationSource.url` with the full URL when one was provided, instead of always synthesizing `https://{domain}`.

**No schema migration required.** The `CitationSource` model already has `url`, `domain`, `title`, and `sourceType` fields. Phase 1 just populates them more accurately.

**Estimated scope:** ~2 days of frontend work, ~0.5 day of core logic work.

### Phase 2: Auto-suggest from response text

**Scope:** Parse the AI response field and suggest citations the operator might have missed.

**Backend (`packages/core`):**
- New function `suggestCitationsFromResponse(response: string): CitationSuggestion[]`.
- Runs URL/domain regex extraction against the response text (same regex as Phase 1).
- Runs known-platform name matching: for each entry in the platform dictionary, check if the platform name appears in the response. If so, produce a suggestion with the platform's canonical domain.
- Each suggestion carries `{ domain: string; source: "url" | "domain_token" | "platform_name"; matchedText: string; confidence: "high" | "medium" }`.
- `"high"` = explicit URL or exact domain token. `"medium"` = platform name reference ("Glassdoor" without a URL).

**Frontend:**
- Add a "Suggest citations from response" button to the `CitationInput` component. Enabled only when the response textarea has content.
- On click, calls `suggestCitationsFromResponse` with the current response text.
- Suggestions render as a separate row of pills (visually distinct -- e.g., dashed border or different background) with "Add" and "Dismiss" actions.
- Adding a suggestion moves it into the confirmed pills list.
- Dismissed suggestions are hidden for the current form session.

**Estimated scope:** ~1 day core + ~1.5 days frontend.

### Phase 3: One-click extract all

**Scope:** Convenience shortcut that auto-confirms all high-confidence suggestions.

- "Extract all citations from response" button runs Phase 2 logic and auto-adds all `"high"` confidence suggestions to the confirmed list.
- `"medium"` confidence suggestions still appear as unconfirmed for manual review.
- Operator can still remove any auto-added citation.

**Estimated scope:** ~0.5 day (mostly wiring, logic already exists from Phase 2).

---

## Architecture Notes

**Where the logic lives:**
- All extraction, normalization, and suggestion logic belongs in `packages/core`. This is pure string processing with no IO. It is testable in isolation and reusable when automated scans (LLM-driven) need the same citation extraction.
- The platform dictionary (`KNOWN_PLATFORMS`) belongs in `packages/core` alongside the extraction functions. It will be needed by the report composer and comparison logic eventually.
- The `CitationInput` UI component belongs in `apps/web/src/components`. It is workflow-specific (not a generic UI primitive), so it does not belong in `packages/ui`.

**What does NOT change:**
- `CitationSource` Prisma model -- no migration needed.
- `analyzeResponse` orchestrator signature -- `rawCitedDomains` becomes `citedDomains: string[]` (already-parsed), but `parseCitedDomains` stays available for backward compatibility.
- Report composer and comparison logic -- they already consume `CitationSource` records from the database.

**Future considerations:**
- When automated LLM scans land, the `suggestCitationsFromResponse` function will be called programmatically (not by a human clicking a button). The same core function, no UI needed. Design the function signature accordingly -- it should accept the response string and return structured data, not depend on any UI state.
- The `KNOWN_PLATFORMS` dictionary will grow. Consider making it a config-driven list that can eventually be org-customizable (some industries have domain-specific platforms). For now, a hardcoded array is fine.
- `CitationSource.sourceType` could be auto-populated based on the platform dictionary (e.g., "review_site" for Glassdoor, "job_board" for Indeed). This is a natural Phase 2 enhancement but not required for the initial spec.

---

## Testing Strategy

- **Core unit tests:** `extractCitationsFromText` with fixtures covering every format variant (numbered list, bullet list, mixed prose, full URLs, bare domains, edge cases like `co.uk` TLDs, subdomains, and false positives like "e.g." or "Dr.").
- **Core unit tests:** `suggestCitationsFromResponse` with realistic AI response samples.
- **Component test:** `CitationInput` renders pills correctly, handles add/remove, debounces properly.
- **Integration test:** `recordResult` server action accepts the new array format and creates correct `CitationSource` records with proper `url` and `domain` values.

---

## Migration Path

Phase 1 is backward-compatible. The `parseCitedDomains` function continues to exist. The schema change to `ManualScanResultSchema` (string to string array) only affects the form submission format, which is internal to the record-result flow. No existing data is affected. Existing `CitationSource` records with synthesized URLs are not modified.

Phase 2 and 3 are additive. No breaking changes.
