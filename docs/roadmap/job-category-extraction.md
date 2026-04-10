# Roadmap: Job Category Extraction from Career Sites

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-30
**Priority:** Medium (reduces operator setup friction, enables multi-category assessments)

---

## Problem

When creating an assessment, the operator manually enters a job category (e.g., "Software Engineer") into the `roleTitle` field of the query generation form (`GenerateQueriesSchema`). To choose the right categories, they have to visit the client's careers page, look at the job filter facets, and type them in. This is manual, error-prone, and becomes a bottleneck as we move toward multi-category assessments.

The current `QueryGenerationInput.roleTitle` is a free-text string. The operator has no guidance on what categories the client actually hires for, so they guess or do external research.

## Opportunity

Most career sites expose job categories as filter facets in their job search pages. These categories map directly to `RoleProfile.title` and the `roleTitle` input for query generation. Auto-extracting them would:

- **Reduce operator setup time.** No need to visit the careers page separately and transcribe categories.
- **Ensure assessment coverage matches hiring reality.** The categories come from the client's own career site, not operator guesswork.
- **Enable multi-category assessments.** Premium-tier assessments that cover multiple roles (Engineering, Product, Design, Data Science) become feasible without manual entry per category.
- **Improve client perception.** "We analyzed your actual hiring categories" signals thoroughness.

---

## Requirements

### R1: Extract job categories from a careers page URL

Given a client's careers page URL (already stored as a `ContentAsset` with `assetType: CAREERS_PAGE`), extract the available job category/department filters and return a structured list.

Output shape:
```typescript
interface ExtractedJobCategory {
  name: string;         // e.g., "Engineering", "Product", "Design"
  source: ATSPlatform | "HTML_SCRAPE" | "STRUCTURED_DATA";
  jobCount?: number;    // if the ATS exposes counts per category
}
```

### R2: Support major ATS platforms

Detect the ATS platform from the URL pattern and use platform-specific extraction where possible:

| Platform   | Detection Pattern                      | Extraction Method                                                                 |
|------------|----------------------------------------|-----------------------------------------------------------------------------------|
| Greenhouse | `boards.greenhouse.io/*`, `*.greenhouse.io` | JSON API at `boards-api.greenhouse.io/v1/boards/{board}/departments` or script tag JSON blob in page HTML |
| Lever      | `jobs.lever.co/*`                      | Department filters in page HTML (`div` with department groupings)                 |
| Workday    | `*.myworkdayjobs.com/*`               | JS-rendered faceted search; requires headless browser or Workday search API       |
| Ashby      | `jobs.ashbyhq.com/*`                  | API-driven; `jobs.ashbyhq.com/api/non-user-graphql` endpoint supports department listing |
| Custom     | Anything else                          | HTML scraping fallback: look for schema.org `JobPosting` structured data, `<select>` / filter elements with department-like labels |

Greenhouse and Lever should be Phase 2 priorities -- they have the cleanest extraction paths and cover a large share of tech companies. Workday is Phase 2+ due to JS rendering requirements.

### R3: Present extracted categories as selectable options

In the query generation form, when a client has a `CAREERS_PAGE` content asset, replace or augment the free-text `roleTitle` field with:
- A list of detected categories shown as selectable chips/checkboxes
- An "Other" option that falls back to free-text entry
- The ability to select multiple categories (for multi-category assessments)

### R4: Caching and freshness

- Extracted categories are cached on the client record (see schema section). Do not re-scrape on every form load.
- A manual "Refresh categories" action allows the operator to re-trigger extraction.
- Cache TTL: categories are considered stale after 30 days. Show a visual indicator but do not auto-refresh.

---

## Implementation Phases

### Phase 1: Manual-assist with generic extraction

When a `CAREERS_PAGE` content asset exists for a client, show a "Detect categories" button on the query generation form. Clicking it fetches the page server-side and attempts extraction using a generic HTML parser (look for structured data, common filter patterns). Results appear as selectable suggestions. Operator can pick from suggestions or fall back to free text.

