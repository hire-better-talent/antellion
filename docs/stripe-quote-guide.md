# Stripe Operational Guide

**Purpose:** Reference for when and how to use Stripe Quotes, Invoices, and Payment Links in Antellion's sales motion. Open this when a deal is moving and you need to know which Stripe primitive to reach for.

---

## Decision: which Stripe tool to use

Match the sales situation to the right Stripe primitive. Wrong choice = friction for the buyer or missing paper trail for you.

| Situation | Use | Why |
|---|---|---|
| Self-serve Baseline Audit ($14K), customer agrees via email | **Invoice** | Fast, clean, no quote ritual needed. Stripe sends a hosted invoice with a Pay link. |
| Any deal with negotiated scope (Focused, Strategic, Enterprise) | **Quote** | Procurement expects quote → PO → invoice flow. Quote creates the paper trail. |
| Repeat customer buying a one-off Quarterly Re-scan | **Invoice** | Relationship is already established. No quote ceremony required. |
| Customer commits to 4 quarterly re-scans upfront | **Subscription** | Automated quarterly billing, predictable invoicing. |
| Simple pre-sold add-on under $5K to existing customer | **Payment Link** | Fastest path to money. Drop the URL into an email. |
| Enterprise deal at $110K+ | **Quote** (always) | Enterprise procurement requires a formal quote document. |
| First deal with a new customer above $50K | **Quote** | The quote doubles as the buyer's internal approval artifact. |

**Default rule:** if the deal is over $50K OR the scope was negotiated in conversation, use a Quote. Below $50K and pre-agreed, use an Invoice.

---

## Pre-work: what to have ready before creating a Quote

Gather these in one place before you open Stripe. Having them ready turns a 20-minute quote build into a 5-minute one.

### Customer details
- Company legal name (exact, not trading name — procurement will reject mismatches)
- Billing contact name + email
- Billing address
- Any purchase order number the buyer has already issued
- Tax ID / W-9 if the buyer requested yours

### Deal scope
- Tier decided: Baseline / Focused Phase 2 / Strategic Phase 2 / Enterprise Phase 2
- Job category(ies) covered — named specifically (e.g., "Software Engineering," not "Engineering")
- Competitor set — named companies (e.g., "Stripe, Square, Adyen")
- Any Enterprise custom scope items (advisory hours, custom research topics, industry benchmark requirement)
- Start date — when Phase 1 work begins after signature

### Commercial terms
- Total price
- Deposit amount (usually 50% of total)
- Balance amount (usually 50%)
- Balance due date trigger (on Phase 2 delivery, or a specific calendar date)
- Quote expiration (default 30 days from send)

### Legal
- Signed MSA already in place? (If not, attach a reference or send for signature first.)
- This engagement's SOW terms — either attached as PDF or summarized in Quote terms

---

## Step-by-step: creating a Quote in Stripe

### 1. Start the Quote
- Dashboard → **Quotes → Create quote**
- Pick or create the customer
- Set the quote currency (USD for US deals)

### 2. Add line items

**For a Baseline-only engagement** ($14K):
- Line item 1: Reference the **Baseline Audit** Product at $14,000
- Line item 2: *(Optional)* Deposit line at 50% = $7,000 with a "Balance due on delivery" line for the remaining $7,000

**For a Focused Phase 2 engagement** ($89K total):
- Line item 1: **Phase 1: Baseline Audit** at $14,000
- Line item 2: **Phase 2: Focused Audit — [category name]** at $75,000
- Optionally split each phase into deposit + balance line items

**For a Strategic Phase 2 engagement** ($104K total):
- Line item 1: **Phase 1: Baseline Audit** at $14,000
- Line item 2: **Phase 2: Strategic Audit — [3 categories named]** at $90,000

**For an Enterprise engagement** (custom, $124K+):
- Line item 1: **Phase 1: Baseline Audit** at $14,000
- Line item 2: **Phase 2: Enterprise Audit — [scope summary]** at negotiated amount
  - Use "Custom item" rather than a catalog Price so you can name the scope precisely
  - Example name: `Phase 2: Enterprise Audit — 7 categories, 3-layer probing, 12-month advisory`

