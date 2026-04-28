# Money Model Launch — Ops Checklist

**Purpose:** Actionable to-do list for Jordan to wire the new offer architecture (Diagnostic, Baseline + Action Brief, Board-Level, Continuous) into Stripe, Instantly, the contract library, and response templates.

**Prerequisite reading:**
- `docs/money-model-assessment.md` — why these offers exist
- `docs/offers/*.md` — full spec for each new offer
- `docs/full-assessment-offer-stack.md` — canonical pricing

**Target completion: before Apr 29, 2026 launch.** Continuous items are explicitly deferred to post-launch.

---

## 1. Stripe — products to create

### 1a. AI Visibility Diagnostic — CREATE NOW

- **Product name:** AI Visibility Diagnostic
- **Statement descriptor (22 char max):** `ANTELLION DIAGNOSTIC`
- **Description (for invoice + quote):**
  > 10-business-day fixed-fee AI employer visibility audit. 40 candidate-intent queries across ChatGPT, Claude, Gemini, and Perplexity; 3 personas; 3 named competitors. Deliverables: Diagnostic Report with 10+ material findings (each with named issue, evidence, and action), Findings Brief, 45-min analyst readout, and interactive HTML report. Full refund if fewer than 10 findings. 100% of fee credits toward Baseline Audit or Phase 2 within 60 days.
- **Price:** $4,900 USD, one-time
- **Price lookup key / SKU:** `ant-diagnostic-4900`
- **Tax behavior:** Exclusive (services are not taxable in most states; buyer handles their own tax)
- **Billing:** Invoiced upfront (full $4,900 on signature, no deposit/balance split at this price point)

### 1b. Baseline + Action Brief — CREATE NOW

- **Product name:** Baseline Audit + Action Brief
- **Statement descriptor:** `ANTELLION BASELINE+`
- **Description:**
  > Phase 1 Baseline Audit plus a prioritized remediation brief for one candidate journey stage you select after Baseline findings. Brief includes 8+ platform-specific recommendations (each with named platform, content type, and owner role), a 90-day execution sequence with 6+ scheduled milestones, and a next-quarter measurement plan. 3-week delivery. 100% of fee credits toward any Phase 2 engagement (Focused, Strategic, or Enterprise) within 60 days.
- **Price:** $24,000 USD, one-time
- **Price lookup key / SKU:** `ant-baseline-action-brief-24000`
- **Billing:** 50/50 split, Net 15 deposit + Net 30 balance (use Method A from stripe-quote-guide.md — single line item, manual second invoice)

### 1c. Board-Level Engagement — CREATE NOW as hidden

- **Product name:** Antellion Board-Level Engagement
- **Statement descriptor:** `ANTELLION BOARD`
- **Description:**
  > Annual enterprise engagement: quarterly full-scope audits across 5+ categories, quarterly in-person CHRO/CEO briefings, annual board-ready deck, named senior analyst, two competitor war-gaming sessions per year, ad-hoc re-scans included on a fair-use basis (typically 6-8 per year, 10-business-day SLA), dedicated Slack Connect channel with 1-business-day response SLA.
- **Price:** $275,000 USD/year, billed quarterly
- **Create as:** Recurring Price, $68,750 USD, interval = quarter (every 3 months)
- **Price lookup key / SKU:** `ant-board-level-275000`
- **Catalog visibility:** mark as hidden/internal; not listed on any public page or pricing table
- **Billing:** First quarter invoiced on signature, Net 30; subsequent quarters auto-invoice on first business day of each new quarter

### 1d. Antellion Continuous — DO NOT CREATE YET

Gated on three launch criteria (see `docs/offers/antellion-continuous.md`). When gates clear (target: June 1, 2026), create:

- **Product name:** Antellion Continuous
- **Price:** $6,500 USD/month, recurring monthly (no free trial)
- **SKU:** `ant-continuous-6500`
- **Companion one-time SKU:** `ant-continuous-activation-25000` ($25,000 activation fee, one-time)

Add a calendar reminder for June 1 to revisit launch gates.

---

## 2. Stripe — coupons / discounts to create (rollover credits)

Stripe's clean path for rollover credits is a **percentage or fixed-amount coupon** applied to a future invoice or quote line item. Create these coupons so applying a rollover credit is two clicks, not manual math.

### 2a. Coupon: Diagnostic → Baseline rollover

- **Name:** Diagnostic Rollover to Baseline
- **ID:** `rollover-diagnostic-baseline`
- **Amount off:** $4,900 USD (fixed amount)
- **Duration:** Once (applies to a single invoice)
- **Redemption limits:** None system-wide; tracking handled outside Stripe (see section 6)
- **Expiration:** No system expiration (60-day business rule tracked in CRM)

