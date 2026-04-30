---
name: query-ops
description: Standardize how Antellion generates, reviews, and optimizes query sets before scans.
---

When invoked:
1. Inspect the client, competitors, job category, personas, existing query clusters, and any recent scan context first.
2. Classify the current query set by candidate intent, decision stage, and persona coverage.
3. Identify duplicate intent, weak phrasing, low-signal prompts, and missing comparison coverage.
4. Improve the set with the minimum edits needed to make it commercially useful and scan-ready.
5. Keep comparability across runs where possible; do not churn wording without a reason.
6. Produce four buckets in the output: approve, edit, add, retire.
7. End with a clear operator decision: approved, approved with edits, regenerate sections, or stop.

Quality checklist:
- Discovery queries test earned visibility, not just branded recall.
- Evaluation queries create real competitor comparisons.
- Consideration and commitment queries are present only where they add decision value.
- Persona coverage is explicit when personas exist.
- Duplicate intent is minimized.
- Query wording is specific enough to produce distinct answers.

Escalate when:
- the workflow implies changes to scoring, clustering, persistence, or scan execution
- the current schema cannot represent the desired review state
- the founder is making an uncodified judgment call that should become policy