**Always order line items Phase 1 first, Phase 2 second.** Procurement reads top-to-bottom and the sequencing signals that Phase 1 is not optional.

### 3. Set deposit + balance structure

For deals $50K+, always split into deposit + balance. Two ways to do this in Stripe:

**Method A — single line item, manual second invoice:**
- Leave line items at full amounts
- In quote terms, note: *"Invoiced in two installments: 50% on signature (due net 15), 50% on Phase 2 delivery (due net 30)."*
- When the quote is accepted, you manually issue two invoices at the right times

**Method B — split line items in the quote itself:**
- Line 1: Phase 1 Baseline — Deposit (50%) — $7,000
- Line 2: Phase 1 Baseline — Balance (50%) — $7,000
- Line 3: Phase 2 — Deposit (50%) — $37,500
- Line 4: Phase 2 — Balance (50%) — $37,500

Method A is simpler. Method B is clearer to procurement. Pick based on the buyer's preference if they've told you; otherwise default to Method A.

### 4. Set the terms and footer

**Paste into "Terms":**

```
Payment terms: Deposit (50% of total) due within 15 days of
quote acceptance. Balance (50% of total) due within 30 days of
Phase 2 deliverable sign-off. Phase 1 Baseline Audit begins
upon receipt of deposit.

Phase 2 contingency: Customer may elect to not proceed to Phase
2 upon Phase 1 Baseline Audit delivery without obligation for
Phase 2 fees. Any Phase 2 deposit paid will be refunded within
30 days of customer's written notice.

Engagement scope and deliverables are defined in the attached
Statement of Work (SOW) and governed by the Master Services
Agreement (MSA) dated [DATE].

Quote valid for 30 days from date of issue.
```

**Paste into "Footer":**

```
Antellion
jordan@antellion.com
antellion.com

Tax ID available upon request.
Payment methods: ACH (preferred for invoices >$10K), wire, or
credit card (card fees apply).
```

### 5. Set expiration and send

- Default expiration: 30 days
- Click **"Send"** — Stripe emails the buyer a hosted quote URL
- Optionally download the PDF to attach in a separate email with context

### 6. Wait for acceptance

- Quote status shows "Open" until accepted, declined, or expired
- Buyer accepts via the hosted page — Stripe notifies you
- Upon acceptance, Stripe can auto-generate the Invoice (if you enabled that) or you generate it manually

### 7. Issue invoices and track payment

- First invoice (deposit) goes out immediately
- Set a calendar reminder for the balance invoice trigger (Phase 2 delivery date)
- Stripe emails you when payments are received; also configure Slack notifications for real-time visibility

---

## Line item template library

Paste these as the "Name" field on each Quote line item. Adjust the bracketed scope details per deal.

### Baseline Audit
```
Phase 1: Antellion Baseline Audit — [Job Function Name]
```

### Focused Phase 2
```
Phase 2: Antellion Focused Audit — [Job Function Name], 3-layer 
conversational probing across ChatGPT, Claude, and Gemini
```

### Strategic Phase 2
```
Phase 2: Antellion Strategic Audit — [Category 1], [Category 2], 
[Category 3], 3-layer conversational probing
```

### Enterprise Phase 2
```
Phase 2: Antellion Enterprise Audit — [N] categories named in 
SOW, 12-month monthly advisory, [custom items if any]
```

### Quarterly Re-scan (standalone)
```
Antellion Quarterly Re-scan — [Job Function Name], tracking 
against [DATE] Baseline
```

### Deposit / Balance split
```
Deposit: 50% of engagement, due on signature
```
```
Balance: 50% of engagement, due on Phase 2 delivery
```

---

## The quote lifecycle

```
DRAFT ──► SENT ──► OPEN ──► ACCEPTED ──► INVOICED ──► PAID
                    │
                    ├──► DECLINED (rare)
                    │
                    └──► EXPIRED (no response in 30 days)
```

**What you do at each stage:**

