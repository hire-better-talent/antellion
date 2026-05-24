---
name: month1-validation-sequencing-may2026
description: Month 1 (May 5-31, 2026) validation gate is 1 Diagnostic; only 5-6 workflows protect it and the rest are post-gate buildouts. Reply-router is the next punchline.
type: project
---

The Month 1 cold-launch validation gate was lowered from 3 → 1 Diagnostic on 2026-05-05 because Tue/Wed/Thu cadence + single warmed mailbox tops Month 1 sends at ~210-220.

**Why:** A 5-day-cadence-sized buildout list will burn founder weeks on automation that can't be tested without paid conversions, and won't help diagnose a Month 1 miss. Per docs/funnel-metrics-targets.md, Month 1 is now a "funnel-mechanics validation window," not a revenue window.

**How to apply:**
- The 5-6 workflows that protect the gate (ship by May 31): reply-router, Snapshot production checklist (query-ops → reportpm), Day 3 follow-up reminder, BAMFAM Google Form, list-hygiene skill, cold inbox daily health check.
- Defer until Diagnostic #1 in the wild: Snapshot/Walkthrough/EngagementEvent schema, Calendly, rollover-credit reminder automation, funnel dashboard, diagnostic-conductor, finance-ops, case-study-builder, competitive-intel, account-health, pipeline-forecaster.
- Next punchline (replaces the resolved May 1 compliance-sentry punchline): "The day reply-router ships is the day the founder stops being the inbox." Inbox bandwidth is the rate-limit on Month 1 reply conversion.
- Latent risk to fix before it bites: Prisma migration history is fragile per docs/codex-handoff-2026-05-06.md. The day a backend agent runs `prisma migrate dev` to add a `Snapshot` model (Month 2), the build breaks. Architect should repair this proactively, not reactively.
- Never propose CRM at current volume — `prospectEmail` as join key plus sheets is the architect-validated path.
