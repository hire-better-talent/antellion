# Antellion Referral Program

**Date:** 2026-04-20
**Purpose:** Operational design + legal template for Antellion's referral program. Partners earn a percentage of engagement fees for qualified referrals into the Full Assessment pipeline.

---

## 1. Program Overview

### Rate

**20% of total first-year engagement fees** paid to Antellion by the referred customer.

The rate applies to the *total* engagement — including Phase 1 Baseline plus any Phase 2 (Focused, Strategic, or Enterprise). Quarterly re-scans included in an engagement are part of the total engagement fee; standalone re-scans purchased later by the same customer are part of the 12-month qualifying window.

### Example Payouts

| Engagement | Customer pays | Partner earns |
|---|---|---|
| Baseline only | $14,000 | $2,800 |
| Baseline + Focused Phase 2 | $89,000 | $17,800 |
| Baseline + Strategic Phase 2 | $104,000 | $20,800 |
| Baseline + Enterprise Phase 2 | $124,000+ | $24,800+ |

### Qualifying Window

Referral fees are payable on all engagement fees paid to Antellion by the referred customer within **twelve (12) months** of the customer's first paid engagement with Antellion. Fees paid after the 12-month window are outside the referral program.

---

## 2. Tracking Mechanism

**Two tracking layers, used together:**

### Primary: Unique Partner URL

Each enrolled partner receives a unique referral URL in the form:

```
https://antellion.com?ref=[PARTNER-SLUG]
```

Example: `https://antellion.com?ref=sarika-lamont`

Partners use this URL in any outreach context — LinkedIn posts, email signatures, advisory conversations, speaking engagements, pitch decks. When a prospect clicks through, the `ref` parameter persists into the lead capture form.

### Secondary: Referral Code

If a prospect reaches antellion.com through organic means (search, word of mouth, direct navigation), they can enter a referral code in an optional field on the lead capture form:

```
"Did someone refer you? Enter their referral code: ___________"
```

Codes are human-readable, partner-specific, and match the URL slug (e.g., `SARIKA-LAMONT`).

### Tertiary: Self-Attribution on Reply

If a prospect replies to the cold email campaign or submits a Snapshot request without URL or code, they can still be attributed to a partner if the partner emails Antellion within 14 days of the prospect's first touch confirming the relationship. Jordan's judgment on attribution is final.

### Attribution Rules

- **First-touch wins.** If a prospect is tagged via URL from Partner A and then manually attributed by Partner B, Partner A receives the referral.
- **Attribution persists for 180 days from first touch.** If a prospect clicks a partner URL today, browses the site, leaves, and returns 3 months later to submit the form, the attribution still holds.
- **Direct competitors and existing pipeline are excluded.** A partner cannot earn a referral fee for a company that was already in active conversation with Antellion before the partner's referral.

---

## 3. Partner Enrollment Process

1. Partner expresses interest (typically after a conversation with Jordan or after receiving a Snapshot that resonated)
2. Partner signs the **Antellion Referral Agreement** (template in Section 7 below)
3. Antellion generates the partner's unique URL slug and referral code
4. Antellion sends enrollment email with:
   - Partner's unique URL
   - Partner's referral code
   - Antellion's W-9 (for partner's records)
   - Instructions for submitting a W-9 to Antellion (so Antellion can issue a 1099 at year-end if payments exceed $600)
5. Partner begins referring

---

## 4. Payment Flow

1. Customer pays Antellion per their engagement fees and schedule (usually 50% deposit on SOW execution, 50% balance on delivery)
2. **Antellion notifies partner of qualifying payments** monthly
3. Partner issues an invoice to Antellion for the 20% referral fee within 30 days of Antellion's notification
4. Antellion pays partner via ACH or check within **30 days** of receiving the invoice
5. At year-end, Antellion issues a 1099-NEC to any partner whose total referral payments in the calendar year exceed $600

### Why the partner-invoices-Antellion model

Rather than Antellion issuing unilateral payments, having the partner invoice Antellion:
- Creates clean accounting records on both sides
- Confirms the partner's acceptance of the payment amount
- Establishes the independent-contractor relationship (the partner is a service provider, not an employee)
- Simplifies 1099 handling

---

## 5. Partner Responsibilities

Partners:

