# Roadmap: Continuous Monitoring with Alerts

**Status:** Proposed
**Author:** Architect
**Date:** 2026-04-04
**Priority:** High (the bridge from one-time assessments to recurring SaaS revenue)
**Source:** Competitive intelligence from Opinly.ai

---

## Problem

TalentSignal assessments are point-in-time deliverables. A VP TA pays $10K-$15K, receives a report, and has no reason to come back until months later when they wonder "has anything changed?" There is no mechanism to detect when AI visibility shifts, when a competitor enters or exits query clusters, or when remediation efforts take effect.

AI models update frequently. A company that appeared in 6/8 discovery queries last month may appear in 2/8 this month due to model retraining, competitor content changes, or platform algorithm shifts. Without continuous monitoring, the client has no early warning system and no way to measure remediation ROI.

This is also the critical business model gap: one-time assessments are consulting revenue. Recurring monitoring is SaaS revenue. The monitoring product is what justifies platform pricing and creates long-term customer retention.

---

## Current State

### What exists

- **`ScanRun` model** supports repeated scans against the same client with `focusArea`, `queryScope`, and full result capture. Nothing prevents scheduling recurring scans.
- **`AssessmentBaseline` model** stores snapshot metrics (earned visibility rate, per-stage mention rates, competitor gap, citation metrics) per report. This is the comparison anchor.
- **`baseline-comparison.ts`** in `packages/core` already computes `MetricChange` diffs between two `BaselineSnapshot` objects, with `ChangeDirection` (improved/declined/unchanged/new) and `Significance` (meaningful/marginal/unchanged). The narrative generation is deterministic and template-driven.
- **Snapshot scan mode** (`snapshot-queries.ts`, `snapshot-composer.ts`) runs a reduced 20-query scan for ~$3, designed for quick reads. This is the natural query budget for monitoring runs.
- **`ScanRun.metadata`** (JSON column) can store arbitrary context, including a reference to the previous run for diff computation.

### What is missing

1. No scheduling mechanism -- scans are manually triggered by an operator.
2. No automated diff between consecutive scan runs for the same client/focusArea.
3. No notification delivery (Slack, email, or in-app).
4. No monitoring configuration per client (frequency, query set, alert thresholds).
5. No dashboard view showing trend over time.

---

## Design

### 1. Monitoring configuration

New concept: a **MonitoringSchedule** stored per client. This is a lightweight configuration that tells the system what to scan and how often.

```typescript
// Stored in Client.metadata (JSON) or as a new model -- see Schema section
interface MonitoringSchedule {
  enabled: boolean;
  frequency: "weekly" | "biweekly" | "monthly";
  queryBudget: number;            // default 50, max 100
  focusAreas: string[];           // which segments to monitor (empty = all)
  alertThresholds: {
    visibilityDropPp: number;     // alert if earned visibility drops by this many pp (default 5)
    newCompetitorAppearances: number; // alert if N+ new competitors appear (default 1)
    stageDropPp: number;          // alert if any stage drops by this many pp (default 10)
  };
  notificationChannels: {
    email?: string[];             // recipient addresses
    slack?: {
      webhookUrl: string;
      channel?: string;
    };
    inApp: boolean;               // always true, shown in dashboard
  };
  lastRunAt?: string;             // ISO date of most recent monitoring run
  nextRunAt?: string;             // ISO date of next scheduled run
}
```

### 2. Monitoring query set

Monitoring runs use a curated subset of the full assessment query set, not a fresh generation. The query selection strategy:

1. **Start with the most recent full assessment's queries.** These are the queries whose baseline results we have.
2. **Select the highest-priority queries up to `queryBudget`.** Priority scoring already exists in `scoreQuery()`. Take the top N.
3. **Ensure stage balance.** At minimum 30% Discovery, 20% Evaluation. Monitoring Discovery absence is the highest-signal change detector.
4. **Store the selected query IDs on the monitoring ScanRun** so the diff logic knows exactly which queries to compare.

This approach avoids regenerating queries (which would produce different text and break comparability) and leverages the existing priority scoring.

