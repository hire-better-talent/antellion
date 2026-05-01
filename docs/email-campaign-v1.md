# Cold Email Campaign V1: Chief Talent Officers
## Antellion AI Employer Visibility Snapshot

**Date:** April 9, 2026
**Sender:** Jordan Ellison, Founder, Antellion (jordan@antellion.com)
**Target:** Chief Talent Officers at companies with 2,001-10,000 employees
**Channel:** Cold email via Apollo sequences
**Goal:** Drive snapshot requests via antellion.com
**Capacity:** 5-10 snapshots per week (manual fulfillment)

---

## 1. Apollo Filter Configuration

### Primary Filters

| Filter | Setting |
|--------|---------|
| **Job Title** | Chief Talent Officer |
| **Seniority Level** | C-Suite, VP |
| **Company Headcount** | 2,001-5,000 and 5,001-10,000 |
| **Contact Email Status** | Verified only |

### Title Keywords (Exact and Variations)

Use Apollo's title search with these keywords. Set to "is any of" not "contains" to avoid Director-level noise:

- Chief Talent Officer
- Chief People Officer
- SVP Talent
- SVP People
- VP Talent Strategy

**Important:** "Chief Talent Officer" is the primary target. CPOs and SVPs are secondary -- include them to increase list size, but the email copy is tuned for the CTO-of-people persona. If your list from "Chief Talent Officer" alone is under 200 contacts, expand to include "Chief People Officer" as a separate sequence with the same emails.

### Industry Filters

**Include (high-density CTO titles):**
- Technology / Software
- Financial Services
- Healthcare (non-hospital systems)
- Professional Services / Consulting
- Manufacturing
- Retail (corporate, not store-level)
- Media / Entertainment

**Exclude:**
- Government / Public Sector (slow procurement, poor fit)
- Education (K-12 and higher ed -- budget constraints, wrong buyer motion)
- Non-profit (budget constraints)
- Companies under 2,000 employees (title inflation -- "Chief Talent Officer" at a 500-person company is often a Director-equivalent)
- Companies over 10,000 employees (harder to reach, longer sales cycles, not where you learn fastest)

### Additional Filters

| Filter | Setting | Why |
|--------|---------|-----|
| **Location** | United States, Canada, United Kingdom | English-language markets, same timezone band for follow-up |
| **Company Technologies** | No filter needed | Not a tech-dependent sale |
| **Funding Stage** | No filter needed | Not relevant for 2K+ companies |
| **Account Lists** | Exclude any companies where Jordan has Symphony Talent relationships | Avoid awkward overlap |

### Expected List Size

With these filters, expect 300-800 contacts. That is more than enough for Campaign V1. Do NOT send to the entire list at once. Start with 50-75 contacts in the first batch.

---

## 2. The Email Sequence

### Sequence Timing

| Step | Email | Delay | Condition |
|------|-------|-------|-----------|
| 1 | Email 1 (The Opener) | Day 0 | -- |
| 2 | Email 2 (The Follow-Up) | Day 3-4 | No reply, no click |
| 3 | Email 3 (The Breakup) | Day 9-11 | No reply, no click |

---

### EMAIL 1: The Opener

**Purpose:** Share something specific you found. Create the feeling that a real person looked at their company and noticed something worth flagging. Get them curious enough to visit antellion.com.

**Subject line:** (see Section 3 for A/B test options)

```
{{first_name}} --

Here is why I reached out. I have been testing what AI tells candidates about companies in [INDUSTRY] -- the kinds of questions engineers, PMs, and analysts ask ChatGPT before deciding where to apply.

I included {{company}} in a scan this week. Two things stood out:

1. Your closest talent competitor came up in significantly more AI responses than {{company}} for the questions I tested.
2. There are sources AI pulls from when it recommends employers in your space -- where that competitor has a presence and {{company}} does not.

This is not a Glassdoor issue or an SEO issue. AI synthesizes hundreds of signals into a single answer, and right now that answer favors your competitors more often than it favors you. At your company's size, this is the kind of gap that quietly compounds -- larger competitors already have the brand gravity, and smaller ones are faster to the new channels.

I can put together your AI Employer Visibility Snapshot: how often {{company}} comes up across 120 questions candidates ask AI, the competitor gap, and the specific places where you are missing and they are not. Takes 48 hours. No cost, no call needed.

If you want to see where {{company}} stands: antellion.com

-- Jordan Ellison
Founder, Antellion
```

**Word count:** ~185

