# Antellion Compliance Rules — Canonical Source of Truth

Single source of truth for what is allowed and what is blocked in public-facing Antellion artifacts. The `compliance-sentry` agent reads this file and enforces these rules.

**Editing policy:** only the founder edits this file. Agents do not auto-mutate rules. New rules are added by manual commit, with provenance noted (where the rule originated, which session/incident, who confirmed it).

---

## Scope at launch

`compliance-sentry` runs against these artifact types:

- **LinkedIn posts** — drafts in conversation context or saved to `docs/linkedin/*.md` if a directory is later created
- **Blog posts** — `apps/marketing/src/content/blog/*.md`
- **Cold email body and subject lines** — `docs/email-campaign-v1.md` and any new sequence files
- **Response templates** — `docs/response-templates.md`

Out of scope at launch (deferred — founder remains the gate):

- Web pages and landing copy
- Sales decks
- Contract / SOW language
- Sales speech rules (don't apologize for price, etc.) — these are call-discipline rules, not artifact-detectable

---

## Severity model

- **BLOCKER** — hard fail. Artifact must be revised before publish.
- **WARNING** — soft fail. Logs a flag, can be overridden with a one-line reason.
- **INFO** — advisory only. Surfaces a suggestion. Never blocks.

Deterministic rules (regex / keyword detection) are typically BLOCKER. Judgment rules (LLM evaluation) are typically WARNING — false-positive risk is real, override mechanic is the safety valve.

---

## Override mechanic

- **Blog posts** (have YAML frontmatter): add `compliance_overrides: [RULE-10]` to frontmatter, plus optional `compliance_override_reason: "topic genuinely tech"`. Lives with the artifact.
- **All other artifacts** (LinkedIn, cold email, response templates — no frontmatter): override at slash-command time via `/compliance-check <path> --allow RULE-10 --reason "intentional"`. Logged to the sentry audit trail. Artifact body stays clean.

---

## Rule format

Each rule has:

- **ID** — stable identifier (`RULE-NN`) used in overrides and reports
- **Name** — short human-readable label
- **Severity** — BLOCKER | WARNING | INFO
- **Applies to** — list of artifact types this rule checks
- **Detection** — `deterministic` (regex / keyword) or `judgment` (LLM evaluation)
- **Source** — provenance: which doc, memory, or session originated the rule
- **Why it matters** — one sentence on the business reason
- **Bad** — anti-pattern example
- **Good** — pattern that satisfies the rule
- **Suggested fix** — template for how to revise on detection

---

# Rules

## Brand & Positioning

### RULE-01 — Symphony Talent additive

- **Severity:** BLOCKER
- **Applies to:** LinkedIn, blog, cold email, response templates
- **Detection:** judgment (with deterministic pattern hints)
- **Source:** `CLAUDE.md` § Domain rules; founder's day job at Symphony Talent (employer brand vendor); reinforced across sessions
- **Why it matters:** Antellion must never anti-sell employer brand work. Anti-employer-brand framing creates a personal conflict of interest and contradicts the structural positioning of Antellion as a measurement layer above existing employer brand programs.

**Pattern hints (deterministic):** flag co-occurrence of `replace`, `instead of`, `obsolete`, `outdated`, `dying`, `dead`, `kills`, or `disrupt` near `employer brand`, `EVP`, `recruitment marketing`, `careers site`, `careers page`.

**Bad:**
> Stop investing in employer brand and start investing in AI visibility.
> Your employer brand program is dying.
> Recruitment marketing is dead. AI is what matters now.

**Good:**
> AI visibility is a measurement layer above your employer brand program — not a replacement.
> The employer brand work most companies are doing is real. The new layer is that AI synthesizes from inputs nobody's team has been formally measured on for the last decade.

**Suggested fix:** reframe as additive. Antellion measures what employer brand teams produce; it does not replace them.

---

### RULE-02 — No capability overclaim

- **Severity:** BLOCKER
- **Applies to:** LinkedIn, blog, cold email, response templates
- **Detection:** judgment
- **Source:** `docs/email-campaign-v1.md` § Do Not Claim Antellion Improves AI Responses
- **Why it matters:** Antellion measures and recommends. It does not directly change what ChatGPT, Claude, Gemini, or Perplexity say. Sophisticated buyers catch overclaims and trust collapses.

**Bad:**
> Antellion improves what AI says about your company.
> We optimize ChatGPT's answers about employers.
> Our platform makes you more visible in AI.

**Good:**
> Antellion measures how AI describes you and identifies the citation gaps your team can address.
> We tell the teams already producing employer brand content which sources AI is currently drawing from and which it is missing.

**Suggested fix:** restate the claim in measurement / recommendation / observability terms. Never imply Antellion writes to AI surfaces.

---

### RULE-03 — Don't open with founder/bio reveal

- **Severity:** BLOCKER
- **Applies to:** cold email
- **Detection:** deterministic + judgment
- **Source:** `docs/email-campaign-v1.md` § Do Not Open With Who You Are
- **Why it matters:** "Hi Sarah, I'm Jordan, founder of [Company]…" pattern-matches to vendor pitch and gets deleted in seconds.

**Pattern hints:** opening sentences containing `I'm <name>, founder of`, `I am <name>, CEO of`, `My name is`, `I lead`, `I run`.

**Bad:**
> Hi Sarah, I'm Jordan Ellison, founder of Antellion, an AI employer visibility platform...

**Good:**
> Sarah — I ran a quick scan to see how AI describes [Company] when candidates ask about working there.

**Suggested fix:** open with the value/finding, not the bio. Move attribution to signature.

---

### RULE-04 — Don't say "I built a tool"

- **Severity:** BLOCKER
- **Applies to:** cold email, response templates
- **Detection:** deterministic
- **Source:** `docs/email-campaign-v1.md` § Do Not Say "I Built a Tool"
- **Why it matters:** vendor reveal kills the peer-to-peer frame the cold sequence depends on. The email is from Jordan, not from Antellion.

**Pattern hints:** `I built a tool`, `I built a platform`, `I built software`, `we built a tool`, `we built a platform`, `our platform does`, `our tool does`.

**Bad:**
> I built a tool that measures this.

**Good:**
> I can put together your Visibility Snapshot — takes about 48 hours.

**Suggested fix:** describe the action ("I can run", "I can put together") not the product.

---

### RULE-05 — Don't use category education as hook

- **Severity:** WARNING
- **Applies to:** cold email
- **Detection:** judgment
- **Source:** `docs/email-campaign-v1.md` § Do Not Use Category Education as Your Hook
- **Why it matters:** "AI is transforming how candidates discover employers..." sounds like a conference keynote, not a peer email. Specificity beats category language.

**Bad:**
> AI is transforming how candidates discover employers...
> The future of talent is being shaped by generative AI...

**Good:**
> When candidates ask ChatGPT about [Company], here's what came back.

**Suggested fix:** lead with a concrete observation about the recipient's company or named competitor, not a category trend.

---

## Sector and Audience

### RULE-10 — Sector-neutral default

- **Severity:** BLOCKER
- **Applies to:** LinkedIn, blog, cold email, response templates
- **Detection:** judgment + deterministic pattern hints
- **Source:** `~/.claude/projects/-Users-jordanellison-Projects-talentsignal/memory/feedback_no_industry_narrowing.md`; confirmed 2026-04-28
- **Why it matters:** Antellion's ICP is enterprise + mid-market CHROs across all sectors. Tech-narrowing alienates non-tech buyers, who read the post and assume the product is for tech companies.

**Pattern hints (deterministic):** `engineering blog`, `engineering blogs`, `Levels.fyi` (when standalone, not paired with broader sources), `Stripe-style hiring`, `SWE candidates`, `ML candidates`, `developer hiring` (when topic is generic).

**Bad:**
> AI synthesizes its answer from sources like engineering blogs, Levels.fyi, and Stack Overflow.
> What's it like to be a Stripe engineer?

**Good:**
> AI synthesizes its answer from sources like industry trade publications, subreddits, Comparably, and Indeed reviews.
> What's it like to work at [Company]?

**Exception:** if the artifact's frontmatter or title is genuinely about tech hiring (e.g., a blog post titled "GEO for tech employers"), tech examples may be used freely. In that case, set `compliance_overrides: [RULE-10]` in frontmatter with a reason.

**Suggested fix:** rotate worked examples across sectors. When a single example is unavoidable, alternate Software Engineering / Revenue (Sales/CS) / Executive across documents.

---

### RULE-11 — Plain language / spell out HR acronyms (LinkedIn only)

- **Severity:** BLOCKER
- **Applies to:** LinkedIn
- **Detection:** deterministic
- **Source:** `~/.claude/projects/-Users-jordanellison-Projects-talentsignal/memory/feedback_linkedin_plain_language.md`; confirmed 2026-04-28
- **Why it matters:** LinkedIn audience includes non-HR readers (CMOs, CFOs, board members, founders) who skim posts without translating jargon. Acronyms create scroll-past friction.

**Pattern hints:**

- Block standalone `EB` (use `employer brand`)
- Block standalone `EVP` (use `candidate value proposition` or `employee value proposition` on first reference)
- Block standalone `TA` when not a title (`talent acquisition`)
- Block standalone `CX` when context is candidate experience (use `candidate experience`)

**Allowed:** titles like `CHRO`, `CMO`, `CFO`, `CPO`, `VP TA` — these are recognized roles, not jargon.

**Bad:**
> Strong EB doesn't equal strong AI visibility.
> Your EVP work won't appear in AI.

**Good:**
> A strong employer brand doesn't equal strong AI visibility.
> Your candidate value proposition refresh won't appear in AI synthesis.

**Suggested fix:** spell out on first use; subsequent uses can shorten if needed.

---

## LinkedIn-specific

### RULE-20 — No antellion.com / Antellion-controlled URL in LinkedIn body

- **Severity:** BLOCKER
- **Applies to:** LinkedIn
- **Detection:** deterministic
- **Source:** `~/.claude/projects/-Users-jordanellison-Projects-talentsignal/memory/feedback_linkedin_no_outbound_links.md`; confirmed 2026-04-28
- **Why it matters:** LinkedIn algorithm down-ranks posts with external links. Enterprise-tone posts land harder when ending on confident statement, not CTA link. Engagement comes from comments/shares/DMs, not click-through.

**Pattern hints:** `antellion.com`, `antellion.io`, any `getantellion.com` / `joinantellion.com` / `antellion.work` (alternate sending domains, but still Antellion-controlled).

**Bad:**
> Read the full breakdown: antellion.com/blog/evp-to-ai-gap

**Good:**
> [End on the punch line. No URL.]

**Suggested fix:** remove the URL entirely. Reference the topic if needed without linking. Engagement happens in the comments.

---

### RULE-21 — LinkedIn ends on punch line, not CTA

- **Severity:** WARNING
- **Applies to:** LinkedIn
- **Detection:** judgment
- **Source:** same memory file as RULE-20
- **Why it matters:** CTA endings ("DM me for…", "follow for more…", "click here") feel cheesy for the enterprise audience. The post should land on its own takeaway.

**Bad:**
> [post body]
> DM me for the breakdown.
> Follow me for more like this.

**Good:**
> [post body]
> [final line that summarizes the insight]

**Suggested fix:** rewrite the closing as a confident statement that lands the insight. No call-to-action.

---

### RULE-22 — No "DM me" / "comment X" engagement gimmicks

- **Severity:** BLOCKER
- **Applies to:** LinkedIn
- **Detection:** deterministic
- **Source:** same memory file as RULE-20
- **Why it matters:** "DM me for the breakdown," "comment X and I'll send" are LinkedIn-creator gimmicks. Enterprise-tone posts cannot use them without sounding cheesy.

**Pattern hints:** `DM me`, `Comment <word>`, `Comment "X"`, `comment below if`, `tag a friend`, `share if you agree`.

**Suggested fix:** delete the line. The post should work without bait.

---

## Cold email-specific

### RULE-30 — Don't use the word "free" in cold email body

- **Severity:** BLOCKER
- **Applies to:** cold email
- **Detection:** deterministic
- **Source:** `docs/email-campaign-v1.md` § Do Not Use the Word "Free"
- **Why it matters:** "Free report" sounds like 2019 lead-magnet PDF. Devalues the Snapshot before it's seen.

**Pattern hints:** `free` (case-insensitive, whole-word). Allow `no cost` as an alternate.

**Bad:**
> I'd like to offer you a free AI employer visibility report...

**Good:**
> I can put together a Visibility Snapshot for [Company] — no cost, takes 48 hours.

**Suggested fix:** replace `free` with `no cost`, or describe the deliverable without referring to price.

---

### RULE-31 — Don't ask for a meeting before giving value

- **Severity:** BLOCKER
- **Applies to:** cold email
- **Detection:** judgment
- **Source:** `docs/email-campaign-v1.md` § Do Not Ask For a Meeting Before Giving Value
- **Why it matters:** "Would you have 15 minutes to discuss…" gives the buyer nothing. The Snapshot is the value; the conversation is earned.

**Bad:**
> Would you have 15 minutes to discuss how AI is shaping employer perception?

**Good:**
> I can put together your Visibility Snapshot in 48 hours. If the gaps look material, that's when we'd have something concrete to discuss.

**Suggested fix:** lead with the deliverable. The meeting comes after the buyer has seen value.

---

### RULE-32 — Big Fast Value subject line (no curiosity / fear hooks)

- **Severity:** WARNING
- **Applies to:** cold email subject lines
- **Detection:** judgment
- **Source:** `docs/email-campaign-v1.md` Appendix B (Hormozi $100M Leads framework, page 168-169)
- **Why it matters:** Subject lines that lead with the offer outperform curiosity gaps and fear hooks at scale. The subject line IS the offer.

**Bad:**
> What AI tells candidates about {{company}}
> Something I found about {{company}}
> {{company}} vs. competitors in AI

**Good:**
> 5-minute read: how candidates see {{company}} in AI
> The $4,900 next step after your {{company}} Snapshot
> Free Visibility Snapshot for {{company}} — 48 hours [retired in this campaign because RULE-30 blocks "free"; use the equivalent "no cost" version]

**Suggested fix:** rewrite the subject to state the offer / deliverable plainly. Resist the urge to tease.

---

### RULE-33 — Don't claim verified competitor data you haven't run

- **Severity:** BLOCKER
- **Applies to:** cold email, response templates
- **Detection:** judgment
- **Source:** `docs/email-campaign-v1.md` § Do Not Name-Drop Competitors You Have Not Verified
- **Why it matters:** if the named competitor or stat is wrong, credibility collapses instantly. Use vague-but-specific framing.

**Bad:**
> I found that Accenture appears 3x more than {{company}} in AI responses.
> {{competitor}} is winning 67% of AI mentions in your space.

**Good:**
> Your closest talent competitor appears to be the more visible answer in AI when candidates ask about working in [Company]'s space — happy to share specifics if useful.

**Suggested fix:** use "your closest talent competitor" framing. Save named-competitor data for the actual Snapshot delivery.

---

### RULE-34 — Don't use visible template language

- **Severity:** WARNING
- **Applies to:** cold email
- **Detection:** judgment + deterministic pattern hints
- **Source:** `docs/email-campaign-v1.md` § Do Not Use Visible Template Language
- **Why it matters:** even if merge fields render, template-feeling sentence structures kill credibility.

**Pattern hints:** `Companies like {{company}} in the {{industry}} space`, `As a leader at {{company}}`, `In your role as {{title}}`.

**Bad:**
> Companies like {{company}} in the {{industry}} space are increasingly...

**Good:**
> {{first_name}} — I ran a quick scan to see how AI describes {{company}} when candidates...

**Suggested fix:** embed merge fields in natural sentences, never in template scaffolding.

---

## Sales speech & forbidden phrases

### RULE-40 — Forbidden phrases (universal)

- **Severity:** BLOCKER
- **Applies to:** LinkedIn, blog, cold email, response templates
- **Detection:** deterministic
- **Source:** `docs/sales-motion-playbook.md` § What NOT to say (multiple sections)
- **Why it matters:** these phrases signal sales pressure, vendor desperation, or carnival tactics. Enterprise buyers audit them and downgrade you.

**Blocked phrases:**

- `no-brainer` (and variants: `it's a no-brainer`, `this is a no-brainer`)
- `this is the best decision you can make`
- `act now`
- `limited time`
- `special offer`
- `let me find a time`
- `let's hop on a call`
- `circle back`

**Suggested fix:** delete or rewrite. State the substance; let the buyer respond.

---

## Pricing, contracts, and guarantees

### RULE-50 — WYMB (Win Your Money Back) canonical language

- **Severity:** BLOCKER
- **Applies to:** LinkedIn, blog, cold email, response templates — any artifact mentioning the Diagnostic guarantee
- **Detection:** deterministic comparison
- **Canonical source:** `docs/offers/ai-visibility-diagnostic.md` § E (Risk reversal — "Win Your Money Back")
- **Why it matters:** the WYMB guarantee is a contractual obligation enforced in code (`validateDiagnosticDelivery()` in `packages/core/src/diagnostic/`). Any softening or modification of the language exposes the business and breaks the guarantee mechanic.

**Canonical phrasing (must match):**

> "If the Diagnostic Report does not include at least 10 material findings, Customer receives a full refund of the $4,900 fee within 10 business days."

Acceptable short-form (must reference the same threshold and refund):

> "Win Your Money Back. If we surface fewer than 10 material findings, full refund."
> "Full refund if it surfaces fewer than 10 material findings."

**Bad (modifications that break the guarantee):**

> "Money back if you're not satisfied" — softens the threshold from deliverable count to subjective satisfaction
> "Refund if AI visibility doesn't improve" — ties the guarantee to customer-side outcome (NOT what the guarantee covers)
> "Up to a 100% refund if findings are insufficient" — adds discretion that doesn't exist in contract
> "Free if we don't deliver" — uses blocked word `free`

**Suggested fix:** revert to the canonical short or full form. Never add discretion or modify the trigger condition.

---

### RULE-51 — Pricing changes / new pricing claims → founder review

- **Severity:** BLOCKER
- **Applies to:** all artifact types
- **Detection:** deterministic
- **Source:** founder-only constraint (CLAUDE.md, COO assessment 2026-05-01)
- **Why it matters:** pricing is founder-only. Agents draft, founder approves, founder signs. Public artifacts that introduce new prices, changed prices, or pricing claims that don't match the canonical offer stack are a liability.

**Pattern hints:** any dollar amount appearing in a public artifact that doesn't match the canonical figures: `$4,900`, `$14,000`, `$24,000`, `$89,000`, `$104,000`, `$124,000`, `$275,000`, `$6,500`, `$9,100` (rollover net), `$10,000`. Any other dollar figure → flag.

Canonical offer stack: `docs/full-assessment-offer-stack.md`.

**Suggested fix:** verify the dollar amount against the canonical offer stack. If it doesn't match, route to founder.

---

### RULE-52 — Contract / guarantee / SOW language → founder review

- **Severity:** BLOCKER
- **Applies to:** all artifact types
- **Detection:** judgment
- **Source:** founder-only constraint
- **Why it matters:** contract language has legal weight. Agents do not draft binding language without founder + counsel review.

**Pattern hints:** terms-of-art language like `shall`, `governing law`, `liability`, `indemnify`, `warrant`, `representations`, `assignment`, `survival`, `force majeure`. Also: any sentence that creates a new contractual commitment not present in the canonical SOW.

**Suggested fix:** route to founder. Do not include in public artifacts.

---

# Future-scope rules (deferred)

These are real rules that don't yet apply at launch because the artifact types they target are out of scope:

- **RULE-60** — Don't introduce Baseline pricing at the Diagnostic pivot (sales speech, deferred)
- **RULE-61** — Don't introduce Phase 2 pricing prematurely (sales speech, deferred)
- **RULE-62** — Don't lead with Baseline + Action Brief — it's a downsell, not the primary path (sales speech, deferred)
- **RULE-63** — Don't present Continuous before all 3 launch gates clear (Jun 1 revisit, deferred)
- **RULE-64** — Don't apologize for the price (sales speech, deferred)
- **RULE-65** — Don't treat rollover expiration as a pressure tactic (sales speech, deferred)

These will be promoted to active scope when sales decks, scoping docs, and proposal language enter the compliance-sentry's review surface.

---

# Rule lifecycle

When a new rule is needed:

1. Founder identifies the rule in conversation or session.
2. Founder edits this file directly, adds a new RULE-NN entry following the format above. Provenance line cites the session, file, or conversation that originated the rule.
3. Founder commits to git. The commit message names the new rule.
4. If a fixture is appropriate, founder adds a fixture file in `docs/compliance-rules-fixtures/RULE-NN.md`.
5. `compliance-sentry` picks up the new rule on next invocation. No agent restart required.

When an existing rule needs to evolve:

1. Founder edits the rule directly. Severity, detection criteria, examples can change.
2. Provenance line is updated with the date of the change and the reason.
3. If past artifacts pass v1 of the rule but fail v2, founder decides whether to re-run sentry against live blog posts and response templates. Already-sent cold emails and already-posted LinkedIn posts are not re-checked (ephemeral).

When a rule is retired:

1. Founder marks the rule with `STATUS: RETIRED` at the top of its block, with reason and date.
2. Rule is left in the file (not deleted) for historical reference.
3. `compliance-sentry` ignores retired rules.

---

# References

- `CLAUDE.md` — overall project guardrails
- `docs/sales-motion-playbook.md` — sales speech rules (deferred-scope source)
- `docs/email-campaign-v1.md` § 6 What NOT to Do, and Appendix B Hormozi framework
- `docs/offers/ai-visibility-diagnostic.md` § E — WYMB canonical language
- `docs/full-assessment-offer-stack.md` — canonical pricing
- `~/.claude/projects/-Users-jordanellison-Projects-talentsignal/memory/feedback_*.md` — founder-confirmed feedback rules