- **DRAFT:** Build the quote. Don't leave in draft longer than a day — the deal is cooling.
- **SENT:** Buyer has received the email. No action unless they reply with questions.
- **OPEN:** Quote is waiting for acceptance. Follow up once at day 7 if no response, once at day 14. Never more than two follow-ups on an open quote.
- **ACCEPTED:** Deposit invoice goes out immediately. Phase 1 work starts upon deposit receipt.
- **INVOICED:** Invoice is waiting for payment. Stripe auto-reminds. You only intervene if it's past-due 10+ days.
- **PAID:** Deposit cleared. Email the buyer a confirmation and scheduled Phase 1 kick-off.
- **DECLINED:** Ask for the reason before closing the lead. Price? Scope? Timing? Useful data either way.
- **EXPIRED:** Send a short note asking if the deal is still live. Re-quote if yes, archive if no.

---

## Edge cases and how to handle them

### "The quote has errors"
- Do NOT edit a sent quote. Stripe's immutability is a feature, not a bug.
- Create a new quote with corrections.
- Cancel the old one in the Dashboard.
- Send the new quote with a short note: *"Replacing the previous quote with corrected [whatever]. New quote attached."*

### "Can you adjust pricing?"
- Never adjust during an active quote. Let the quote expire or decline.
- Create a new quote with the renegotiated pricing.
- Maintain discipline — buyers test pricing. Your consistency protects the anchor.

### "We need Net 60 payment terms"
- Deposit terms stay at Net 15. Non-negotiable for launching Phase 1.
- Balance terms are flexible. Net 30 is standard; Net 60 is acceptable for Fortune 500 / procurement-driven deals. Never Net 90+.

### "Can we pay by credit card?"
- Fine for Baseline ($14K) and Re-scan ($10K) deals. Card fees absorbed as a cost of business for small deals.
- For Focused+ ($89K+), quote 3% additional surcharge for card payments. Most buyers switch to ACH or wire once they see the surcharge.

### "We lost the quote PDF"
- Resend it from the Quote's detail page in Stripe. Don't create a new quote.
- If they need modification, see "quote has errors" above.

### "Customer accepted but won't pay the deposit"
- Phase 1 does NOT start until deposit clears. No exceptions.
- Follow up at day 15 (Net 15 overdue trigger).
- If still no payment at day 30, the engagement is effectively dead. Archive the quote and move on.

### "Enterprise customer wants to pay the entire engagement in advance for a discount"
- Accept only with clear conditions. Offer 5% discount for 100% upfront payment (not more than 5% — the deposit structure exists for a reason).
- Require the full MSA + SOW to be signed before the prepayment invoice goes out.
- Note this in the quote terms if it's part of the deal.

---

## Setup checklist before your first real quote

- [ ] Stripe account activated with ACH enabled
- [ ] Products created in Stripe catalog:
  - Baseline Audit ($14,000, one-time)
  - Focused Audit Phase 2 ($75,000, one-time)
  - Strategic Audit Phase 2 ($90,000, one-time)
  - Enterprise Audit Phase 2 ($110,000 placeholder, one-time)
  - Quarterly Re-scan ($10,000, one-time)
- [ ] Each Product has a compliant Description field (see `docs/full-assessment-offer-stack.md`)
- [ ] Statement descriptor set (22 chars: `ANTELLION AI AUDIT` or `ANTELLION`)
- [ ] Invoice branding configured: Antellion logo, brand colors, footer with contact info
- [ ] MSA template available as PDF for attachment to quotes
- [ ] SOW template available — customized per engagement
- [ ] Slack webhook configured for "Invoice Paid" notifications
- [ ] Test quote sent to your own email, verified rendering on mobile + desktop
- [ ] Test invoice paid with your own card to verify the end-to-end flow

---

## Related files

- `docs/full-assessment-offer-stack.md` — canonical pricing and tier reference
- `docs/response-templates.md` — Template #9 (price question reply)
- MSA template (not in repo yet — source externally or have drafted)
- SOW template (not in repo yet — build per-engagement until there's a pattern)
