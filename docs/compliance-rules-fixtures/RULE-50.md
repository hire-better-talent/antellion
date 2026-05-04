# Fixtures — RULE-50: WYMB (Win Your Money Back) canonical language

The Diagnostic's "Win Your Money Back" guarantee is a contractual obligation enforced in code (`validateDiagnosticDelivery()` in `packages/core/src/diagnostic/`). Any softening or modification of the language exposes the business and breaks the guarantee mechanic. Canonical source: `docs/offers/ai-visibility-diagnostic.md` § E.

## Canonical phrasings (authoritative)

**Long form:**
> "If the Diagnostic Report does not include at least 10 material findings, Customer receives a full refund of the $4,900 fee within 10 business days."

**Short forms (acceptable):**
> "Win Your Money Back. If we surface fewer than 10 material findings, full refund."
> "Full refund if it surfaces fewer than 10 material findings."
> "Win Your Money Back if the Diagnostic surfaces fewer than 10 material findings — full refund."

## Known-bad (must FAIL)

> Money back if you're not satisfied with the Diagnostic.

*Why fails:* softens the trigger from deliverable count to subjective satisfaction. Subjective satisfaction is unenforceable and not what the contract says.

> Refund if AI visibility doesn't improve.

*Why fails:* ties the guarantee to customer-side outcome (visibility improvement). The contract explicitly states the guarantee is "tied to what we ship, not to what you do afterward."

> Up to a 100% refund if findings are insufficient.

*Why fails:* "Up to" introduces discretion that doesn't exist in the contract. The refund is binary: 0 or 100%, triggered by deliverable count, not severity.

> Free if we don't deliver.

*Why fails:* uses the blocked word "free" (RULE-30) AND softens the trigger from "fewer than 10 material findings" to vague "deliver."

> Money back guarantee on the Diagnostic.

*Why fails:* doesn't name the trigger condition. A buyer reading this could believe the guarantee is broader than it is. This creates an expectation gap.

> If we don't surface enough findings, partial refund based on coverage.

*Why fails:* contract is binary. "Partial" and "based on coverage" introduce non-canonical mechanics.

## Known-good (must PASS)

> Win Your Money Back. If we surface fewer than 10 material findings, full refund.

> Full refund if the Diagnostic surfaces fewer than 10 material findings.

> If the Diagnostic Report does not include at least 10 material findings, Customer receives a full refund of the $4,900 fee within 10 business days.

> 10 business days, full refund if it surfaces fewer than 10 material findings, and the fee credits toward a Baseline within 60 days.

> Two terms worth flagging: 1. Win Your Money Back. If we surface fewer than 10 material findings, full refund. The guarantee is tied to what we ship, not to what you do afterward.

## Edge cases (judgment)

> Refund guarantee included.

*Read:* technically doesn't violate (no softening of canonical), but is too vague to be useful. Mark as INFO advisory: "guarantee mentioned without canonical phrasing — recommend including the threshold (10 material findings) explicitly."

> The Diagnostic comes with a refund guarantee under defined conditions.

*Read:* same as above — vague but not violating. INFO advisory.

> If the Diagnostic doesn't deliver value, you get your money back.

*Read:* should fail. "Deliver value" is subjective. Canonical phrasing requires "fewer than 10 material findings" as the deterministic trigger.

## Pattern detection

For artifacts mentioning the Diagnostic guarantee:

1. **Detect mention:** any of these phrases triggers a guarantee-mention check:
   - `money back`
   - `Win Your Money Back`
   - `WYMB`
   - `refund`
   - `guarantee`
   - `full refund`

2. **If guarantee mention detected:** verify the surrounding context contains:
   - `10 material findings` (or `fewer than 10`, `at least 10`)
   - Either `full refund` or the specific dollar amount `$4,900`
   - Trigger condition tied to deliverable count, NOT to subjective satisfaction or customer-side outcomes

3. **If trigger condition is absent or modified:** BLOCKER. Suggest canonical phrasing in the fix.

4. **If guarantee mention is absent in an artifact promoting the Diagnostic:** advisory only — the founder may have a reason to omit it in this artifact.