- May refer any company that fits Antellion's ICP (Chief People Officers / VP Talent Acquisition / Chief Talent Officers at 2,000+ employee companies)
- May NOT refer:
  - Their own employer
  - Symphony Talent or Symphony Talent's customers (see note below)
  - Any company they have a pre-existing financial stake in without disclosure
- Must represent Antellion accurately — no claims beyond what is publicly documented on antellion.com or in Antellion's published materials
- Must respect Antellion's Symphony Talent messaging constraint (AI visibility is additive to employer brand, never a replacement)
- Operate as independent contractors, not employees or agents of Antellion

### Symphony Talent exclusion

Partners are explicitly prohibited from referring Symphony Talent customers or Symphony Talent itself. This protects Jordan's day-job obligations. Partners sign an acknowledgment of this exclusion in the Referral Agreement.

---

## 6. Operational Setup (backend)

The following backend work supports the referral program. These are separate engineering tasks not covered by this doc.

### Landing page (apps/marketing)

- Add `ref` query parameter handling on `antellion.com`
- Persist `ref` value across navigation (sessionStorage or URL)
- Pass `ref` value to lead capture form as a hidden field
- On form submission, store `ref` in the Lead record metadata

### Lead capture form

- Add optional "Referral code" input field
- On submission, if `ref` is absent but code is present, parse code to partner slug and store

### Operator dashboard (apps/web)

- Display `ref` value on each lead in the Leads list
- Add a Referrals view grouping leads by partner
- Add a simple payment-tracker (partner, month, total qualifying payments, status: invoice received / paid / pending)

### Admin

- Partner enrollment management (create partner slug, generate code, track enrollment date)

None of the above is implemented yet. Estimated engineering effort: 4-6 hours for a minimum-viable version.

---

## 7. Referral Agreement Template

> **⚠️ NOT LEGAL ADVICE.** This template is a starting point. Have it reviewed by counsel before first use.

The template begins below. Copy to a new file per partner, fill in bracketed placeholders, export to PDF for signature.

---

## ANTELLION REFERRAL AGREEMENT

This Referral Agreement (the "**Agreement**") is entered into as of **[EFFECTIVE DATE]** (the "**Effective Date**") by and between:

**Hire Better Talent LLC**, a **[STATE]** limited liability company, doing business as "Antellion," with a principal place of business at **[ANTELLION ADDRESS]** ("**Antellion**"), and

**[PARTNER LEGAL NAME]**, an individual / entity with a principal address at **[PARTNER ADDRESS]** ("**Partner**").

---

### 1. Purpose

Antellion provides AI employer visibility assessment services to enterprise talent teams. Partner may, from time to time, refer prospective customers to Antellion. This Agreement sets forth the terms under which Antellion will pay Partner referral fees for qualified referrals that become paying customers of Antellion.

### 2. Qualified Referral

A "**Qualified Referral**" is a prospective customer that:

(a) Is introduced to Antellion through Partner's unique referral URL, referral code, or direct written introduction confirmed by Partner to Antellion within fourteen (14) days of the prospect's first touch with Antellion;

