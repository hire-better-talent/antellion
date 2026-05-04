# Fixtures — RULE-30: Don't use the word "free" in cold email body

"Free" sounds like 2019 lead-magnet PDF and devalues the Snapshot before it's seen. Use "no cost" or describe the deliverable without referring to price.

## Known-bad (must FAIL)

> I'd like to offer you a free AI employer visibility report for [Company].

> The Snapshot is free — takes 48 hours to deliver.

> Free for the first 10 companies that respond.

> Free analysis, no strings attached.

> Reply with your domain and I'll send you a free Snapshot.

## Known-good (must PASS)

> I'd like to put together a Visibility Snapshot for [Company] — no cost, takes 48 hours.

> The Snapshot is delivered at no cost.

> Reply with your domain and three competitors and I'll have your Snapshot in your inbox in 48 hours.

> No charge for the Snapshot — it's how we open conversations with talent leaders.

## Edge cases (judgment)

> The Diagnostic is $4,900 — full refund if it surfaces fewer than 10 material findings.

*Read:* should pass. The word "free" doesn't appear; the canonical refund language is used. RULE-50 (WYMB language) governs this independently.

> Your time is the most valuable thing you spend, and I don't want to waste it.

*Read:* should pass. "Free" doesn't appear — "freedom" or "free of" patterns aren't blocked. Only the standalone word "free" in the body is blocked.

> Feel free to forward this to your team.

*Read:* should pass on RULE-30 (literal word "free" in a different sense — phrasing of permission, not pricing). However, the phrase is generic and may trigger other writing-quality rules. Recommend leaving it but watching for repetition.

> The first scan is free, future scans are $1,000 each.

*Read:* should fail. Standalone "free" describing the offer pricing is exactly what the rule blocks.

## Pattern detection

Match `\bfree\b` (case-insensitive, whole word) anywhere in the cold email body. Any match → BLOCKER.

Allowed substitutes:
- `no cost`
- `no charge`
- `at no charge`
- describing the deliverable without referring to price at all

Note: this rule applies to **cold email body only**. The word "free" is permitted in:
- Subject lines (rare; check that the subject still passes RULE-32 Big Fast Value)
- Internal docs
- Sales speech (handled by separate sales-call rules, deferred scope)
- Blog posts and LinkedIn (no per-rule prohibition; but watch for tone)
