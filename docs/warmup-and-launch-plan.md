# Email Warmup and Launch Plan

**Date:** April 12, 2026
**Domain:** antellion.com
**Sender:** jordan@antellion.com
**Current status:** Domain registered, zero sending history, landing page live, Slack lead notifications active
**Constraint:** No LinkedIn outreach (employer risk)
**Goal:** Be sending cold emails by April 28, 2026

---

## 1. Email Infrastructure Setup

### Email Provider: Google Workspace

Use Google Workspace, not Zoho or a budget alternative. Here is why:

- **Deliverability reputation.** Google IP ranges have the highest baseline trust with receiving mail servers. A new domain on Google Workspace starts with better deliverability than the same domain on Zoho, Outlook.com, or a self-hosted solution.
- **Apollo integration.** Apollo's sending infrastructure works cleanly with Google Workspace. SMTP connection is straightforward and well-documented.
- **Price.** $7.20/month for Business Starter. This is not the place to save money.

**Setup steps:**

1. Go to workspace.google.com and sign up with the antellion.com domain
2. Create the primary mailbox: jordan@antellion.com
3. Complete the Google Workspace verification (add a TXT record to DNS to prove domain ownership)

### DNS Records for Deliverability

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

### Verification Checklist

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

## 2. Inbox Warmup Plan

### Warmup Tool: Warmbox

**Why Warmbox:**

- **Purpose-built for email warmup.** Warmbox operates its own network of real inboxes that exchange emails with your account, mimicking genuine engagement (opens, replies, moves-out-of-spam).
- **Clear monitoring dashboard.** Warmbox tracks your warmup score, inbox placement rate, and daily volume, and flags problems before they become permanent.
- **Native Google Workspace support.** Warmbox connects directly to Google Workspace without workarounds or additional app passwords.
- **Does not interfere with Apollo.** You can run Warmbox warmup on jordan@antellion.com while also connecting it to Apollo for sending. They use different SMTP connections.

**Alternatives if Warmbox does not work for some reason:** Mailwarm ($79/month, larger network) or Instantly.ai ($30/month, warmup + sending). Warmbox is the best fit for a solo founder who needs dedicated warmup.

### Warmup Schedule

The warmup period is 14 days minimum. Here is the exact daily ramp:

| Day | Warmup Emails Sent | Warmup Emails Received | Notes |
|-----|-------------------|----------------------|-------|
| 1-2 | 5 | 5 | Warmbox auto-configures this. Low volume to establish baseline. |
| 3-4 | 10 | 10 | Still establishing domain reputation. |
| 5-7 | 15 | 15 | Open and reply rates from warmup network should be 40-60%. |
| 8-10 | 20 | 20 | Check Warmbox dashboard. Warmup score should be climbing. |
| 11-14 | 25-30 | 25-30 | Peak warmup volume. This is where most reputation building happens. |
| 15+ | Keep running at 20-25 | 20-25 | Continue warmup indefinitely alongside cold sends. Never stop. |

**Important:** Do not turn off warmup when you start sending cold emails. Warmup and cold sends run in parallel. The warmup activity (opens, replies, moves-out-of-spam) continues to improve your sender reputation while your cold sends are going out. Turning off warmup after launch is the second most common mistake after sending too early.

### What Warmup Emails Look Like

Warmbox handles this automatically. The warmup emails are:

- **Real conversations between real inboxes.** They are not blank messages or test strings. Warmbox's network sends contextual, natural-language emails back and forth.
- **Opened, replied to, and marked as important** by the receiving accounts. This teaches Gmail, Outlook, and Yahoo that emails from jordan@antellion.com are legitimate and wanted.
- **Moved out of spam** if they land there. This is critical -- it actively trains spam filters that your domain is not spam.

You do not write warmup emails. You connect your Google Workspace account to Warmbox, enable warmup, and it runs automatically in the background.

### How to Verify Warmup Is Working

