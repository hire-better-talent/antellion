# Rollover Credit Ledger — Spec

**Sheet name:** `Antellion - Rollover Credit Ledger`
**Owner:** Jordan
**Source-of-truth status:** Authoritative. Stripe coupons are how credits are *applied*; this ledger is how credits are *tracked*.

This ledger exists because Stripe does not natively track the 60-day rollover clock attached to Diagnostic, Baseline, and Baseline + Action Brief fees. Without this, an expired credit can be applied by accident (revenue leakage) or a live credit can be missed (customer expectation breach). Migrate to a CRM custom field once a CRM is adopted.

---

## Columns (12)

Paste-ready header row (tab-separated):

```
Customer	Contact name	Contact email	Source SOW #	Source product	Credit amount (USD)	Deliverable acceptance date	Credit expiry date	Days to expiry	Status	Applied to SOW #	Applied date / Notes
```

Column-by-column:

| # | Column | Type | Notes |
|---|---|---|---|
| A | Customer | Text | Legal entity name (matches SOW) |
| B | Contact name | Text | Primary buyer at customer (CHRO, VP TA, etc.) |
| C | Contact email | Text | Where the Day-45 reminder lands |
| D | Source SOW # | Text | SOW that generated the credit |
| E | Source product | Dropdown | `Diagnostic` \| `Baseline` \| `Baseline + Action Brief` |
| F | Credit amount (USD) | Currency | $4,900 / $14,000 / $24,000 — the full fee paid |
| G | Deliverable acceptance date | Date | Date customer signed off on the deliverable (NOT invoice date — acceptance starts the 60-day clock per SOW §X) |
| H | Credit expiry date | Date (formula) | `=G2+60` |
| I | Days to expiry | Number (formula) | `=IF(J2="Open", H2-TODAY(), "")` |
| J | Status | Dropdown | `Open` \| `Applied` \| `Expired` \| `Forfeit-on-Termination` (default `Open`) |
| K | Applied to SOW # | Text | Filled in when status flips to `Applied` |
| L | Applied date / Notes | Text | Free-form (Day-45 reminder fired? customer asked for extension? etc.) |

---

## Setup (one-time, ~3 minutes)

1. Create a new Google Sheet named `Antellion - Rollover Credit Ledger` in the Antellion Google Drive folder.
2. Paste the header row above into row 1.
3. Freeze row 1: `View → Freeze → 1 row`.
4. Format column F as currency (USD): select column F, `Format → Number → Currency`.
5. Format columns G and H as date: select G:H, `Format → Number → Date`.
6. Add data validation:
   - **Column E** (Source product): `Data → Data validation → Dropdown` with values `Diagnostic`, `Baseline`, `Baseline + Action Brief`. Reject input that doesn't match.
   - **Column J** (Status): `Data → Data validation → Dropdown` with values `Open`, `Applied`, `Expired`, `Forfeit-on-Termination`. Reject mismatch. Default value: `Open`.
7. Enter formulas in row 2:
   - H2: `=IF(G2="","",G2+60)`
   - I2: `=IF(AND(J2="Open",H2<>""),H2-TODAY(),"")`
   - Drag both formulas down 100 rows to pre-fill.
8. Conditional formatting:
   - Select rows 2:1000.
   - Rule 1 — **Day 45 trigger (red)**: custom formula `=AND($J2="Open",$I2<=15,$I2>=0)` → red background. Means the credit has 15 or fewer days left and is still open.
   - Rule 2 — **Expired (gray)**: custom formula `=$J2="Expired"` → gray background, strikethrough text.
   - Rule 3 — **Applied (green)**: custom formula `=$J2="Applied"` → green background.
9. Bookmark the sheet in browser. Add to Antellion ops bookmarks.

---

## Operating procedure

### When a Diagnostic / Baseline / Baseline+Action Brief is delivered

1. Confirm acceptance in writing (email or signed deliverable acknowledgement) — that date goes in column G.
2. Add a row to the ledger: customer, contact, source SOW #, source product, credit amount, acceptance date.
3. Status defaults to `Open`. H and I auto-compute.
4. Create a Google Calendar event titled `Day 45 — [Customer] rollover credit follow-up` for date `G + 45`. Description should include the customer name, credit amount, expiry date, and a link to this ledger row.

### When the Day-45 reminder fires

1. Email the customer's contact (column C). Suggested copy:
   > [Contact name] — quick note: the $[X] credit from your [Source product] expires [Expiry date] (15 business days from now). It rolls forward in full to [next-tier offer]. Want me to send the SOW so you can lock in the credit before it lapses?
2. Log the outreach in column L.

### When the credit is applied (customer signs the next-tier SOW within 60 days)

1. Apply the matching Stripe coupon to the new invoice/quote:
   - `rollover-diagnostic-baseline` (Diagnostic → Baseline)
   - `rollover-diagnostic-baseline-action` (Diagnostic → Baseline + Action Brief)
   - `rollover-baseline-phase2` (Baseline → Phase 2)
   - `rollover-baseline-action-phase2` (Baseline + Action Brief → Phase 2)
2. Update the ledger row: status → `Applied`, applied SOW # → column K, applied date → column L.
3. Cancel/dismiss the Day-45 calendar reminder if it's still pending.

### When the credit expires unused (60 days past acceptance, no next-tier signature)

1. Status → `Expired` in column J.
2. Note in column L why (timing, decision delay, lost deal, etc.).
3. No outreach action required, but expired credits are useful diagnostic data — review quarterly to spot pattern (are credits expiring on a specific persona/ICP/industry?).

### When the customer terminates for convenience

1. Status → `Forfeit-on-Termination` (per SOW rollover clause: credit is forfeit on termination for convenience).
2. Note the termination date and reason in column L.

---

## What this ledger does NOT do

- It does not enforce credit application — that's the Stripe coupon's job at invoice time.
- It does not track Phase 2 → Continuous attach discounts (Continuous launch is gated to June 1; revisit then).
- It does not replace SOW language — every SOW's rollover clause is the binding agreement; this is a tracking aid.

---

## Migration triggers

- **CRM adoption:** when a CRM is selected (HubSpot, Attio, Pipedrive, etc.), migrate to a custom field on the customer record with auto-email reminder at Day 45. Retire this sheet.
- **Volume > 50 active credits at once:** Google Sheets becomes operationally fragile; move to CRM regardless of timing.

---

## Related

- `docs/money-model-launch-checklist.md` §6 — original spec source
- `docs/sow-template.md` — Scope Block A and Section 8 carry the rollover language
- `docs/sow-diagnostic-short-form.md` — short-form SOW carries the rollover language for Diagnostic
- `docs/offers/ai-visibility-diagnostic.md` — Diagnostic offer spec (acceptance criteria definition)
