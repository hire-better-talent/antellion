# Antellion Landing Page Copy Deck
## Messaging Strategy, Conversion Architecture, and Full Section Copy

**Date:** April 8, 2026 (language optimization pass applied same day)
**Author:** Growth Operator
**Purpose:** Complete copy deck for the Antellion landing page. This page captures leads from VP-level Talent Acquisition and employer brand leaders who will receive manual snapshot assessments. Every claim below is grounded in actual product capabilities.
**Note:** The implemented page (apps/marketing/src/app/page.tsx) reflects a final language optimization pass applying Hormozi value equation, specificity, and risk reversal frameworks. Key changes: headline shifted to "what does it say about you" framing, all CTAs use first-person "My", deliverable descriptions enumerate exact quantities, value stack language in closing CTA, FAQ reframed to reduce perceived effort/risk. The copy deck below reflects the original draft; the page.tsx file is the source of truth.

---

## Page Architecture: Psychological Flow

The page follows a deliberate emotional arc designed for two types of visitors:

1. **Cold traffic** (organic, content-driven) -- needs to understand the category before they feel the problem
2. **Warm traffic** (LinkedIn DM recipients clicking through) -- already knows their company was scanned, wants to see if this is legitimate

Both paths converge at the same point: "I want to see what AI says about my company."

| Section | Purpose | Emotional State |
|---------|---------|-----------------|
| 1. Hero | Identify the blind spot | Curiosity: "Wait, what DOES AI say about us?" |
| 2. Problem | Make the blind spot feel dangerous | Anxiety: "We might be losing candidates we never see" |
| 3. What You Get | Show the deliverable is real | Relief: "This is specific, not a vague pitch" |
| 4. How It Works | Remove process uncertainty | Confidence: "This is simple and low-risk" |
| 5. Example Finding | Prove the signal is real | Recognition: "This is exactly the kind of data I need" |
| 6. Credibility | Address "why should I trust you?" | Trust: "The methodology is rigorous" |
| 7. Lead Capture Form | Convert | Action: "Let me see my results" |
| 8. Objection Handling (FAQ) | Clear final doubts | Certainty: "No reason not to do this" |
| 9. Footer | Close with trust signals | Assurance |

---

## Section 1: Hero

### Layout Direction

Full-width section. Clean background (white or very light gray). No hero image -- the text IS the product. Headline centered or left-aligned with generous whitespace. CTA button visible without scrolling. Optional: subtle animated visualization of AI query results appearing (abstract, not literal).

### Copy

**Headline:**

> What does AI tell candidates about your company?

**Subheadline:**

> Candidates ask ChatGPT, Claude, and Gemini where to work. AI answers -- synthesizing hundreds of sources into a single recommendation. Most companies have never seen what that answer says about them.

**Body text (1 sentence, optional):**

> Antellion runs 100 candidate-intent queries against AI and shows you where you appear, where competitors appear instead, and which sources are shaping the answer.

**CTA Button:**

> Get Your Visibility Snapshot

**Microcopy below CTA:**

> No cost. No demo. You receive a personalized analysis within 48 hours.

### Notes

- The headline is a question, not a claim. Questions pull enterprise buyers in because they cannot answer it. The moment they think "I actually don't know," the page has done its job.
- "ChatGPT, Claude, and Gemini" -- name the models. Specificity is credibility. Avoid "AI tools" or "AI assistants" (vague).
- The CTA says "Get Your Visibility Snapshot" not "Request a Demo" or "Contact Us." The word "your" signals personalization. "Snapshot" signals a deliverable, not a conversation.
- The microcopy below the CTA addresses the three immediate objections: cost (none), format (not a sales call), and timeline (48 hours).

---

## Section 2: Problem

### Layout Direction

Two-column or single-column. Left side: text. Right side (optional): a stylized representation of an AI chat interface showing an employer query and response -- sanitized, not from a real company. Dark text on light background. The section should feel editorial, not promotional.

### Copy

**Section headline:**

> Your employer brand has a blind spot

**Body:**

> You manage your Glassdoor presence. You invest in your careers page. You run your LinkedIn company profile. But there is a channel shaping candidate decisions that you have never measured.

> When a candidate asks AI "best companies to work for in fintech" -- or "should I join [Competitor] or stay where I am?" -- AI does not link to your careers page. It synthesizes hundreds of signals into a single, definitive answer.

> That answer mentions some companies and not others. It cites some sources and ignores the rest. It frames employers as leaders, contenders, or afterthoughts.