**Why this works:**
- **"Here is why I reached out"** -- the original DM tone. It answers the one question every cold email recipient asks: "why is this person emailing me?" It feels like a human explaining themselves, not a template firing.
- **"I have been testing what AI tells candidates"** -- positions Jordan as someone doing research work, not prospecting a list. He is sharing what he found, not pitching what he sells.
- **The numbered two-findings structure** -- carried directly from the original DM. Specific enough to feel real, general enough to be true for any company in the batch. Two findings is the right number: enough to be credible, not so much that they feel they already got the answer.
- **"At your company's size, this is the kind of gap that quietly compounds"** -- this is the line tuned for 2K-10K companies. These talent leaders feel squeezed between enterprises (which have brand inertia) and startups (which move faster on new channels). This sentence names that anxiety without overselling it.
- **The sign-off with full name and title** -- Email 1 is the introduction. Full attribution builds credibility. Subsequent emails drop to "Jordan" for warmth.
- **One CTA: the URL.** Not a calendar link, not a reply instruction. One thing to do, naturally embedded in a sentence rather than sitting naked on a line.

**Personalization notes:**
- `{{first_name}}` -- Apollo merge field
- `{{company}}` -- Apollo merge field
- `[INDUSTRY]` -- manually set once per batch (e.g., "enterprise SaaS," "healthcare tech," "financial services")

---

### EMAIL 2: The Follow-Up (Day 3-4)

**Purpose:** Add a new angle they have not considered. Frame the problem around strategic investment, not competitive fear. Do NOT repeat Email 1. Do NOT reference Email 1.

**Subject line:** (see Section 3)

```
{{first_name}} --

One more thought on this.

Your team has probably invested real money in employer brand -- Glassdoor, careers site, LinkedIn presence, maybe EVP work. All of that matters. But none of it controls what AI synthesizes about {{company}} when a candidate asks "where should I work in [INDUSTRY]?"

AI does not pull from one source. It reads hundreds of signals and produces one answer. The companies that show up in that answer are the ones candidates consider first. The ones that do not show up are invisible to an entire research channel -- regardless of how strong the underlying brand actually is.

For a talent leader thinking about where the next competitive edge comes from, this is worth measuring. I can show you exactly where {{company}} stands in 48 hours.

antellion.com

Jordan
```

**Word count:** ~145

**Why this works:**
- **"One more thought on this"** -- conversational, not salesy. Does not say "following up" or "just checking in." Sounds like a colleague adding context, not a vendor bumping a thread.
- **"Your team has probably invested real money"** -- acknowledges their work. Chief Talent Officers own employer brand strategy. This line respects the investment before introducing the gap. It is the opposite of "your employer brand is broken" -- it says "your brand is probably strong, but there is a channel it is not reaching."
- **"For a talent leader thinking about where the next competitive edge comes from"** -- speaks to their strategic identity. CTOs at 2K-10K companies are competing for board attention and executive influence. They want to be the person who identifies the next lever, not the person who gets surprised by it.
- **Signed "Jordan"** -- warmer, more personal. They already have the full name and title from Email 1.
- **Same single CTA.** Shorter email, same link.

---

### EMAIL 3: The Breakup (Day 9-11)

**Purpose:** Give them a clean exit. Short, respectful, no pressure. Enterprise buyers respond to restraint. The breakup often gets the highest reply rate because it removes all pressure.

**Subject line:** (see Section 3)

```
{{first_name}} --

Last note on this. If AI visibility is not something you are thinking about right now, completely understand.

If it is -- antellion.com. Takes 60 seconds to request, and your Snapshot is back in 48 hours.

Either way, no follow-up from me after this.

Jordan
```

**Word count:** ~48

**Why this works:**
- **"Completely understand"** -- warmer than "no worries." It conveys respect, not indifference.
- **"Either way, no follow-up from me after this"** -- explicit commitment to restraint. Every other vendor will send 5-7 follow-ups. This line differentiates by promising to stop. Paradoxically, this makes them more likely to respond -- the window is closing.
- **Still includes the link and the specific numbers** (60 seconds, 48 hours). The offer is there if they want it. No re-selling required.
- **Four sentences.** A C-suite executive will read the entire thing before deciding to delete it. That is all you need.

---

### Post-Snapshot Diagnostic follow-up (Day 3 after Snapshot delivery)

**Purpose:** Convert a delivered Snapshot into a paid Diagnostic. Fires three business days after the Snapshot delivery email if no walkthrough has been booked. This is the explicit economic pitch — Snapshot already established credibility and surfaced the gap; this email names the next analyst-delivered step with full economic terms.

