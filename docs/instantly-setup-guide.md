# Instantly Setup and Launch Guide

**Purpose:** Reference doc for configuring Instantly ahead of the April 29, 2026 cold email launch, and operating the campaign post-launch. Open this when you're actually in the Instantly dashboard working through setup.

**Relationship to other docs:**

- `docs/email-campaign-v1.md` — email copy, subject lines, sequence strategy (originally written for Apollo; content transfers to Instantly)
- `docs/warmup-and-launch-plan.md` — warmup timeline and deliverability thresholds (Warmbox, not Instantly's native warmup)
- `docs/response-templates.md` — 9 reply templates to save as Instantly Snippets
- `docs/outreach-tracker.csv` — log for every reply and outcome
- `docs/calendar-blocks.md` — operational cadence during active campaign

---

## Total time budget

**3-4 hours** across the remaining 9 days before launch, broken down as:

| Phase | Sections | Est. time |
|---|---|---|
| Initial configuration | 1, 2, 4, 5, 6 | 70 min |
| Lead list import | 3 | 30-45 min |
| Response handling setup | 7 | 30 min |
| End-to-end testing | 8 | 45 min |
| Pre-launch gates | 9 | 30 min (Apr 27-28) |
| Launch day | 10 | Monitoring, not setup |

---

## 1. Sending infrastructure (30 min)

- [ ] **Connect `jordan@antellion.com` mailbox** to Instantly via SMTP/IMAP (Google Workspace)
- [ ] **DISABLE Instantly's native warmup.** You are using Warmbox externally. Running both creates conflicting warm-up signal and wastes engagement.
- [ ] **Set daily send limit to 5/day** at launch. Will ramp per the launch plan.
- [ ] **Configure sending window:** 7:30–8:30 AM **recipient's local time**, not yours. Instantly supports timezone-aware scheduling.
- [ ] **Configure sending days:** Tuesday, Wednesday, Thursday only. No Mon/Fri/weekends.
- [ ] **Set campaign start date:** Tuesday, April 29, 2026.
- [ ] **Re-verify SPF/DKIM/DMARC** in Instantly's mailbox health view. Should be green from initial Google Workspace setup; fail here means DNS drift has happened.

---

## 2. Campaign mechanics (20 min)

The 3-email sequence copy and subject lines live in `docs/email-campaign-v1.md`. Configuration steps in Instantly:

- [ ] **Email 1 send timing:** Day 0 (when sequence starts for each lead)
- [ ] **Email 2 delay:** Day 3–4 after Email 1; trigger condition = "no reply, no click"
- [ ] **Email 3 delay:** Day 9–11 after Email 2; trigger condition = "no reply, no click" (breakup email)
- [ ] **A/B subject line variants on Email 1** — 3 variants running in rotation:
  - A: `ran a quick AI audit on {{companyName}}`
  - B: `what AI tells candidates about {{companyName}}`
  - C: `5-minute read: how candidates see {{companyName}} in AI`
- [ ] **"Stop sequence on reply"** = **enabled.** Critical. Do NOT email a prospect who already replied.
- [ ] **"Stop sequence on click"** = **disabled.** Clicks without replies should continue the sequence.
- [ ] **Open tracking** = enabled
- [ ] **Click tracking** = enabled

---

## 3. Lead list (30–45 min)

- [ ] **Prepare CSV** with 24 leads. Required columns (names must match merge fields in emails exactly):
  - `firstName`
  - `lastName`
  - `email`
  - `companyName`
  - `title`
  - `companyDomain`
- [ ] **Import the CSV** into Instantly.
- [ ] **Verify merge fields render** — for each of the 24 leads, preview Email 1 in Instantly's preview. Look for `{{firstName}}` rendering as a name (not the literal placeholder) and `{{companyName}}` rendering correctly.
- [ ] **Check for bad email formats** — Instantly flags invalid emails; remove them.
- [ ] **Run Instantly's email verification** on the list (built-in, ~$0.01 per lead). Verifies deliverability before send. Worth the 25 cents of spend.
- [ ] **Spot-check 3–5 leads manually:** confirm the company's domain resolves, the email follows the company's pattern, and the title is current (LinkedIn check).

---

## 4. Links and UTMs (10 min)

Every link in every email needs UTM parameters for attribution and analytics. Pattern:

```
https://antellion.com?utm_source=instantly&utm_medium=email&utm_campaign=cto_v1&utm_content=email_1
```

- [ ] **Email 1 link:** `utm_content=email_1`
- [ ] **Email 2 link:** `utm_content=email_2`
- [ ] **Email 3 link:** `utm_content=email_3`
- [ ] Verify each UTM by clicking the link in Instantly's preview and watching the URL that loads. The query params must appear in the landing page URL.

---

## 5. Blocklist and safety (5 min)

- [ ] **Domain blocklist:**
  - `symphonytalent.com` — never email own employer's domain
  - `antellion.com` — never email own company's domain
  - Any Symphony Talent customer domain you know about. Pre-block even if they're not on your 24-lead list, to prevent future slipups.
- [ ] **Email blocklist** (individual addresses): add any personal emails you don't want to accidentally hit
- [ ] **Global unsubscribe list** — confirm Instantly is honoring unsubscribes across all campaigns

---

## 6. Unsubscribe compliance (5 min)

CAN-SPAM requires both of these in every commercial email. Without them, you're legally exposed.

- [ ] **Unsubscribe link** in every email footer. Instantly auto-inserts this when configured correctly — verify it's present in the rendered email preview.
- [ ] **Physical mailing address** in every email footer. CAN-SPAM requirement. Can be a registered business address or PO Box. Not optional.
- [ ] **"Unsubscribe" handled gracefully** — clicking the link should:
  - Remove them from this campaign
  - Add them to Antellion's global unsubscribe list
  - Show a simple confirmation page (not a 404 or error)

---

## 7. Response handling setup (30 min)

- [ ] **Inbox forwarding to `jordan@antellion.com`** (optional). If you prefer Gmail over Instantly's inbox, forward all replies. Otherwise use Instantly's inbox natively.
- [ ] **Save all 9 reply templates from `docs/response-templates.md` as Instantly Snippets.** Label each one by scenario (Interested / Bad Timing / Objection-Glassdoor / etc.) so you can insert in 1 click during live reply.
- [ ] **Slack integration (optional but recommended):** send real-time notifications to a `#outreach-replies` channel for reply events. Enables 2-hour response SLA without checking Instantly constantly.
- [ ] **Auto-responder OFF** — do NOT enable any auto-reply from `jordan@antellion.com`. All replies are handled personally within 2 hours per `docs/calendar-blocks.md`.

---

## 8. Testing (45 min — do 1–2 days before launch)

End-to-end verification on a personal test account.

- [ ] **Add a personal email as a dummy lead** (e.g., your personal Gmail). Use fake company and name values.
- [ ] **Send Email 1 manually to the test address** using Instantly's "send test" feature.
- [ ] **Verify inbox placement:**
  - [ ] Lands in Gmail **Inbox** (not Promotions, not Spam)
  - [ ] Lands in Outlook **Inbox** (if you have an Outlook test address)
  - [ ] Check Yahoo if any of your 24 leads are on Yahoo
- [ ] **Verify merge fields render correctly** — first name, company name, any other merge fields
- [ ] **Click every link** — confirm each URL loads and UTM parameters appear in the landing page URL
- [ ] **Click the unsubscribe link** — confirm it processes correctly
- [ ] **Check email source** (Gmail: "Show original") — confirm SPF, DKIM, DMARC all **PASS**
- [ ] **Run one final mail-tester.com check** — send a test to their address, target **9/10+** score
- [ ] **Remove the test lead** from the campaign before activation

---

## 9. Pre-launch gates (Apr 27–28 — Session B)

Before flipping the campaign from Draft to Active, confirm every item:

- [ ] Warmbox warmup score **80+**
- [ ] Inbox placement rate **95%+** per Warmbox
- [ ] mail-tester score **9/10+** (fresh run)
- [ ] Test email lands in Gmail Inbox, Outlook Inbox
- [ ] All 24 leads have valid emails + correct merge fields
- [ ] Sequence configured with A/B subject lines, proper delays, stop-on-reply
- [ ] UTMs on all links
- [ ] Blocklist loaded
- [ ] Reply templates saved as Instantly Snippets
- [ ] Calendar blocks confirmed for Tue/Wed/Thu 7:30–10:00 AM
- [ ] At least 1 Snapshot dry run completed (see `docs/calendar-blocks.md` — this lives outside Instantly but is a launch gate)

---

## 10. Launch day (Tue Apr 29)

Pure monitoring, no setup.

- [ ] **7:25 AM** — open Instantly, confirm campaign is in **Draft**
- [ ] **7:29 AM** — flip to **Active**
- [ ] **7:30–8:30 AM** — watch first sends go out on timezone-aware schedule
- [ ] **8:30–10:00 AM** — monitor for bounces, opens, and replies
- [ ] **Throughout the day** — respond to any replies within 2 hours using the Instantly Snippets from `docs/response-templates.md`
- [ ] **End of day** — log every reply in `docs/outreach-tracker.csv`

---

## 11. Post-launch: first two weeks

### Daily during active send days (Tue/Wed/Thu)

Per `docs/calendar-blocks.md`:

- 7:30–8:30 AM: sending window — Instantly open, no meetings
- 8:30–10:00 AM: reply monitoring — respond within 2 hours
- Log every reply same day

### Metrics to watch in Instantly

| Metric | Healthy | Warning | Stop & investigate |
|---|---|---|---|
| Bounce rate | < 2% | 2-5% | > 5% |
| Open rate | 35-50% | 25-35% | < 25% |
| Reply rate (total) | 3-8% | 1-3% | < 1% |
| Positive reply rate | 2-5% | 0.5-2% | 0% after 30+ sends |
| Spam complaints | 0 | 1 in 50+ | > 1 in 50 |
| Unsubscribes | Normal | N/A | N/A (part of normal activity) |

### When to adjust

- **Bounce rate > 5%:** pause, clean the list, remove bounced addresses. Bounce rate is the #1 killer of sender reputation.
- **Open rate < 25%:** possible spam placement. Run a fresh mail-tester check and a GlockApps seed test. Reduce cold volume by 50% for 3-5 days.
- **Reply rate strong (3%+) but Snapshot requests low:** landing page friction. Investigate form flow, mobile rendering, or messaging clarity.
- **Spam complaint rate > 1 in 50:** kill the campaign immediately. Diagnose subject line, sender name, or content. Do not resume without a change.

### A/B subject line analysis

After ~75-100 sends, Instantly's A/B data should show which of the 3 subject lines is winning. Rules:

- **Compare on reply rate**, not open rate. Apple Mail Privacy Protection inflates open rates and makes them unreliable.
- **Kill the bottom variant** if reply rate is materially lower (say, <50% of the best variant's rate).
- **Let the winner and second-place run** through the full 24-lead campaign.
- **For campaign V2** (next cohort), start with the winner and test 2 new variants.

---

## Known pitfalls and gotchas

### Instantly-specific

- **Instantly's native warmup will fight Warmbox.** Confirmed disabled. If Instantly later asks you to "enable warmup" via a prompt or UI, say no.
- **Instantly's "Auto-Pause on Bounce"** is on by default in most accounts. Keep it on. It stops the campaign if bounce rate spikes above a threshold.
- **"Test send" feature may bypass normal sending window.** A test email can land at 3 PM even though your campaign sends at 7:30 AM. Do NOT assume the test send time = the real send time.
- **Merge field syntax is strict.** `{{firstName}}` works; `{{first_name}}` or `{{firstname}}` does not. Verify your CSV column names match exactly.
- **Email verification runs on the campaign, not on the global list.** If you add leads later, re-run verification on the new additions.

### Deliverability-specific

- **Friday replies are common.** Enterprise buyers often catch up on email Friday morning. Keep reply-monitoring windows Tue/Wed/Thu, but check Monday AM for any Friday/weekend replies.
- **Out-of-office auto-replies are not engagement signals.** Instantly may count them as replies; they're not. Manually re-enable the sequence for OOO'd leads after their return date.
- **One bounce can sink the campaign.** If the first bounce is your first send, Instantly's reputation protection may throttle future sends. Best practice: pre-verify the list thoroughly before launch.

### Symphony Talent constraint

- **Do not email any Symphony Talent customer or prospect.** Confirm each of the 24 leads is clean against Symphony's account list before launch.
- **Any reply that mentions Symphony Talent** (positive or negative) — do not engage on that thread. Respond with a polite "thanks for the note, I'm focused on Antellion's work" and move on. Do not compare, do not acknowledge, do not defend.

---

## What to skip for v1

Avoid these pre-launch to keep complexity manageable:

- **Instantly Copilot** — optional, can configure after first 10 sends
- **Advanced workflow automations** (conditional branches, multi-touch logic) — keep v1 simple
- **Multiple campaigns** — one campaign (CTO V1) is enough. Build V2 after 30 days with data.
- **Lead Finder / prospecting inside Instantly** — you have 24 vetted leads; adding more pre-launch delays launch
- **Multi-mailbox rotation** — single mailbox is fine for the first 100 sends. Add a second mailbox if/when volume exceeds 30/day sustained.

---

## Priority order for remaining work

If you have limited time, tackle in this order:

1. **Tonight (70 min):** Sections 1, 2, 4, 5, 6 — sending infrastructure, campaign mechanics, UTMs, blocklist, unsubscribe compliance
2. **Tomorrow or Wednesday (45 min):** Section 3 — lead list import and verification
3. **Thursday or Friday (30 min):** Section 7 — response handling, Snippets, Slack notifications
4. **Saturday or Sunday (45 min):** Section 8 — testing
5. **Apr 27–28 (30 min):** Section 9 — pre-launch gates
6. **Apr 29:** Section 10 — launch day monitoring

---

## Related files

- `docs/email-campaign-v1.md` — email copy + subject line variants
- `docs/warmup-and-launch-plan.md` — Warmbox schedule + deliverability thresholds
- `docs/response-templates.md` — reply templates to save as Snippets
- `docs/outreach-tracker.csv` — outcome log
- `docs/calendar-blocks.md` — operational rhythm during active campaign
- `docs/full-assessment-offer-stack.md` — pricing conversations triggered by replies

## Changelog

- **2026-04-20** — Initial guide created.
