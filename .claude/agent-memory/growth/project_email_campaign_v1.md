---
name: Email Campaign V1 targeting Chief Talent Officers
description: First cold email campaign (2026-04-09) targeting CTOs at 2K-10K companies via Apollo, 3-email sequence, driving to antellion.com for snapshot requests
type: project
---

Campaign V1 created 2026-04-09. Three-email sequence targeting Chief Talent Officers at 2,001-10,000 employee companies. Channel is cold email from jordan@antellion.com via Apollo. All emails drive to antellion.com for self-serve snapshot requests.

Key design decisions:
- Email 1 uses competitive gap angle ("your top talent competitor appeared in noticeably more AI responses")
- Email 2 uses investment gap angle ("your employer brand work may not be reaching AI")
- Email 3 is a breakup email (36 words)
- Subject lines are all lowercase, under 6 words, A/B tested with 4 variants
- No competitor names in emails (guessing wrong destroys credibility -- let the Snapshot reveal this)
- Industry-batch personalization method: one industry per day, 3-5 real AI queries per batch, same industry_keyword merge field for the batch
- Domain warmup required: 14 days minimum before first cold send
- Volume ramp: 5-8/day weeks 1-2, 10-15/day weeks 3-4, 15-20/day steady state

**Why:** This is the first real outbound push. Learning matters as much as leads. Jordan's manual Snapshot capacity is 5-10/week, so volume is calibrated to match fulfillment capacity.

**How to apply:** Use `/docs/email-campaign-v1.md` as the source of truth for all Apollo sequence setup. Track results weekly against the metrics table in Section 8. Campaign V2 should be informed by which subject lines, angles, and industries performed best.