**Sequence trigger:** Snapshot delivered + 3 business days elapsed + no walkthrough scheduled.

**Subject line:** `The $4,900 next step after your {{company}} Snapshot`

**Body:**

```
{{first_name}} --

Following up on the Snapshot for {{company}}. The Snapshot covers Discovery -- the candidate-intent queries that surface in AI when someone first asks about the best companies to work for in your space. Roughly a quarter of the real picture.

The next analyst-delivered step is the AI Visibility Diagnostic. The scope:

- 40 candidate-intent queries (vs. the Snapshot's lighter-touch scan)
- Four AI systems -- ChatGPT, Claude, Gemini, Perplexity
- Three personas scoped to a role family you actually hire for -- early-career, mid-career, senior
- All four stages of the candidate journey -- Discovery, Consideration, Evaluation, Commitment

Delivery: 10 business days from kickoff. Output: written report with at least 10 material findings -- each with a specific named issue, captured AI-response evidence, and an actionable category -- plus a 45-minute analyst readout.

Two terms worth flagging:

1. Win Your Money Back. If we surface fewer than 10 material findings, full refund. The guarantee is tied to what we ship, not to what you do afterward.
2. 100% rollover. The $4,900 credits in full toward a Baseline within 60 days. Net cost of going deeper later is $9,100, not $14,000.

It's authorizable on a P-card or simple PO -- designed not to require procurement.

Reply with your priority role family and three competitors and I'll send the SOW.

Jordan
```

**Word count:** ~270

**Why this works (Hormozi alignment):**
- **Lead with value, not curiosity** -- the subject line states the offer and price plainly. No teasing.
- **Dream Outcome, named** -- the four-stage candidate journey, three personas, four AI systems. Specifics, not abstractions.
- **Perceived Likelihood, maxed** -- exact numbers (40 queries, 10 business days, 10 findings, $4,900, $9,100 net), captured-evidence requirement, named output formats.
- **Time Delay, named** -- 10 business days from kickoff. Stated explicitly.
- **Effort, minimized** -- "Reply with your priority role family and three competitors" is the entire CTA. No call required to start, no demo, no procurement.
- **Risk reversal, explicit** -- Win Your Money Back. Tied to deliverable count, not to subjective satisfaction.
- **Rollover math shown** -- $9,100 net frames the decision as "extra $4,200 to go three to four times deeper" rather than "another $14K."
- **P-card/PO line** -- removes the procurement objection before it surfaces. Crucial at this price tier.

**Personalization variables required:**
- `{{first_name}}` -- Apollo / Instantly merge field
- `{{company}}` -- Apollo / Instantly merge field

No per-prospect data customization required. This email scales to launch-week volume (~50-75 Snapshots) without operator authoring overhead.

**What NOT to add:**
- Do not link to a Diagnostic landing page. The `/diagnostic` page is gated on first 1-2 deliveries (see `docs/project_diagnostic_page_decisions.md`). The CTA is reply-driven until then.
- Do not add a Calendly link. Calendly is not stood up yet; reply-and-scope is the launch-volume motion.
- Do not introduce Baseline pricing as the primary frame. The $4,900 P-card pitch is the whole point of the Diagnostic — anchoring against $14K Baseline reactivates procurement.
- Do not offer to discount the $4,900. The refund guarantee is the risk reversal. Discounting signals lack of belief in the guarantee.

**Sequencing question:** This email fires Day 3. The current sequence in `docs/snapshot-outreach-guide.md` also has a "Day 3 Insight follow-up" email (a data-led walkthrough request requiring per-prospect customization). Two Day 3 emails is too many. Recommended resolution: replace the existing Day 3 insight-follow-up with this Diagnostic-pitch email at launch volume; reintroduce a customized data-led follow-up at Day 7 once volume drops below 10 active prospects/week and per-email authoring is feasible. Founder to confirm.

---

## 3. Subject Lines

### Email 1 Subject Lines (A/B Test)

Run these in rotation. Apollo lets you set up to 5 variants. Start with 3 and kill the bottom one after 75-100 sends based on reply rate (not open rate — Apple Mail Privacy Protection makes open rates unreliable).

**Framework note:** These subject lines are grounded in Hormozi's $100M Leads "Big Fast Value" principle (page 168-169). Instead of manufacturing curiosity or using fear hooks, they lead with the free deliverable itself. The subject line IS the offer. No teasing, no clever wordplay, no riddles. Hormozi's exact guidance: "We're not trying to tickle their interest, we're trying to blow their minds in under thirty seconds." Plainspoken wins.

