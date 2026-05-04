# Fixtures — RULE-20: No antellion.com or Antellion-controlled URL in LinkedIn body

LinkedIn algorithm down-ranks posts with external links. Enterprise-tone posts land harder when ending on confident statement, not CTA link. Engagement comes from comments/shares/DMs, not click-through.

## Known-bad (must FAIL)

> [post body]
>
> Read the full breakdown: antellion.com/blog/evp-to-ai-gap

> [post body]
>
> Full analysis here: https://antellion.com/blog/citation-ecosystem

> [post body]
>
> More at antellion.com.

> [post body]
>
> Sign up for our newsletter: getantellion.com/newsletter

> [post body]
>
> Visit joinantellion.com to see the data.

## Known-good (must PASS)

> [post body]
>
> [Final line that summarizes the insight without a URL.]

> A question that's going to start appearing in board prep — and few companies have an answer ready: "How does AI describe us to candidates?"

> Your CHRO can tell you exactly what Glassdoor says about your company. Can your CHRO tell you what ChatGPT says about your company?

## Edge cases (judgment)

> A version of this analysis is published in Antellion's research notes.

*Read:* should pass. References the existence of a publication without linking. The post doesn't drive click-through to an Antellion-controlled destination. Acceptable per the rule's "post can REFERENCE the topic but should NOT link to it" exception.

> If you want to talk through this for your company specifically, my email is in my profile.

*Read:* should pass. Profile is LinkedIn-internal (not an Antellion-controlled URL); the contact pattern is acceptable.

> Read more on Substack: jordan.substack.com

*Read:* technically passes RULE-20 (Substack is not an Antellion-controlled URL), but is flagged separately by RULE-21 (LinkedIn ends on punch line, not CTA). The post should still be revised.

## Pattern detection

Match these strings (case-insensitive) anywhere in the post body:

- `antellion.com`
- `antellion.io`
- `antellion.app`
- `getantellion.com`
- `joinantellion.com`
- `antellion.work`
- Any other URL containing the literal substring `antellion`

Any match → BLOCKER.
