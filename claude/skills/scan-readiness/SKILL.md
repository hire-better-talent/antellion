---
name: scan-readiness
description: Review whether a planned scan is operationally ready before model time or client-facing work is spent.
---

When invoked:
1. Start from the current repo flow: selected client -> selected clusters -> scan configuration -> create scan gate.
2. Inspect the planned scan inputs: client, competitors, personas, selected clusters, model choice, query depth, and workflow status.
3. Verify the query set has enough coverage and quality to justify running.
4. Check for obvious blockers: missing competitors, stale or duplicated clusters, inactive queries, weak prompt balance, mismatched personas, or configuration mismatch.
5. Score the scan using `docs/scan-review-rubric.md`.
6. Return one of three decisions: ready, ready with edits, not ready.
7. Format the output using `docs/scan-decision-template.md`.

This skill is a gate, not a brainstorming exercise. Prefer stopping a weak scan over pretending it is good enough.

Reference:
- Use `docs/scan-readiness-sop.md` as the repo-specific operating procedure.