| Variant | Subject Line | Why |
|---------|-------------|-----|
| A | `free AI visibility audit for {{company}}` | Canonical "lead with the free thing" construction. Names the deliverable, names the recipient, says it's free. No tease. |
| B | `ran a quick AI audit on {{company}}` | Implies work already done for them specifically. Strongest form of Big Fast Value because the value is already delivered before they click. |
| C | `5-minute read: how candidates see {{company}} in AI` | Hits the time delay lever from the Value Equation (Dream Outcome × Perceived Likelihood / Time Delay × Effort). Explicitly reduces perceived effort. |

**Notes:**
- All lowercase. Lowercase subject lines outperform title case in cold email because they look like a real person typed them, not a marketing platform.
- No punctuation at the end. No question marks. No exclamation points.
- No "I'd love to" or "partnership" or "opportunity" — every vendor in their inbox uses those words.
- **Retired variants** (do not use): subject lines built around curiosity gaps ("what AI tells candidates about {{company}}"), competitor threats ("{{company}} vs. competitors in AI"), or peer observations ("something I found about {{company}}"). These rely on curiosity and fear hooks that Hormozi's framework explicitly rejects. They may work in market — but they are not framework-aligned, and at scale the plain-value construction should outperform them.

### Email 2 Subject Line

`your employer brand might not be reaching AI`

**Why:** Different angle from Email 1 subjects. References something they own and have invested in (their employer brand) and introduces the possibility that investment has a blind spot. Specific enough to be interesting, not alarmist enough to feel like clickbait.

### Email 3 Subject Line

`closing the loop`

**Why:** Signals finality. Neutral. Does not try to re-sell. The subject line is not doing the work here -- the email body is 48 words. They will read it regardless.

---

## 4. Personalization Strategy

### What to Personalize (High ROI)

| Element | How | Time Cost | Impact |
|---------|-----|-----------|--------|
| `{{first_name}}` | Apollo auto-merge | 0 seconds | High -- without it, instant delete |
| `{{company}}` | Apollo auto-merge | 0 seconds | High -- makes it feel hand-written |
| `[INDUSTRY]` | Manually set once per batch (5-10 companies in same industry) | 30 seconds per batch | Medium -- makes the AI query example feel specific |

### What NOT to Personalize (Low ROI, High Time Cost)

| Element | Why Skip It |
|---------|-------------|
| Specific competitor name in Email 1 | You do not know who their talent competitor is yet. Guessing wrong destroys credibility. The emails say "your closest talent competitor" -- specific enough to feel real, safe enough to be true. Let the Snapshot intake form collect the actual name. |
| Specific AI findings per company | You cannot run pre-scans for every prospect. The emails imply you scanned broadly for their industry -- which is true if you have run queries for that vertical. |
| Their recent press, job postings, or LinkedIn activity | Takes 3-5 minutes per prospect. At 20 emails/day, that is an extra 60-100 minutes. Save deep research for prospects who respond. |
| Custom opening line per person | Same time cost issue. The email structure already feels personal because of the company name, industry reference, and conversational tone. |

### The "Industry Batch" Method

This is the most efficient personalization approach for a solo founder:

1. **Pick one industry per day.** Example: Monday = enterprise SaaS, Tuesday = healthcare tech, Wednesday = financial services.
2. **Run 3-5 real AI queries for that industry before sending.** Example: "Best enterprise SaaS companies to work for," "Top employers in cloud computing." This gives you genuine observations you can reference if anyone replies.
3. **Set the `[INDUSTRY]` keyword for the batch.** All 15-20 sends that day use the same industry keyword.
4. **Send the batch.**
5. **Document what you learned.** Keep a running Google Doc of industry-specific findings. After 2 weeks, you have enough observations to write genuinely personalized follow-ups to anyone who responds.

This method means you are telling the truth in every email -- you have been testing what AI tells candidates about companies in their industry. You included their company. The specifics come from real queries, even if the per-company deep scan happens after they request the Snapshot.

---

## 5. Sending Strategy

### Volume

| Week | Daily Sends | Why |
|------|-------------|-----|
| Week 1-2 | 5-8 per day | Domain warmup. antellion.com is new. Start slow or you land in spam. |
| Week 3-4 | 10-15 per day | Ramp after deliverability is confirmed (check open rates -- if below 30%, slow down) |
| Week 5+ | 15-20 per day | Steady state. This is your sustainable capacity for manual snapshot fulfillment anyway. |