### 3. Diff computation

New function in `packages/core`, likely `src/monitoring/compute-monitoring-diff.ts`:

```typescript
interface MonitoringDiffInput {
  previousResults: ScanResultData[];   // from last monitoring run (or baseline assessment)
  currentResults: ScanResultData[];    // from this monitoring run
  clientName: string;
  competitors: string[];
}

interface MonitoringDiff {
  // Overall changes
  earnedVisibilityChange: {
    previous: number;
    current: number;
    changePp: number;
    direction: ChangeDirection;
    significance: Significance;
  };

  // Per-stage changes
  stageChanges: Array<{
    stage: string;
    previous: number;
    current: number;
    changePp: number;
    direction: ChangeDirection;
  }>;

  // Competitor changes
  newCompetitorAppearances: Array<{
    competitor: string;
    appearedInClusters: string[];
  }>;
  competitorDisappearances: Array<{
    competitor: string;
    disappearedFromClusters: string[];
  }>;

  // Query-level flips (most actionable for alerts)
  mentionFlips: Array<{
    queryText: string;
    stage: string;
    previousMentioned: boolean;
    currentMentioned: boolean;
  }>;

  // Alert determination
  alerts: MonitoringAlert[];
}

interface MonitoringAlert {
  type: "visibility_drop" | "visibility_gain" | "new_competitor" | "stage_drop" | "mention_flip";
  severity: "high" | "medium" | "low";
  headline: string;    // e.g., "Your AI visibility score dropped 12 points this week"
  detail: string;      // supporting context
}
```

This builds directly on the patterns in `baseline-comparison.ts` but operates at the ScanResult level rather than the AssessmentBaseline level, giving finer-grained (per-query) change detection.

### 4. Notification delivery

**Phase 1: In-app notifications only.** Store alerts in a new `MonitoringAlert` table (or in `ScanRun.metadata`). Display on the dashboard in the "needs attention" panel.

**Phase 2: Slack webhook.** POST a formatted message to the configured webhook URL. Message format:

```
[Antellion] Acme Corp -- AI Visibility Alert
Your AI visibility score dropped 12 points this week (38% -> 26%).
- Discovery visibility fell from 42% to 28% (-14pp)
- A new competitor (NovaBridge) appeared in 3 query clusters
View details: https://app.antellion.com/clients/[id]/monitoring
```

**Phase 3: Email digest.** Weekly/monthly summary email with the same alert content plus a trend chart (rendered server-side as a simple HTML table, not a chart library).

### 5. Scheduling mechanism

Two options, evaluated in order of complexity:

**Option A (recommended for MVP): Cron-triggered job in `apps/jobs`.**
- A single cron job runs daily (e.g., 6 AM UTC).
- It queries all clients with `monitoringSchedule.enabled = true` and `nextRunAt <= now()`.
- For each eligible client, it creates a monitoring ScanRun with the curated query set.
- After the scan completes (via existing scan pipeline), the diff function runs and generates alerts.
- Updates `lastRunAt` and computes `nextRunAt` based on frequency.

**Option B (future): Event-driven scheduling via a task queue.**
- Each monitoring configuration enqueues its own recurring job.
- More scalable but adds infrastructure complexity (Redis/BullMQ or similar).
- Only needed at 100+ monitored clients.

Option A is sufficient for the first 50 clients and requires zero new infrastructure. The daily cron checks are cheap (one DB query).

### 6. Dashboard integration

New page: `/clients/[id]/monitoring` (or a tab on the client detail page).

Shows:
- Current monitoring status (enabled/disabled, frequency, last run, next run)
- Trend chart: earned visibility rate over time (one point per monitoring run)
- Alert history: chronological list of alerts with severity badges
- Latest diff summary: what changed in the most recent run
- Configuration panel: frequency, query budget, alert thresholds, notification channels

---

## Schema Implications

**Option A: Lean -- use existing models + JSON metadata.**