Check these daily during the warmup period:

**Warmbox Dashboard (check daily, takes 30 seconds):**
- **Warmup Score:** Should climb from ~50 to 80+ over 14 days. If it plateaus below 70, something is wrong with your DNS configuration.
- **Inbox Placement Rate:** Percentage of warmup emails landing in inbox vs. spam. Target: 95%+ by day 10.
- **Daily Volume:** Confirm Warmbox is sending and receiving the expected number of warmup emails per the schedule above. If volume drops unexpectedly, check your connection.

**External Checks (run once at day 7 and once at day 14):**
- **mail-tester.com:** Send a fresh test email. Score should be 9/10 or higher.
- **GlockApps or InboxReady:** These services send your email to seed accounts across Gmail, Outlook, and Yahoo and report where it lands (inbox, promotions, spam). Run one test at $4-7 to see actual placement. If more than 10% of seeds land in spam, pause and investigate.

**Manual Spot Check (do this on day 7):**
- Send an email from jordan@antellion.com to your personal Gmail, a Outlook/Hotmail address, and a Yahoo address. Check if they land in inbox, promotions, or spam. If any land in spam, check your DNS records again.

### Red Flags During Warmup

Stop and investigate if any of these happen:

| Signal | What it means | What to do |
|--------|--------------|------------|
| Reputation score dropping | DNS misconfigured, or warmup volume too high too fast | Re-check SPF/DKIM/DMARC. Reduce warmup volume by 50%. |
| Inbox placement below 80% after day 7 | Spam filters are not trusting your domain | Run mail-tester.com. Check if your domain or IP is on any blacklists (mxtoolbox.com/blacklists). |
| Google Workspace account suspended | Google flagged unusual sending patterns | Contact Google support. This is rare with Warmbox but possible. Reduce warmup volume. |
| Warmup emails not being sent | Connection issue | Re-authenticate in Warmbox. Verify Google Workspace connection is active. |

---

## 3. What to Do During the 1-2 Week Warmup Period

This is not idle time. This is building phase. Hormozi's framework is explicit: there are four ways to get leads (warm outreach, cold outreach, free content, paid ads). Cold outreach is blocked for 14 days. The other three are not. And there is essential prep work that makes cold email day 1 dramatically more effective.

### Priority 1: Build the Apollo Prospect List (Days 1-3)

**Time investment:** 3-4 hours total over 3 days
**Why now:** On cold email day 1, you want to press "start sequence" with 50-75 contacts already loaded, vetted, and organized by industry batch. If you wait until launch day to build the list, you waste another 2-3 days.

**Actions:**

1. **Set up the Apollo account.** Connect jordan@antellion.com as the sending address. Configure the signature block.
2. **Configure the filters exactly as documented in the email campaign plan:**
   - Title: Chief Talent Officer, Chief People Officer, SVP Talent, SVP People, VP Talent Strategy
   - Seniority: C-Suite, VP
   - Headcount: 2,001-5,000 and 5,001-10,000
   - Email status: Verified only
   - Location: US, Canada, UK
   - Exclude: Government, Education, Non-profit, companies with Symphony Talent relationships
3. **Export the full list.** You should get 300-800 contacts with these filters.
4. **Organize into industry batches.** Group contacts by industry (enterprise SaaS, healthcare tech, financial services, professional services, manufacturing, retail, media). Each batch should have 15-25 contacts.
5. **Create the email sequence in Apollo.** Load all three emails from the campaign plan. Configure the A/B test on Email 1 subject lines. Set the sending window to 7:30-8:30 AM prospect local time, Tuesday-Thursday.
6. **Add UTM parameters** to all antellion.com links: `?utm_source=apollo&utm_campaign=cto_v1`
7. **Load the first batch (50-75 contacts) into the sequence** but DO NOT activate it. It should be ready to go on day 1 with one click.

### Priority 2: Run Industry Research Scans (Days 3-7)

