---
name: Diagnostic UX Gap Closures (Apr 2026)
description: 5 operator UX gaps closed in Diagnostic dashboard before Apr 29 launch
type: project
---

5 gaps closed in the Diagnostic operator dashboard on 2026-04-23.

**Why:** Jordan needs to run a real Diagnostic end-to-end before Apr 29 launch without shell/server action access.

**How to apply:** These patterns establish the Diagnostic page conventions — use them for any future Diagnostic UI additions.

Gap 1 — Sidebar nav: Added "Diagnostics" entry to `navigation.ts` (between Clients and Queries) with a new `DiagnosticsIcon` (clipboard-list SVG) in `icons.tsx`. `iconMap` extended with `diagnostics` key.

Gap 2 — Extract findings button: `extract-findings-button.tsx` client component calls `materializeCandidateFindings` and redirects to findings review on success. Shown on engagement detail when `latestScan.status === "COMPLETED" && findings.length === 0`.

Gap 3 — Query cluster picker: `trigger-scan-panel.tsx` client component fetches clusters from new API route `/api/clients/[clientId]/query-clusters`, groups by DecisionStage, multi-select checkboxes, calls `triggerEngagementScan`. Shown on detail page when status is SCOPING or REVIEW and no scan is running. Decision: clusters held until scan-trigger (not persisted to Engagement) — no schema change needed.

Gap 4 — Publish-block alert: No Slack/email infra exists. Expanded TODO in `publishEngagement` action with Options A (Slack webhook via `OPERATOR_SLACK_WEBHOOK_URL`) and B (Resend). Added `console.warn("[diagnostic:publish-blocked]", ...)` with structured JSON so the signal is visible in Vercel logs. Jordan needs to add Slack webhook if real alerting is wanted before launch.

Gap 5 — Publish page refactor: `publish/page.tsx` is now a server shell that awaits params and passes `engagementId` as prop. `publish/publish-form.tsx` is the client component with `useActionState`. Eliminates `window.location.pathname` hack.
