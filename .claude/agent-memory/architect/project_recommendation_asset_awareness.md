---
name: Recommendation engines check existing content assets
description: Both recommendation engines (legacy and stage-aware) now accept existingAssetUrls and suppress "get listed on X" when the client already has a presence on that platform
type: project
---

As of 2026-03-31, both recommendation engines check the client's existing ContentAsset URLs before generating platform-specific recommendations.

**Why:** The first real audit (HGV) recommended "get listed on LinkedIn" for a company that already has a LinkedIn profile. This undermines report credibility in client-facing meetings.

**How to apply:** When adding new platform-specific recommendations to either engine, always check `clientHasPlatformPresence()` before recommending profile creation. If the client has a presence, recommend strengthening instead of creating. The `existingAssetUrls` field is optional in both `ReportInput` and `RecommendationInput.client` to preserve backward compatibility with tests and legacy code paths.
