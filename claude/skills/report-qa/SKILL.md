---
name: report-qa
description: Run a client-delivery quality review on Antellion reports before they are treated as final.
---

When invoked:
1. Inspect the current report output, readiness warnings, evidence basis, and recommendations first.
2. Review for unsupported claims, weak prioritization, repeated points, and low-trust phrasing.
3. Distinguish commercial/report clarity issues from technical or data integrity issues.
4. Return must-fix items before should-fix items.
5. End with a delivery recommendation: publishable, publishable with edits, or hold.