**Time investment:** 30-45 minutes per industry, 3-4 industries during warmup
**Why now:** The email copy says "I have been testing what AI tells candidates about companies in [INDUSTRY]." This must be true. You need real observations for your first industry batches, and you need practice running scans efficiently.

**Actions:**

1. **Pick the 3-4 industries in your first sending batches.** Likely: enterprise SaaS, healthcare tech, financial services, and one more.
2. **For each industry, run 10-15 candidate-intent queries through ChatGPT and Claude.** Examples:
   - "Best [industry] companies to work for"
   - "Top employers in [industry] for engineers"
   - "Should I work at [Company A] or [Company B]?"
   - "What is the culture like at [Company]?"
   - "Is [Company] a good place to work?"
   - "[Company] vs [Competitor] for product managers"
3. **Document findings in a running Google Doc** organized by industry. For each query, note:
   - Which companies appear in the AI response
   - Which sources AI cites (Built In, Glassdoor, Levels.fyi, Blind, etc.)
   - Any surprising gaps (large companies that do not appear, small companies that do)
   - Common themes in how AI describes the industry
4. **For each company in your first Apollo batch, note two specific findings.** These become your personalization material for reply conversations. You do not put them in the cold email (the copy uses "your closest talent competitor" intentionally), but you need them ready for when someone replies.

This also doubles as practice for Snapshot fulfillment. By the time your first Snapshot request comes in, you will have already run queries for that industry and know the patterns.

### Priority 3: Write and Publish Foundation Content (Days 4-10)

**Time investment:** 2-3 hours per piece, 2-3 pieces during warmup
**Why now:** The content plan already exists. The warmup period is the only time you will have to write before cold email volume demands your attention. And published content makes your cold emails more credible -- when a CTO Googles "Antellion" or "AI employer visibility" after receiving your email, they should find substance.

**Actions from the GEO content plan, in priority order:**

1. **Piece 1: "AI Employer Visibility: What It Is, Why It Matters, and How to Measure It"**
   - The definitional piece. 2,500-3,500 words.
   - Publish on the Antellion blog. Cross-post a shorter version to Medium.
   - This is the cornerstone. When someone asks an AI model "what is AI employer visibility?" this should become a cited source.
   - Include clear H2 headers that match likely queries. Structure for AI citation.

2. **Piece 3: "GEO for Employer Brand: A Glossary of AI Visibility Terms"**
   - Reference page with every term from the Antellion vocabulary framework.
   - Publish as a standalone, permanently linked page on antellion.com.
   - This is the highest-value GEO asset. AI models prioritize structured, definitional content.

3. **If time permits, Piece 2: "The Candidate Decision Journey"**
   - The four-stage framework piece.
   - Include the pipeline throughput leakage math.

**Hormozi framework alignment:** This is "Post Free Content" from the Core Four. You cannot do warm outreach (no LinkedIn), cold outreach (domain warming up), or paid ads (not yet). Free content is the one lever you can pull right now. And the content is not generic -- it is defining the category and creating the reference material that makes your cold emails credible.

### Priority 4: Landing Page Optimization (Days 5-7)

**Time investment:** 2-3 hours total
**Why now:** Cold emails drive traffic to antellion.com. If the landing page loses them, the emails do not matter. Fix friction before launch, not after.

**Actions:**

1. **Load the page yourself and time the experience.** Can a CTO understand what they are getting within 10 seconds? Is the form visible without scrolling? Does the confirmation flow work?
2. **Check mobile rendering.** Executives check email on phones at 7:30 AM. If they click through, the landing page must work on mobile.
3. **Verify the Slack notification fires** for form submissions. Submit a test entry and confirm it appears in Slack.
4. **Add the UTM tracking.** Confirm that visits from `?utm_source=apollo&utm_campaign=cto_v1` are trackable in whatever analytics you are using.
5. **Review the confirmation email.** When someone submits the form, what do they receive? It should confirm: what they will get (Visibility Snapshot), when (48 hours), and what happens next (you will email them directly). If no confirmation email exists, set one up.