- Store `MonitoringSchedule` in `Client.metadata` (JSON column already exists).
- Store per-run diff results in `ScanRun.metadata` with a `monitoringDiff` key.
- Store alerts in `ScanRun.metadata` with an `alerts` key.
- Add a `scanMode` field to `ScanRun` enum: `FULL | SNAPSHOT | MONITORING`. This distinguishes monitoring runs from manual scans in queries and UI.

**Option B: First-class models (deferred until monitoring is validated).**

- `MonitoringConfig` model (FK to Client, stores schedule and thresholds).
- `MonitoringRun` model (FK to MonitoringConfig and ScanRun, stores diff + alerts).
- `MonitoringAlert` model (FK to MonitoringRun, stores individual alerts with delivery status).

Start with Option A. Promote to Option B when monitoring has paying customers and the JSON metadata becomes unwieldy.

**Definite schema change needed:** Add `scanMode` to `ScanRun` as `String? @default("FULL")`. This is a backward-compatible addition with no migration risk.

---

## Dependencies

- `AssessmentBaseline` and `baseline-comparison.ts` -- the diff logic extends this pattern
- `snapshot-queries.ts` -- monitoring query selection borrows the reduced-set approach
- `ScanRun` pipeline -- monitoring runs go through the same scan execution flow
- `apps/jobs` -- the cron scheduling lives here

---

## Implementation Phases

### Phase 1: Manual monitoring runs with diff (2-3 days)

1. Add `scanMode` field to `ScanRun`.
2. Build `computeMonitoringDiff()` in `packages/core/src/monitoring/`.
3. Build a "Run monitoring scan" action on the client detail page that creates a monitoring ScanRun with curated queries from the most recent assessment.
4. After scan completion, compute the diff against the previous run and store in `ScanRun.metadata`.
5. Display diff results on the client page.

**Value:** Operator can manually trigger monitoring runs and see what changed. Validates the diff logic before adding automation.

### Phase 2: Automated scheduling (2 days)

1. Add `MonitoringSchedule` to `Client.metadata`.
2. Build monitoring configuration UI on client detail page.
3. Add daily cron job in `apps/jobs` that finds eligible clients and triggers monitoring runs.
4. Auto-compute diffs on completion.

### Phase 3: Notifications (2-3 days)

1. Build alert generation from diff output (threshold comparison).
2. In-app alert display in dashboard "needs attention" panel.
3. Slack webhook delivery.
4. Email delivery (later iteration).

### Phase 4: Monitoring dashboard (2-3 days)

1. Build `/clients/[id]/monitoring` page with trend visualization.
2. Alert history timeline.
3. Configuration management UI.

---

## Estimated Total Effort

8-11 days of development across all phases. Phase 1 alone delivers value and can ship independently.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|------|-----------|
| Query comparability across runs: if the query set changes, diffs are meaningless | Lock the monitoring query set to the assessment's queries. Only re-derive when a new full assessment is run. |
| Cost accumulation: 50 queries/week x 20 clients = 1000 queries/week | Monitoring queries can use cheaper models (GPT-4o-mini vs GPT-4o). At $0.03/query, 1000 queries = $30/week. |
| Noise: small fluctuations trigger alerts | Significance thresholds in `alertThresholds` config. Default 5pp for overall visibility, 10pp for stage-level. Only `meaningful` changes generate alerts. |
| AI model changes cause universal visibility shifts | Compare against the delta, not the absolute. If all clients drop equally, surface that as a model-change note, not a client-specific alert. Phase 2+ enhancement. |
| Cron reliability in `apps/jobs` | The daily cron is idempotent: if it runs twice, the second run sees `nextRunAt` is already in the future and skips. |

---

## Strategic Value

This feature transforms TalentSignal from a consulting deliverable into a monitoring platform. The business model shift:

- **Without monitoring:** $10K-$15K per assessment, 1-2x per year per client. Revenue is lumpy, relationship requires re-sell.
- **With monitoring:** $2K-$5K/month subscription that includes continuous scanning + alerts. Assessment becomes the onboarding, monitoring becomes the retention.

The technical investment is modest because the hardest pieces already exist: scan execution, baseline comparison, diff computation, snapshot query sets. This feature is primarily orchestration and notification -- not new analytical capability.