> **You have never seen this answer. Your competitors might already be in it.**

### Concrete Examples (displayed as callout cards or styled quotes)

> "Best enterprise software companies for backend engineers"
> -- Does your company appear in the AI response?

> "Should I work at [Your Company] or [Competitor]?"
> -- What does AI tell candidates who ask?

> "What is the salary range at companies like [Competitor] in [your city]?"
> -- Are you part of the compensation conversation?

### Notes

- This section works by making the invisible visible. The reader has never thought about this, and now they cannot stop thinking about it.
- The three example queries are not hypothetical -- they are the kinds of queries the snapshot scan actually runs. This plants the seed that Antellion knows the exact questions candidates ask.
- Avoid saying "AI is disrupting hiring" or "the future of talent acquisition." This is not a thought leadership piece. It is a diagnostic landing page. The problem is specific and present-tense.

---

## Section 3: What You Get

### Layout Direction

Clean, structured section. Three deliverable components displayed as cards or a compact visual summary. Optional: a sanitized visual mockup of the snapshot output (redacted company names, real structure). Light background with accent-colored cards.

### Copy

**Section headline:**

> Your Visibility Snapshot: a personalized analysis of how AI represents your company

**Introductory sentence:**

> We run 100 candidate-intent queries -- the same questions your candidates ask AI when deciding where to work -- and produce a structured analysis of what they find.

**Deliverable Component 1:**

> **Your AI Mention Rate**
> How often your company appears when candidates ask AI about employers in your industry. Not a guess -- a measured percentage across 100 queries spanning 10 employer reputation themes.

**Deliverable Component 2:**

> **Competitor Visibility Gap**
> Your top competitor's mention rate compared to yours, with the specific gap quantified. If a competitor is 3x more visible to candidates using AI, this is where you see it.

**Deliverable Component 3:**

> **Citation Blind Spots**
> The platforms and sources AI cites when recommending competitors but not you. These are the specific places where your absence is costing you visibility -- with the source type and a recommended first action for each.

**Deliverable Component 4:**

> **Interpretation Layer**
> Not just data -- a written analysis identifying your primary strength, your two biggest opportunities, and a primary takeaway. This is the paragraph you forward to your VP or CPO.

**Closing line:**

> The Snapshot answers one question: where do you stand? The full Assessment -- available after you review your Snapshot -- answers the harder question: what should you do about it, and in what order.

### Notes

- Each component is something the product actually produces. The snapshot scan runs 100 queries, computes mention rates, identifies the top competitor gap, maps citation sources, and generates a summary with a primary hook, evidence, and opportunities.
- The "Interpretation Layer" is the key differentiator from a raw data dump. Enterprise buyers do not want data -- they want judgment. The snapshot provides this via the `snapshotSummary` in the scan metadata.
- The closing line is the first hint of the Assessment upsell. It is positioned as an informational note, not a sales pitch. The reader should feel they are getting something complete (the Snapshot) that naturally raises the next question (what to do about it).

---

## Section 4: How It Works

### Layout Direction

Three steps displayed horizontally (desktop) or vertically (mobile). Numbered circles or icons. Minimal text per step. The section should feel effortless -- the point is to communicate that this requires almost nothing from the prospect.

### Copy

**Section headline:**

> Three steps. No demo required.

**Step 1:**

> **Tell us about your company**
> Company name, domain, and your biggest talent competitor. Takes 60 seconds.

**Step 2:**

> **We run the analysis**
> 100 candidate-intent queries, scored and compared against your competitor. This is real analytical work, not an automated template. Allow 48 hours.

**Step 3:**

> **You receive your Snapshot**
> A personalized analysis delivered to your inbox: your mention rate, competitor gap, citation blind spots, and a written interpretation of what the data means for your talent strategy.

### Notes

- "No demo required" is deliberate. These buyers sit through 50 SaaS demos a month. Positioning this as "not a demo" is differentiation.
- Step 2 says "real analytical work, not an automated template." This is true (the operator reviews and interprets) and it signals that the deliverable is bespoke. It also sets the 48-hour expectation without making it feel slow -- "allow 48 hours" implies quality, not delay.
- Step 3 says "delivered to your inbox." The deliverable comes to them. They do not need to log in, create an account, or schedule a call.

---

## Section 5: Example Finding (Social Proof Substitute)

### Layout Direction