### Priority 5: Prepare Response Infrastructure (Days 8-10)

**Time investment:** 1-2 hours
**Why now:** When cold emails go out and someone replies "interested," you need to respond within 2 hours. That means the response templates, the intake process, and the scan workflow need to be ready before day 1, not figured out on the fly.

**Actions:**

1. **Save response templates as Apollo snippets** (or as text expander shortcuts):
   - "Interested" reply template
   - "Bad timing" reply template
   - Objection-handling templates (all from the campaign plan Section 7)
2. **Set up a tracking spreadsheet or CRM.** Columns: prospect name, company, industry, date sent, email stage, reply status, snapshot requested (Y/N), snapshot delivered (Y/N), outcome.
3. **Do a dry run of the Snapshot fulfillment process.** Pick one company from your Apollo list. Run the queries. Score the results. Draft the output. Time yourself. Know how long a Snapshot actually takes before you promise 48 hours to a real prospect.
4. **Block your calendar.** 7:30-8:30 AM Tuesday-Thursday for sending. 8:30-10:00 AM same days for monitoring replies and responding. This is non-negotiable once sends begin.

### Daily Schedule During Warmup (Suggested)

| Time Block | Activity | Duration |
|------------|----------|----------|
| 7:30-8:00 AM | Check Warmbox dashboard. Run any manual spot checks. | 30 min |
| 8:00-10:00 AM | Apollo list building (days 1-3) or industry research (days 4-7) or content writing (days 8-14) | 2 hours |
| 10:00-10:30 AM | Landing page work, response prep, or Snapshot dry runs | 30 min |
| Evening | Check warmup metrics one more time | 5 min |

**Total daily time investment during warmup:** 2.5-3 hours focused on Antellion work. This respects the constraint that Jordan has a full-time job and limited time windows.

---

## 4. Day 1 Cold Email Launch Plan

### Pre-Launch Verification (Day 14 of warmup, the day before launch)

Do not launch without completing every item:

- [ ] Warmbox warmup score is 80+
- [ ] Inbox placement rate is 95%+
- [ ] mail-tester.com score is 9/10 or higher
- [ ] Sent test email to personal Gmail -- lands in inbox, not spam or promotions
- [ ] Sent test email to Outlook address -- lands in inbox
- [ ] Apollo sequence is configured with all 3 emails, A/B test active
- [ ] First batch of 50-75 contacts is loaded in Apollo
- [ ] UTM parameters are on all links
- [ ] Response templates are saved
- [ ] Tracking spreadsheet is ready
- [ ] Calendar is blocked for sending windows
- [ ] At least one Snapshot dry run is complete
- [ ] At least 3 industries have documented AI query observations

### Cold Send Ramp Schedule

Do not go from 0 to 20 emails per day. Ramp gradually so spam filters see a natural sending pattern, not a sudden blast.

| Day | Cold Emails Sent | Warmup Emails (parallel) | Total from jordan@antellion.com | Notes |
|-----|-----------------|------------------------|-----------------------------|-------|
| Launch Day 1 (Tue) | 5 | 20 | 25 | First real sends. Small batch, one industry. |
| Day 2 (Wed) | 5 | 20 | 25 | Same industry or second industry. |
| Day 3 (Thu) | 8 | 20 | 28 | Slight increase if deliverability is clean. |
| Day 4 (next Tue) | 8 | 20 | 28 | Check metrics from first 3 days before increasing. |
| Day 5 (Wed) | 10 | 20 | 30 | Increase only if open rates are above 30%. |
| Day 6 (Thu) | 10 | 18 | 28 | Slightly reduce warmup as cold volume increases. |
| Week 3 | 12-15/day | 15 | 27-30 | Steady state for Month 1. |
| Week 4+ | 15-20/day | 15 | 30-35 | Max sustainable volume for one mailbox. |

