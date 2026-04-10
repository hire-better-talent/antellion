---
name: First real audit findings
description: First production audit (Hilton Grand Vacations, 2026-03-31) revealed template quality issues that drove 5 roadmap items
type: project
---

The first real audit was run against Hilton Grand Vacations (hospitality / timeshare / vacation ownership sales).

Key findings:
1. Comparison templates without employment framing produced consumer/product AI answers instead of employer answers
2. "[Company] + attribute" keyword templates do not match how candidates use AI -- conversational queries are underrepresented
3. Consideration stage templates (33 of ~90) are overrepresented and produce tautological mention rates
4. No tracking for uncited AI responses, which are less defensible as evidence
5. Independent-query assessment misses conversational candidate journeys

**Why:** These findings indicate the template system was designed for search engine patterns, not AI conversation patterns. This is the single biggest quality gap in the product.

**How to apply:** All future template work, dedup changes, and report composition should be evaluated against the natural-language-first principle: does this measure earned AI visibility or prompted visibility? Earned is the valuable signal.

Five roadmap specs were written on 2026-03-31:
- employment-framing-in-templates.md (Critical, ~3 hours)
- natural-query-language.md (Critical, 1-2 days)
- citation-required-flag.md (Medium, ~2.5 days)
- query-depth-audit-paths.md (Low/Premium, multi-phase)
- template-rebalance.md (High, 1-2 days)

Recommended implementation order: employment-framing -> natural-query-language -> template-rebalance -> citation-required-flag -> depth-audit-paths
