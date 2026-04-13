# Apollo Launch Playbook
## The Complete Cold Email Campaign Guide: Setup, List Building, Launch, and Conversion

**Date:** April 13, 2026 (consolidated)
**Launch target:** April 29, 2026
**Sender:** jordan@antellion.com
**Tool:** Apollo.io
**Status:** This is the ONE document. Everything you need is here.

---

## Table of Contents

1. [Pre-Launch Setup](#part-1-pre-launch-setup) -- Account, infrastructure, filters, blocklist
2. [Company Profile and Persona Config](#part-2-company-profile-and-persona-config) -- Ready to paste into Apollo when persona feature works
3. [List Building](#part-3-list-building) -- Search, batching, quality checks, sizing
4. [Sequence Setup](#part-4-sequence-setup) -- Emails, subject lines, A/B test, schedule
5. [Pre-Launch Checks](#part-5-pre-launch-checks) -- Test emails, warmup verification, DNS
6. [Launch Week Day-by-Day](#part-6-launch-week-day-by-day) -- April 28 through May 5
7. [Conversion Optimization](#part-7-conversion-optimization) -- Reply handling, snapshot workflow, assessment transition
8. [Metrics and Iteration](#part-8-metrics-and-iteration) -- Weekly tracking, benchmarks, optimization triggers
9. [Appendices](#appendices) -- Templates, checklists, math, language rules, Hormozi framework, nurture cadence

---

## Part 1: Pre-Launch Setup

Complete every step in this section before April 29.

---

### 1.1 Account Setup

**Create your Apollo account**

1. Go to app.apollo.io and click "Sign Up"
2. Use your personal email (not jordan@antellion.com) for the Apollo login -- your sending email and your login email should be different
3. Choose the free plan to start. You get 250 emails/month and 10,000 records. This is enough for Month 1 volume (200-250 emails). Upgrade to Basic ($49/month) only if you hit the contact export limit.

**Connect your sending mailbox**

1. In Apollo, go to **Settings** (gear icon, bottom-left) > **Email** > **Email Accounts**
2. Click **"+ Add Email Account"**
3. Select **"Google / Gmail"**
4. Sign in with **jordan@antellion.com** (your Google Workspace account)
5. Grant Apollo permission to send on your behalf
6. Once connected, you will see jordan@antellion.com listed under "Connected Accounts" with a green checkmark

**Configure your email signature**

1. Still in **Settings > Email > Email Accounts**, click on **jordan@antellion.com**
2. Click **"Edit Signature"**
3. Leave the signature blank. Your cold emails include the sign-off in the body text ("-- Jordan Ellison / Founder, Antellion"). A formatted HTML signature makes emails look automated. Plain text only.
4. If Apollo forces a signature, set it to just:

```
Jordan Ellison
Founder, Antellion
```

No logo. No social links. No phone number. No "Schedule a meeting" link.

**Set your sending name**

1. In the same email account settings, find **"Sender Name"**
2. Set it to: `Jordan Ellison`
3. Do NOT use "Jordan from Antellion" or "Antellion Team" -- it should look like a person, not a company

---

### 1.2 Email Infrastructure (DNS and Warmup)

**Email Provider: Google Workspace**

Use Google Workspace, not Zoho or a budget alternative.

- **Deliverability reputation.** Google IP ranges have the highest baseline trust with receiving mail servers. A new domain on Google Workspace starts with better deliverability than the same domain on Zoho, Outlook.com, or a self-hosted solution.
- **Apollo integration.** Apollo's sending infrastructure works cleanly with Google Workspace. SMTP connection is straightforward and well-documented.
- **Price.** $7.20/month for Business Starter. This is not the place to save money.

**Setup steps:**

1. Go to workspace.google.com and sign up with the antellion.com domain
2. Create the primary mailbox: jordan@antellion.com
3. Complete the Google Workspace verification (add a TXT record to DNS to prove domain ownership)

**DNS Records for Deliverability**

You need four DNS records configured correctly before sending a single email. All of these are set in your domain registrar's DNS management panel (Namecheap, Cloudflare, GoDaddy, wherever antellion.com is registered).

**SPF Record (Sender Policy Framework)**

| Type | Host | Value |
|------|------|-------|
| TXT | @ | `v=spf1 include:_spf.google.com ~all` |

This tells receiving servers "only Google's mail servers are authorized to send email on behalf of antellion.com." Without it, your emails look unauthorized.

**DKIM Record (DomainKeys Identified Mail)**

Google Workspace generates this for you:

1. Go to Google Admin Console > Apps > Google Workspace > Gmail > Authenticate email
2. Click "Generate new record" for antellion.com
3. Copy the TXT record Google gives you and add it to your DNS
4. Return to the Admin Console and click "Start authentication"

DKIM cryptographically signs every email so receiving servers can verify it was not tampered with in transit. This is the single most important deliverability record.

**DMARC Record**

| Type | Host | Value |
|------|------|-------|
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:jordan@antellion.com; pct=100` |

Start with `p=none` (monitor mode). This tells receiving servers to report alignment failures without rejecting emails. After 30 days of clean sending, you can tighten this to `p=quarantine`.

**Why `p=none` first:** A strict DMARC policy on a brand new domain with no sending history can cause false positives. Monitor mode lets you catch configuration errors before they cause real deliverability damage.

**Custom Return Path (optional but recommended)**

Some warmup tools and Apollo support custom return-path configuration. If available, set up a CNAME record pointing to your sending service's return-path domain. This improves SPF alignment.

**DNS Verification Checklist**

After configuring all DNS records, verify everything is working:

1. **Wait 24-48 hours** for DNS propagation
2. **Send a test email from jordan@antellion.com to a personal Gmail account.** Open it, click "Show original," and look for:
   - `SPF: PASS`
   - `DKIM: PASS`
   - `DMARC: PASS`
3. **Run the domain through mail-tester.com.** Send an email to the address it gives you. Target a score of 9/10 or higher before starting warmup.
4. **Check MXToolbox.** Go to mxtoolbox.com/SuperTool.aspx and run a full domain health check on antellion.com. Fix any warnings.

Do not proceed to warmup until all four checks pass. DNS misconfiguration is the most common reason new domains land in spam permanently.

---

### 1.3 Inbox Warmup

**Warmup Tool: Warmbox**

Why Warmbox:
- Purpose-built for email warmup with its own network of real inboxes
- Clear monitoring dashboard (warmup score, inbox placement rate, daily volume)
- Native Google Workspace support without workarounds
- Does not interfere with Apollo -- they use different SMTP connections

Alternatives if Warmbox does not work: Mailwarm ($79/month, larger network) or Instantly.ai ($30/month, warmup + sending).

**Warmup Schedule (14-day minimum)**

| Day | Warmup Emails Sent | Warmup Emails Received | Notes |
|-----|-------------------|----------------------|-------|
| 1-2 | 5 | 5 | Low volume to establish baseline |
| 3-4 | 10 | 10 | Still establishing domain reputation |
| 5-7 | 15 | 15 | Open/reply rates from warmup network should be 40-60% |
| 8-10 | 20 | 20 | Warmup score should be climbing |
| 11-14 | 25-30 | 25-30 | Peak warmup volume, most reputation building |
| 15+ | Keep at 20-25 | 20-25 | Continue warmup indefinitely alongside cold sends. Never stop. |

**Important:** Do not turn off warmup when you start sending cold emails. Warmup and cold sends run in parallel. Turning off warmup after launch is the second most common mistake after sending too early.

**How to Verify Warmup Is Working**

Check daily during the warmup period:

**Warmbox Dashboard (daily, takes 30 seconds):**
- **Warmup Score:** Should climb from ~50 to 80+ over 14 days. If it plateaus below 70, something is wrong with your DNS.
- **Inbox Placement Rate:** Target 95%+ by day 10.
- **Daily Volume:** Confirm sending/receiving expected number per schedule above.

**External Checks (run once at day 7 and once at day 14):**
- **mail-tester.com:** Send a fresh test email. Score should be 9/10+.
- **GlockApps or InboxReady:** Send to seed accounts across Gmail, Outlook, Yahoo and check placement. Run one test at $4-7. If more than 10% of seeds land in spam, pause and investigate.

**Manual Spot Check (day 7):**
- Send from jordan@antellion.com to personal Gmail, Outlook/Hotmail, and Yahoo. All must land in inbox, not spam or promotions.

**Red Flags During Warmup**

| Signal | What it means | What to do |
|--------|--------------|------------|
| Reputation score dropping | DNS misconfigured or volume too high too fast | Re-check SPF/DKIM/DMARC. Reduce warmup volume by 50%. |
| Inbox placement below 80% after day 7 | Spam filters not trusting your domain | Run mail-tester.com. Check blacklists (mxtoolbox.com/blacklists). |
| Google Workspace account suspended | Google flagged unusual sending patterns | Contact Google support. Reduce warmup volume. |
| Warmup emails not being sent | Connection issue | Re-authenticate in Warmbox. Verify Google Workspace connection. |

---

### 1.4 Blocklist Setup

**Add companies to the blocklist**

1. Go to **Settings > Blocklist** (sometimes called "Do Not Contact")
2. Click **"+ Add"**
3. Add these domains:

**Mandatory exclusions:**
- `symphonytalent.com` (and all known Symphony Talent subsidiary/client domains)
- `antellion.com` (your own domain)
- Any company where Jordan has active Symphony Talent relationships

**Optional exclusions (add as you go):**
- Companies that unsubscribe from your emails (Apollo may handle this automatically)
- Companies that send a clear "not interested" reply (add manually after receiving)

4. Also add individual email addresses to the blocklist for anyone who explicitly asks to not be contacted

**How to check your lists against the blocklist:**

1. After adding contacts to a list, go to that list and sort by company
2. Visually scan for any Symphony Talent connections
3. Apollo will also automatically skip anyone on the blocklist when running a sequence, but manually verify before your first send

---

## Part 2: Company Profile and Persona Config

Apollo has a company profile and persona feature that is currently broken. The content below is ready to paste when the feature is restored. In the meantime, it serves as the reference document for how Antellion describes itself and its buyer.

---

### 2.1 Company Profile (Paste Into Apollo)

**Company Name:** Antellion

**Website:** antellion.com

**Industry:** AI-Powered Employer Intelligence / HR Technology

**Company Overview:**

Antellion is an AI employer visibility intelligence company that helps organizations understand and control how they appear in AI-powered candidate discovery. When candidates ask ChatGPT, Claude, Perplexity, or other AI assistants "where should I work?" or "what is it like to work at [Company]?", the answers they receive are shaped by hundreds of signals across dozens of sources. Most companies have no visibility into what AI says about them as an employer, or how they compare to competitors in these responses.

Antellion measures this systematically. We run structured queries across candidate-intent themes, score how often a company appears relative to competitors, identify which sources AI cites and where gaps exist, and deliver executive-level intelligence that talent leaders can act on.

**Products / Services:**

1. **AI Employer Visibility Snapshot** (free, lead magnet): A point-in-time scan showing how a company appears across AI-generated candidate discovery queries, including competitor comparison, source analysis, and key findings. Delivered within 48 hours. No cost.

2. **AI Employer Visibility Assessment** (paid, $5,000-$7,500): A comprehensive assessment covering 120+ queries across 6 candidate-intent themes, full competitor comparison, source-level analysis, and a strategic remediation roadmap. The document that tells a talent team exactly what to do and in what order.

**Competitive Advantage:**

- First-mover in measuring AI employer perception (not traditional SEO, not Glassdoor reputation management)
- Methodology maps to actual candidate decision behavior, not vanity metrics
- Deliverables are executive-ready and designed to be shared with leadership teams
- Category-defining position: AI Employer Visibility is a new surface that existing HR tech and employer brand tools do not measure

**Competitor Landscape:**

- **Direct competitors:** None currently measuring AI employer visibility systematically
- **Adjacent competitors:** Employer brand agencies (focus on Glassdoor/LinkedIn, not AI), traditional SEO agencies (focus on web traffic, not candidate perception), HR analytics platforms (focus on internal data, not external AI perception)
- **Why we win:** Nobody else is measuring this. The category does not exist yet. Every adjacent player would need to build the methodology from scratch.

**CTA / Key Offer:**

Visit antellion.com to request a free AI Employer Visibility Snapshot: how often your company appears when candidates ask AI where to work, compared to your top talent competitor, delivered in 48 hours.

**Ideal Customer Profile:**

- Companies with 2,001-10,000 employees
- Industries: Technology/Software, Financial Services, Healthcare (corporate), Professional Services, Manufacturing, Retail (corporate), Media/Entertainment
- Buyer titles: Chief Talent Officer, Chief People Officer, SVP Talent, SVP People, VP Talent Strategy
- Companies that have invested in employer brand (Glassdoor, careers site, EVP work) but have not measured the AI channel
- Companies that compete for technical and professional talent against both larger enterprises and faster-moving startups

---

### 2.2 Persona Config (Paste Into Apollo When Feature Works)

**Persona Name:** Chief Talent Officer (2K-10K)

**Target Titles:**
- Chief Talent Officer (primary)
- Chief People Officer
- SVP Talent
- SVP People
- VP Talent Strategy

**Seniority:** C-Suite, VP

**Company Size:** 2,001-10,000 employees

**Industries:** Technology/Software, Financial Services, Healthcare (corporate), Professional Services, Manufacturing, Retail (corporate), Media/Entertainment

**Geography:** United States, Canada, United Kingdom

**Pain Points:**
1. Employer brand investment (Glassdoor, careers site, LinkedIn, EVP work) is not reaching the AI discovery channel where candidates increasingly do research
2. No visibility into what AI tells candidates about their company vs. competitors
3. Feeling squeezed between larger competitors (brand gravity) and smaller ones (faster to new channels)
4. Cannot measure or report on AI-driven employer perception to their board or leadership team
5. Talent acquisition costs rising without clear understanding of which discovery channels are working and which are not

**Value Propositions:**
1. See exactly where your company stands when candidates ask AI where to work -- measured across 120 questions, compared to your top competitor
2. Identify the specific sources and signals where competitors have a presence and you do not
3. Get executive-ready intelligence you can share with your leadership team today
4. Discover a competitive channel most talent teams have not measured yet, before your competitors do
5. Turn a blind spot into a strategic advantage without ripping out existing employer brand investments

**Use Cases:**
1. "I need to show my board where we stand in the new AI discovery channel"
2. "I want to know why we are losing candidates to [Competitor] before they even apply"
3. "I have invested in employer brand for years -- I need to know if that investment is reaching AI"
4. "I need a competitive intelligence report on employer visibility that does not exist anywhere else"
5. "I want to be the person who identifies the next lever for talent acquisition, not the person who gets surprised by it"

**Killer Questions (for discovery conversations):**
1. "Have you looked at what ChatGPT tells a software engineer who asks where to work in [your industry]?"
2. "Do you know which sources AI cites when it recommends employers in your space?"
3. "If a candidate asks an AI assistant to compare [your company] to [your top competitor], what does it say?"
4. "How are you measuring whether your employer brand investment is reaching the AI channel?"
5. "What would it be worth to know, right now, that your biggest talent competitor shows up 2x more often than you in AI candidate responses?"

**Why Now:**
- AI-assisted candidate research is growing rapidly -- candidates are asking ChatGPT and Claude before they ever visit a careers site
- The companies that optimize for AI visibility now will build a moat while competitors are still measuring Glassdoor ratings
- AI models are being trained on current data -- the signals you create today shape the answers candidates get tomorrow
- For 2K-10K companies specifically: you are in the window where you can move faster than larger competitors but have more resources than smaller ones. This is the moment of maximum leverage.

---

## Part 3: List Building

---

### 3.1 Search Filter Configuration

**Build the prospect search in Apollo**

1. Go to **People** (left sidebar) > **Search**
2. Configure these filters one by one:

**Job Title filter:**

1. Click **"Job Titles"** in the filter panel
2. Set the match type to **"is any of"** (NOT "contains" -- this is critical to avoid Director-level noise)
3. Enter each title on its own line:
   - `Chief Talent Officer`
   - `Chief People Officer`
   - `SVP Talent`
   - `SVP People`
   - `VP Talent Strategy`

**Seniority filter:**

1. Click **"Seniority"**
2. Check: **C-Suite** and **VP**
3. Leave Director, Manager, and all others unchecked

**Company Headcount filter:**

1. Click **"# Employees"**
2. Check: **201-500** = NO. **501-1000** = NO. **1001-2000** = NO.
3. Check: **2001-5000** = YES. **5001-10000** = YES.
4. Leave everything else unchecked

**Location filter:**

1. Click **"Person Location"**
2. Add: `United States`, `Canada`, `United Kingdom`

**Industry filter (include):**

1. Click **"Industry"**
2. Add these industries:
   - Computer Software
   - Information Technology and Services
   - Financial Services
   - Hospital & Health Care (use judgment -- corporate healthcare, not hospital systems)
   - Management Consulting
   - Manufacturing
   - Retail
   - Media & Entertainment

**Industry filter (exclude):**

1. In the same Industry filter, switch to the **"Exclude"** tab
2. Add:
   - Government Administration
   - Education Management
   - Higher Education
   - Primary/Secondary Education
   - Nonprofit Organization Management

**Email status filter:**

1. Click **"Contact Email Status"**
2. Select: **"Verified"** only
3. This removes guessed emails and catch-all domains, reducing bounce rate

**Save the search:**

1. After all filters are configured, click **"Save Search"** in the top-right
2. Name it: `CTO v1 - 2K-10K - Verified`
3. This saves your filter configuration so you can return to it anytime

**Expected results:** 300-800 contacts. If you get fewer than 200, expand to include "Head of Talent Acquisition" as an additional title. If you get more than 1,000, the filters may be too loose -- check that headcount and seniority are set correctly.

---

### 3.2 Industry Batch Method

Create separate saved lists for each industry. This is how you control the `[INDUSTRY]` personalization and maintain the one-industry-per-day sending cadence.

**Naming convention:**

- `Batch 1 - Enterprise SaaS - Apr 29`
- `Batch 2 - Healthcare Tech - Apr 30`
- `Batch 3 - Financial Services - May 1`
- `Batch 4 - Professional Services - May 6`
- `Batch 5 - Manufacturing - May 7`

Each batch should contain 15-20 contacts from the same industry.

**How to build the batches:**

1. From your saved search results, sort by industry (use the column headers)
2. Select 15-20 contacts from one industry
3. Click **"Save to List"** at the top
4. Create a new list with the naming convention above
5. Repeat for each industry until you have 5 batches covering your first 5 weeks

**The industry batch workflow:**

1. **Pick one industry per sending day.** Example: Tuesday = enterprise SaaS, Wednesday = healthcare tech, Thursday = financial services.
2. **Run 3-5 real AI queries for that industry before sending.** Example: "Best enterprise SaaS companies to work for," "Top employers in cloud computing." This gives you genuine observations you can reference if anyone replies.
3. **Set the `[INDUSTRY]` keyword for the batch.** Open the email templates and find-and-replace `[INDUSTRY]` with the actual industry keyword (e.g., "enterprise SaaS," "healthcare tech"). You do this in the sequence step editor.
4. **Send the batch.**
5. **Document what you learned.** Keep a running Google Doc of industry-specific findings. After 2 weeks, you have enough observations to write genuinely personalized follow-ups to anyone who responds.

This method means you are telling the truth in every email -- you have been testing what AI tells candidates about companies in their industry. The specifics come from real queries.

---

### 3.3 List Quality Checks

Before loading any batch into your sequence, check every contact. This takes 2-3 minutes per batch of 15-20 contacts and prevents the two things that kill new-domain campaigns: bounces and mismatched recipients.

**Red flags (remove the contact):**

| Signal | Why |
|--------|-----|
| Email status is "Guessed" or "No Email" | Guessed emails bounce at 15-30%. One batch with 3+ bounces can damage your domain reputation permanently on a new domain. |
| Company headcount is under 2,000 | Title inflation. "Chief Talent Officer" at a 500-person company is often a Director-equivalent with no budget authority. |
| Company is in government, education, or non-profit | Wrong buyer motion, slow procurement, poor fit for the offer. |
| Contact is at a Symphony Talent client or relationship company | Career risk. Non-negotiable. |
| Contact's LinkedIn shows they left the company | Apollo data can be 3-12 months stale. If the title or company does not match, the email will bounce or reach someone who does not care. |

**Yellow flags (investigate before including):**

| Signal | What to do |
|--------|------------|
| Company headcount is exactly at 2,000 | Check their careers page. If they list 50+ open roles, they are probably above 2K. If fewer than 20, they might be below. |
| Title says "VP People" or "SVP People" | These are legitimate targets but the email copy is tuned for the CTO-of-people persona. If your list from "Chief Talent Officer" alone is over 200, remove these to keep the list tight. If under 200, include them. |
| Multiple contacts at the same company | Do NOT include more than one contact per company in the same batch. If both the CTO and CPO are at the same company and they both get the email, the "this feels personal" illusion breaks. Pick the one whose title best matches "Chief Talent Officer." |
| Hospital system (vs. corporate healthcare) | Hospital systems are usually government-adjacent with slow procurement. Corporate healthcare companies (health tech, insurance, pharma) are better fits. Check the company website if the industry label is ambiguous. |

**Per-contact checklist (quick scan, 10 seconds per contact):**

1. Email status: Verified (green checkmark)?
2. Title: Matches one of the five target titles?
3. Company size: 2,001-10,000?
4. Company: Not on the blocklist?
5. No duplicate company in this batch?

If all five are yes, the contact stays. If any are no, remove.

---

### 3.4 First Batch Sizing and Staged Rollout

**Total first load: 150-200 contacts across 5 industry batches**

| Batch | Industry | Contacts | Sending Week |
|-------|----------|----------|--------------|
| 1 | Enterprise SaaS | 15-20 | Week 1 (Apr 29) |
| 2 | Healthcare Tech | 15-20 | Week 1 (Apr 30) |
| 3 | Financial Services | 15-20 | Week 1 (May 1) |
| 4 | Professional Services | 15-20 | Week 2 |
| 5 | Manufacturing | 15-20 | Week 2 |
| 6-10 | Repeat cycle with new contacts | 15-20 each | Weeks 3-5 |

**Why 15-20 per batch, not more:**

- At 5-10 cold sends per day (Week 1-2 ramp), one batch covers 2-3 sending days
- Small batches let you catch quality issues before they scale (one bad batch of 15 bounces 3 contacts = 20% bounce rate = you fix it before the next batch)
- The `[INDUSTRY]` keyword change happens per batch -- smaller batches mean less manual work per switch
- Matches fulfillment capacity: if 5% of a 20-contact batch requests a Snapshot, that is 1 Snapshot, which is manageable alongside other work

**Do not front-load your best prospects.** The first 15-20 sends are partially a deliverability test. Use middle-of-the-list contacts, not your dream accounts. Save the best prospects for week 2 once you have confirmed everything is working.

---

### 3.5 Launch Week Staging

This maps contacts to specific sending days during launch week. See Part 6 for the full day-by-day playbook.

| Day | Date | Contacts to Send | From Batch | Industry Keyword |
|-----|------|-----------------|------------|------------------|
| Launch Day 1 | Tue Apr 29 | 5 | Batch 1 | enterprise SaaS |
| Day 2 | Wed Apr 30 | 5 | Batch 2 | healthcare tech |
| Day 3 | Thu May 1 | 8 | Batch 3 | financial services |
| Day 4 | Tue May 6 | 8 | Batch 4 | professional services |
| Day 5 | Wed May 7 | 10 | Batch 5 | manufacturing |
| Day 6 | Thu May 8 | 10 | Batch 1 (remainder) | enterprise SaaS |

**How to load contacts per day:**

You do not load the entire batch into the sequence on day 1. Select 5 contacts from the batch, add them to the active sequence, and activate those 5. The next day, select the next 5 from the same or next batch.

This gives you granular control over volume during the critical first week when your domain reputation is most fragile.

---

### 3.6 Free Tier Guidance

**Apollo free plan limits:**

| Resource | Free Tier Limit | Your Month 1 Usage | Enough? |
|----------|----------------|--------------------|---------|
| Emails per month | 250 | 200-250 | Yes, barely |
| Contact exports | 10,000/month | 300-800 | Yes |
| Sequences | Unlimited | 1 | Yes |
| A/B testing | Available | Yes | Yes |

**When to upgrade to Basic ($49/month):**

- If you hit the 250 email/month cap before the month ends
- If you need more than 10,000 contact records (unlikely in Month 1)
- If you want Apollo's advanced analytics (nice but not necessary yet)

**Strategy for staying on free:** If you are at 230 emails by week 3 and have 5 days left in the month, slow down rather than upgrading. The extra $49 is not worth it for 20 more emails. Wait for Month 2 when you know the campaign works.

**Emails count per step:** Apollo counts each email step in the sequence as a separate email toward your monthly limit. A 3-email sequence to 1 contact = 3 emails used. With 250 emails/month and a 3-step sequence, you can add ~83 contacts to your sequence. At 15-20 contacts per week, this covers about 4 weeks.

---

## Part 4: Sequence Setup

---

### 4.1 Create the 3-Email Sequence

1. Go to **Engage** (left sidebar) > **Sequences**
2. Click **"+ New Sequence"**
3. Name it: `CTO V1 - AI Visibility Snapshot`

**Add Email 1 (The Opener):**

1. Click **"+ Add Step"**
2. Select **"Automatic Email"**
3. Set **"Day"** to: `1` (sends immediately when contact is added)
4. Paste the Email 1 body (see Section 4.2 for subject line A/B setup):

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

**Why Email 1 works:**
- **"Here is why I reached out"** -- answers the one question every cold email recipient asks. Feels like a human explaining themselves, not a template firing.
- **"I have been testing what AI tells candidates"** -- positions Jordan as someone doing research, not prospecting a list.
- **The numbered two-findings structure** -- specific enough to feel real, general enough to be true for any company in the batch.
- **"At your company's size, this is the kind of gap that quietly compounds"** -- tuned for 2K-10K companies who feel squeezed between enterprises and startups.
- **One CTA: the URL.** Not a calendar link, not a reply instruction. Naturally embedded in a sentence.

**Add Email 2 (The Follow-Up):**

1. Click **"+ Add Step"**
2. Select **"Automatic Email"**
3. Set **"Day"** to: `4` (3 days after Email 1)
4. Set **"Condition"**: "No reply AND no click" -- in Apollo, this is the default behavior (the sequence stops if someone replies)
5. Subject line: `your employer brand might not be reaching AI`
6. Paste the Email 2 body:

```
{{first_name}} --

One more thought on this.

Your team has probably invested real money in employer brand -- Glassdoor, careers site, LinkedIn presence, maybe EVP work. All of that matters. But none of it controls what AI synthesizes about {{company}} when a candidate asks "where should I work in [INDUSTRY]?"

AI does not pull from one source. It reads hundreds of signals and produces one answer. The companies that show up in that answer are the ones candidates consider first. The ones that do not show up are invisible to an entire research channel -- regardless of how strong the underlying brand actually is.

For a talent leader thinking about where the next competitive edge comes from, this is worth measuring. I can show you exactly where {{company}} stands in 48 hours.

antellion.com?utm_source=apollo&utm_campaign=cto_v1_e2

Jordan
```

**Why Email 2 works:**
- **"One more thought on this"** -- conversational, not salesy. Does not say "following up" or "just checking in."
- **"Your team has probably invested real money"** -- acknowledges their work before introducing the gap.
- **"For a talent leader thinking about where the next competitive edge comes from"** -- speaks to their strategic identity.
- **Signed "Jordan"** -- warmer. They already have the full name from Email 1.

**Add Email 3 (The Breakup):**

1. Click **"+ Add Step"**
2. Select **"Automatic Email"**
3. Set **"Day"** to: `11` (10 days after Email 1, about 7 days after Email 2)
4. Subject line: `closing the loop`
5. Paste the Email 3 body:

```
{{first_name}} --

Last note on this. If AI visibility is not something you are thinking about right now, completely understand.

If it is -- antellion.com?utm_source=apollo&utm_campaign=cto_v1_e3. Takes 60 seconds to request, and your Snapshot is back in 48 hours.

Either way, no follow-up from me after this.

Jordan
```

**Why Email 3 works:**
- **"Either way, no follow-up from me after this"** -- explicit commitment to restraint. Paradoxically makes them more likely to respond.
- **Four sentences.** A C-suite executive will read the entire thing.

**Important: The `[INDUSTRY]` placeholder**

Apollo does NOT have a built-in merge field for industry. You have two options:

**Option A (Recommended for Month 1):** Manually replace `[INDUSTRY]` before activating each batch. Since you are sending one industry per day, open the email templates, find-and-replace `[INDUSTRY]` with the actual industry keyword for that batch (e.g., "enterprise SaaS," "healthcare tech"), then activate. Takes 30 seconds per batch.

**Option B (If you want automation):** Create a custom field in Apollo called "Industry Keyword" and populate it manually for each contact. Then use `{{custom.industry_keyword}}` in your email templates. More setup time but scales better.

For Month 1 at 5-8 sends per day, Option A is simpler.

---

### 4.2 Subject Line A/B Testing

**Configure the 3-variant A/B test on Email 1**

1. Go back to your sequence and click on the **Email 1** step
2. In the email editor, look for the **"A/B Test"** toggle or the **"Add Variant"** button (usually near the subject line field)
3. Click **"Add Variant"** twice (to get 3 total variants)
4. Enter the three subject lines:

| Variant | Subject Line |
|---------|-------------|
| A | `free AI visibility audit for {{company}}` |
| B | `ran a quick AI audit on {{company}}` |
| C | `5-minute read: how candidates see {{company}} in AI` |

5. Set the **split** to: **Equal (33/33/33)**
6. Apollo will randomly assign each contact to one variant

**All lowercase.** Do not capitalize. Do not add punctuation at the end. This is intentional -- lowercase subject lines outperform title case in cold email because they look like a real person typed them.

**How to read the results:**

- Go to **Engage > Sequences > [Your Sequence]** and click the **"Analytics"** tab
- Apollo shows open rate and reply rate per variant
- **Ignore open rates** for decision-making -- Apple Mail Privacy Protection inflates them. Judge by **reply rate** only.
- After 75-100 sends per variant, kill the worst-performing variant and redistribute volume to the top two
- After 150+ sends, go with the single winner

**Emails 2 and 3 do NOT need A/B testing.** Only Email 1 needs the test.

**Subject line design rationale (Hormozi framework):**

These subject lines are grounded in Hormozi's $100M Leads "Big Fast Value" principle. Instead of manufacturing curiosity or using fear hooks, they lead with the free deliverable itself. The subject line IS the offer.

**Retired variants (do not use):** Subject lines built around curiosity gaps ("what AI tells candidates about {{company}}"), competitor threats ("{{company}} vs. competitors in AI"), or peer observations ("something I found about {{company}}"). These rely on curiosity and fear hooks that the framework explicitly rejects.

**Email 2 subject line:** `your employer brand might not be reaching AI`
References something they own and have invested in. Specific enough to be interesting, not alarmist enough to feel like clickbait.

**Email 3 subject line:** `closing the loop`
Signals finality. Neutral. The subject line is not doing the work here -- the email body is 48 words.

---

### 4.3 Personalization Fields

**Standard Apollo merge fields (auto-populated):**

| Merge Tag | What it Inserts | Where Used |
|-----------|----------------|------------|
| `{{first_name}}` | Contact's first name | All 3 emails |
| `{{company}}` | Contact's company name | All 3 emails |

These are auto-populated from Apollo's database. No action needed.

**Custom fields you may want to add:**

If you decide to use Option B from Section 4.1 (custom industry merge field):

1. Go to **Settings > Fields > Custom Fields**
2. Click **"+ Create Custom Field"**
3. Name: `Industry Keyword`
4. Type: `Text`
5. Click **Save**
6. Now go to each contact in your list, click on their profile, and manually enter the industry keyword
7. Use `{{custom.industry_keyword}}` in your email templates

**What you do NOT need custom fields for:**

- **Competitor name:** The emails say "your closest talent competitor" intentionally. Do not guess.
- **Specific AI findings:** The per-company findings come in the Snapshot, after they request it.
- **Their job title:** The emails are written for the CTO-of-people persona. Do not template-insert their title.

**The "Industry Batch" personalization method:**

| Element | How | Time Cost | Impact |
|---------|-----|-----------|--------|
| `{{first_name}}` | Apollo auto-merge | 0 seconds | High -- without it, instant delete |
| `{{company}}` | Apollo auto-merge | 0 seconds | High -- makes it feel hand-written |
| `[INDUSTRY]` | Manually set once per batch | 30 seconds per batch | Medium -- makes the AI query example feel specific |

**What NOT to personalize (low ROI, high time cost):**

| Element | Why Skip It |
|---------|-------------|
| Specific competitor name in Email 1 | You do not know their talent competitor yet. Guessing wrong destroys credibility. Let the Snapshot intake form collect it. |
| Specific AI findings per company | You cannot run pre-scans for every prospect. The emails imply you scanned broadly for their industry -- which is true if you have run queries for that vertical. |
| Their recent press, job postings, or LinkedIn activity | Takes 3-5 minutes per prospect. At 20 emails/day, that is 60-100 extra minutes. Save deep research for prospects who respond. |
| Custom opening line per person | Same time cost issue. The email structure already feels personal. |

---

### 4.4 Sending Schedule

**Configure the sending window**

1. Go to your sequence and click **"Settings"** (or the gear icon)
2. Find **"Sending Schedule"** or **"Sending Window"**
3. Set:
   - **Days:** Tuesday, Wednesday, Thursday (check these three only)
   - **Time window:** 7:30 AM to 8:30 AM
   - **Timezone:** Select **"Contact's timezone"** or **"Recipient's local time"** -- Apollo supports timezone-aware scheduling. A 7:30 AM email to someone in San Francisco should not arrive at 4:30 AM.
   - If Apollo does not support per-recipient timezone: set to **Eastern Time** and manually adjust for UK contacts

**Configure daily sending limits**

1. In **Settings > Email > Email Accounts > jordan@antellion.com**
2. Find **"Daily Sending Limit"**
3. Set to: **10** for the first two weeks (cold sends only -- warmup runs separately through Warmbox)
4. After Week 2, increase to **15**, then **20** by Week 4
5. **Never exceed 30 total emails per day** (cold + warmup combined) from this single mailbox

**Configure delay between emails**

1. In the sequence settings, find **"Delay Between Emails"** or **"Throttle"**
2. Set to: **3-5 minutes between each email**
3. This mimics human sending behavior and avoids triggering spam filters

**Cold send ramp schedule (with warmup running in parallel):**

| Day | Cold Emails Sent | Warmup Emails (parallel) | Total from jordan@antellion.com |
|-----|-----------------|------------------------|-----------------------------|
| Launch Day 1 (Tue) | 5 | 20 | 25 |
| Day 2 (Wed) | 5 | 20 | 25 |
| Day 3 (Thu) | 8 | 20 | 28 |
| Day 4 (next Tue) | 8 | 20 | 28 |
| Day 5 (Wed) | 10 | 20 | 30 |
| Day 6 (Thu) | 10 | 18 | 28 |
| Week 3 | 12-15/day | 15 | 27-30 |
| Week 4+ | 15-20/day | 15 | 30-35 |

**Hard ceiling:** Never exceed 30-35 total emails per day from a single Google Workspace mailbox. If you need more volume in the future, set up a second address (j@antellion.com) and warm it up separately.

**Send time priority order:**

| Priority | Time (Prospect's Local Time) | Why |
|----------|------------------------------|-----|
| 1st | 7:30-8:30 AM Tuesday-Thursday | Before their first meeting. Highest open rates for executive cold email. |
| 2nd | 7:30-8:30 AM Monday | Acceptable but competes with weekend catch-up. |
| 3rd | 12:00-1:00 PM Tuesday-Thursday | Lunch break email check. |

**Avoid:** Friday after 12 PM (mental checkout), weekends (signals automation), after 6 PM (looks desperate), Monday before 7 AM (buried in weekend backlog).

---

### 4.5 Tracking Settings

1. In your sequence settings, configure:

| Setting | Value | Notes |
|---------|-------|-------|
| **Track opens** | Yes | Useful directionally, but Apple Mail Privacy Protection inflates numbers. |
| **Track link clicks** | Yes | Tells you who clicked antellion.com but did not submit the form. Warm leads. |
| **Stop on reply** | Yes | Any reply stops the sequence for that contact. |
| **Stop on bounce** | Yes | Hard bounces immediately remove the contact. |
| **Include unsubscribe link** | Yes | Required by CAN-SPAM. Apollo adds a small text link at the bottom. |

**UTM parameters are already in the email copy.** The links include `?utm_source=apollo&utm_campaign=cto_v1` (and `_e2`, `_e3` for subsequent emails). Test that the UTM parameters pass through correctly by sending yourself a test email and clicking the link.

---

## Part 5: Pre-Launch Checks

Complete these checks on April 28 (the day before launch). Every item must pass.

---

### 5.1 Send a Test Email to Yourself

1. In your Apollo sequence, click **"Send Test Email"**
2. Send Email 1 to your **personal Gmail address** (not jordan@antellion.com)
3. Check the following:

| Check | What to Look For |
|-------|-----------------|
| **Merge fields** | `{{first_name}}` and `{{company}}` should show as test values, not raw merge tags |
| **Link** | Click the antellion.com link. Verify it loads and UTM parameters appear in the URL bar |
| **Formatting** | No weird line breaks, no HTML artifacts. Should look like a plain-text email |
| **Inbox placement** | Must land in Primary inbox, not Promotions or Spam |
| **Unsubscribe link** | Present at the bottom, small text |
| **From name** | Shows "Jordan Ellison," not "Antellion" or "Apollo" |
| **Reply-to** | Click Reply -- should go to jordan@antellion.com |

4. Repeat the test to an **Outlook/Hotmail** address and a **Yahoo** address if you have them
5. If any test lands in Spam or Promotions, STOP. Do not launch. Investigate DNS records and warmup score first.

---

### 5.2 Check Deliverability with mail-tester.com

1. Go to **mail-tester.com**
2. It will show you a unique email address
3. From your **Gmail inbox at jordan@antellion.com**, compose a new email to that address
4. Write a short subject line and 2-3 sentences (not your cold email template -- write something natural)
5. Send it
6. Return to mail-tester.com and click "Then check your score"
7. **Target: 9/10 or higher.** If below 9, check SPF, DKIM, DMARC records and fix before launching.

---

### 5.3 Verify Warmup Readiness

1. Log into **Warmbox** (warmbox.ai)
2. Check the dashboard for jordan@antellion.com:

| Metric | Ready to Launch | Not Ready |
|--------|----------------|-----------|
| **Warmup Score** | 80+ | Below 75 |
| **Inbox Placement Rate** | 95%+ | Below 90% |
| **Days of Warmup** | 14+ | Fewer than 12 |
| **Warmup Volume** | 20-30/day for past 4+ days | Still ramping up |

3. If warmup score is below 80, **delay launch by 3-5 days.** There is no prize for launching on schedule if your emails land in spam.
4. **Keep warmup running after launch.** Do not turn it off.

---

### 5.4 Verify Domain DNS

1. Go to **mxtoolbox.com/SuperTool.aspx**
2. Enter `antellion.com`
3. Run:
   - **MX Lookup** -- should show Google Workspace MX records
   - **SPF Record Lookup** -- should show `v=spf1 include:_spf.google.com ~all` and result: PASS
   - **DKIM Test** -- should show a valid DKIM record and result: PASS
   - **DMARC Lookup** -- should show `v=DMARC1; p=none; rua=mailto:jordan@antellion.com; pct=100`
   - **Blacklist Check** -- should show NO blacklists

4. If any check fails, fix the DNS record in your domain registrar and wait 24-48 hours for propagation before re-testing.

---

## Part 6: Launch Week Day-by-Day

---

### Monday, April 28 (Pre-Launch Day)

**Time: 7:30-10:00 AM**

- [ ] Run the complete pre-launch verification checklist (Part 5 of this document)
- [ ] Confirm Warmbox score is 80+ and inbox placement is 95%+
- [ ] Send test email to personal Gmail. Verify inbox placement, merge fields, link tracking.
- [ ] Send test email via mail-tester.com. Confirm 9/10+.
- [ ] Open Apollo. Verify the sequence is armed with all 3 emails, A/B test active on Email 1.
- [ ] Verify Batch 1 (first industry, 5 contacts for Day 1) is loaded in the sequence but NOT activated
- [ ] Replace `[INDUSTRY]` in Email 1 and Email 2 with the specific keyword for Batch 1 (e.g., "enterprise SaaS")
- [ ] Do a final scan of Batch 1 contacts for Symphony Talent conflicts
- [ ] Verify response templates are saved as Apollo snippets
- [ ] Verify tracking spreadsheet is set up
- [ ] Verify antellion.com is live, form works, Slack notification fires on test submission
- [ ] Run 3-5 AI queries for tomorrow's industry batch. Document findings.
- [ ] Block your calendar for 7:30-10:00 AM Tuesday through Thursday

**Time: Evening**

- [ ] Final Warmbox check. Score stable.
- [ ] Get some rest. You launch tomorrow.

---

### Tuesday, April 29 -- LAUNCH DAY

**7:30 AM: Activate the sequence**

1. Go to **Engage > Sequences > CTO V1 - AI Visibility Snapshot**
2. Confirm 5 contacts from Batch 1 are loaded (NOT the full batch)
3. Click **"Activate"** or **"Start"**
4. Apollo will begin sending within the 7:30-8:30 AM window, throttled at 3-5 minute intervals
5. Your first cold emails are now going out

**8:30-9:30 AM: Monitor**

- Check the Apollo dashboard. Verify emails show as "Sent" (not "Failed" or "Bounced")
- Check Warmbox dashboard. Confirm warmup score is stable (not dropping)
- Check your jordan@antellion.com inbox for immediate bounces or auto-replies
- Check the antellion.com Slack channel for form submissions (unlikely on Day 1, but be ready)

**Rest of Day:**

- Do NOT check Apollo obsessively. You sent 5 emails. There will probably be 0 replies today. That is normal.
- Prep tomorrow's batch: select 5 contacts from Batch 2. Replace `[INDUSTRY]` keyword. Load into sequence.
- Write or edit blog content.

**End of Day:**

- Check Apollo one more time. Note: sends, opens (if any), bounces, replies.
- Log numbers in your tracking spreadsheet.
- Check Warmbox score. Should be stable.

**Day 1 targets:** 5 emails sent, 0 bounces, warmup score stable. That is success.

---

### Wednesday, April 30

**7:30 AM:** Apollo sends Batch 2 (5 contacts, second industry)

**8:30 AM:** Check metrics from Day 1.
- Any opens? (Directional only.)
- Any bounces? If yes, check the contact and remove if invalid.
- Any replies? If yes, respond within 2 hours using your saved snippet.

**Rest of Day:** Prep Thursday's batch. Continue blog writing. Run AI queries for Thursday's industry.

**Day 2 targets:** 10 total emails sent (cumulative), 0 bounces, no spam complaints.

---

### Thursday, May 1

**7:30 AM:** Apollo sends Batch 3 (8 contacts -- slight ramp if Day 1-2 deliverability is clean)

**8:30 AM:** Check metrics from Days 1-2.
- Review any opens, clicks, or replies
- This is the first day you might see Email 2 trigger for Day 1 contacts

**Key decision point after 18 sends over 3 days:**
- If bounce rate is 0% and warmup score is stable: you are clear to ramp to 8-10/day next week
- If bounce rate is above 5%: pause. Clean the list. Re-verify contacts.
- If warmup score dropped 5+ points: reduce cold volume back to 5/day. Increase warmup.

**Rest of Day:** Prep next Tuesday's batch. Write content.

**Day 3 targets:** 18 total emails sent, bounce rate under 2%, warmup score stable.

---

### Friday, May 2

**No cold sends.** Friday is review day.

**Morning:**
- Check all metrics from the week
- Review any replies (reply immediately if you have not already)
- Log Week 1 numbers in the tracking spreadsheet:
  - Total sent
  - Open rate (approximate)
  - Reply rate
  - Positive replies
  - Snapshot requests
  - Bounce rate
  - Warmup score trend

**Assessment:**
- If 0 replies: **This is normal.** Enterprise executives are slow. You sent 18 emails to C-suite. Give it another full week.
- If 1-2 replies: **This is ahead of pace.** Respond immediately. Begin Snapshot work if they request one.
- If any bounces above 3%: Clean your list before Tuesday.
- If warmup score is stable or climbing: On track to ramp to 10/day next week.

---

### Saturday-Sunday, May 3-4

**No cold sends. No reply monitoring required** (C-suite executives do not reply on weekends, and replying on a weekend makes you look like a bot).

**Optional productive work:**
- Write or publish a blog post
- Run AI queries for next week's industry batches
- Refine your Snapshot delivery process (do a practice run if you have not yet)

---

### Monday, May 5

**No cold sends** (Monday competes with weekend catch-up backlog).

**Morning:**
- Check for any weekend replies (reply by 9 AM)
- Prep Tuesday's batch (8-10 contacts from the next industry)
- Replace `[INDUSTRY]` keyword for the new batch
- Run 3-5 AI queries for this industry

**Afternoon:**
- Review Week 1 subject line performance by variant (likely too early for meaningful data, but start watching)
- If you received any replies, analyze: What did they respond to? What questions did they ask? Document this.

---

### Handling Different First-Week Scenarios

**If you get 0 replies all week:**

This is the most likely outcome. Do not panic. Do not change anything yet. Most contacts have only received Email 1. Email 3 (the breakup) often gets the highest reply rate. Wait for the full sequence to play out before iterating.

Diagnostic order:
1. **Check deliverability** (mail-tester.com, Warmbox score, manual test to your own Gmail)
2. **Check open rates** -- if above 30%, your emails are landing. The issue is the body or the offer.
3. **Check your list** -- are these the right people at the right companies?
4. Only after ruling out 1-3 should you consider changing the email copy.

**If you get 1-3 replies:**

You are ahead of pace. Focus entirely on converting these replies to Snapshot requests:
- Respond within 2 hours
- Use the appropriate reply template from Part 7
- If they request a Snapshot, deliver within 48 hours
- Log every detail of the conversation

**If you get 5+ replies (unlikely but possible):**

You may have a capacity problem. If more than 5 people request Snapshots in Week 1:
- Acknowledge every reply within 2 hours
- Be honest about timeline: "I am running a few Snapshots this week. I can have yours within 72 hours."
- Prioritize by company quality -- larger companies and brand-name logos first. Better case studies.

**If you get negative replies or spam complaints:**

- A single "not interested" is normal. Use the "Not Now" template. Move on.
- A single "unsubscribe" is normal. Remove them immediately. Move on.
- Multiple spam complaints in a small batch (more than 1 in 50 sends) means something is wrong. Pause and check: Is the unsubscribe link working? Does the subject line look spammy?

---

### Balancing Email Operations with Other Work

Your daily time budget during launch week:

| Time Block | Activity | Duration |
|------------|----------|----------|
| 7:30-8:00 AM | Check Warmbox. Activate day's batch in Apollo. | 30 min |
| 8:30-9:30 AM | Monitor sends. Reply to any responses. | 60 min |
| 9:30-10:00 AM | Log metrics. Prep tomorrow's batch. | 30 min |
| Lunch or evening | One check for late-morning replies. | 15 min |
| **Total** | | **~2.5 hours** |

The 7:30-10:00 AM block is non-negotiable on Tuesday, Wednesday, and Thursday.

---

## Part 7: Conversion Optimization

---

### 7.1 Reply Handling: The 2-Hour Rule

**Response speed is your credibility signal.** When a C-suite executive replies to a cold email, they are testing whether a real person sent it. Respond within 2 hours to confirm the peer-to-peer dynamic.

**Set up reply monitoring:**

1. Turn on **email notifications** in Apollo: **Settings > Notifications > Email Replies** = ON
2. Set up push notifications on your phone for jordan@antellion.com (Gmail app)
3. Block **8:30-10:00 AM Tuesday-Thursday** for reply monitoring and response

**Save reply templates as Apollo Snippets:**

Go to **Engage > Snippets** (or **Templates**) and save each of the following.

---

**REPLY TEMPLATE: "Yes, interested" / "Tell me more"**

Name this snippet: `Reply - Interested`

```
{{first_name}} --

Great. Here is what I need to run your Snapshot:

1. Company domain (confirming: [their domain])
2. Your biggest talent competitor (who do you lose candidates to most?)
3. Primary roles you hire for (e.g., engineers, sales, product)

You can also submit this at antellion.com if that is easier.

I will have your results within 48 hours of receiving the above.

Jordan
```

**When to use:** Any reply that signals interest -- "this sounds interesting," "tell me more," "what do you need from me," "yes please."

**Key principle (Hormozi):** This is the lead magnet conversion moment. Your only job is to make the next step frictionless. Three quick questions or a link to a 60-second form. Do not pitch the assessment. Collect what you need and deliver.

**Alternate version for warm but brief replies:**

```
{{first_name}} --

Glad this resonated. The fastest path: submit your company info at antellion.com -- takes 60 seconds, and I will have your Snapshot back within 48 hours.

If you have a specific competitor you want compared, include that in the form. If not, I will identify your most visible competitor from the scan data.

Jordan
```

---

**REPLY TEMPLATE: "Not now" / "Bad timing"**

Name this snippet: `Reply - Not Now`

```
Completely understand. I will check back in a quarter with updated observations about how AI describes {{company}} to candidates. If anything changes on your end before then, the offer stands.

Jordan
```

**After sending:** Add to a "90-Day Follow-Up" list in Apollo. Set a calendar reminder. When you follow up in 90 days, lead with a new finding, not "just checking in."

---

**REPLY TEMPLATE: "Unsubscribe me" / "Remove me from your list"**

Name this snippet: `Reply - Unsubscribe`

```
Done. You will not hear from me again. Apologies for the interruption.

Jordan
```

**After sending:** Immediately remove from the sequence. Add their email to Apollo's blocklist (**Settings > Blocklist**). A spam complaint from a C-suite executive can damage your domain reputation disproportionately.

---

**REPLY TEMPLATE: Objection -- "We already manage our employer brand"**

Name this snippet: `Reply - Objection EB`

```
That is exactly why this is worth seeing. The Snapshot shows whether your employer brand investment is reaching the AI channel -- the one surface most talent teams have not measured yet.

Companies with strong employer brands are often the most surprised by where they stand in AI. The gap is usually not about brand quality -- it is about whether the right signals are reaching the right sources.

Happy to run it if you want to see where {{company}} stands. Same offer: 48 hours, no cost.

Jordan
```

---

**REPLY TEMPLATE: Objection -- "Can I just ask ChatGPT myself?"**

Name this snippet: `Reply - Objection DIY`

```
You can ask a few questions and get anecdotes. What you cannot replicate is 120 questions across employer reputation themes with consistent scoring, competitor comparison, source-by-source analysis, and a written interpretation.

The volume and structure are what turn a curiosity into a measurement. Happy to show you what that looks like for {{company}}.

Jordan
```

---

**REPLY TEMPLATE: Objection -- "What do you do with our data?"**

Name this snippet: `Reply - Objection Data`

```
Your information is used only to produce your Snapshot. We do not share it with third parties or use it for any other purpose.

Jordan
```

---

**REPLY TEMPLATE: Objection -- "What qualifies you to do this?"**

Name this snippet: `Reply - Objection Quals`

```
I have spent the last year studying how AI models represent employers -- which sources they cite, where the gaps are, and how it differs from traditional employer brand channels. I built the methodology because no one else was measuring this. Happy to walk through the approach after you see your results.

Jordan
```

---

**Handling out-of-office replies:**

- Apollo will automatically pause the sequence when it detects an out-of-office
- Check the return date in the OOO message
- If they return within the sequence window (11 days), let the sequence resume naturally
- If they are out for 2+ weeks, manually remove from the current sequence and add to a future batch

---

### 7.2 Lead-to-Snapshot Workflow

When someone says "yes" to the Snapshot, here is the exact workflow.

**What information you need:**

| Info | How You Get It |
|------|---------------|
| Company name and domain | You already have this from Apollo |
| Primary talent competitor | Ask in your reply OR they submit via the antellion.com form |
| Key roles they hire for | Ask in your reply OR they submit via the form |

**Two paths to intake:**

**Path A: They reply to your email with the info.** This is the high-touch path. You have what you need. Begin the Snapshot immediately.

**Path B: You direct them to antellion.com.** Use this when the reply is warm but brief ("yes, sounds good" without details). The form collects what you need.

**Which path to use:** If they replied to your cold email directly, keep the conversation in email. Sending them to a form feels like a downgrade. If they say "sounds interesting but I'm in back-to-back meetings," then directing to the form is appropriate.

**Delivery timeline:**

- Promise: 48 hours from receiving their info
- Target: 24 hours (under-promise, over-deliver)
- Hard maximum: 72 hours (if you go past this, send a brief update: "Running the final comparison now. You will have this tomorrow morning.")

**The delivery email:**

Name this snippet: `Snapshot Delivery`

```
{{first_name}} --

Your AI Employer Visibility Snapshot is attached.

Here is the short version: I ran [X] queries across [Y] themes that candidates ask AI when deciding where to work. I compared {{company}} against [competitor name] across every query.

Three things worth your attention:

1. [Top finding -- e.g., "You appear in 34% of AI responses. [Competitor] appears in 61%."]
2. [Second finding -- e.g., "AI cites [source] for [Competitor] but has no equivalent signal for {{company}}."]
3. [Third finding -- e.g., "For [role type] candidates specifically, {{company}} is absent from the top recommendations in [X] of [Y] queries."]

The full Snapshot walks through the methodology and every query result. It is designed to be shareable with your leadership team.

If you want to discuss what is driving these gaps and what the remediation options look like, I am happy to walk through it. But the Snapshot speaks for itself -- start there.

Jordan
```

**Why this structure works (Hormozi):** The Snapshot is a Type 1 lead magnet -- it reveals a problem they did not know they had. The delivery email gives them the three most important findings without explaining the full solution. The findings naturally create the question the Assessment answers.

---

### 7.3 Snapshot-to-Assessment Conversion

This is the transition from free value to paid offer.

**When to follow up after delivering the Snapshot:**

| Signal | When to Follow Up | What to Say |
|--------|-------------------|-------------|
| They reply immediately ("this is concerning" / "can we discuss?") | Respond within 2 hours | Warm Response template |
| They reply within 1-3 days with a question | Same day | Answer the question, then bridge |
| No reply after 3 business days | Day 4 after delivery | Gentle Check-In template |
| No reply after 7 business days | Day 8 after delivery | Final Follow-Up template |
| They forward it to someone else on their team | Immediately | Internal Champion template |

---

**TEMPLATE: Warm Response (they want to discuss)**

```
{{first_name}} --

Happy to walk through it. A few things I would focus on:

1. The specific sources where [Competitor] shows up and {{company}} does not -- these are addressable, and some of them are faster fixes than you might expect.
2. The query categories where {{company}} is completely absent -- this is where candidates are making decisions without ever seeing your name.
3. What "good" looks like for companies at your scale in [industry] -- there are clear patterns in which companies show up consistently and why.

The Snapshot shows you where you stand. The next step would be a full Assessment -- 120+ queries across 6 candidate-intent themes, 4 competitor comparison, source-level analysis, and a strategic remediation roadmap. That is the document that tells your team exactly what to do and in what order.

For companies at {{company}}'s size, the Assessment runs $5,000-$7,500 depending on scope. I can put together a specific proposal if that is worth exploring.

But first -- what stood out to you most in the Snapshot?

Jordan
```

**Why this works:** You demonstrate expertise with three specific areas, name the Assessment and its price in a single natural sentence, and end with an open question. The price is stated matter-of-factly, not apologetically.

---

**TEMPLATE: Gentle Check-In (day 4, no reply)**

```
{{first_name}} --

Wanted to make sure the Snapshot came through. Did anything stand out?

Jordan
```

That is the entire email. Do not re-pitch. Do not summarize findings.

---

**TEMPLATE: Final Follow-Up (day 8, no reply)**

```
{{first_name}} --

Last note on the Snapshot. If the timing is not right, completely understand -- the findings do not expire. AI responses shift slowly, so the competitive positioning data will be relevant for at least a quarter.

If you or someone on your team wants to revisit this later, everything I sent will still apply.

Jordan
```

Then stop. Add them to the 90-day follow-up list. When you circle back, lead with fresh data.

---

**TEMPLATE: "This is interesting but I need to think about it"**

This is the most common response after seeing Assessment pricing. Do NOT chase or discount.

```
Makes total sense. No rush on this.

One thing that might help: the Snapshot data I already sent you is yours to share internally. If there are stakeholders who need to see the competitive gap before committing to the full Assessment, the Snapshot is designed to make that case.

When you are ready to move forward, I can have a proposal to you the same day.

Jordan
```

**Why this works (Hormozi):** "Giving in public, asking in private." The Snapshot does the internal selling. You are not discounting, not adding urgency. You are making it easy for them to build internal consensus.

---

**TEMPLATE: Internal Champion (they forwarded to someone else)**

```
{{first_name}} --

Happy to connect directly with [person's name / their team] if that would be helpful. I can walk them through the methodology and answer any questions about how the scoring works.

The Snapshot was designed to be self-contained, but a 20-minute walkthrough makes the competitive findings land harder. Let me know if that would be useful.

Jordan
```

---

## Part 8: Metrics and Iteration

---

### 8.1 Weekly Tracking

**Set up a Google Sheets spreadsheet. Update every Friday.**

**Columns:**
- Week number
- Total emails sent (cumulative)
- Emails sent this week
- Open rate (directional only -- Apple Mail inflates this)
- Reply rate (all replies, including negative)
- Positive reply rate (interested + questions only)
- Snapshot requests
- Snapshots delivered
- Assessment conversations started
- Deals closed / revenue

---

### 8.2 Benchmarks: What "Good" Looks Like

**Cold email to C-suite benchmarks:**

| Metric | Bad (investigate) | Okay (keep going) | Good (double down) | Great (you found something) |
|--------|-------------------|--------------------|--------------------|----------------------------|
| **Open rate** | Below 25% | 25-35% | 35-50% | Above 50% |
| **Reply rate (all)** | Below 1% | 1-3% | 3-6% | Above 6% |
| **Positive reply rate** | 0% | 1-2% | 2-4% | Above 4% |
| **Snapshot requests per 100 emails** | 0-1 | 2-3 | 4-6 | 7+ |
| **Bounce rate** | Above 5% (stop) | 3-5% (clean list) | 1-3% | Below 1% |

**Context:** These buyers get 30+ vendor emails per week. A 3% positive reply rate from Chief Talent Officers at 2,001-10,000 employee companies is excellent. Do not compare yourself to SDR benchmarks that target Directors or Managers.

---

### 8.3 Optimization Triggers

**After first 50 sends (end of Week 1):**
- Check open rates per subject line variant. If any variant is below 25%, kill it.
- Check bounce rate. If above 5%, your list quality is bad -- tighten Apollo filters.
- Check spam rate. If any emails are landing in spam (check with a seed email to your own Gmail), investigate domain warmup.

**After first 100 sends (end of Week 2):**
- Compare reply rates across subject lines. Double down on the winner.
- Read every reply carefully. Are they confused about what you are offering? If so, the email copy needs clarity, not more persuasion.
- If you have 0 replies: the problem is likely deliverability, subject line, or offer clarity.

**After first 200 sends (end of Month 1):**
- You should have 4-15 snapshot requests by now. If fewer than 4, something fundamental is off.
- If open rates are strong (40%+) but reply rates are weak (<1%), the email body is not compelling enough. Test a different angle in Email 1.
- If reply rates are decent (3%+) but snapshot requests are low, the landing page is losing them. Check antellion.com for friction.

**What to iterate on and when:**

| Metric | When to Change | What to Change |
|--------|---------------|---------------|
| Open rate below 25% after 50 sends | Immediately | Check deliverability first. If fine, test new subject lines. |
| Open rate strong but reply rate below 1% after 100 sends | After 100 sends | Email body is not compelling. Test a different angle in Email 1. |
| Reply rate strong but snapshot requests low | After first 5 replies | Landing page is losing them. Check antellion.com for friction. |
| High bounce rate (above 3%) | Immediately | Tighten list. Remove bounced contacts. Consider secondary verification. |

**Red flags that mean something is broken:**

- 0 opens after 20+ sends = emails landing in spam. Stop sending. Run seed tests. Check Warmbox score.
- Open rate above 60% with 0 replies = Apple Mail inflating opens (normal) OR email body does not compel action.
- Warmbox score dropping while cold sends are active = cold sending is damaging warmup reputation. Reduce cold volume by 50% immediately.
- Multiple spam complaints in a small batch = subject line or sender name is triggering reports. Pause.

---

### 8.4 Apollo-Specific Optimization

**Reading Apollo analytics:**

1. Go to **Engage > Sequences > [Your Sequence]**
2. Click the **"Analytics"** tab
3. You will see:
   - Overall metrics: Total contacts, emails sent, opens, replies, bounces
   - Per-step metrics: Performance of each email in the sequence
   - A/B test results: Open rate and reply rate per subject line variant

**Identifying the winning subject line:**

1. After 75-100 sends total (25-33 per variant), check reply rates per variant
2. Kill the lowest-performing variant: deactivate it in the A/B test settings
3. After 150+ sends across the remaining two, go to the single winner
4. **Judge by reply rate, not open rate.**

**A/B testing email body (not just subject lines):**

Do NOT do this in Month 1. At 5-8 sends/day, you do not have enough volume for statistical significance on body variants. Subject line testing is higher-leverage. In Month 2, if reply rates are still below target with a winning subject line, create a second body variant for Email 1.

**Segmenting by industry:**

After Month 1, check reply rates per industry batch. If one industry outperforms (e.g., healthcare tech replies at 5% while manufacturing replies at 1%), allocate more volume to the winning industry. Consider writing an industry-specific Email 1 variant for your top-performing vertical.

**Handling bounced emails:**

1. Apollo automatically stops the sequence for hard bounces
2. Weekly, filter your sequence by **"Bounced"**
3. Review each bounced contact:
   - Domain exists but email bounced = person may have left the company. Remove them.
   - Domain does not exist = company data is stale. Remove the entire company.
4. If bounce rate exceeds 3% for a batch, re-verify contacts before sending the next batch.

**When to expand the prospect list:**

- After you have sent to your first 50-75 contacts (end of Week 2)
- Load the next 50-75 from your saved search into new industry batch lists
- Do NOT load all 300-800 contacts at once
- If you exhaust your list (unlikely in Month 1), expand the title filter to include "Head of Talent Acquisition" and "VP People" as secondary personas. Monitor reply rates separately.

---

### 8.5 What You Are Learning (Not Just Selling)

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

## Appendices

---

### Appendix A: "Do Today" Checklist

When Apollo access is restored, open this checklist and go top to bottom. This is the critical path.

**Hour 1: Account and Infrastructure**
- [ ] Log into Apollo. Verify account is active.
- [ ] Connect jordan@antellion.com as sending mailbox (Settings > Email > Email Accounts > + Add Email Account > Google)
- [ ] Set sender name to "Jordan Ellison"
- [ ] Set signature to blank or plain text only
- [ ] Go to Settings > Blocklist. Add `symphonytalent.com` and `antellion.com` and all Symphony Talent client domains.

**Hour 2: Search and List Building**
- [ ] Go to People > Search. Configure all filters per Part 3, Section 3.1.
- [ ] Save the search as `CTO v1 - 2K-10K - Verified`
- [ ] Create Batch 1 list: select 15-20 contacts from first industry, save as `Batch 1 - [Industry] - [Date]`
- [ ] Create Batch 2 list: repeat for second industry
- [ ] Create Batch 3 list: repeat for third industry
- [ ] Run quality checks on all three batches per Section 3.3
- [ ] Remove any contacts that fail quality checks

**Hour 3: Sequence and Templates**
- [ ] Go to Engage > Sequences > + New Sequence. Name: `CTO V1 - AI Visibility Snapshot`
- [ ] Add all 3 email steps per Part 4, Section 4.1
- [ ] Set up A/B test on Email 1 with 3 subject line variants per Section 4.2
- [ ] Configure sending window: 7:30-8:30 AM recipient local time, Tue/Wed/Thu
- [ ] Set daily sending limit to 10
- [ ] Set throttle delay to 3-5 minutes between emails
- [ ] Enable open tracking, click tracking, stop on reply, stop on bounce, unsubscribe link
- [ ] Replace `[INDUSTRY]` in Email 1 and Email 2 with Batch 1's industry keyword
- [ ] Load 5 contacts from Batch 1 into the sequence. DO NOT ACTIVATE YET.
- [ ] Go to Engage > Snippets. Save all 8 reply templates from Part 7.

**Hour 4: Verification**
- [ ] Send test email from the sequence to personal Gmail. Check all items in Section 5.1.
- [ ] Verify UTM parameters pass through correctly on link click.
- [ ] If Apollo has a persona feature working: paste the persona config from Part 2, Section 2.2
- [ ] If Apollo has a company profile feature working: paste the company profile from Part 2, Section 2.1

**After verification passes:**
- [ ] If warmup is complete (Warmbox score 80+, 14+ days), sequence is ready to activate on the next Tue/Wed/Thu
- [ ] If warmup is not complete, leave sequence armed but not activated. Continue warmup.

---

### Appendix B: Complete Pre-Launch Checklist

Copy this to a note or print it. Check off every item on April 28.

**Infrastructure**
- [ ] Google Workspace active for antellion.com
- [ ] jordan@antellion.com mailbox working
- [ ] SPF record added and verified (PASS on mxtoolbox)
- [ ] DKIM record generated, added, and authenticated (PASS)
- [ ] DMARC record added (`p=none`)
- [ ] mail-tester.com score 9/10+
- [ ] MXToolbox shows no warnings or blacklists

**Warmup**
- [ ] Warmbox warmup score 80+
- [ ] Inbox placement rate 95%+
- [ ] 14+ days of warmup completed
- [ ] Manual test email lands in inbox (Gmail, Outlook)
- [ ] Warmup will continue running alongside cold sends

**Apollo**
- [ ] Account created and jordan@antellion.com connected as sending mailbox
- [ ] Sending name: "Jordan Ellison"
- [ ] Signature: plain text or blank
- [ ] Search filters configured per Part 3
- [ ] 300-800 contacts in saved search
- [ ] Contacts organized into industry batch lists (15-20 per batch)
- [ ] First batch of 50-75 contacts loaded across 3 industry lists
- [ ] Sequence created with all 3 emails
- [ ] A/B test configured on Email 1 (3 variants, equal split)
- [ ] `[INDUSTRY]` replaced with actual industry keyword for first batch
- [ ] Sending window: 7:30-8:30 AM recipient local time, Tue-Wed-Thu
- [ ] Daily sending limit: 10
- [ ] Delay between emails: 3-5 minutes
- [ ] Open tracking: ON
- [ ] Click tracking: ON
- [ ] Stop on reply: ON
- [ ] Stop on bounce: ON
- [ ] Unsubscribe link: present
- [ ] UTM parameters on all antellion.com links (verified by clicking test email link)
- [ ] Sequence armed but NOT activated

**Reply Readiness**
- [ ] All reply templates saved as Apollo snippets (8 templates from Part 7)
- [ ] Tracking spreadsheet set up with all columns
- [ ] Snapshot delivery email template saved
- [ ] Assessment transition templates saved

**Content and Site**
- [ ] antellion.com landing page live and form functional
- [ ] Mobile rendering tested
- [ ] Slack notification fires on form submission
- [ ] Confirmation email sends on form submission
- [ ] At least 1 blog post published
- [ ] At least 3 industry research scans documented (with real AI query observations)
- [ ] At least 1 Snapshot dry run completed and timed

**Calendar**
- [ ] 7:30-10:00 AM blocked on Tue/Wed/Thu for sending and monitoring
- [ ] 90-day follow-up list created in Apollo for "not now" responses

**Safety**
- [ ] Symphony Talent companies excluded from all lists
- [ ] Symphony Talent domains added to Apollo blocklist
- [ ] No LinkedIn activity associated with Antellion
- [ ] All outreach is from jordan@antellion.com only

---

### Appendix C: Conversion Math

**Month 1 funnel (conservative):**

```
Emails sent:                    200
Open rate:                      35%      = 70 opens
Reply rate (all):               3%       = 6 replies
Positive reply rate:            2%       = 4 positive replies
Snapshot request rate:          1.5%     = 3 Snapshot requests
Snapshots delivered:                       3
Assessment conversations:                  1-2
Assessment closed:                         0-1
```

**Month 1 funnel (realistic):**

```
Emails sent:                    200
Open rate:                      40%      = 80 opens
Reply rate (all):               4%       = 8 replies
Positive reply rate:            2.5%     = 5 positive replies
Snapshot request rate:          2%       = 4-5 Snapshot requests
Snapshots delivered:                       4-5
Assessment conversations:                  2-3
Assessment closed:                         1
```

**Revenue implications:**

- 1 Assessment closed at $5,000 (introductory pricing) = $5,000
- 1 Assessment closed at $7,500 (standard pricing) = $7,500
- Cost of acquisition: ~$35-85/month (Google Workspace + Warmbox + Apollo)
- ROI: 60-200x on software cost alone

Even at the conservative estimate, 3 Snapshots in Month 1 creates 3 live assessment conversations. Expect a 2-4 week lag between delivering the Snapshot and closing the Assessment. Month 1 plants seeds. Month 2 is where the first deals close.

**The Hormozi math:**

Warm reach outs convert at about 1%. Cold outreach to C-suite converts lower -- call it 0.5% to close. At 200 emails:

- 200 x 0.5% = 1 closed deal
- 1 deal x $5,000 = $5,000

That is $5,000 from $85 in software costs and approximately 50 hours of total work. That is $100/hour for the founder's time -- and more importantly, it is the first revenue, the first case study, and the first proof that the positioning works.

The compounding starts in Month 2-3 when:
- Your winning subject line is identified
- Your domain reputation is established
- Your Snapshot delivery process is fast
- Your first happy customers refer others
- You expand to a second persona (VP Talent Acquisition)

---

### Appendix D: Language Rules

Maintain these across all emails and replies.

**Always say:**
- "Visibility Snapshot" (capitalized, two words)
- "how often [company] comes up" or "how often you are mentioned" (plain English, not "mention rate")
- "places AI pulls from where you are missing" or "sources where you do not show up" (not "citation gaps")
- "questions candidates ask AI" or "what candidates ask ChatGPT" (not "candidate-intent queries")

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

### Appendix E: What NOT to Do

These are specific to this audience and campaign. Every one will kill your reply rate.

**Do Not Open With Who You Are**

> Bad: "Hi Sarah, I'm Jordan Ellison, founder of Antellion, an AI employer visibility platform..."

Chief Talent Officers get 30+ vendor emails a week. Open with what you found, not your bio.

**Do Not Ask For a Meeting Before Giving Value**

> Bad: "Would you have 15 minutes to discuss how AI is shaping employer perception?"

The Snapshot is the value. Give it first, earn the conversation after.

**Do Not Use the Word "Free"**

> Bad: "I'd like to offer you a free AI employer visibility report..."

"Free report" sounds like a PDF lead magnet from 2019. Say "no cost" not "free."

**Do Not Use Category Education as Your Hook**

> Bad: "AI is transforming how candidates discover employers..."

This sounds like a conference keynote. They need to know what AI says about THEIR company.

**Do Not Name-Drop Competitors You Have Not Verified**

> Bad: "I found that Accenture appears 3x more than {{company}} in AI responses..."

If you guess wrong, credibility gone. The emails use "your closest talent competitor" intentionally.

**Do Not Send More Than 3 Emails**

Enterprise buyers respect restraint. Move non-responders to 90-day nurture.

**Do Not CC or BCC Multiple People at the Same Company**

If both contacts realize they got the same email, the personal illusion breaks.

**Do Not Use Visible Template Language**

> Bad: "Companies like {{company}} in the {{industry}} space are..."

Template-feeling sentence structure kills credibility even when merge fields render correctly.

**Do Not Claim Antellion Improves AI Responses**

Antellion measures and recommends. Chief Talent Officers catch overclaims.

**Do Not Send on a New Domain Without Warmup**

The 14-day warmup is not optional.

**Do Not Say "I Built a Tool"**

> Bad: "I built a tool that measures this."

The moment they read it, you are a founder pitching a product, not a peer sharing something interesting.

---

### Appendix F: Hormozi Framework Applied to This Campaign

**Value Equation: Snapshot Offer**

**Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort)**

| Variable | How This Campaign Maximizes It |
|----------|-------------------------------|
| **Dream Outcome** | Know what AI tells candidates about your company vs. competitors. For CTOs at 2K-10K companies, the dream outcome is intelligence that larger competitors do not yet act on. |
| **Perceived Likelihood** | "120 questions." "48 hours." "Two things stood out." Specific numbers and evidence of work already done. |
| **Time Delay** | 48 hours. Said explicitly in every email. |
| **Effort** | Visit a URL. Fill out a 60-second form. No call. No demo. |

**Lead Magnet Type: Reveal Their Problem**

The Snapshot is a Type 1 lead magnet: it reveals a problem the prospect does not know they have. This is the most powerful type because:
- They cannot get this data anywhere else (incomparable offer)
- The problem gets worse the longer they wait
- Once revealed, the problem naturally points to the full Assessment
- For 2K-10K companies: the squeeze dynamic makes the revealed problem feel urgent and strategic

**"The Goal of the First Message Is to Get a Response, Not to Close"**

The emails never ask for a sale, meeting, or commitment. They ask for one thing: visit a link. The Snapshot does the selling. The Assessment conversation happens after they see their data.

---

### Appendix G: The 90-Day Nurture Cadence

For every contact who replies "not now" or does not convert after receiving a Snapshot.

**Day 90: Re-engagement email**

```
{{first_name}} --

Three months ago I shared some observations about how AI describes {{company}} to candidates. A few things have shifted since then.

I re-ran queries for [industry] last week. Two updates worth noting:

1. [New finding -- something that changed or a new competitive dynamic]
2. [New finding -- a new source or signal that has emerged]

If you want an updated Snapshot, same offer as before -- antellion.com. Takes 60 seconds to request, 48 hours to deliver.

Jordan
```

**Why 90 days:** Long enough for genuinely new data. Short enough that they remember who you are. Hormozi: "keeping the list warm" with regular value deposits.

**Day 180: Second re-engagement (if no response at Day 90)**

Same format but with six months of new data. If they do not respond after two nurture attempts, move to a passive list. Do not email them again unless you have something genuinely new (a published case study from their industry, a major AI model change that affects employer visibility).

---

### Appendix H: Post-Campaign Next Steps

**If Campaign V1 works (5+ Snapshot requests in Month 1):**
- Run Campaign V2 with the winning subject line and iterate on the email body
- Expand to VP Talent Acquisition as a second persona (different copy, same sequence structure)
- Begin testing a second industry vertical

**If Campaign V1 underperforms (<3 Snapshot requests in Month 1):**
- Check deliverability first (most common cause of failure for new domains)
- If deliverability is fine, test a completely different Email 1 angle
- Consider whether VP Talent Acquisition should be the primary target

**Regardless of outcome:**
- Every Snapshot you deliver is a potential case study (anonymized)
- Every reply is data about how this persona thinks about AI and employer brand
- Every non-response is also data -- it tells you what did not work

---

### Appendix I: Copy-Paste Ready Emails (All Three, Apollo Format)

**Email 1 -- Apollo Format**

**Subject lines (A/B variants):**
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

**Note:** Replace `[INDUSTRY]` with the industry keyword for each batch.

---

**Email 2 -- Apollo Format**

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

**Email 3 -- Apollo Format**

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

### Appendix J: Cost Summary

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Google Workspace (Business Starter) | $7.20 | jordan@antellion.com |
| Warmbox | $19 | Dedicated email warmup |
| Apollo.io | $0-49 | Free tier may be sufficient for Month 1 |
| GlockApps (one-time seed test) | $7 | Run once at day 7 and once at day 14 |
| **Total Month 1** | **~$35-85** | |

This is intentionally cheap. Do not add tools until the process demands them. The expensive thing is Jordan's time, not the software.

---

### Appendix K: Warmup Period Parallel Work Plan

This is not idle time. Here is what to do during the 14-day warmup before cold sends begin.

**Priority 1: Build the Apollo Prospect List (Days 1-3)**

Time: 3-4 hours over 3 days.

1. Set up Apollo account and connect jordan@antellion.com
2. Configure all filters per Part 3
3. Export 300-800 contacts
4. Organize into industry batches (15-20 per batch)
5. Create the email sequence with all 3 emails and A/B test
6. Load first 50-75 contacts into sequence (DO NOT ACTIVATE)

**Priority 2: Run Industry Research Scans (Days 3-7)**

Time: 30-45 minutes per industry, 3-4 industries.

For each industry:
1. Run 10-15 candidate-intent queries through ChatGPT and Claude:
   - "Best [industry] companies to work for"
   - "Top employers in [industry] for engineers"
   - "Should I work at [Company A] or [Company B]?"
   - "What is the culture like at [Company]?"
2. Document findings in a running Google Doc: which companies appear, which sources AI cites, surprising gaps
3. For each company in your first Apollo batch, note two specific findings (for reply conversations)

**Priority 3: Write and Publish Foundation Content (Days 4-10)**

Time: 2-3 hours per piece, 2-3 pieces during warmup.

1. "AI Employer Visibility: What It Is, Why It Matters, and How to Measure It" (the definitional piece)
2. "GEO for Employer Brand: A Glossary of AI Visibility Terms" (the reference page)
3. "The Candidate Decision Journey" (if time permits)

**Priority 4: Landing Page Optimization (Days 5-7)**

Time: 2-3 hours total.

1. Load the page and time the experience (can a CTO understand in 10 seconds?)
2. Check mobile rendering
3. Verify Slack notification fires for form submissions
4. Add UTM tracking
5. Review confirmation email

**Priority 5: Prepare Response Infrastructure (Days 8-10)**

Time: 1-2 hours.

1. Save all response templates as Apollo snippets
2. Set up tracking spreadsheet
3. Do a Snapshot dry run (pick a company, run queries, score results, time yourself)
4. Block calendar for sending windows

**Daily schedule during warmup:**

| Time Block | Activity | Duration |
|------------|----------|----------|
| 7:30-8:00 AM | Check Warmbox dashboard | 30 min |
| 8:00-10:00 AM | List building (days 1-3) / Research (4-7) / Content (8-14) | 2 hours |
| 10:00-10:30 AM | Landing page, response prep, or Snapshot dry runs | 30 min |
| Evening | Check warmup metrics | 5 min |
| **Total** | | **~2.5-3 hours** |

---

### Appendix L: Complete Timeline

**Week 1 (Apr 12-18): Infrastructure and List Building**

| Day | Date | Primary Task | Secondary Task |
|-----|------|-------------|----------------|
| Sat | Apr 12 | Set up Google Workspace. Configure SPF, DKIM, DMARC. | Sign up for Warmbox. |
| Sun | Apr 13 | Connect Workspace to Warmbox. Start warmup. Verify DNS. | Set up Apollo account. |
| Mon | Apr 14 | Build Apollo prospect list. Configure filters. Export and organize. | Check Warmbox dashboard. |
| Tue | Apr 15 | Load first 50-75 contacts into sequence. Configure A/B test. DO NOT ACTIVATE. | Run first industry scan (enterprise SaaS). |
| Wed | Apr 16 | Run second industry scan (healthcare tech). | Check warmup metrics. Send manual test email. |
| Thu | Apr 17 | Run third industry scan (financial services). | Begin writing Piece 1. |
| Fri | Apr 18 | Continue writing Piece 1. | Check warmup metrics. Score should be climbing past 60. |

**Week 2 (Apr 19-25): Content, Optimization, Final Prep**

| Day | Date | Primary Task | Secondary Task |
|-----|------|-------------|----------------|
| Sat | Apr 19 | Finish and publish Piece 1 to blog. Cross-post to Medium. | Write Piece 3 (Glossary). |
| Sun | Apr 20 | Publish Piece 3. | Landing page review and optimization. |
| Mon | Apr 21 | Day-7 warmup verification: mail-tester, spot check to Gmail/Outlook/Yahoo. | Save response templates in Apollo. |
| Tue | Apr 22 | Full Snapshot dry run. Time yourself. Fix workflow issues. | Set up tracking spreadsheet. |
| Wed | Apr 23 | Run 4th industry scan. | Write Piece 2 if time permits. |
| Thu | Apr 24 | Run day-14 pre-launch verification checklist. Fix any issues. | Block calendar for launch week. |
| Fri | Apr 25 | Final check: all systems ready. Warmbox score 80+. Sequence armed. | Rest. |

**Week 3 (Apr 26-30): Launch**

| Day | Date | Activity |
|-----|------|----------|
| Sat-Mon | Apr 26-28 | No cold sends. Warmup continues. Final reviews. Pre-launch day checklist (Mon). |
| Tue | Apr 29 | LAUNCH. Activate sequence. Send first 5 cold emails. Monitor. |
| Wed | Apr 30 | Send 5 more. Check Day 1 metrics. |

**Post-launch weekly rhythm:**

| Day | Morning (7:30-10:00 AM) | Rest of Day |
|-----|------------------------|-------------|
| Monday | Prep industry research. Check metrics. | Write content if time permits. |
| Tuesday | Send cold emails (batch 1). Monitor. Respond. | Fulfill Snapshot requests. |
| Wednesday | Send cold emails (batch 2). Monitor. Respond. | Fulfill Snapshot requests. |
| Thursday | Send cold emails (batch 3). Monitor. Respond. | Fulfill Snapshot requests. |
| Friday | Review metrics. Update spreadsheet. Plan next week. | No sends. No follow-ups. |

---

**End of playbook.** This is the ONE file. When Apollo access is restored, start with Appendix A ("Do Today" checklist) and work forward.