**Hard ceiling:** Never exceed 30-35 total emails per day (cold + warmup combined) from a single Google Workspace mailbox. If you need more volume in the future, set up a second address (j@antellion.com or hello@antellion.com) and warm it up separately.

### Sending Rules for Week 1

1. **Send only on Tuesday, Wednesday, Thursday.** No Monday (competes with weekend catch-up). No Friday (mental checkout). Definitely no weekends.
2. **Send between 7:30-8:30 AM in the prospect's local time.** Apollo handles timezone-aware scheduling.
3. **One industry per day.** This is the "industry batch method" from the campaign plan. Monday = prep queries for that industry. Tuesday = send to enterprise SaaS. Wednesday = send to healthcare tech. Thursday = send to financial services.
4. **Do not front-load your best prospects.** The first 15-20 sends are partially a deliverability test. Use middle-of-the-list contacts, not your dream accounts. Save the best prospects for week 2 once you have confirmed everything is working.

### What to Monitor (Daily, During First Week)

Check these numbers every day at the end of your sending window:

| Metric | Healthy | Warning | Stop and Investigate |
|--------|---------|---------|---------------------|
| **Bounce rate** | Under 2% | 2-5% | Above 5% |
| **Open rate** | 35-50% | 25-35% | Below 25% |
| **Spam complaints** | 0 | 1 in 50+ sends | More than 1 in 50 sends |
| **Unsubscribes** | Normal at any rate | N/A | N/A |
| **Warmbox warmup score** | Stable or climbing | Dropping 1-2 points | Dropping 5+ points |

**If bounce rate exceeds 5%:** Your Apollo list quality is bad. The verified email filter is not working or contacts are stale. Pause, clean the list, remove bounced addresses, and resume with a smaller batch.

**If open rates drop below 25%:** Your emails are likely landing in spam for some recipients. Run a GlockApps seed test immediately. If the test confirms spam placement, reduce cold volume by 50% and increase warmup for 3-5 days.

**If you get a spam complaint:** This is a CAN-SPAM issue. Check that the unsubscribe link is present and functional. A single complaint in 100+ sends is normal. Multiple complaints in a small batch means your subject line or sender name is triggering spam reports -- most likely because it looks automated.

### When to Know Something Is Wrong vs. Normal

**Normal (do not panic):**
- 0 replies in the first 3 days. Enterprise executives are slow. Give it a full week.
- Open rates of 30-40% on a new domain. This is fine. It will improve as your reputation builds.
- One or two bounces in 50 sends. Apollo verification is not perfect.
- A prospect unsubscribes. They are not your customer. Move on.

**Something is wrong (investigate):**
- 0 opens after 20+ sends. Your emails are landing in spam. Run seed tests.
- Open rates above 60% but 0 clicks or replies. Apple Mail Privacy Protection may be inflating opens. Or your email body is not compelling. Check a few manually.
- Warmbox warmup score dropping while cold sends are going out. Your cold sending is damaging the reputation the warmup built. Reduce cold volume immediately.
- Google Workspace sends a warning about unusual activity. Take it seriously. Reduce volume.

---

## 5. Parallel Lead Generation During Warmup

Cold email is blocked for 14 days. LinkedIn DMs are permanently blocked. That leaves three categories worth exploring, all within the Hormozi "Core Four" framework.

### Channel 1: Free Content (High Priority)

This is the one lever you can pull immediately with no infrastructure constraints.

**Where to publish (in priority order):**

1. **antellion.com blog.** Foundation content goes here first. This is what prospects find when they Google your name after receiving a cold email. It is also what AI models index when someone asks about AI employer visibility.

2. **Medium.** Cross-post blog content. Medium has domain authority that a new site does not. Articles on Medium rank faster in Google and get picked up by AI models more quickly. Use your own Medium account, not the Antellion publication (you do not have one yet and do not need one).

