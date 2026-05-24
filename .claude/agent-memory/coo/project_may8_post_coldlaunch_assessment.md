---
name: May 8 post-cold-launch assessment — reply-router is the new bottleneck
description: After May 5 cold-launch (13 sends, 2 bounces, 0 replies), reply-router MVP is the single buildout that protects the Month 1 1-Diagnostic gate; everything past list-hygiene + inbox-health + Snapshot QA + Day-3 reminder + Calendly is gated on Diagnostic #1
type: project
---

Cold-launch fired 2026-05-05. 13 sends Tue/Wed, 2 bounces (stale Apollo data, alm.com security policy). 0 replies — too early. Compliance-sentry shipped May 3 (commit c7db01c) — the prior punchline is resolved.

**The new punchline: reply latency, not compliance.** Founder is solo at Symphony Talent during business hours; replies will land while he can't triage live. `reply-router` MVP (read-only classification + draft suggestion, no autosend) is the highest-leverage buildout because every >24-hr reply delay compresses the Month 1 gate.

**Why:** Month 1 gate = 1 Diagnostic by May 31 (revised down from 3). Single mailbox at 22-28/day. With n=0 replies, anything past triage hygiene is theoretical leverage on theoretical revenue.

**How to apply:**

Build in next 30 days (protects Month 1 gate):
1. `reply-router` MVP — read-only classify + draft, no autosend
2. `pre-send-snapshot` skill — compose existing scan-readiness + report-qa skills, no new agent
3. Day-3 reminder script — daily diff of Instantly export vs replies
4. Inbox-health daily digest — bounce >3% alert
5. Apollo list-hygiene filter — 30-line script catches stale/role-based emails
6. Calendly + BAMFAM form — collapse 3-5 scheduling emails to one round-trip

Do NOT build until Diagnostic #1 closes:
- finance-ops agent (use Google Sheet + cron reminder instead)
- diagnostic-conductor (write SOP in markdown after first run)
- case-study-builder (n=0 case studies possible)
- EngagementEvent / Snapshot / Walkthrough schemas (no data to model)
- competitive-intel agent (it's a Snapshot feature, not a workflow)
- pipeline-forecaster (n=0 conversions = fiction)
- CRM (flat file/Notion correct until ~10 replies/wk)
- Automated reply sending (hard rule: 10+ manual triages first)

Productize-vs-bespoke buckets:
- Productize now: Snapshot pipeline, Diagnostic intake, response templates, cold-send cadence
- Productize after Diagnostic #N: stage tracker (#1), case-study (#2), competitive-intel/account-health (#3)
- Keep bespoke: founder's exec narrative, CHRO framing per client, final report sign-off, pricing negotiation

If Month 1 misses, diagnosis is upstream of agents (positioning/list/offer) — escalate to `growth`, do not build more agents.

Opportunities founder is probably missing:
- Apollo list-hygiene script (caused first bounce)
- LinkedIn↔blog cross-post skill (Apr 28 LI post, blog ISR shipped, no bridge)
- Symphony calendar conflict detection for Diagnostic call windows
- Response-template version lock as of May 5 (so reply-router has stable corpus)
- BAMFAM Calendly form
