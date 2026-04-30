---
name: scan-readiness
description: Review whether a planned scan is operationally ready before model time or client-facing work is spent.
---

When invoked:
1. Inspect the planned scan inputs: client, competitors, personas, selected clusters, model choice, and workflow status.
2. Verify the query set has enough coverage and quality to justify running.
3. Check for obvious blockers: missing competitors, stale or duplicated clusters, inactive queries, weak prompt balance, or mismatched personas.
4. Return one of three decisions: ready, ready with edits, not ready.
5. List must-fix blockers before any optional improvements.

This skill is a gate, not a brainstorming exercise. Prefer stopping a weak scan over pretending it is good enough.