3. **X (Twitter).** You can post observations from your industry research scans as short threads. "I asked ChatGPT who the best employers are in enterprise SaaS. Here is what it said, and here is what is surprising about it." This is Hormozi's "manufactured experience" content category -- you are running the scans anyway for Apollo prep, so turn the findings into content.

4. **Substack or email newsletter.** Not for warmup period. Revisit after Month 1 if you need a nurture channel.

**What NOT to do:** Do not post on LinkedIn. The employer constraint applies to all LinkedIn activity that could associate Jordan with Antellion. Posting content about AI employer visibility on LinkedIn risks exactly the connection you are trying to avoid.

### Channel 2: Community Engagement (Medium Priority)

**Time investment:** 30 minutes per day, 2-3 days during warmup
**Why:** Hormozi explicitly recommends joining communities of people doing the same work. For Antellion, the relevant communities are where talent leaders, employer brand professionals, and HR tech buyers gather.

**Where to engage:**

1. **ERE.net community forums.** ERE is where serious recruiting leaders discuss strategy. If you can provide a genuinely useful observation about AI and employer perception (not a pitch), you build credibility with the exact ICP you are emailing in two weeks.

2. **People Geek community (from Culture Amp).** Active Slack community of people analytics and HR leaders. Lurk first, contribute when you have something specific.

3. **r/recruiting and r/humanresources on Reddit.** Lower-quality leads but high visibility. If someone posts "how do candidates research companies before applying?" you have a genuinely expert answer. Do not pitch. Just answer well and include "Antellion" in your flair or bio.

4. **SHRM Connect.** The Society for Human Resource Management has online discussion boards. More traditional HR than your ICP but occasionally has employer brand conversations.

**Rules of engagement:**
- Never pitch in communities. Ever. Contribute genuine insight.
- If someone asks a question you can answer with data from your scans, answer it thoroughly and include a link to your blog post (not your landing page).
- The goal is that someone reads your comment, clicks through to the blog, and lands on antellion.com from there. Two clicks away from a pitch, not zero.

### Channel 3: Direct Referrals and Warm Introductions (Low Volume, High Value)

**Time investment:** 1-2 hours total during warmup period

Hormozi's warm outreach chapter makes the case that everyone has a list. Even with LinkedIn off-limits, Jordan has professional contacts from Symphony Talent and prior roles who know people in talent leadership.

**The constraint-compliant approach:**

1. **Identify 5-10 people in your personal network** (not Symphony Talent colleagues) who know VP-level talent or HR leaders. Former classmates, friends in HR tech, people from conferences.
2. **Send a personal email (from personal email, not jordan@antellion.com)** that says: "I have been doing research on how AI describes employers to candidates. I put together some interesting findings. If you know any talent leaders who would find that useful, I would appreciate an introduction."
3. **If someone makes an intro,** respond from jordan@antellion.com with a version of the cold email that is warmer and more personal. This is not cold outreach -- it is a referred conversation.

**Volume expectation:** 1-2 introductions during the warmup period. Do not spend more than 2 hours on this. The math does not work at scale for a solo founder without LinkedIn, but even one referred conversation produces learnings that improve your cold email.

### Channel 4: Organic Website Traffic (Background, No Active Work Required)

The landing page is live. If anyone searches for "AI employer visibility" or "how AI describes employers," and your blog content is indexed, they could arrive at antellion.com organically.

**What to do:** Nothing active beyond publishing the foundation content in Priority 3 above. Organic traffic is a long game. But every blog post you publish during warmup is an asset that compounds -- both for Google indexing and for AI model training data.

**Do not spend money on paid ads during the warmup period.** You do not have enough data yet to know what messaging works. Cold email is your learning channel. Paid ads come after you know which subject lines, angles, and offer framings convert.

### What is NOT Worth Doing During Warmup

Be disciplined about where you spend time. These feel productive but do not advance the business:

- **Building a fancy CRM.** A spreadsheet is fine for Month 1. You will have fewer than 20 active conversations. Do not spend 5 hours setting up HubSpot.
- **Designing email templates.** Your cold emails should look like plain text from a real person, not an HTML-designed newsletter. No images, no headers, no colors.
- **Recording a podcast or video.** You do not have an audience yet. Written content is faster to produce, faster to index, and faster to find via AI.
- **Attending virtual HR conferences.** Passive consumption. You need to be producing, not consuming, during this window.
- **Building a second landing page or A/B testing the current one.** You have zero traffic data. Optimization is premature. Ship the first version and learn from cold email traffic.

---

## 6. Complete Timeline

### Week 1 (April 12-18): Infrastructure and List Building

| Day | Date | Primary Task | Secondary Task |
|-----|------|-------------|----------------|
| Sat | Apr 12 | Set up Google Workspace. Configure SPF, DKIM, DMARC. | Sign up for Warmbox. |
| Sun | Apr 13 | Connect Google Workspace to Warmbox. Start warmup. Verify DNS with mail-tester. | Set up Apollo account. |
| Mon | Apr 14 | Build Apollo prospect list. Configure filters. Export and organize by industry. | Check Warmbox dashboard (first metrics). |
| Tue | Apr 15 | Load first 50-75 contacts into Apollo sequence. Configure A/B test. Set sending windows. DO NOT ACTIVATE. | Run first industry research scan (enterprise SaaS). |
| Wed | Apr 16 | Run second industry research scan (healthcare tech). Document findings. | Check warmup metrics. Send manual test email to personal Gmail. |
| Thu | Apr 17 | Run third industry research scan (financial services). | Begin writing Piece 1 (AI Employer Visibility definition piece). |
| Fri | Apr 18 | Continue writing Piece 1. | Check warmup metrics at end of week. Score should be climbing past 60. |

### Week 2 (April 19-25): Content, Optimization, and Final Prep

| Day | Date | Primary Task | Secondary Task |
|-----|------|-------------|----------------|
| Sat | Apr 19 | Finish and publish Piece 1 to antellion.com blog. Cross-post to Medium. | Write Piece 3 (Glossary). |
| Sun | Apr 20 | Publish Piece 3 to antellion.com. | Landing page review and optimization. |
| Mon | Apr 21 | Run day-7 warmup verification: mail-tester, manual spot check to Gmail/Outlook/Yahoo. | Save response templates in Apollo. |
| Tue | Apr 22 | Do a full Snapshot dry run. Time yourself. Fix any workflow issues. | Set up tracking spreadsheet. |
| Wed | Apr 23 | Run 4th industry research scan for the industry you are sending to first. | Write Piece 2 (Candidate Decision Journey) if time permits. |
| Thu | Apr 24 | Run day-14 pre-launch verification checklist. Fix any issues. | Block calendar for launch week sending windows. |
| Fri | Apr 25 | Final check: all systems ready. Warmbox score 80+. Apollo sequence armed. | Rest. You launch Tuesday. |

### Week 3 (April 26-30): Launch

| Day | Date | Activity |
|-----|------|----------|
| Sat-Mon | Apr 26-28 | No cold sends. Warmup continues. Review everything one more time. |
| Tue | Apr 29 | LAUNCH. Activate Apollo sequence. Send first 5 cold emails. Monitor. |
| Wed | Apr 30 | Send 5 more. Check metrics from day 1. |

**Note on the timeline:** If DNS records take longer than 48 hours to propagate, or if Warmbox's warmup score is not above 80 by day 14, push the launch date. Better to delay 3-4 days than to send from a domain that is not ready. There is no prize for launching on schedule if your emails land in spam.

---

## 7. Post-Launch Cadence

### Weekly Rhythm (Starting Week 3)