**Scope:** ~3 days. Generic extractor + UI integration + caching.

**This is the minimum shippable unit.** Even a partially successful generic extractor provides value over pure manual entry.

### Phase 2: ATS-specific extractors

Add platform detection from URL patterns and route to specialized extractors. Priority order:

1. **Greenhouse** -- JSON API, highest success rate, no browser needed
2. **Lever** -- HTML parsing, straightforward DOM structure
3. **Ashby** -- GraphQL API, clean but smaller market share
4. **Workday** -- Requires headless browser (Playwright), defer unless demand justifies the dependency

Each extractor implements a common interface. The generic HTML extractor from Phase 1 remains as the fallback.

**Scope:** ~2 days per extractor (Greenhouse/Lever), ~4 days for Workday (headless browser infrastructure).

### Phase 3: Auto-detect on client creation

When a `CAREERS_PAGE` content asset is added (during client creation or later), automatically enqueue a background job that attempts category extraction. Results are cached on the client record. The query generation form loads them without operator action.

This integrates with the standard asset creation flow from the `required-client-assets` roadmap item. When the careers page URL is auto-derived during client creation, category extraction fires automatically after the client is saved.

**Scope:** ~1 day (job plumbing + trigger from content asset creation).

---

## Technical Design

### Where the logic lives

**Extraction logic: `packages/core/src/job-category-extraction.ts`**

Platform detection (URL pattern matching) and result normalization are pure functions with no IO. They belong in core.

```typescript
type ATSPlatform = "GREENHOUSE" | "LEVER" | "WORKDAY" | "ASHBY" | "UNKNOWN";

function detectATSPlatform(url: string): ATSPlatform;

function normalizeCategories(raw: string[]): ExtractedJobCategory[];
```

**Fetching and scraping: `apps/jobs`**

The actual HTTP requests and HTML parsing involve IO and belong in the jobs layer. Each ATS extractor is a function that takes a URL and returns `ExtractedJobCategory[]`.

```typescript
// apps/jobs/src/extractors/greenhouse.ts
async function extractGreenhouseCategories(url: string): Promise<ExtractedJobCategory[]>;

// apps/jobs/src/extractors/lever.ts
async function extractLeverCategories(url: string): Promise<ExtractedJobCategory[]>;

// apps/jobs/src/extractors/generic.ts
async function extractGenericCategories(html: string): Promise<ExtractedJobCategory[]>;
```

An orchestrator in `apps/jobs` calls `detectATSPlatform` (from core), routes to the appropriate extractor, and falls back to generic.

**Do NOT create a `packages/scraper` package.** Scraping is IO-bound job work, not reusable domain logic. It belongs in `apps/jobs`. If scraping capabilities grow significantly, revisit this decision then.

### Schema changes

Add a `jobCategories` JSON field to `Client`:

```prisma
model Client {
  // ... existing fields ...
  jobCategories     Json?      // ExtractedJobCategory[]
  jobCategoriesAt   DateTime?  // when categories were last extracted
}
```

This is a JSON field, not a related table. Rationale:
- Categories are cached derived data, not entities with their own lifecycle.
- They are read as a batch (to populate a form) and written as a batch (after extraction).
- A normalized table would add migration complexity and query joins for no behavioral benefit.
- If categories later need to become first-class entities (e.g., with per-category scan history), migrate then.

The `RoleProfile` model already exists and has `title` and `department` fields. When the operator selects extracted categories and generates queries, each selected category becomes a `RoleProfile` record. This connection is application logic, not schema.

### Rate limiting and safety