A styled card or panel that looks like a redacted snapshot finding. Dark background with light text, or a clean card with a border. The visual treatment should make it feel like a real document excerpt, not marketing copy. Company names are anonymized but realistic (e.g., "a mid-market enterprise software company" or use the Meridian Technologies demo narrative, clearly labeled as an example).

### Copy

**Section headline:**

> What a Snapshot finding looks like

**Example card:**

> **Example: Enterprise Software, Austin TX**
>
> We evaluated a mid-market enterprise software company against 4 competitors across 100 candidate-intent queries.
>
> **Mention rate:** 28% -- the company appeared in roughly 1 in 4 AI responses about employers in their space.
>
> **Top competitor gap:** Their primary competitor appeared in 71% of the same queries -- a 43-percentage-point lead. Candidates researching employers through AI were 2.5x more likely to hear about the competitor first.
>
> **Citation blind spots:** Three platforms that AI cited when recommending competitors had no presence from this company: a compensation data site, a tech employer review platform, and an engineering community job board.
>
> **Primary takeaway:** AI describes this company favorably when it mentions them -- positive sentiment on culture and engineering quality. But it does not mention them often enough. The gap is not reputation. It is discoverability.

**Below the example:**

> This is a real finding from an Antellion assessment. Company name withheld. Your Snapshot will show findings specific to your company, your industry, and your competitors.

### Notes