| Day | Morning (7:30-10:00 AM) | Rest of Day |
|-----|------------------------|-------------|
| Monday | Prep industry research for the week's batches. Check last week's metrics. | Write content if time permits. |
| Tuesday | Send cold emails (batch 1). Monitor replies. Respond within 2 hours. | Fulfill any Snapshot requests. |
| Wednesday | Send cold emails (batch 2). Monitor replies. Respond within 2 hours. | Fulfill any Snapshot requests. |
| Thursday | Send cold emails (batch 3). Monitor replies. Respond within 2 hours. | Fulfill any Snapshot requests. |
| Friday | Review week's metrics. Update tracking spreadsheet. Plan next week's batches. | No sends. No follow-ups. |

### Month 1 Expected Numbers

Based on the campaign plan targets and typical new-domain cold email performance:

| Metric | Conservative | Realistic | Optimistic |
|--------|-------------|-----------|-----------|
| Total cold emails sent | 150 | 200 | 250 |
| Open rate | 30% | 40% | 50% |
| Reply rate (all replies) | 2% | 4% | 6% |
| Positive reply rate | 1% | 2.5% | 4% |
| Snapshot requests | 2 | 5 | 10 |

At 5-10 snapshots per week fulfillment capacity, even the optimistic scenario is manageable. The constraint is not demand -- it is deliverability and domain reputation. Protect those above all else.

---

## 8. Pre-Launch Checklist (Copy This)

### Infrastructure
- [ ] Google Workspace set up for antellion.com
- [ ] jordan@antellion.com mailbox is active
- [ ] SPF record added and verified
- [ ] DKIM record generated, added, and authenticated
- [ ] DMARC record added (p=none)
- [ ] mail-tester.com score is 9/10+
- [ ] MXToolbox shows no warnings

### Warmup
- [ ] Warmbox account created
- [ ] Google Workspace connected to Warmbox
- [ ] Warmup enabled and running for 14+ days
- [ ] Warmup score is 80+
- [ ] Inbox placement rate is 95%+
- [ ] Manual test emails land in inbox (Gmail, Outlook, Yahoo)

### Apollo
- [ ] Apollo account set up
- [ ] jordan@antellion.com connected as sending address
- [ ] Filters configured per campaign plan
- [ ] 300-800 contacts exported
- [ ] Contacts organized into industry batches
- [ ] First batch of 50-75 loaded into sequence
- [ ] All 3 emails in sequence with A/B test on Email 1
- [ ] Sending window set to 7:30-8:30 AM prospect local time
- [ ] UTM parameters on all links
- [ ] Unsubscribe link present and functional
- [ ] Sequence is configured but NOT activated

### Content and Readiness
- [ ] At least 1 blog post published on antellion.com
- [ ] At least 3 industry research scans documented
- [ ] Response templates saved
- [ ] Tracking spreadsheet ready
- [ ] Landing page tested on mobile
- [ ] Slack notification tested for form submissions
- [ ] Confirmation email working for form submissions
- [ ] At least 1 Snapshot dry run completed and timed
- [ ] Calendar blocked for sending windows (T/W/Th 7:30-10:00 AM)

### Symphony Talent Safety
- [ ] No Symphony Talent client companies in Apollo list
- [ ] No LinkedIn activity associated with Antellion
- [ ] All outreach is from jordan@antellion.com, not personal or work email
- [ ] No content published under Jordan's LinkedIn profile about AI employer visibility

---

## Appendix: Cost Summary

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Google Workspace (Business Starter) | $7.20 | jordan@antellion.com |
| Warmbox | $19 | Dedicated email warmup |
| Apollo.io | $0-49 | Free tier may be sufficient for Month 1 volume. Paid tier if you need more than 250 contacts/month. |
| GlockApps (one-time seed test) | $7 | Run once at day 7 and once at day 14. |
| **Total Month 1** | **~$35-85** | |

This is intentionally cheap. Do not add tools until the process demands them. The expensive thing is Jordan's time, not the software.