### 2b. Coupon: Diagnostic → Baseline + Action Brief rollover

- **Name:** Diagnostic Rollover to Baseline+Action Brief
- **ID:** `rollover-diagnostic-baseline-action`
- **Amount off:** $4,900 USD fixed
- **Duration:** Once

### 2c. Coupon: Baseline → Phase 2 rollover

- **Name:** Baseline Rollover to Phase 2
- **ID:** `rollover-baseline-phase2`
- **Amount off:** $14,000 USD fixed
- **Duration:** Once

### 2d. Coupon: Baseline + Action Brief → Phase 2 rollover

- **Name:** Baseline+Action Brief Rollover to Phase 2
- **ID:** `rollover-baseline-action-phase2`
- **Amount off:** $24,000 USD fixed
- **Duration:** Once

### 2e. Coupon: Continuous at Phase 2 close — first re-scan included

- **Name:** Continuous Attach Discount (first re-scan free)
- **ID:** `continuous-attach-first-rescan`
- **Amount off:** $13,000 USD fixed (equivalent to one standalone re-scan value)
- **Duration:** Once, applied to month 4 of Continuous subscription
- **Create when:** Continuous launches (defer to June)

---

## 3. Stripe — invoice template / branding

Already mostly done per earlier work. One addition:

- Add a note to the invoice footer template:
  > **Rollover credit:** Fees paid under this SOW credit 100% toward a subsequent Antellion engagement signed within 60 days of deliverable acceptance. Credit is non-transferable and forfeit on termination for convenience.
- Keep this only on Diagnostic, Baseline, and Baseline+Action Brief invoices. Phase 2 invoices do NOT show the rollover (the rollover ends at Phase 2).

---

## 4. Contract library — SOW and short-form variant

### 4a. SOW template — DONE

- Rollover clause added to Scope Block A (Baseline) and Section 8 Phase 2 Contingency. See `docs/sow-template.md` (updated 2026-04-23).

### 4b. Short-form Diagnostic SOW — CREATE

The Diagnostic is sub-$10K and should not require full MSA execution for every deal. Create a **2-page short-form services agreement** at `docs/sow-diagnostic-short-form.md` covering:

- Parties (Hire Better Talent LLC d/b/a Antellion; Customer)
- Scope (refer to `docs/offers/ai-visibility-diagnostic.md` by version)
- Fee ($4,900, paid in full on signature, Net 15)
- Deliverables and acceptance criteria (from Diagnostic spec)
- Guarantee (Win Your Money Back — fewer than 10 material findings)
- Rollover credit clause (100% toward Baseline / Baseline + Action Brief / Phase 2 within 60 days)
- Confidentiality (mutual, 3-year term)
- Limitation of liability (cap at fees paid)
- Signature block
- Governing law, dispute resolution

Enterprise customers who want full MSA execution should still get the full MSA + SOW — the short-form is a convenience path for the Diagnostic price point, not a mandate.

### 4c. SOW template scope blocks — ADD LATER

When the Diagnostic and Baseline + Action Brief volume justifies it, add to `docs/sow-template.md`:
- Scope Block E — AI Visibility Diagnostic (for customers who want a full-MSA Diagnostic SOW)
- Scope Block F — Baseline + Action Brief

Not blocking launch. Short-form Diagnostic SOW handles the default case.

### 4d. Continuous SOW — DEFER

To be created when launch gates clear. Do NOT pre-commit Continuous scope until the product side supports it.

---

## 5. Instantly — email sequence updates

### 5a. Update V1 cold sequence

Current sequence ends with a Snapshot offer. Add a new email to the sequence after Snapshot delivery:

- **Email #N (new)** — sent 3 business days after Snapshot delivery
- **Subject:** The $4,900 next step after your Snapshot
- **Body:** Brief email introducing the Diagnostic as the paid analyst-delivered next step. Emphasize: analyst-delivered, 10 business days, guaranteed refund under 10 findings, $4,900 credits toward Baseline within 60 days.
- **Draft in:** `docs/email-campaign-v1.md` (new section: "Post-Snapshot Diagnostic follow-up")
- **CTA:** "Reply to this email or book a 15-minute Diagnostic scoping call: [Calendly link]"

### 5b. Update Snapshot delivery email

- Change the default "next step" language from "book a Baseline scoping call" to "book a Diagnostic scoping call."
- Baseline remains an option for customers who ask for it directly; Diagnostic is the default next step.

### 5c. Do NOT

- Do not add pricing to cold outreach emails. Cold sequence continues to drive toward the free Snapshot.
- Do not add Diagnostic pricing to the email subject line of cold emails — $4,900 in the subject line kills open rates.

---

