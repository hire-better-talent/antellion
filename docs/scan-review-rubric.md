# Scan Review Rubric

**Last updated:** 2026-05-03

Use this rubric for both `query-ops` and `scan-readiness` reviews so founder decisions stay consistent.

## 1. Query Quality

Score:

- `5`: highly specific, commercially useful, minimal duplication, strong diagnostic value
- `4`: mostly strong with minor generic or overlapping prompts
- `3`: mixed quality, some useful signal but obvious weak spots
- `2`: too broad, too repetitive, or poorly matched to the scan goal
- `1`: not fit to run

## 2. Stage Coverage

Score:

- `5`: stage mix is intentional and clearly aligned to the scan objective
- `4`: good coverage with one minor gap
- `3`: acceptable but lopsided
- `2`: materially skewed or accidental
- `1`: stage structure does not support the intended output

## 3. Competitor Comparison Strength

Score:

- `5`: clear head-to-head prompts and meaningful comparison surfaces
- `4`: good comparison coverage with some broadness
- `3`: some comparisons exist but too much generic category querying
- `2`: competitor readiness exists in setup but not in the actual prompt set
- `1`: scan cannot support credible comparative findings

## 4. Specificity and Distinctiveness

Score:

- `5`: prompts are likely to produce distinct answers and reveal meaningful differences
- `4`: mostly distinct with a few weak overlaps
- `3`: moderate distinctiveness, some likely duplicate answer surfaces
- `2`: many prompts are vague or ambient-brand biased
- `1`: the query set mostly measures noise

## 5. Report Usefulness Potential

Score:

- `5`: likely to generate findings that matter in a client conversation
- `4`: likely useful with some cleanup needed
- `3`: probably usable but not sharp
- `2`: output likely to be weak or too generic
- `1`: output unlikely to support a credible report

## Decision bands

- `Ready`: average 4.0+ and no category below 3
- `Ready with edits`: average 3.0-3.9 or one category at 2
- `Not ready`: average below 3.0 or any category at 1

## Required commentary

Every rubric score should be followed by:

- strongest area
- weakest area
- one thing to fix before rerun
- whether LLM supplemental depth is justified