- **Request throttling.** Extraction makes outbound HTTP requests. Apply a per-domain rate limit (max 1 request per domain per 5 minutes) in the job worker.
- **Timeout.** Hard 10-second timeout on fetch. Career sites with slow JS rendering will fail gracefully in Phase 1/2; Workday support (Phase 2+) adds headless browser with a 30-second timeout.
- **Error handling.** Extraction failure is not blocking. If extraction fails, the form falls back to free text. Log the failure for platform coverage analysis.
- **Content size limit.** Cap HTML response parsing at 2MB. Career pages beyond this are likely malformed or JS-heavy.

### Dependencies

- **Phase 1-2:** `cheerio` for HTML parsing (already a common choice, zero-runtime dependency, no browser needed). Evaluate whether this is already in the dependency tree before adding.
- **Phase 2+ (Workday only):** `playwright` for headless browser rendering. This is a heavy dependency. Only add when Workday extraction is specifically prioritized. It requires its own browser binary management in CI/CD and production.
- **No LLM involvement.** Category extraction is deterministic HTML/API parsing. Do not route this through an LLM. The extraction targets are structured data (JSON APIs, DOM elements), not natural language.

### Validation schema

Add to `packages/core/src/schemas.ts`:

```typescript
export const ExtractJobCategoriesSchema = z.object({
  clientId: cuid,
  careersPageUrl: z.string().url(),
});

export const JobCategorySchema = z.object({
  name: z.string().min(1).max(255),
  source: z.enum(["GREENHOUSE", "LEVER", "WORKDAY", "ASHBY", "HTML_SCRAPE", "STRUCTURED_DATA"]),
  jobCount: z.number().int().min(0).optional(),
});
```

---

## Interaction with existing features

- **Query generation (`GenerateQueriesSchema`).** Currently accepts a single `roleTitle: string`. Multi-category support means either: (a) the form calls `generateQueryIntelligence` once per selected category and merges results, or (b) the schema expands to accept `roleTitles: string[]`. Option (a) is simpler and avoids changing the core generation pipeline. Start there.
- **RoleProfile model.** Selected categories should create `RoleProfile` records so they persist across assessments. The extraction populates the *suggestion list*; the operator's selection creates the profile.
- **`required-client-assets` roadmap item.** That spec auto-creates `CAREERS_PAGE` content assets during client creation. This feature consumes that asset. The two specs are complementary -- once both ship, the flow is: create client -> careers URL auto-derived -> categories auto-extracted -> operator selects categories -> queries generated.
- **Content asset crawling.** The `ContentAsset.lastCrawled` and `ContentAsset.content` fields exist but are not yet used for systematic crawling. Category extraction is a specific, targeted fetch -- it does not depend on or conflict with a general crawling system.

---

## Testing Strategy

- **Unit tests (core):** `detectATSPlatform` with URL fixtures for each platform and edge cases (subdomains, path variations, non-ATS URLs).
- **Unit tests (core):** `normalizeCategories` deduplication, trimming, empty-string filtering.
- **Integration tests (jobs):** Each ATS extractor against recorded HTML/JSON fixtures (not live requests). Record fixtures from real career pages and commit them as test data.
- **Integration test (jobs):** Orchestrator routes to the correct extractor based on URL and falls back to generic.
- **No live-site tests in CI.** External career sites change without notice. All tests use committed fixtures. Maintain a manual smoke-test script for validating against live sites during development.

---

## Future considerations

- **Category-to-RoleProfile auto-creation.** Phase 3+ could auto-create `RoleProfile` records from extracted categories, pre-populating the client with role profiles the operator can refine.
- **Category change detection.** Compare current extraction with cached categories to detect when a client adds or removes hiring categories. Could trigger proactive re-assessment suggestions.
- **Competitor category extraction.** Same extraction logic applied to competitor career sites. Enables "your competitor is hiring for Data Science and you are not" analysis.
- **ATS detection as metadata.** Storing the detected ATS platform on the `ContentAsset` or `Client` record could be useful for other features (e.g., tailoring scan recommendations based on ATS capabilities).