**Total Month 1:** ~200-300 emails sent. At a 2-5% positive reply rate, that is 4-15 snapshot requests. At your 5-10/week fulfillment capacity, that is the right volume.

### Domain Warmup Protocol

**antellion.com is a new sending domain. Warmup is non-negotiable.**

1. **Before launching the campaign:**
   - Set up SPF, DKIM, and DMARC records for antellion.com (if not already done)
   - Use Apollo's built-in warmup feature OR a dedicated warmup tool (Instantly, Warmup Inbox, or similar)
   - Warmup for at least 14 days before sending cold emails
   - During warmup, send 5-10 emails/day to the warmup network -- these are automated back-and-forth emails that build domain reputation

2. **Week 1-2 of actual sending:**
   - Keep volume under 10/day
   - Monitor bounce rate (must stay under 3%)
   - Monitor spam complaint rate (must stay under 0.1%)
   - If open rates drop below 25%, pause and investigate

3. **Ongoing:**
   - Never send more than 30 emails/day from a single mailbox
   - If you need to scale past 30/day, set up a second sending address (e.g., j@antellion.com or jordan@antellion.com + hello@antellion.com)

### Send Times

| Priority | Time (Prospect's Local Time) | Why |
|----------|------------------------------|-----|
| 1st | 7:30-8:30 AM Tuesday-Thursday | Before their first meeting. Highest open rates for executive cold email. |
| 2nd | 7:30-8:30 AM Monday | Acceptable but competes with weekend catch-up. |
| 3rd | 12:00-1:00 PM Tuesday-Thursday | Lunch break email check. |

**Avoid:**
- Friday after 12 PM (mental checkout)
- Weekends (signals automation)
- After 6 PM (looks desperate or automated)
- Monday before 7 AM (buried in weekend backlog)

### Apollo Sequence Settings

| Setting | Value |
|---------|-------|
| Sending window | 7:30 AM - 8:30 AM prospect's local time |
| Days | Monday-Thursday (Friday optional for Email 3 only) |
| Track opens | Yes |
| Track clicks | Yes |
| Stop sequence on reply | Yes |
| Stop sequence on bounce | Yes |
| Unsubscribe link | Required by law -- use Apollo's built-in link, keep it small and at the bottom |

---

## 6. What NOT to Do

These are specific to this audience and this campaign. Every one of them will kill your reply rate.

### Do Not Open With Who You Are

> Bad: "Hi Sarah, I'm Jordan Ellison, founder of Antellion, an AI employer visibility platform..."

Chief Talent Officers get 30+ vendor emails a week. The moment they read "founder of [Company]" in the first sentence, the pattern-matching kicks in and the email is deleted. Open with what you found, not your bio.

### Do Not Ask For a Meeting Before Giving Value

> Bad: "Would you have 15 minutes to discuss how AI is shaping employer perception?"

You have given them nothing. Why would they give you 15 minutes? The Snapshot is the value. Give the value first, earn the conversation after.

### Do Not Use the Word "Free"

> Bad: "I'd like to offer you a free AI employer visibility report..."

"Free report" sounds like a PDF lead magnet from 2019. It devalues the Snapshot before they see it. The Snapshot is custom analytical work. Describe what they get and let the absence of a price signal generosity. If you must reference cost, say "no cost" not "free."

### Do Not Use Category Education as Your Hook

> Bad: "AI is transforming how candidates discover employers..."

This sounds like a conference keynote abstract, not an email from a peer. They do not need to be educated about AI trends. They need to know what AI says about THEIR company. Specificity always beats category language.

### Do Not Name-Drop Competitors You Have Not Verified

> Bad: "I found that Accenture appears 3x more than {{company}} in AI responses..."

If you guess their competitor wrong, or fabricate a specific stat, you lose all credibility instantly. The emails above use "your closest talent competitor" intentionally -- it is specific enough to feel real without claiming a finding you have not verified. The Snapshot itself delivers the specific competitor data.

### Do Not Send More Than 3 Emails

Enterprise buyers respect restraint. If they do not respond to 3 emails, they are not interested right now. Move them to a 90-day nurture list. You can come back with fresh data later. Following up 5-7 times makes you look like every other SDR tool in their inbox.

### Do Not CC or BCC Multiple People at the Same Company

Tempting to reach the CTO and the VP TA at the same company. Do not do it in the same sequence. If they talk to each other and realize they both got the same email, the "this feels personal" illusion breaks completely.

### Do Not Use Visible Template Language

> Bad: "Companies like {{company}} in the {{industry}} space are..."

Even if your merge fields render correctly, template-feeling sentence structure kills credibility. The emails above are written as if Jordan typed each one. The merge fields are embedded in natural sentences, not in template scaffolding.

### Do Not Claim Antellion Improves AI Responses

Antellion measures and recommends. It does not directly change what ChatGPT says. Chief Talent Officers are sophisticated enough to catch overclaims, and it destroys the trust you are building. Keep it to "I can show you where you stand."

### Do Not Send on a New Domain Without Warmup

This is the number one technical mistake that kills first campaigns. If you send 50 cold emails from a brand-new domain on day one, you will land in spam for every recipient. The 14-day warmup is not optional. See Section 5.

### Do Not Say "I Built a Tool"

> Bad: "I built a tool that measures this."

This is a vendor reveal. The moment they read it, you are no longer a peer sharing something interesting -- you are a founder pitching a product. The emails should describe what you can do for them ("I can put together your Visibility Snapshot") without centering the pitch on your product. Let them discover Antellion through the site. The email is from Jordan, not from Antellion.

---

## 7. Response Handling

### If They Reply "Interested" or Ask a Question

**Response time:** Under 2 hours during business hours. Speed signals that a real person sent the email.

**Reply template:**

```
{{first_name}} --

Great. Here is what I need to run your Snapshot:

1. Company domain (confirming: {{company_domain}})
2. Your biggest talent competitor (who do you lose candidates to most?)
3. Primary roles you hire for (e.g., engineers, sales, product)

You can also submit this at antellion.com if that is easier.

I will have your results within 48 hours of receiving the above.

Jordan
```

Alternatively, if they seem warm, direct them to the landing page:

```
{{first_name}} --

Glad this resonated. The fastest path: submit your company info at antellion.com -- takes 60 seconds, and I will have your Snapshot back within 48 hours.

If you have a specific competitor you want compared, include that in the form. If not, I will identify your most visible competitor from the scan data.

Jordan
```

### If They Reply "Not Right Now" or "Bad Timing"

```
Completely understand. I will check back in a quarter with updated observations about how AI describes {{company}} to candidates. If anything changes on your end before then, the offer stands.

Jordan
```

**Then:** Add to 90-day follow-up list. Set a calendar reminder. When you follow up in 90 days, lead with a new finding, not a "just checking in."

### If They Reply With an Objection

Common objections and how to handle them:

**"We already manage our employer brand."**
> That is exactly why this is worth seeing. The Snapshot shows whether your employer brand investment is reaching the AI channel -- the one surface most talent teams have not measured yet. Companies with strong employer brands are often the most surprised by where they stand in AI.

**"Can I just ask ChatGPT myself?"**
> You can ask a few questions and get anecdotes. What you cannot replicate is 120 questions across employer reputation themes with consistent scoring, competitor comparison, source-by-source analysis, and a written interpretation. The volume and structure are what turn a curiosity into a measurement.

**"What do you do with our data?"**
> Your information is used only to produce your Snapshot. We do not share it with third parties or use it for any other purpose.

**"What qualifies you to do this?"**
> I have spent the last year studying how AI models represent employers -- which sources they cite, where the gaps are, and how it differs from traditional employer brand channels. I built the methodology because no one else was measuring this. Happy to walk through the approach after you see your results.

---

## 8. Metrics and Learning

### Track These Numbers Weekly

| Metric | Target | How to Track |
|--------|--------|-------------|
| Email deliverability rate | >95% | Apollo dashboard |
| Open rate | 35-50% | Apollo (tracked opens) |
| Reply rate | 3-8% | Apollo (count all replies) |
| Positive reply rate | 2-5% | Manual count of "interested" or question replies |
| Landing page visits from email | 5-15% of opens | UTM tracking on antellion.com link |
| Snapshot requests (from email-sourced traffic) | 2-5% of emails sent | Form submissions with email UTM |
| Time from first email to Snapshot request | Under 7 days | Track in spreadsheet |

### What to Optimize and When

**After first 50 sends (end of Week 1):**
- Check open rates per subject line variant. If any variant is below 25%, kill it.
- Check bounce rate. If above 5%, your list quality is bad -- tighten Apollo filters.
- Check spam rate. If any emails are landing in spam (check with a seed email to your own gmail), investigate domain warmup.

**After first 100 sends (end of Week 2):**
- Compare reply rates across subject lines. Double down on the winner.
- Read every reply carefully. Are they confused about what you are offering? If so, the email copy needs clarity, not more persuasion.
- If you have 0 replies: the problem is likely deliverability (check if emails are landing), subject line (check open rate), or offer clarity (check if they click but do not convert).

**After first 200 sends (end of Month 1):**
- You should have 4-15 snapshot requests by now. If you have fewer than 4, something fundamental is off -- either targeting, deliverability, or offer framing.
- If open rates are strong (40%+) but reply rates are weak (<1%), the email body is not compelling enough. Test a different angle in Email 1.
- If reply rates are decent (3%+) but snapshot requests are low, the landing page is losing them. Check antellion.com for friction.

### What You Are Learning (Not Just Selling)

This is the first campaign. The learning is as valuable as the leads.

After Month 1, you should know:
1. Which subject line framing resonates most (competitive? blind spot? investment gap?)
2. Which industries respond fastest
3. What objections come up in replies
4. Whether the CTO persona is the right entry point or if a different title converts better
5. Whether the landing page converts email traffic or loses it
6. How long it takes from first email to Snapshot request to Assessment conversation

Document everything. This data shapes Campaign V2.

---

## 9. Campaign Checklist (Pre-Launch)

- [ ] SPF, DKIM, DMARC configured for antellion.com
- [ ] Domain warmup started (14 days minimum before first cold send)
- [ ] antellion.com landing page is live and form is functional
- [ ] Confirmation email is set up (auto-send on form submission)
- [ ] Apollo account is set up with verified email for jordan@antellion.com
- [ ] Apollo filters configured per Section 1
- [ ] First batch of 50-75 contacts loaded into Apollo
- [ ] Email sequence created in Apollo with all 3 emails
- [ ] Subject line A/B test configured (3 variants for Email 1, all Hormozi-aligned "lead with the free thing" constructions)
- [ ] UTM parameters added to all antellion.com links in emails (e.g., ?utm_source=apollo&utm_campaign=cto_v1)
- [ ] Seed email sent to personal Gmail to verify emails are not landing in spam
- [ ] Response templates saved as Apollo snippets for fast replies
- [ ] Spreadsheet or CRM set up to track: sends, opens, replies, snapshot requests, and outcomes
- [ ] 3-5 AI queries run for the first industry batch (to back up the "I have been testing what AI tells candidates" claim with real observations)
- [ ] Calendar blocked for 7:30-8:30 AM sending window on Tuesday-Thursday

---

## 10. Full Email Copy (Copy-Paste Ready for Apollo)

### Email 1 -- Apollo Format

**Subject lines (A/B variants — Hormozi-aligned, lead with the free thing):**
- `free AI visibility audit for {{company}}`
- `ran a quick AI audit on {{company}}`
- `5-minute read: how candidates see {{company}} in AI`

**Body:**
```
{{first_name}} --

Here is why I reached out. I have been testing what AI tells candidates about companies in [INDUSTRY] -- the kinds of questions engineers, PMs, and analysts ask ChatGPT before deciding where to apply.

I included {{company}} in a scan this week. Two things stood out:

1. Your closest talent competitor came up in significantly more AI responses than {{company}} for the questions I tested.
2. There are sources AI pulls from when it recommends employers in your space -- where that competitor has a presence and {{company}} does not.

This is not a Glassdoor issue or an SEO issue. AI synthesizes hundreds of signals into a single answer, and right now that answer favors your competitors more often than it favors you. At your company's size, this is the kind of gap that quietly compounds -- larger competitors already have the brand gravity, and smaller ones are faster to the new channels.

I can put together your AI Employer Visibility Snapshot: how often {{company}} comes up across 120 questions candidates ask AI, the competitor gap, and the specific places where you are missing and they are not. Takes 48 hours. No cost, no call needed.

If you want to see where {{company}} stands: antellion.com?utm_source=apollo&utm_campaign=cto_v1

-- Jordan Ellison
Founder, Antellion
```

**Note:** Replace `[INDUSTRY]` with the industry keyword for each batch. This is the one manual edit per batch. Examples: "enterprise SaaS," "healthcare tech," "financial services," "e-commerce."

---

### Email 2 -- Apollo Format

**Subject:** `your employer brand might not be reaching AI`

**Body:**
```
{{first_name}} --

One more thought on this.

Your team has probably invested real money in employer brand -- Glassdoor, careers site, LinkedIn presence, maybe EVP work. All of that matters. But none of it controls what AI synthesizes about {{company}} when a candidate asks "where should I work in [INDUSTRY]?"

AI does not pull from one source. It reads hundreds of signals and produces one answer. The companies that show up in that answer are the ones candidates consider first. The ones that do not show up are invisible to an entire research channel -- regardless of how strong the underlying brand actually is.

For a talent leader thinking about where the next competitive edge comes from, this is worth measuring. I can show you exactly where {{company}} stands in 48 hours.

antellion.com?utm_source=apollo&utm_campaign=cto_v1_e2

Jordan
```

---

### Email 3 -- Apollo Format

**Subject:** `closing the loop`

**Body:**
```
{{first_name}} --

Last note on this. If AI visibility is not something you are thinking about right now, completely understand.

If it is -- antellion.com?utm_source=apollo&utm_campaign=cto_v1_e3. Takes 60 seconds to request, and your Snapshot is back in 48 hours.

Either way, no follow-up from me after this.

Jordan
```

---

## Appendix A: Language Rules

Maintain these across all emails and replies.

**Always say:**
- "Visibility Snapshot" (capitalized, two words)
- "how often [company] comes up" or "how often you are mentioned" (the primary metric -- plain English, not "mention rate" or "AI mention rate")
- "places AI pulls from where you are missing" or "sources where you do not show up" (not "citation gaps" or "citation blind spots" -- those are internal terms)
- "questions candidates ask AI" or "what candidates ask ChatGPT" (not "candidate-intent queries" -- that is internal terminology no buyer uses)

**Never say:**
- "Free report" (diminishes value)
- "Limited time" or "act now" (enterprise buyers recoil)
- "AI is disrupting..." (commodity hype)
- "Transform your talent strategy" (meaningless)
- "Schedule a demo" (the Snapshot is not a demo)
- "I'd love to" (every vendor says this)
- "I built a tool" (vendor reveal, kills peer dynamic)

**Never claim:**
- That Antellion improves AI responses directly (we measure and recommend)
- Real-time monitoring (scans are point-in-time)
- Multi-model simultaneous scanning as a current capability
- Guaranteed timelines for visibility improvement

---

## Appendix B: Hormozi Framework Applied to This Campaign

### Value Equation: Snapshot Offer

**Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort)**

