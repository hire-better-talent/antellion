---
name: query-ops
description: Standardize how Antellion generates, reviews, and optimizes query sets before scans.
---

When invoked:
1. Start from the current repo flow: client detail -> query generation or supplemental generation -> query cluster review -> scan creation.
2. Inspect the client, competitors, job category, personas, existing query clusters, and any recent scan context first.
3. Classify the current query set by candidate intent, decision stage, and persona coverage.
4. Identify duplicate intent, weak phrasing, low-signal prompts, and missing comparison coverage.
5. Improve the set with the minimum edits needed to make it commercially useful and scan-ready.
6. Keep comparability across runs where possible; do not churn wording without a reason.
7. Produce four buckets in the output: approve, edit, add, retire.
8. End with a clear operator decision: approved, approved with edits, regenerate sections, or stop.

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

Reference:
- Use `docs/query-ops-sop.md` as the repo-specific operating procedure.