- This section does the work that testimonials would do for a company with customers. It proves the signal is real and commercially meaningful by showing what a finding actually looks like.
- The example is based on the Meridian Technologies seed data narrative (28% mention rate vs. Apex Cloud's 75%), adjusted to feel anonymized. This is real data from the system, not fabricated.
- "AI describes this company favorably when it mentions them -- positive sentiment on culture and engineering quality. But it does not mention them often enough." This is the kind of nuanced finding that makes the prospect think: "I wonder if that is true for us too."
- The finding is specific enough to be credible but general enough that every reader can project their own company onto it.

---

## Section 6: Credibility / Methodology

### Layout Direction

Clean, structured. Could be a grid of four credibility pillars or a compact methodology summary. Enterprise-appropriate -- no playful icons. The visual tone should feel like a methodology page from a consulting firm, not a SaaS features section.

### Copy

**Section headline:**

> How we produce the analysis

**Pillar 1: Query Design**

> We design 100 queries that model how candidates actually research employers through AI -- spanning 10 themes (compensation, culture, career growth, work-life balance, and more) across multiple phrasings and specificity levels. These are not random questions. They are a structured query set designed to produce a statistically meaningful measurement of your visibility.

**Pillar 2: Structured Scoring**

> Every AI response is scored using deterministic analysis -- not a subjective read. Mention detection, visibility scoring, sentiment analysis, and citation extraction are applied consistently across every response. The same query set, the same scoring methodology, the same standards for every company we assess.

**Pillar 3: Competitive Comparison**

> Your results are compared against named competitors using the same methodology. Mention rates, visibility gaps, and citation sources are computed per entity. The comparison is apples-to-apples because the data comes from the same queries asked in the same way.

**Pillar 4: Honest Measurement**

> When the data supports a strong claim, we make it. When the sample is limited or findings are ambiguous, we say so. Every Snapshot includes a confidence assessment. We do not overclaim what 100 queries can tell you -- and we are transparent about what requires a deeper assessment to answer.

**Category ownership line (below the pillars):**

> Antellion created the AI Employer Visibility category. We are the first platform purpose-built to measure, analyze, and improve how companies appear in AI when candidates decide where to work.

### Notes

- "Antellion created the AI Employer Visibility category" is a strong claim, but it is defensible. No other product does this. The claim is about the category, not market share or customer count.
- The "Honest Measurement" pillar is a deliberate trust signal. Enterprise buyers are more impressed by what you admit you cannot do than by what you claim you can. Saying "we don't overclaim" is more credible than saying "our AI is the most advanced."
- This section does NOT mention customer count, revenue, or logos. It does not need to. The credibility comes from methodology specificity and intellectual honesty.

---

## Section 7: Lead Capture Form

### Layout Direction

The form should appear on the main page, not behind a separate /contact route. It should be visually prominent but not aggressive -- framed as "tell us about your company so we can run the analysis." Background color shift (slightly darker or accent-colored) to distinguish it from editorial sections. The form itself should be clean, with clear labels and generous spacing.

The form should also be reachable via a sticky or repeated CTA button at the top of the page that scrolls to this section.

### Form Fields

**Required fields (in this order):**

| Field | Label | Type | Placeholder/Helper | Why |
|-------|-------|------|-------------------|-----|
| 1 | Your name | Text | "Jane Smith" | Basic identification |
| 2 | Work email | Email | "jane@company.com" | Lead qualification + delivery address |
| 3 | Company name | Text | "Acme Corp" | The entity being assessed |
| 4 | Company website | URL | "acme.com" | Domain for scan configuration |

**Optional fields (in this order):**

| Field | Label | Type | Placeholder/Helper | Why |
|-------|-------|------|-------------------|-----|
| 5 | Your title | Text | "VP Talent Acquisition" | Lead qualification and personalization |
| 6 | Biggest talent competitor | Text | "Who do you compete with most for hires?" | This is the single most valuable field for producing a compelling Snapshot. It tells the operator who to compare against. |
| 7 | Primary role you hire for | Text | "e.g., Software Engineers, Account Executives" | Helps target the query set to the right talent segment |

### Form Section Copy

**Section headline:**

> See how AI describes your company to candidates

**Subheadline:**

> Tell us about your company and we will run 100 candidate-intent queries against AI on your behalf. You receive a personalized Visibility Snapshot within 48 hours. No cost, no obligation.

**CTA Button Text:**

> Run My Snapshot

**Microcopy below button:**

> Your information is used only to produce your Snapshot. We do not share your data with third parties.

### Post-Submit Confirmation

**On-page confirmation (replaces the form):**

**Headline:**

> Your Snapshot is in progress

**Body:**

> We are running 100 candidate-intent queries for [Company Name] now. Your personalized Visibility Snapshot will be delivered to [email] within 48 hours.
>
> What to expect: a 1-page analysis showing your AI mention rate, your top competitor gap, and the citation sources shaping how AI describes employers in your space.
>
> If you named a talent competitor, we will include a direct comparison. If you did not, we will identify your most visible competitor from the scan data.
>
> Questions before then? Reach us at hello@antellion.com.

**Confirmation email (sent immediately):**

**Subject:** Your Visibility Snapshot for [Company Name] -- in progress

**Body:**

> [First name] --
>
> We received your request. Your AI Employer Visibility Snapshot for [Company Name] is in progress.
>
> Here is what we are doing:
>
> - Running 100 candidate-intent queries across the AI models candidates use to research employers
> - Scoring every response for mentions of [Company Name] and your competitors
> - Identifying the citation sources and platforms shaping AI's answers in your industry
> - Producing a written analysis with your mention rate, competitor gap, and citation blind spots
>
> You will receive your Snapshot at this email address within 48 hours.
>
> If you have questions or want to add a specific competitor to the analysis, reply to this email.
>
> -- Jordan Ellison, Antellion

### Notes

- The CTA is "Run My Snapshot" -- active voice, first person, specific. Not "Submit," not "Get Started," not "Book a Demo."
- "Biggest talent competitor" is optional but is the highest-value field. The placeholder text ("Who do you compete with most for hires?") is conversational and avoids the word "competitor," which some people find confrontational. The scan comparison is dramatically more compelling with a named competitor.
- The confirmation is specific about what happens next. It lists the four things being done. This sets expectations and reinforces that this is real analytical work, not a form submission that generates a PDF template.
- The confirmation email comes from a real person (Jordan), not a no-reply address. This signals that a human is doing the work, which is true.

---

## Section 8: Objection Handling (FAQ)

### Layout Direction

Accordion-style FAQ section. Clean, minimal. Questions are written in the voice of a skeptical buyer, not in the voice of the company. Each answer is 2-4 sentences.

### Copy

**Section headline:**

> Common questions

**Q: Is this actually useful, or is it a gimmick to get my email?**

> The Snapshot contains real data from 100 queries run against AI models on your behalf. It shows your company's mention rate, your top competitor's visibility advantage, and the specific platforms creating that gap. Most TA leaders who receive their Snapshot learn something they did not know about how candidates encounter their company. If the findings are not useful, there is no follow-up obligation.

**Q: What is the catch? Why is this free?**

> We run the Snapshot because the findings speak for themselves. When a VP of Talent Acquisition sees that their top competitor is 2-3x more visible in AI candidate queries, the value of understanding the full picture becomes self-evident. The Snapshot is a genuine diagnostic, not a teaser. If the findings are compelling, we offer a deeper Assessment. If they are not, you still got useful data about your company.

**Q: How long does this take?**

> 48 hours from submission. This is not an automated report -- we design the query set for your industry and competitive landscape, run the analysis, and produce a written interpretation. The 48-hour window reflects real analytical work.

**Q: How is this different from our Glassdoor or Comparably data?**

> Glassdoor shows you what employees say about you. Antellion shows you what AI tells candidates about you -- and AI does not just read Glassdoor. It synthesizes Glassdoor, Blind, Built In, Levels.fyi, your careers page, press coverage, and dozens of other sources into a single answer. The candidate who asks ChatGPT "should I work at [Company] or [Competitor]?" gets one synthesized recommendation. Your Glassdoor score is one input. The AI answer is what the candidate reads. We measure the answer.

**Q: Is the sample size large enough to be meaningful?**

> 100 queries across 10 employer reputation themes and multiple phrasings produce a statistically meaningful measurement of your AI mention rate. We are transparent about what 100 queries can and cannot tell you. The Snapshot is designed to give you an accurate read on your overall visibility and your top competitive gap. The full Assessment expands to 200-600 queries for per-theme, per-competitor, and per-role analysis.

**Q: We already have an employer brand strategy. How does this fit?**

> This is not a replacement for employer brand work -- it is a measurement of whether that work is reaching the AI channel. You may have invested significantly in EVP, culture content, and review site management. The question the Snapshot answers is: when candidates ask AI about employers in your space, is that investment showing up in the answer? If it is, the Snapshot confirms it. If it is not, you now know where the gap is.

**Q: Can I just do this myself with ChatGPT?**

> You can ask ChatGPT a few questions about your company. That gives you anecdotes. What you cannot build in an afternoon is a structured query set across 100 candidate-intent variations spanning 10 themes, multiple phrasings, and different specificity levels -- with consistent scoring, competitor comparison, citation mapping, and a written interpretation. The volume and structure are what transform a curiosity into a measurement.

---

## Section 9: Footer

### Layout Direction

Minimal footer. Dark background. Three elements: brief company description, contact, privacy note.

### Copy

**Company line:**

> Antellion is an AI employer visibility platform. We help companies understand and improve how they appear in AI when candidates decide where to work.

**Contact:**

> hello@antellion.com

**Privacy line:**

> Your data is used only to produce your Visibility Snapshot. We do not sell, share, or distribute your information. See our privacy policy.

**Copyright:**

> (c) 2026 Antellion. All rights reserved.

---

## Section 10: SEO and Meta

### Page Title

> AI Employer Visibility | See How AI Describes Your Company to Candidates | Antellion

### Meta Description

> Candidates ask ChatGPT and Gemini where to work. Antellion shows you what AI tells them about your company. Get a free Visibility Snapshot: your AI mention rate, competitor gap, and citation blind spots.

### OG Tags (for social sharing)

**og:title**

> What does AI tell candidates about your company?

**og:description**

> Antellion runs 100 candidate-intent queries and shows you where you appear in AI, where competitors appear instead, and which sources are shaping the answer. Free Visibility Snapshot in 48 hours.

**og:type**

> website

**og:image**

> (Design asset needed: a clean, branded card showing a stylized snapshot output -- mention rate percentage, competitor gap bar, and 2-3 citation sources. Text should be readable at social sharing thumbnail size. No stock photography.)

### URL Structure

> antellion.com (homepage, not /landing-page or /get-started)

### Structured Data Considerations

- `Organization` schema with name, URL, and description
- `FAQPage` schema for the objection handling section (improves search snippet eligibility)

---

## Appendix A: Repeated CTA Strategy

The primary CTA ("Get Your Visibility Snapshot" / "Run My Snapshot") should appear in three places:

1. **Hero section** -- the first CTA, visible without scrolling
2. **After the "What You Get" section** -- captures visitors who are convinced by the deliverable description
3. **The lead capture form section** -- the primary conversion point

A sticky header CTA (small button in the navigation bar) should appear once the visitor scrolls past the hero section. This button scrolls to the form section.

All CTAs link to the same form. There is no separate /contact or /demo page.

---

## Appendix B: Visual and Layout Principles

**Typography:** Enterprise-appropriate. A clean sans-serif (Inter, Geist, or similar). Large headline sizes for section headers. Body text at 18-20px for readability.

**Color:** Restrained palette. White/light gray backgrounds for content sections. One accent color (dark blue or dark teal -- not startup purple or neon green). The form section can use a slightly darker background to create visual separation.

**Photography:** None. No stock photos of people in meetings, no abstract "AI" imagery. If visual elements are needed, use data visualizations (stylized mention rate bars, citation gap tables) that reinforce the product's analytical nature.

**Whitespace:** Generous. Enterprise buyers associate whitespace with credibility and quality. Cramped layouts signal consumer SaaS or commodity software.

**Mobile:** The page must work on mobile because LinkedIn DM recipients will often click through on their phone. The form must be usable on mobile without horizontal scrolling. Section headlines should be readable without pinching to zoom.

**Load time:** No hero video, no heavy JavaScript animations, no large image carousels. The page should load in under 2 seconds. Fast loading signals operational seriousness.

---

## Appendix C: Warm Traffic vs. Cold Traffic Considerations

**Warm traffic (LinkedIn DM recipients clicking through):**

These visitors have already received a personalized outreach message that referenced their company. They are clicking through to verify that Antellion is legitimate. Their mental state is: "Is this real? Is this company credible? Should I respond to that DM?"

For warm traffic, the hero section does the most work. The headline confirms what the DM said ("What does AI tell candidates about your company?"), and the subheadline establishes context. The credibility section and example finding address the legitimacy question. The form is the conversion point.

**Cold traffic (search, content-driven, event-driven):**

These visitors have no prior context. They need to understand the category before they feel the problem. For cold traffic, the problem section does the most work. The three example queries create the "I never thought about that" moment. The "What You Get" section then shows that the answer is available.

The page structure works for both because it follows the natural psychological sequence: curiosity (hero) -> anxiety (problem) -> relief (deliverable) -> action (form). Warm traffic may scroll quickly past the problem section. Cold traffic will read it carefully. Both arrive at the form with sufficient motivation.

---

## Appendix D: Language Rules (from Snapshot Outreach Guide)

**Always say:**
- "Visibility Snapshot" (capitalized, two words)
- "AI Employer Visibility Assessment" (for the paid product, when referenced)
- "mention rate" (the primary metric)
- "citation gaps" or "citation blind spots" (not "missing sources" or "link gaps")
- "candidate-intent queries" (not "search queries" or "prompts")

**Never say:**
- "Free report" (diminishes perceived value)
- "Limited time" or "act now" (enterprise buyers recoil)
- "AI is disrupting..." (commodity hype)
- "Transform your talent strategy" (meaningless)
- "Upgrade to the full version" (sounds like SaaS upsell)
- "Schedule a demo" (the form is not a demo request)
- "Submit" (as a CTA button -- too generic)

**Never claim:**
- That Antellion improves AI responses directly (we measure and recommend; the client acts)
- Real-time monitoring (scans are point-in-time)
- Multi-model scanning as a current capability (the snapshot runs against one model; the landing page should say "AI" generically, not "we scan across ChatGPT, Gemini, and Claude simultaneously")
- Guaranteed timelines for visibility improvement

---

## Appendix E: Measurement Plan

**Primary conversion metric:** Form submissions (Snapshot requests)

**Secondary metrics:**
- Time on page (target: 90+ seconds for cold traffic)
- Scroll depth (target: 70%+ reach the form section)
- Form field completion rate (track which optional fields get filled -- the "biggest talent competitor" field is the most valuable)
- CTA click-to-submission ratio (measure drop-off within the form)

**Attribution:** UTM parameters on all outbound links (LinkedIn DMs, email outreach, social posts, content). This allows tracking which traffic source produces the highest-quality leads (defined as: form submission -> Snapshot delivered -> conversation started -> Assessment sold).

---

## Appendix F: What This Page Does NOT Do

This page does not:

1. **Show pricing.** The Snapshot is free. The Assessment pricing is discussed in conversation after the Snapshot is delivered. Adding pricing to the landing page creates comparison shopping behavior and premature objections.

2. **Offer self-service.** There is no "try it yourself" or "run your own scan" option. The product is operator-delivered. The landing page reflects this: "We run the analysis" is a feature, not a limitation.

3. **Promise a specific delivery format.** The Snapshot will be delivered as the operator determines is appropriate (email with PDF, link to the snapshot page, or as part of a DM conversation). The landing page says "delivered to your inbox" to set a general expectation without overcommitting to a format.

4. **Feature a product demo or screenshots of the internal dashboard.** The dashboard is an internal tool. Showing it would undercut the "we do this for you" positioning and invite questions about self-service access that the product does not support.

5. **Include fake testimonials, fabricated logos, or invented statistics.** All data points on the page trace to the seed data narrative or to the actual product methodology. The example finding is based on real assessment output.