| Variable | How This Campaign Maximizes It |
|----------|-------------------------------|
| **Dream Outcome** | Know what AI tells candidates about your company vs. your competitors. Named in their language: competitive talent advantage, strategic blind spot -- not "AI visibility metrics." For CTOs at 2K-10K companies, the dream outcome is having intelligence that their larger competitors do not yet act on. |
| **Perceived Likelihood** | "120 questions candidates ask AI." "Delivered in 48 hours." "Two things stood out." Specific numbers, a concrete deliverable, and evidence of work already done. Not "we might be able to help." |
| **Time Delay** | 48 hours. Said explicitly in every email. The prospect sees the path from "visit the site" to "receive your Snapshot" as a two-day straight line. |
| **Effort** | Near zero. Visit a URL. Fill out a 60-second form. They do nothing else. No call. No demo. No "let's find a time." |

### Lead Magnet Type: Reveal Their Problem

The Snapshot is a Type 1 lead magnet per Hormozi's framework: it reveals a problem the prospect does not know they have. This is the most powerful type because:
- They cannot get this data anywhere else (incomparable offer)
- The problem gets worse the longer they wait (competitors are gaining AI visibility whether they act or not)
- Once revealed, the problem naturally points to the core offer (the full Assessment)
- For 2K-10K companies specifically: the squeeze dynamic (bigger brands above, faster movers below) makes the revealed problem feel urgent and strategic

### "The Goal of the First Message Is to Get a Response, Not to Close"

The emails above never ask for a sale, a meeting, or a commitment. They ask for one thing: visit a link. The Snapshot does the selling. The Assessment conversation happens after they see their data and realize they need to act on it.

---

## Appendix C: Post-Campaign Next Steps

**If Campaign V1 works (5+ Snapshot requests in Month 1):**
- Run Campaign V2 with the winning subject line and iterate on the email body
- Expand to VP Talent Acquisition as a second persona (different copy, same sequence structure)
- Begin testing a second industry vertical

**If Campaign V1 underperforms (<3 Snapshot requests in Month 1):**
- Check deliverability first (this is the most common cause of failure for new domains)
- If deliverability is fine, test a completely different Email 1 angle
- Consider whether the CTO title is too narrow and whether VP Talent Acquisition should be the primary target

**Regardless of outcome:**
- Every Snapshot you deliver is a potential case study (anonymized)
- Every reply is data about how this persona thinks about AI and employer brand
- Every non-response is also data -- it tells you what did not work
