---
name: Lead source is Instantly native, not Apollo
description: Cold outreach leads sourced via Instantly's B2B Lead Finder (~160M contacts), not Apollo + import — changes how list-hygiene is operationalized
type: project
---

Cold outreach leads are sourced directly inside Instantly using its native B2B Lead Finder (~160M+ contacts, verified emails, source-side filtering). There is no Apollo step and no spreadsheet export-import seam where a script could filter stale or role-based addresses.

**Why:** Founder corrected this on 2026-04-29 after I (incorrectly) recommended an Apollo list-hygiene script as item #5 in the post-cold-launch buildout list. The actual operational surface is Instantly's UI, not an external CSV.

**How to apply:**
- List-hygiene recommendations must be expressed as Instantly-native mechanisms: Lead Finder query filters (saved search), per-campaign email verification toggle, and campaign-level domain blocklist.
- Do not propose external scripts (Python/Node) that depend on a CSV export from Apollo — that seam doesn't exist.
- Third-party verification (NeverBounce/ZeroBounce/Bouncer) is technically possible against a flat export but is manual and overkill at current send volume (~13/day).
- The "list-hygiene script" buildout is downgraded to a recurring 5-minute Friday checklist item folded into the inbox health monitor's weekly cadence. The 30-day buildout list is now 5 items, not 6.
- Bounce taxonomy worth remembering: M&A/domain-non-existent (e.g., Siemens-acquired company on 2026-05-05) is caught by Instantly's verification toggle; enterprise-policy rejection (e.g., `alm.com` 554 on 2026-05-06, likely Mimecast/Proofpoint) is only caught on the *second* attempt via blocklist append. Expect 1-2 of the latter per 100 sends as steady-state cost.