(b) Was not, at the time of the introduction, already in active conversation with Antellion (i.e., had not requested a Snapshot, engaged in sales discussion, or been contacted by Antellion's outbound campaign in the preceding ninety (90) days);

(c) Executes a Statement of Work with Antellion for a paid engagement within one hundred eighty (180) days of the Partner's introduction; and

(d) Is not Partner's employer, Symphony Talent, or a customer of Symphony Talent.

### 3. Referral Fee

For each Qualified Referral, Antellion will pay Partner a referral fee equal to **twenty percent (20%)** of all engagement fees actually paid by the Qualified Referral to Antellion within **twelve (12) months** of the Qualified Referral's first paid engagement.

**Examples:**

- A Qualified Referral signs a Baseline Audit ($14,000) and pays in full: Partner earns **$2,800**.
- A Qualified Referral signs a combined Baseline + Focused engagement ($89,000) and pays in full: Partner earns **$17,800**.
- A Qualified Referral signs a Strategic engagement ($104,000) and also purchases a standalone Quarterly Re-scan ($10,000) within 12 months of the first engagement: Partner earns **$22,800** ($20,800 + $2,000).

### 4. Payment Terms

(a) Antellion will notify Partner monthly of qualifying payments received from Partner's Qualified Referrals.

(b) Within thirty (30) days of Antellion's notification, Partner will issue an invoice to Antellion for the applicable referral fee.

(c) Antellion will pay Partner's invoice via ACH or check within **thirty (30) days** of receipt.

(d) Antellion will issue a Form 1099-NEC to Partner at year-end if cumulative referral payments in the calendar year exceed $600. Partner is responsible for all applicable taxes on referral payments.

### 5. Partner Conduct

Partner agrees to:

(a) Represent Antellion accurately, using only statements and claims publicly documented on antellion.com or in Antellion's published materials;

(b) Respect Antellion's messaging constraints — specifically, frame AI employer visibility as additive to traditional employer brand work, not as a replacement;

(c) Not misrepresent Partner's relationship with Antellion (Partner is an independent referrer, not an agent, employee, or officer of Antellion);

(d) Not refer Symphony Talent, Symphony Talent's customers, or any company Partner is employed by;

(e) Disclose to Antellion any material financial relationship Partner has with a referred company (e.g., board membership, equity holdings, paid advisory role).

### 6. Non-Exclusivity

This Agreement is non-exclusive. Partner may refer prospective customers to other vendors. Antellion may accept referrals from other sources. Neither Party is required to refer a minimum number of prospects or engage a minimum number of customers from referrals.

### 7. Term and Termination

This Agreement commences on the Effective Date and continues for **twelve (12) months**, automatically renewing for successive twelve-month periods, until terminated by either Party upon **thirty (30) days'** written notice. Upon termination:

(a) Referral fees continue to be owed on Qualified Referrals made before the termination date, for the full twelve-month payment window associated with each Qualified Referral;

(b) Partner's tracking URL and referral code will be deactivated; and

(c) No new Qualified Referrals will be accepted under this Agreement after the termination date.

Either Party may terminate this Agreement immediately upon written notice for the other Party's material breach that remains uncured after fifteen (15) days' written notice.

### 8. Confidentiality

Partner will not disclose Antellion's non-public methodology, pricing specifics beyond what is publicly communicated, or the identity of Antellion's customers, except as necessary to perform referrals under this Agreement and subject to the confidentiality obligations of the referral relationship. Antellion will not disclose Partner's referral activity or earnings to third parties without Partner's consent, except as required by law or financial reporting.

### 9. Independent Contractor

Partner is an independent contractor. Nothing in this Agreement creates any employment, agency, joint venture, partnership, or similar relationship. Partner has no authority to bind Antellion to any agreement or commitment.

### 10. Limitation of Liability

Neither Party will be liable to the other for any indirect, incidental, consequential, special, or punitive damages arising out of this Agreement. Antellion's total cumulative liability to Partner will not exceed the total referral fees paid or payable to Partner under this Agreement in the twelve (12) months preceding the event giving rise to the claim.

### 11. Governing Law

This Agreement is governed by the laws of **[STATE — e.g., Delaware]**, without regard to conflict-of-laws principles.

### 12. General

(a) **Entire Agreement.** This Agreement is the entire agreement between the Parties regarding referral payments and supersedes all prior discussions.

(b) **Amendment.** This Agreement may be amended only by a written document signed by both Parties.

(c) **Assignment.** Partner may not assign this Agreement without Antellion's written consent.

(d) **Counterparts.** This Agreement may be executed in counterparts, including via electronic signature.

---

## Signatures

**HIRE BETTER TALENT LLC** (d/b/a Antellion)

Signature: ___________________________

Name: [SIGNATORY NAME]

Title: [SIGNATORY TITLE]

Date: _______________

---

**[PARTNER LEGAL NAME]**

Signature: ___________________________

Name: [SIGNATORY NAME]

Date: _______________

---

## Related Files

- `docs/full-assessment-offer-stack.md` — pricing that drives referral math
- `docs/msa-template.md` — customer-facing agreement
- `docs/sow-template.md` — per-engagement SOW (defines the fees the referral calculates against)
- `docs/stripe-quote-guide.md` — how customer payments flow, which is when referral fees are triggered

## Changelog

- **2026-04-20** — Initial program design + agreement template created. Requires counsel review before use.
- **2026-04-22** — Legal entity updated throughout: Antellion is a d/b/a of Hire Better Talent LLC. Parties section and signature block reflect the corrected entity disclosure.
