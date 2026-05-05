# Funnel Metrics & Conversion Targets

**Status:** Durable spec. Authored 2026-04-29 (T-6 to May 5 cold launch).
**Purpose:** Memorialize the full funnel-stage conversion target framework so a future dashboard build has authoritative numerator/denominator definitions, data sources, and instrumentation gaps in one place.
**Maintenance:** This doc is **manually updated** by the founder when targets evolve. It is not auto-mutated by any system.

**Related:**
- [`docs/money-model-launch-checklist.md`](./money-model-launch-checklist.md) — money model commercials (Diagnostic, Baseline, Phase 2, Continuous, rollover credit)
- [`docs/email-campaign-v1.md`](./email-campaign-v1.md) — Appendix B Hormozi framework, subject-line construction
- [`docs/rollover-credit-ledger.md`](./rollover-credit-ledger.md) — manual rollover credit tracking
- [`docs/sales-motion-playbook.md`](./sales-motion-playbook.md) — BAMFAM closes, rollover commitment mechanic
- [`docs/snapshot-outreach-guide.md`](./snapshot-outreach-guide.md) — Snapshot delivery flow

---

## 1. Targets

### Stage 1 — Cold email → Snapshot request

| Metric | Floor | Target | Stretch |
|---|---|---|---|
| Reply rate (any reply) | 1% | 3% | 5% |
| Positive reply rate | 0.5% | 1.5% | 3% |
| Snapshot request rate (off positive replies) | 50% | 75% | 90% |
| Net Snapshot requests / sends | 0.25% | 1.0% | 2.5% |

### Stage 2 — Snapshot delivered → walkthrough booked

| Metric | Floor | Target | Stretch |
|---|---|---|---|
| Walkthrough booking rate | 30% | 50% | 70% |
| Day 3 email reply rate (when no walkthrough booked) | 10% | 25% | 40% |
| Combined Snapshot → walkthrough conversion | 35% | 60% | 80% |

### Stage 3 — Walkthrough → Diagnostic SOW signed

| Metric | Floor | Target | Stretch |
|---|---|---|---|
| Diagnostic SOW signed | 30% | 50% | 65% |
| BAMFAM compliance | 70% | 90% | 95% |

### Stage 4 — Diagnostic delivered → Baseline signed

| Metric | Floor | Target | Stretch |
|---|---|---|---|
| Baseline conversion (within 60-day rollover window) | 40% | 60% | 75% |
| Conversion within 30 days of Diagnostic delivery | 25% | 45% | 60% |

### Stage 5 — Baseline delivered → Phase 2 signed

| Metric | Floor | Target | Stretch |
|---|---|---|---|
| Phase 2 conversion (within 60-day rollover) | 25% | 40% | 55% |
| Time-to-close from Baseline delivery (days) | 90 | 60 | 30 |

### Stage 6 — Phase 2 close → Continuous attach (deferred to June 1+)

| Metric | Floor | Target | Stretch |
|---|---|---|---|
| Continuous attach at Phase 2 signature page | 30% | 55% | 70% |

### Deliverability metrics (cold sending)

| Metric | Threshold |
|---|---|
| Bounce rate | <2% |
| Open rate | >35% sustained |
| Positive reply rate | >1.5% |
| Spam complaint rate | <0.1% |

### Three numbers on a wall — weekly leading indicators

1. Positive reply rate this week (target 1.5%, floor 0.5%)
2. Walkthroughs booked this week (count)
3. BAMFAM compliance this week (target >90%)

### Cold send cadence (locked May 5, 2026)

Cold sends run **Tuesday / Wednesday / Thursday only** — 3 send days/week, not 5. This is the deliverability sweet spot per `docs/email-campaign-v1.md` § Send Times: Mondays compete with weekend backlog, Fridays compete with mental checkout, weekends signal automation. Tue/Wed/Thu maximize per-email engagement at the cost of total monthly volume.

