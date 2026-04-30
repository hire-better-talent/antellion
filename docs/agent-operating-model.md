# Claude Agent Operating Model

This repo uses project-local Claude Code agents in [.claude/agents](/Users/jordanellison/Projects/talentsignal/.claude/agents) and workflow prompts in [claude/commands](/Users/jordanellison/Projects/talentsignal/claude/commands).

## Roles

- `coo`: orchestrates recurring business operations, converts manual work into workflows, and routes work to specialists.
- `architect`: owns system design, schema boundaries, and long-term maintainability.
- `query-ops`: owns query generation, review, pruning, and scan-input quality.
- `backend` and `frontend`: implement approved technical changes.
- `quality`: acts as the hardening and regression gate.
- `reportpm`: owns report usefulness and executive clarity.
- `growth`: owns positioning, demo realism, and GTM framing.

## Standard workflow shape

Every recurring process should be expressed in the same shape:

1. Trigger
2. Required inputs
3. Review checklist
4. Quality gate
5. Output artifact or decision
6. Escalation path

If a process cannot yet be described this way, it is not ready to be delegated cleanly.

## Initial workflows

The first standardized workflows in this repo are:

- query generation, review, and optimization
- scan-readiness review
- report QA before delivery
- demo-readiness refresh
- remediation content backlog generation

## Suggested usage

- Start with `coo` when the request is cross-functional or still ambiguous.
- Use `run-query-ops` when the founder wants a scan-ready query decision.
- Use `review-scan-readiness` before high-cost or client-facing scan runs.
- Use `qa-report-delivery` before publishing, exporting, or walking through a report live.
- Use `refresh-demo-ops` before demos or outbound sequences that rely on seeded data.
- Use `build-remediation-backlog` after a report is complete and the next step is execution planning.
