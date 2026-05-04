# Fixtures — RULE-10: Sector-neutral default

All public-facing copy defaults to sector-neutral language. Tech-narrowing alienates non-tech CHROs at consumer goods, financial services, healthcare, and other sectors. Tech examples appear only when the topic is genuinely tech-specific.

## Known-bad (must FAIL)

> AI synthesizes its answer from sources like engineering blogs, Levels.fyi, and Stack Overflow.

> What's it like to work at Stripe as a software engineer in 2026?

> Companies like Datadog and Snowflake are winning the AI visibility race because they invest heavily in engineering content.

> Your engineering brand is what shows up when AI is asked about your company.

> SWE candidates increasingly start their job search by asking ChatGPT.

## Known-good (must PASS)

> AI synthesizes its answer from sources like industry trade publications, subreddits, Comparably, Indeed reviews, and press coverage.

> What's it like to work at [Company]?

> Companies that invest in cross-functional employer brand content across multiple sectors win on AI visibility.

> Your employer reputation is what shows up when candidates ask AI about your company.

> Candidates across all functions increasingly start their job search by asking ChatGPT, Claude, Gemini, or Perplexity.

## Edge cases (judgment)

> AI cites a different mix of sources for engineering roles than for sales roles or executive roles.

*Read:* should pass. Names tech as ONE worked example among multiple, treats it as illustrative rather than as the default. This is the rotated-example pattern the rule allows.

> The Diagnostic uses Software Engineering as a worked example for the persona archetype model.

*Read:* should pass. This is internal documentation context (worked example clearly framed as one illustration of a generalizable pattern). The rule explicitly allows this in `docs/compliance-rules.md` § RULE-10 exception clause.

> Five years ago, employer brand was about getting on Glassdoor's "best places to work" list. Today, it's about whether AI mentions you when candidates ask about working in tech, finance, healthcare, or any other industry.

*Read:* should pass. Names multiple sectors explicitly, treating tech as one of several. Reinforces the sector-neutral framing rather than implicitly defaulting to tech.

> When candidates Google "best engineering companies in San Francisco," your SEO might show up. When they ask ChatGPT the same question, you might not.

*Read:* should fail or warn. "Best engineering companies" tech-narrows the example without rotating to other sectors. Could be rescued by adding "best companies for sales in healthcare" or similar pairing. Recommend WARNING; flag for founder review.

## Override expectation

If the artifact's frontmatter has `compliance_overrides: [RULE-10]` AND `compliance_override_reason: "topic genuinely about tech hiring"` (or similar), this rule is skipped. Example: a blog post titled "GEO for tech employers: what software companies need to know" should set the override.

When the override is applied, log the reason to the audit trail and skip rule. Don't argue.
