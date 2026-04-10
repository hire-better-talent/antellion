# Required Content Assets on Client Creation

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-30

---

## Problem

When an operator creates a new client, the next step is always the same: manually adding the same 6 content asset URLs (careers page, Glassdoor, LinkedIn, etc.) before scans can reference them. This is tedious, error-prone, and delays time-to-first-scan. Every client needs these assets, and the URLs are derivable from the client's domain and name.

## Proposed Behavior

### 1. Standard Asset Definitions

Define the 6 required assets as a constant in `packages/core`:

| Label       | assetType      | URL Template                                           |
|-------------|----------------|--------------------------------------------------------|
| Careers     | CAREERS_PAGE   | `https://{domain}/careers`                             |
| Glassdoor   | REVIEW_SITE    | `https://www.glassdoor.com/Overview/-{slug}`           |
| LinkedIn    | SOCIAL_PROFILE | `https://www.linkedin.com/company/{slug}`              |
| Levels.fyi  | REVIEW_SITE    | `https://www.levels.fyi/companies/{slug}`              |
| Built In    | REVIEW_SITE    | `https://builtin.com/company/{slug}`                   |
| Indeed      | REVIEW_SITE    | `https://www.indeed.com/cmp/{slug}`                    |

`{domain}` = the client's domain as entered (e.g. `stripe.com`).
`{slug}` = company name lowercased, whitespace replaced with hyphens, non-alphanumeric stripped (e.g. `Acme Corp` -> `acme-corp`).

The slug derivation function should live in `packages/core` and be unit tested independently.

### 2. Client Creation Form Changes

When the operator enters a company name and domain, the form derives and displays the 6 asset URLs in a new "Content Sources" section below the existing fields. Each row shows:

- A read-only label (e.g. "Glassdoor")
- An editable URL input, pre-filled from the template
- The asset type badge (informational, not editable here)

The URLs update live as the operator types the name/domain. The operator can correct any URL before submitting. All 6 are submitted with the form.

No new page or modal. This is an extension of the existing `ClientForm` component, gated behind the create flow (`isEdit === false`). The edit form does not show this section -- assets are edited on the client detail page after creation.

### 3. Server Action Changes

`createClient` wraps the client insert and the 6 content asset inserts in a single `prisma.$transaction`. If the client insert succeeds but asset creation fails, the whole operation rolls back.

The action validates the asset URLs using the existing `CreateContentAssetSchema`. The form submits the assets as an array of `{url, title, assetType}` tuples alongside the existing client fields.

### 4. Schema: No Changes Required

The existing `ContentAsset` model and `ContentAssetType` enum already support everything needed. The 6 standard assets are just regular `ContentAsset` rows.

**Do not add** a `required` boolean or a `StandardAsset` model. Rationale:

- The "required" concept is an onboarding workflow concern, not a data model concern. There is no downstream behavior that changes based on whether an asset is "required" vs. manually added. Reports, scans, and crawling treat all assets identically.
- If we later need to prevent deletion of standard assets or mark them visually, a simpler approach is a `source` enum (`STANDARD | MANUAL`) on ContentAsset. But do not add this until there is a concrete product need.

### 5. Validation Schema Changes

Add a new schema in `packages/core/src/schemas.ts`:

```typescript
export const CreateClientWithAssetsSchema = CreateClientSchema.extend({
  assets: z.array(
    z.object({
      url: z.string().url().max(2048),
      title: z.string().max(500),
      assetType: ContentAssetType,
    })
  ).min(1),
});
```

The existing `CreateClientSchema` remains unchanged for backward compatibility.

---

## Implementation Notes for Backend Engineer

### Core package (`packages/core`)

1. **Slug derivation function.** Create `packages/core/src/content-assets.ts` with:
   - `deriveCompanySlug(name: string): string` -- lowercase, collapse whitespace to hyphens, strip non-alphanumeric except hyphens.
   - `STANDARD_ASSET_TEMPLATES` -- the constant array of `{ label, assetType, urlTemplate }` from the table above.
   - `deriveStandardAssets(domain: string, name: string): Array<{ url: string; title: string; assetType: ContentAssetType }>` -- applies templates, returns ready-to-insert objects.
   - Unit test the slug derivation with edge cases: multi-word names, names with punctuation, names with consecutive spaces, single-word names.

2. **Validation schema.** Add `CreateClientWithAssetsSchema` to `schemas.ts` as described above.

### Server action (`apps/web`)

3. **Transaction in `createClient`.** Wrap in `prisma.$transaction`:
   - Create the client.
   - Bulk-create the 6 content assets with `prisma.contentAsset.createMany`, using the client ID from step 1.
   - The form sends assets as JSON in a hidden field or as indexed form fields (`assets[0].url`, `assets[0].title`, etc.). Indexed form fields are simpler with the existing `FormData` pattern.

4. **Parse asset fields from FormData.** Extract indexed fields. Consider a small helper: `parseIndexedFields(formData, 'assets', ['url', 'title', 'assetType'])`.

### Form (`apps/web`)

5. **Extend `ClientForm`** with a `StandardAssetsSection` sub-component, rendered only when `isEdit === false`. This component:
   - Imports `STANDARD_ASSET_TEMPLATES` and `deriveCompanySlug` from `@antellion/core`.
   - Uses controlled state to derive URLs from the current name/domain values.
   - Renders one `FormField` per asset with the pre-filled URL.
   - Submits via hidden or visible indexed form fields.

6. **Domain/name must drive URL derivation client-side.** This means the name and domain fields need `onChange` handlers that update local state. The existing form uses uncontrolled inputs with `defaultValue`. The create flow will need controlled inputs for name and domain (or use `useRef` to read current values). Keep the edit flow unchanged.

### Migration

No database migration required. This is purely application-level logic.

### Testing

- Unit test `deriveCompanySlug` and `deriveStandardAssets` in core.
- Integration test: creating a client via the action produces 6 content asset rows.
- Edge case: if the operator clears a URL, that asset should be skipped (not inserted with empty URL). Validate this server-side.

### Future Considerations

- **Crawl validation.** After creation, a background job could HEAD-request each URL and flag unreachable ones. Out of scope for this item.
- **Competitor standard assets.** The same pattern could apply to competitors. Keep the template system generic enough to accept any domain/name pair, not just clients.
- **`source` field.** If product later needs to distinguish auto-generated from manually-added assets (e.g. prevent deletion of standard ones), add `source: STANDARD | MANUAL` to ContentAsset at that time. Not now.