## 6. Operational tracking — rollover credit ledger

Rollover credits have a 60-day clock. Stripe does not track this natively. Options:

**Option A — Spreadsheet (good enough for first 10 deals):**
- Google Sheet: `Antellion - Rollover Credit Ledger`
- Columns: Customer, Credit source (Diagnostic / Baseline / Baseline+Action Brief), Credit amount, Deliverable acceptance date, Credit expiry date (+60 days), Status (open / applied / expired), Applied to (SOW number)
- Calendar reminder at Day 45 of each credit to follow up with the customer if still open

**Option B — CRM custom field (once CRM is picked):**
- Single custom field on the customer record: "Rollover credit expires [DATE]"
- Auto-email reminder at Day 45

Start with Option A. Migrate when CRM is adopted.

---

## 7. Response templates — `docs/response-templates.md`

Add three new templates (to be drafted in response-templates.md — not part of this checklist):

### 7a. Template #11 — Diagnostic pitch (post-Snapshot, or inbound "is there something between Snapshot and Baseline?")

Use case: prospect wants a paid tier below $14K, or Snapshot delivered and you want to BAMFAM the Diagnostic scoping call.

### 7b. Template #12 — Baseline + Action Brief pitch (price pushback between Baseline and Focused)

Use case: pitched Focused/Strategic/Enterprise, prospect signals current-cycle budget resistance ("we could do $30K this quarter but not $90K").

### 7c. Template #13 — Continuous pitch (post-Phase 2 close) — DRAFT ONLY, NOT ACTIVE

Use case: attached at Phase 2 signature page. Draft in response-templates.md with a "DO NOT SEND — launch-gated" header. Activate when Continuous launches.

---

## 8. Website / landing page — NO CHANGES

Confirmed from `docs/money-model-assessment.md`: pricing stays off the public site. No `/pricing` page. No Diagnostic public listing. The Diagnostic is introduced in sales conversations, post-Snapshot follow-ups, and private pitch decks.

**Optional — not blocking launch:**
- Private Calendly link for Diagnostic scoping calls (not in site nav, sent directly in follow-up emails). Same UX as Snapshot scoping call, different calendar.

---

## 9. Finding Audit Appendix — Diagnostic deliverable template

The Diagnostic's Win Your Money Back guarantee requires a **Finding Audit Appendix** in every Diagnostic Report that numbers each finding and shows how it satisfies the three criteria (specific named issue + data evidence + actionable category).

- Create a template in `packages/core/src/diagnostic-report/finding-audit-appendix.ts` (or equivalent)
- Each finding entry: number, finding title, specific-named-issue reference, data-evidence reference, actionable-category tag
- Total count displayed at the top: "X material findings included. Minimum guarantee threshold: 10."
- If count < 10, auto-trigger refund workflow (engineering: wire this into the report generation pipeline)

**Owner:** Backend / product work. Not blocking launch — can be manually assembled for the first 2-3 Diagnostics.

---

## 10. Pre-launch ordered sequence

Work in this order over the next 6 days:

1. **Stripe products + coupons** (section 1a-c, section 2a-d) — 60 min in Stripe dashboard
2. **Invoice footer rollover note** (section 3) — 10 min
3. **Short-form Diagnostic SOW** (section 4b) — 90 min to draft and have reviewed
4. **Instantly Snapshot-to-Diagnostic follow-up email** (section 5a-b) — 45 min
5. **Rollover ledger spreadsheet** (section 6 Option A) — 15 min
6. **Response templates #11 and #12** (section 7a-b, drafted in `docs/response-templates.md`) — 60 min

**Total: ~5 hours of operational work to have the new money model fully operational before Apr 29.**

**Explicitly deferred to post-launch:**
- Continuous Stripe product (section 1d) — June 1 revisit
- Continuous coupon (section 2e) — June 1
- Continuous SOW (section 4d) — June 1
- Response template #13 (section 7c) — June 1
- SOW scope blocks E and F (section 4c) — when volume justifies
- Finding Audit Appendix automation (section 9) — after 2-3 Diagnostics delivered
- CRM rollover custom field (section 6 Option B) — when CRM is adopted

---

## Related files

- `docs/money-model-assessment.md` — strategic rationale
- `docs/offers/ai-visibility-diagnostic.md`
- `docs/offers/baseline-action-brief.md`
- `docs/offers/board-level-engagement.md`
- `docs/offers/antellion-continuous.md`
- `docs/sow-template.md` — rollover clause added 2026-04-23
- `docs/full-assessment-offer-stack.md` — canonical pricing updated 2026-04-23
- `docs/stripe-quote-guide.md` — Stripe Quote operational reference
- `docs/response-templates.md` — add templates #11, #12, #13