The trade-off: at safe ramp velocity from a single warmed mailbox (Warmbox capacity ~22-28/day), Month 1 cold-email volume tops out at **~210-220 sends** — meaningfully below the ~340 a 5-day cadence would deliver.

This shapes the Month 1 validation gate (next section) and means LinkedIn + warm-channel contribution to Snapshot requests is structurally more important to the gate than cold email alone.

### Phased validation gates

The original "3 closed Diagnostics in Month 1" gate assumed a 5-day send cadence. With Tue/Wed/Thu only and a single warmed mailbox, Month 1 cold-email volume cannot mathematically support that gate at target conversion rates. Revised gates:

| Window | Gate | What it validates |
|---|---|---|
| **Month 1 (May 5-31)** | **1 Diagnostic delivered** | Funnel mechanics work end-to-end. Day 3 email converts. BAMFAM cadence holds. WYMB guarantee invoked-or-not correctly. Most failures are single-step bugs, not systemic. |
| **Month 2 (June 1-30)** | **2-3 Diagnostics delivered** | Compounded LinkedIn engagement starts contributing Snapshot requests. Second mailbox (alternate domain) potentially active. Conversion benchmarks stabilize across more N. |
| **Month 3 (July 1-31)** | **4-6 Diagnostics delivered** | Steady-state from blended channels (cold + LinkedIn + blog SEO + warm). First Baseline conversion expected via 60-day rollover from a Month 1 Diagnostic. |

Below floor in any window = funnel structural issue → audit per-stage conversion to find which lever broke. Above floor = scale spend on whichever Stage 1 input has the most headroom.

### What changed and why (May 5, 2026)

The Month 1 gate was lowered from 3 → 1 Diagnostic when send cadence locked at Tue/Wed/Thu. The math: at target conversion (1% Snapshot request rate × 60% walkthrough × 50% Diagnostic), 3 Diagnostics requires ~1,000 cold sends in the window. Tue/Wed/Thu cadence delivers ~220 sends. The gate had to follow the cadence, not the other way around.

Month 1 is now a **funnel-mechanics validation window**, not a revenue window. Validate the system; revenue scales with channel maturation in Months 2-3.

---

## 2. Per-metric definitions

Each metric is `numerator / denominator` over a time window with a stated attribution rule. Use UTC for all windows. Cohort by `send_week` for sending metrics; by `delivery_week` (Snapshot delivered) for downstream metrics.

### Stage 1

| Metric | Numerator | Denominator | Window | Attribution |
|---|---|---|---|---|
| Reply rate | Distinct prospects with `reply_count >= 1` | Distinct prospects sent any email | Per send-week cohort, measured 14 days after first send | One reply per prospect, regardless of which sequence step |
| Positive reply rate | Distinct prospects with at least one **classified-positive** reply | Distinct prospects sent any email | Per send-week cohort, 14 days post first send | Positive = manually labeled "interested / asked for Snapshot / curious / asked a clarifying question." Excludes "not me," OOO, autoresponders, hard nos |
| Snapshot request rate (off positive replies) | Distinct prospects who submitted a Snapshot request form within 7 days of positive reply | Distinct prospects with a positive reply in window | Per positive-reply-week cohort, 7-day attribution | A "Snapshot request" = qualifier form submission, not just a verbal ask |
| Net Snapshot requests / sends | Distinct prospects who submitted Snapshot request form | Distinct prospects sent any email | Per send-week cohort, 21 days post first send | End-to-end conversion. Single number for top-of-funnel health |

### Stage 2

| Metric | Numerator | Denominator | Window | Attribution |
|---|---|---|---|---|
| Walkthrough booking rate | Snapshot recipients who booked a walkthrough within 14 days of delivery | Snapshots delivered in window | Per Snapshot-delivery-week cohort, 14-day attribution | "Booked" = calendar event accepted, not just expressed interest |
| Day 3 email reply rate | Replies to the day-3 follow-up email | Day-3 follow-ups sent (i.e., Snapshot recipients who had not booked by day 3) | Per Snapshot-delivery cohort, measured 7 days post day-3 send | Any reply counts (positive or negative) — purpose is engagement signal, not intent |
| Combined Snapshot → walkthrough conversion | Snapshot recipients who booked a walkthrough within 21 days | Snapshots delivered in window | Per Snapshot-delivery-week cohort, 21-day attribution | Captures both same-week and day-3-recovered bookings |

