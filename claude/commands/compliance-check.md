# /compliance-check

Run the `compliance-sentry` agent against a public-facing artifact (LinkedIn post, blog post, cold email, response template) and return a pass/fail report with line-level redlines.

## Usage

```
/compliance-check <path-or-inline-artifact> [--type <artifact-type>] [--allow RULE-NN] [--reason "..."] [--backtest]
```

### Arguments

- `<path>` — file path to the artifact, OR `-` for inline (paste the artifact body in the next message)
- `--type <type>` — explicit artifact type override. One of: `linkedin`, `blog`, `cold-email`, `response-template`. Useful when the path doesn't match a recognized pattern.
- `--allow RULE-NN` — override a specific rule for this check. Repeatable. Logs the override with reason to the audit trail.
- `--reason "..."` — human-readable reason for the override. Required when `--allow` is supplied. Captured in the audit log.
- `--backtest` — run advisory-only against an existing artifact (e.g., a live blog post). Emits findings but never blocks. Used during rule evolution and ruleset validation.

### Examples

```
/compliance-check apps/marketing/src/content/blog/geo-vs-seo-employer-brand.md
/compliance-check docs/email-campaign-v1.md --type cold-email
/compliance-check linkedin-post-may-5.md --type linkedin --allow RULE-10 --reason "post is genuinely about tech hiring"
/compliance-check apps/marketing/src/content/blog/citation-ecosystem-employer-recommendations.md --backtest
```

## What the command does

1. Resolves the artifact (reads file or accepts inline body).
2. Detects artifact type from path; honors `--type` override if supplied.
3. Loads `docs/compliance-rules.md` as the canonical ruleset.
4. Invokes the `compliance-sentry` agent with the artifact, type, and any overrides.
5. Returns the structured report (verdict, blockers, warnings, info, ambiguous, OK-to-publish).
6. If overrides were applied, appends a single line to `docs/compliance-rules-audit.log` capturing timestamp, path, verdict, overrides + reasons.

## Output

The report follows the structured format defined in `.claude/agents/compliance-sentry.md`. At a glance:

- **PASS** → green light to publish
- **WARN** → can publish, but one or more judgment rules flagged. Operator decides.
- **FAIL** → hard block. At least one BLOCKER violation. Revise and re-run.

## When to use

**Always before:**
- Posting a LinkedIn post
- Merging a blog post that will go live (gated by date in `apps/marketing/src/lib/blog.ts:20`)
- Saving a new cold email template into Instantly
- Adding a new entry to `docs/response-templates.md`

**Often during:**
- Drafting and revising — run iteratively as the artifact evolves
- After applying agent-generated content (when `growth`, `reportpm`, etc. produce a draft, run `/compliance-check` as the final pass)

**Sometimes after:**
- `--backtest` mode against past artifacts when rules change in `docs/compliance-rules.md` and you want to spot-check live content

## What this command does NOT do

- Does not auto-fix violations. You revise, you re-run.
- Does not update rules. Rules are edited manually in `docs/compliance-rules.md` and committed.
- Does not check artifacts outside the launch scope (web pages, decks, contracts). Those remain founder-only review.
- Does not evaluate voice, tone, or strategic positioning. Rules, not taste.

## Override etiquette

Overrides exist for legitimate exceptions, not to bypass the system. Patterns to watch for:

- If you find yourself overriding the same rule repeatedly, the rule probably needs revision. Edit `docs/compliance-rules.md` instead of accumulating overrides.
- Always supply a real `--reason`. The audit log is the historical record of why exceptions were made — useful when revisiting rule scope.
- If a judgment rule fires three times on similar artifacts and you override each time, that's signal to either tighten the rule's detection criteria or convert it from BLOCKER to WARNING.

## Related

- Rules: `docs/compliance-rules.md`
- Agent: `.claude/agents/compliance-sentry.md`
- Fixtures (known-good and known-bad examples per rule): `docs/compliance-rules-fixtures/`
- Audit trail: `docs/compliance-rules-audit.log` (created on first override)
- Canonical pricing: `docs/full-assessment-offer-stack.md`
- Canonical WYMB language: `docs/offers/ai-visibility-diagnostic.md` § E
