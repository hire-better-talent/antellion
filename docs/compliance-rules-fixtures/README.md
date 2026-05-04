# Compliance Rules — Fixture Library

Known-good and known-bad examples per rule. Used to:

1. **Verify** that `compliance-sentry` correctly flags violations and lets clean copy through.
2. **Backtest** new rules or rule modifications against existing artifacts.
3. **Onboard** the agent to edge cases that aren't obvious from the rule definition alone.

## Structure

One file per rule: `RULE-NN.md`. Each file has three sections:

- **Known-bad** — examples that the agent MUST flag as a violation. If the agent doesn't catch one of these, the rule's detection criteria need tightening.
- **Known-good** — examples that the agent MUST allow through. If the agent flags one of these, the rule is over-aggressive and needs constraint.
- **Edge cases** — examples that test rule boundaries. Useful for judgment rules where reasonable disagreement is possible.

## Coverage at launch

Fixtures exist for the highest-stakes rules. Remaining rules will accumulate fixtures as we backtest against existing artifacts.

| Rule | Fixtures status | Why prioritized |
|---|---|---|
| RULE-01 (Symphony additive) | ✓ | Day-job conflict, brand-existential |
| RULE-10 (sector-neutral) | ✓ | Most-corrected pattern in past sessions |
| RULE-20 (no antellion.com on LinkedIn) | ✓ | Deterministic, easy to validate |
| RULE-30 (no "free" in cold email) | ✓ | Deterministic, high false-positive risk on edge cases |
| RULE-50 (WYMB canonical) | ✓ | Code-enforced guarantee — drift = legal exposure |
| All others | TODO | Add during first 30 days of `compliance-sentry` runtime |

## Backtest invocation

```
/compliance-check docs/compliance-rules-fixtures/RULE-NN.md --backtest
```

The agent reads the fixture file, runs the rule against each example, and reports whether each example was correctly classified. A good rule scores 100% on known-bad and known-good. Edge cases are advisory.