### Stage 3

| Metric | Numerator | Denominator | Window | Attribution |
|---|---|---|---|---|
| Diagnostic SOW signed | Walkthroughs that produced a signed Diagnostic SOW within 21 days | Walkthroughs held in window | Per walkthrough-week cohort, 21-day attribution | "Signed" = countersigned PDF stored, regardless of payment status |
| BAMFAM compliance | Walkthroughs where a next meeting was booked **before the call ended** | Walkthroughs held in window | Per walkthrough-week cohort | Manually logged by founder immediately post-call. Excludes calls where buyer explicitly asked for breathing room (per playbook §"buyer signals discomfort with pace") |

### Stage 4

| Metric | Numerator | Denominator | Window | Attribution |
|---|---|---|---|---|
| Baseline conversion (60-day rollover window) | Diagnostic engagements where a Baseline SOW was signed within 60 days of Diagnostic delivery | Diagnostics delivered in window | Per Diagnostic-delivery-week cohort, 60-day attribution | "Diagnostic delivered" = report shared with client, not SOW signature. The 60-day clock matches the rollover credit expiration |
| Conversion within 30 days of Diagnostic delivery | Diagnostic engagements where a Baseline SOW was signed within 30 days of Diagnostic delivery | Diagnostics delivered in window | Per Diagnostic-delivery-week cohort, 30-day attribution | Tighter window measures momentum vs. eventual close |

### Stage 5

| Metric | Numerator | Denominator | Window | Attribution |
|---|---|---|---|---|
| Phase 2 conversion (60-day rollover) | Baseline engagements where a Phase 2 SOW was signed within 60 days of Baseline delivery | Baselines delivered in window | Per Baseline-delivery-week cohort, 60-day attribution | Same 60-day rollover construction as Stage 4 |
| Time-to-close from Baseline delivery | Median days between Baseline delivery and Phase 2 SOW signature | Closed Phase 2 deals in window | Per Baseline-delivery-quarter cohort | Median, not mean — small N is volatile |

### Stage 6 (deferred until 2026-06-01+)

| Metric | Numerator | Denominator | Window | Attribution |
|---|---|---|---|---|
| Continuous attach at Phase 2 signature page | Phase 2 SOWs signed with the Continuous add-on enabled | Phase 2 SOWs signed in window | Per Phase-2-signature-month cohort | At-signature attach only. Later upgrades count as a separate metric |

### Deliverability

| Metric | Numerator | Denominator | Window |
|---|---|---|---|
| Bounce rate | Hard bounces | Sends | Per send-week cohort, no attribution lag |
| Open rate | Distinct opens (acknowledged unreliable post-Apple Mail Privacy — directional only) | Distinct sends | Per send-week, 7 days |
| Positive reply rate | (see Stage 1) | (see Stage 1) | (see Stage 1) |
| Spam complaint rate | Spam complaints reported by ESPs | Sends | Per send-week, no attribution lag |

---

## 3. Data source mapping

Honest read on where the source-of-truth lives **today** for each metric. "Manual" means there is no system event — it lives in a Gmail thread, a spreadsheet, or the founder's head.

| Metric | Source today | Confidence |
|---|---|---|
| Sends, opens, bounces, spam complaints | **Instantly API** | High for sends/bounces. Low for opens (Apple Mail Privacy) |
| Replies (any) | **Instantly API** + **Gmail** (founder's inbox) | Medium — Instantly catches threads it sent; manual replies via Gmail are the truth |
| Positive reply classification | **Manual** — founder labels in Gmail / a spreadsheet | Manual |
| Snapshot request form submissions | **Antellion DB** if the form writes to a table; otherwise **manual** | **Unknown — needs verification.** No `Snapshot` model exists in `packages/db/prisma/schema.prisma`. The qualifier form on `/diagnostic` may write to a different table or not persist at all |
| Snapshot deliveries | **Manual** — sent from Gmail, no automated event | Manual |
| Walkthrough bookings | **Manual** — Calendly not in use at launch, scheduling is manual | Manual |
| Walkthroughs held | **Manual** — founder logs after the call | Manual |
| BAMFAM compliance | **Manual** — founder logs immediately post-call | Manual |
| Diagnostic SOW signed | **Manual** — countersigned PDF; SOW status not in DB. Stripe invoice exists once paid | Manual + Stripe (payment-state only) |
| Diagnostic delivered | **Antellion DB** — `Engagement.status` transitions, plus `Finding.status = APPROVED` and `FindingAuditEntry.approvedAt` | Medium — depends on whether `EngagementStatus` enum has a `DELIVERED` state and whether the founder consistently transitions it |
| Baseline / Phase 2 SOW signed | **Manual** + **Stripe** (invoice creation) | Manual + Stripe |
| Baseline / Phase 2 delivered | **Antellion DB** — same Engagement / Finding pattern, scoped by `tier` | Medium |
| Continuous attach at signature | **Stripe** (line item on invoice) | High once Stripe products are configured per money-model checklist |
| Rollover credit applied | **Stripe** (coupon redemption) + **Google Sheet ledger** per `docs/rollover-credit-ledger.md` | Medium — sheet is the operating record, Stripe is the financial truth |

---

## 4. Instrumentation gaps

What does **not** exist today that the dashboard will need. Listed in priority order.

1. **No `Snapshot` event in the system.** Snapshots are delivered manually from Gmail. There is no record of "Snapshot delivered to prospect X on date Y" beyond the founder's sent folder. **Every Stage 2/3/4 metric depends on this anchor date.** Without it, cohorting is impossible.

2. **No qualifier-form persistence (likely).** The `/diagnostic` qualifier form's storage path is unverified. If it does not write to the DB, every "Snapshot requested" measurement is a Gmail/manual count.

3. **No `Walkthrough` event.** Calendly is not in use. There is no system record of scheduled, held, or no-show walkthroughs. Stage 2 conversion and BAMFAM compliance are 100% manual today.

4. **No `BAMFAMEvent` or call-disposition log.** BAMFAM compliance relies on the founder remembering and recording it post-call.

5. **No reply-classification system.** Positive vs. negative reply labeling is not persisted anywhere structured. Instantly's "interested" tag is the closest proxy but is founder-applied and inconsistent.

6. **No Engagement lifecycle events.** `Engagement.status` is a flat enum. There is no audit trail of when the engagement transitioned from `SCOPING` → signed → delivered → next-tier-signed. Time-based metrics (60-day rollover window, 30-day momentum, time-to-close) require either status-change timestamps or a separate event log.

7. **No SOW-signature event.** Signed SOWs live as countersigned PDFs in a Drive/email folder. Stripe invoice creation is a proxy but lags signature by hours-to-days and only fires when payment is initiated.

8. **No CRM.** Prospect → Snapshot → Walkthrough → Engagement is not a single object graph anywhere. Manual joins via email address are required to compute funnel conversion end-to-end.

9. **Open-rate unreliability.** Acknowledge — directional only. Do not gate decisions on this metric.

---

## 5. Recommended data model additions (proposed, **not** built)

These are the minimum-viable schema additions that would make the dashboard accurate without introducing a CRM. Listed in order of leverage.

### `Snapshot` (highest leverage)

Anchors Stages 2 through end. Without this, no honest funnel measurement.

```
Snapshot {
  id            String  @id
  organizationId String
  prospectEmail String        // email used as the join key across stages
  prospectCompany String
  requestedAt   DateTime?     // qualifier form submission
  deliveredAt   DateTime?     // Snapshot sent (the anchor)
  scanRunId     String?       // optional link to ScanRun if scan was used
  campaignId    String?       // Instantly campaign attribution
  notes         String?
}
```

Relates to: `ScanRun`, optional future `Engagement` (when prospect converts).

### `Walkthrough`

```
Walkthrough {
  id              String   @id
  snapshotId      String   // FK — every walkthrough is post-Snapshot
  scheduledAt     DateTime
  heldAt          DateTime?
  outcome         String   // enum: held / no-show / canceled / rescheduled
  bamfamCompliant Boolean? // booked next meeting before call ended
  nextMeetingAt   DateTime?
  notes           String?
}
```

Relates to: `Snapshot` → upstream; `Engagement` → downstream when SOW signs.

### `EngagementEvent` (audit trail)

Replaces the implicit-status problem. Append-only event log on `Engagement`.

```
EngagementEvent {
  id            String  @id
  engagementId  String
  eventType     String  // enum: sow_signed, kickoff, delivered, next_tier_signed, churned
  occurredAt    DateTime
  notedById     String?
  metadata      Json?
}
```

Relates to: `Engagement`. Replaces lossy single-status field for time-to-X metrics.

### Optional (lower priority): `ProspectReply`

Persists positive/negative reply classification. Could live in DB or stay in a spreadsheet — the value of moving it is mostly cohort-joinability with `Snapshot` via `prospectEmail`.

### Migration risk note

All four additions are additive and have no schema change to existing models — low migration risk. The largest open question is **`Snapshot.prospectEmail` as the cross-system join key**: it must be normalized (lowercased, trimmed, plus-stripped) and treated as the canonical funnel identifier until a CRM exists.

---

## 6. Dashboard build readiness — three buckets

### Bucket A: Computable today (with manual data ingestion)

These need a Google Sheet or CSV import as the source. Honest, computable.

- Sends, bounces, spam complaints (Instantly API)
- Open rate (Instantly, directional only)
- Reply rate, any reply (Instantly + Gmail manual reconciliation)
- Three numbers on the wall (positive reply count, walkthroughs booked count, BAMFAM compliance) — if the founder maintains a weekly tally sheet
- Stripe-backed metrics: invoice-paid counts, rollover credit redemptions, Continuous attach at signature
- Phased validation gates (1 Diagnostic in Month 1 / 2-3 in Month 2 / 4-6 in Month 3) — manual count from Stripe by month

### Bucket B: Requires new instrumentation

Cannot be reliably computed until the proposed models exist or the founder maintains structured spreadsheets that mirror them.

- Snapshot request rate (off positive replies) — needs `Snapshot.requestedAt` or qualifier-form persistence
- Net Snapshot requests / sends — needs `Snapshot` table
- Walkthrough booking rate — needs `Walkthrough` table or Calendly + email join
- Day 3 email reply rate — needs Snapshot delivery date + reply timestamps joined
- Combined Snapshot → walkthrough conversion — same as above
- Diagnostic SOW signed rate — needs SOW-signature event distinct from Stripe invoice
- BAMFAM compliance — needs `Walkthrough.bamfamCompliant` or a log
- Baseline / Phase 2 conversion (60-day, 30-day) — needs `EngagementEvent` for delivered-at and next-tier-signed-at
- Time-to-close from Baseline delivery — needs `EngagementEvent`

### Bucket C: Deferred (post-CRM or post-launch validation)

- Continuous attach at signature — defer until 2026-06-01+ per Stage 6 rollout
- Cohort retention curves (continuous churn) — out of scope for v1 dashboard
- Multi-touch attribution across campaigns — requires CRM, deferred indefinitely

### Recommended dashboard build sequence (when scheduled)

1. Ship **Bucket A** as a v0 dashboard backed by a single weekly Google Sheet the founder fills in. Pulls Stripe + Instantly via API. Renders the Three Numbers wall and deliverability. **This alone covers the weekly leading indicators and the Year-1 gate.**
2. Add `Snapshot` + qualifier-form persistence. Unlocks Stage 1 net rate and Stage 2 anchor. Half of Bucket B becomes computable.
3. Add `Walkthrough` + `EngagementEvent`. Unlocks Stages 3/4/5 cleanly.
4. Defer Continuous attach + retention until post-June.

---

## 7. Hormozi alignment notes

For each stage, the $100M framework lever the metric is measuring. Lets the founder read the dashboard as a diagnostic of which lever is working.

| Stage | Hormozi framework lever | What the metric is really measuring |
|---|---|---|
| Stage 1 — Cold → Snapshot request | **Big Fast Value** subject line (*$100M Leads* p.168-169) + **Type 1 lead magnet** (reveals problem prospect didn't know they had) | Whether the subject line and offer construction land in 30 seconds. Low positive reply rate = subject line / offer copy problem, not a list problem. Low Snapshot-request-off-positive-reply = qualifier-form friction or weak Email 1 → form handoff |
| Stage 2 — Snapshot → walkthrough | **Value Equation** (Dream Outcome × Perceived Likelihood / Time Delay × Effort) realized in the deliverable | Whether the Snapshot itself sells the next step. Low walkthrough booking rate = the Snapshot is not vivid enough about the named problem, or CTA placement is weak |
| Stage 3 — Walkthrough → Diagnostic SOW | **BAMFAM** discipline (*$100M Money Models* §3) | BAMFAM compliance is the leading indicator. Low BAMFAM = founder is not closing for the next meeting in-call, which is the single highest-leverage sales motion in the playbook. Low SOW signed despite high BAMFAM = pricing or scoping objection |
| Stage 4 — Diagnostic → Baseline | **Rollover commitment mechanic** (*$100M Money Models* §3 Upsells) | The 60-day window is the rollover expiration. The 30-day window measures urgency the rollover is creating. Low 30-day with healthy 60-day = rollover works but not as urgency mechanic; consider adding scarcity or accelerator |
| Stage 5 — Baseline → Phase 2 | **Continuity setup** + **rollover commitment** (Phase 2 → Continuous attach) | This is where the money model compounds. Low Phase 2 conversion = Baseline deliverable is not surfacing enough next-tier value. Time-to-close is the cleanest signal of buyer momentum |
| Stage 6 — Continuous attach | **Continuity offer** at point of maximum trust (signature page, post-Phase-2 commitment) | Attach at signature is the cheapest continuity acquisition. Below 30% = continuity offer is not framed as the obvious next thing |
| Deliverability | Foundational — no framework lever, pure infrastructure | If bounce >2% or spam >0.1%, all upstream framework levers are masked. Always check deliverability first when Stage 1 underperforms |
| Phased validation gates (1 / 2-3 / 4-6 Diagnostics across Months 1/2/3) | Hormozi's "validate before scale" gate (*$100M Offers* — funnel must work at small N before paid acquisition) | Each window validates a different mechanic: Month 1 = funnel mechanics work end-to-end; Month 2 = compounded LinkedIn engagement contributes; Month 3 = blended-channel steady state. Below floor in any window = audit per-stage conversion to find the broken lever. Above floor = scale spend on whichever Stage 1 input has the most headroom |

---

## 8. Open questions for the founder before dashboard build

These are the questions that need answers before instrumentation work starts. Listed so they don't get lost.

1. Does the `/diagnostic` qualifier form persist submissions to the DB? If yes, to which table? If no, where do submissions land (email-only)?
2. Is the founder willing to maintain a weekly Google Sheet covering Snapshot deliveries, walkthroughs scheduled/held, and BAMFAM compliance? Bucket A v0 dashboard depends on this.
3. Is positive-reply classification something to do in Instantly tags, in Gmail labels, or in a sheet? Pick one and stick with it.
4. When does Calendly come online? Walkthrough metrics get dramatically cleaner the moment scheduling is automated.
5. What is the canonical SOW-signature record — DocuSign, signed PDF in Drive, or Stripe invoice creation? The dashboard needs one source of truth.
