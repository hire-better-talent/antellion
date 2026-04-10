# Confidence Scoring System Design

## Status: DESIGN ONLY -- No code changes

---

## 1. Result-Level Confidence (per ScanResult)

Result-level confidence answers: "How much should we trust THIS individual result's visibility and sentiment scores?"

### Input Signals

Every ScanResult row in the database provides:

| Signal | Source | Currently Available |
|--------|--------|---------------------|
| `response` (text) | `ScanResult.response` | Yes |
| `mentioned` (bool) | `ScanResult.mentioned` | Yes |
| `visibilityScore` (0-100) | `ScanResult.visibilityScore` | Yes |
| `sentimentScore` (-1 to 1) | `ScanResult.sentimentScore` | Yes |
| `tokenCount` (int) | `ScanResult.tokenCount` | Partially (nullable, not always populated) |
| `latencyMs` (int) | `ScanResult.latencyMs` | Partially (nullable) |
| `citations[]` | `CitationSource[]` via relation | Yes |
| `metadata.competitorMentions` | `ScanResult.metadata` JSON blob | Yes |

### Factor Definitions

#### Factor 1: Response Quality (weight: 0.25)

Measures whether the AI response is substantive enough to extract reliable scores from.

**Computation:**

```
responseLength = response.length  (character count)

if responseLength < 50:
    responseQuality = 0.0    // too short to be meaningful
else if responseLength < 150:
    responseQuality = 0.3    // terse, likely unreliable
else if responseLength < 400:
    responseQuality = 0.7    // adequate
else if responseLength < 1000:
    responseQuality = 0.9    // good
else:
    responseQuality = 1.0    // detailed response
```

**Why character count and not tokenCount:** `tokenCount` is nullable and not reliably populated (see `ScanResult.tokenCount` in schema -- `Int?`). Character count is always available from `response`. Token count can serve as an optional refinement when present.

**Edge cases:**
- Empty response string: responseQuality = 0.0
- Response that is all whitespace: responseQuality = 0.0 (trim first)
- Very long response (>5000 chars): Still 1.0. Length does not hurt confidence; it can only help.

#### Factor 2: Mention Clarity (weight: 0.25)

Measures how clearly the client was identified in the response. A passing mention buried at the end is less trustworthy than an explicit, early, named recommendation.

**Computation:**

```
if not mentioned:
    mentionClarity = 0.5    // We ARE confident it's absent -- this is not low-confidence
                            // "not mentioned" is itself a clear signal
else:
    lowerResponse = response.toLowerCase()
    lowerName = clientName.toLowerCase()

    // Exact name match via word boundary regex (mirrors containsName in scan-analysis.ts)
    exactMatch = regex \b{clientName}\b matches in response
    nameOccurrences = count of non-overlapping matches of lowerName in lowerResponse

    firstMentionPosition = lowerResponse.indexOf(lowerName) / response.length
    // 0.0 = mentioned at the very start, 1.0 = mentioned at the very end

    // Base: exact match is more reliable than substring match
    base = exactMatch ? 0.6 : 0.3

    // Bonus for multiple mentions (diminishing returns)
    mentionBonus = min(0.2, nameOccurrences * 0.05)

    // Bonus for early mention (first 20% of response)
    positionBonus = firstMentionPosition < 0.2 ? 0.15 : (firstMentionPosition < 0.5 ? 0.05 : 0.0)

    mentionClarity = min(1.0, base + mentionBonus + positionBonus)
```

**Edge cases:**
- Client name is very short (<3 chars): exactMatch detection is unreliable (falls back to `includes` in current code). Apply a 0.1 penalty: `mentionClarity = max(0, mentionClarity - 0.1)`
- Client mentioned by domain but not by name: `containsName` in `scan-analysis.ts` checks both. For confidence, domain-only mention gets a 0.05 penalty since domain mentions are often in citation context, not substantive discussion.
- Response mentions client name only in a citation/source attribution (e.g., "Sources: meridiantech.com"): This is a known limitation. We do NOT attempt to parse this distinction in the heuristic path; the LLM validation layer (Section 3) can catch this.

#### Factor 3: Score Extremity (weight: 0.15)

Extreme scores (visibility 0 or 100, sentiment -1 or 1) from a heuristic system are MORE likely to be correct than moderate scores, because the heuristic is counting binary signals. A visibility score of 0 (not mentioned = not visible) is highly reliable. A visibility score of 47 is an interpolation that may not reflect reality.

This is counterintuitive but correct for THIS system. The heuristic in `scoreVisibility` returns 0 when the client is not mentioned (binary, reliable) and interpolates from there. Moderate scores arise from ambiguous signal combinations.

**Computation:**

```
// Visibility extremity (0-100 scale)
if visibilityScore == null:
    visExtremeConfidence = 0.5   // no score, no signal
else if visibilityScore == 0:
    visExtremeConfidence = 1.0   // client not mentioned -- highly certain
else if visibilityScore >= 80:
    visExtremeConfidence = 0.85  // strong signals aligned
else if visibilityScore >= 60:
    visExtremeConfidence = 0.6   // moderate signals, reasonable confidence
else:
    visExtremeConfidence = 0.5   // ambiguous mid-range

// Sentiment extremity (-1 to 1 scale)
if sentimentScore == null:
    sentExtremeConfidence = 0.5
else:
    absSent = abs(sentimentScore)
    if absSent == 0:
        sentExtremeConfidence = 0.6   // no signal words found -- somewhat reliable
    else if absSent > 0.6:
        sentExtremeConfidence = 0.85  // clear positive or negative
    else if absSent > 0.3:
        sentExtremeConfidence = 0.65
    else:
        sentExtremeConfidence = 0.5   // weak/mixed signals

scoreExtremity = (visExtremeConfidence + sentExtremeConfidence) / 2
```

**Edge cases:**
- Both scores null: scoreExtremity = 0.5 (neutral -- we simply have no data to assess).
- Visibility is null but sentiment is present (or vice versa): Use only the available score, not the average. `scoreExtremity = availableExtremeConfidence`.

#### Factor 4: Citation Presence (weight: 0.35)

This is the highest-weighted factor. Responses that cite sources are more trustworthy because they indicate the AI model grounded its claims in retrievable content. This directly maps to the `CitationSource[]` relation on `ScanResult`.

**Computation:**

```
citationCount = result.citations.filter(c => c.domain != null && c.domain.length > 0).length

if citationCount == 0:
    citationConfidence = 0.3   // no grounding -- lower trust
else if citationCount == 1:
    citationConfidence = 0.6   // minimal grounding
else if citationCount <= 3:
    citationConfidence = 0.8   // reasonable grounding
else:
    citationConfidence = 1.0   // well-grounded

// Bonus for known trusted domains
TRUSTED_DOMAINS = keys of KNOWN_SOURCE_TYPES in report-composer.ts
// i.e., glassdoor.com, indeed.com, linkedin.com, levels.fyi, etc.
trustedCount = citations.filter(c => TRUSTED_DOMAINS.includes(c.domain)).length

if trustedCount > 0 and citationCount > 0:
    trustedRatio = trustedCount / citationCount
    citationConfidence = min(1.0, citationConfidence + trustedRatio * 0.1)
```

**Edge cases:**
- Citations with null domain (see schema `domain String?`): Filtered out. Only citations with a non-empty domain count.
- Duplicate domains in the same result: Count each citation row. If the model cited glassdoor.com twice for the same result, that still counts as 2 -- it suggests the model has multiple data points from that source.

### Result-Level Confidence Formula

```
resultConfidence = (
    responseQuality   * 0.25 +
    mentionClarity    * 0.25 +
    scoreExtremity    * 0.15 +
    citationConfidence * 0.35
)

// Clamp to [0, 1]
resultConfidence = max(0, min(1, resultConfidence))
```

### Worked Example: Seed Data Result (Engineering Culture Query 3)

From seed data, query "what is it like to work as an engineer at Meridian Technologies":
- response: ~400 chars, mentions Meridian early and multiple times
- mentioned: true, visibilityScore: 72, sentimentScore: 0.6
- citations: glassdoor.com, linkedin.com, meridiantech.com
- competitorsMentioned: []

```
responseQuality:
  length ~406 chars -> 0.9 (400-1000 range)

mentionClarity:
  mentioned = true
  exactMatch = true (word boundary matches "Meridian Technologies")
  nameOccurrences = 3 ("Meridian Technologies" appears 3 times)
  firstMentionPosition = ~0 / 406 ~= 0.0 (very early)

  base = 0.6 (exact match)
  mentionBonus = min(0.2, 3 * 0.05) = 0.15
  positionBonus = 0.15 (first 20%)
  mentionClarity = min(1.0, 0.6 + 0.15 + 0.15) = 0.9

scoreExtremity:
  visibilityScore = 72 -> visExtremeConfidence = 0.6 (60-80 range)
  sentimentScore = 0.6 -> absSent = 0.6 -> sentExtremeConfidence = 0.65 (0.3-0.6 range)
  Wait -- 0.6 > 0.6 is false, 0.6 == 0.6, so absSent > 0.6 is false. absSent > 0.3 is true.
  sentExtremeConfidence = 0.65
  scoreExtremity = (0.6 + 0.65) / 2 = 0.625

citationConfidence:
  3 citations, all with non-null domains -> 0.8 (2-3 range)
  trustedCount = 2 (glassdoor.com and linkedin.com are in KNOWN_SOURCE_TYPES)
  trustedRatio = 2/3 = 0.667
  citationConfidence = min(1.0, 0.8 + 0.667 * 0.1) = min(1.0, 0.867) = 0.867

resultConfidence = 0.9 * 0.25 + 0.9 * 0.25 + 0.625 * 0.15 + 0.867 * 0.35
                 = 0.225 + 0.225 + 0.094 + 0.303
                 = 0.847
```

**Interpretation:** 0.847 -- HIGH confidence. This makes sense: the response is detailed, mentions the client clearly and early, has 3 citations from known sources, and the scores are in a reasonable range.

### Worked Example: Seed Data Result (Compensation Query 1 -- client NOT mentioned)

From seed data, query "senior backend engineer salary enterprise SaaS Austin Texas":
- response: ~330 chars, does NOT mention Meridian
- mentioned: false, visibilityScore: 0, sentimentScore: 0
- citations: levels.fyi, glassdoor.com, comparably.com, payscale.com
- competitorsMentioned: [apexcloudsystems.com, velochain.com]

```
responseQuality:
  length ~330 chars -> 0.7 (150-400 range)

mentionClarity:
  mentioned = false -> 0.5
  (The "not mentioned" signal is itself reliable.)

scoreExtremity:
  visibilityScore = 0 -> visExtremeConfidence = 1.0 (not mentioned = certain)
  sentimentScore = 0 -> sentExtremeConfidence = 0.6 (no signal words)
  scoreExtremity = (1.0 + 0.6) / 2 = 0.8

citationConfidence:
  4 citations -> 1.0
  trustedCount = 4 (all are in KNOWN_SOURCE_TYPES)
  trustedRatio = 1.0
  citationConfidence = min(1.0, 1.0 + 1.0 * 0.1) = 1.0

resultConfidence = 0.7 * 0.25 + 0.5 * 0.25 + 0.8 * 0.15 + 1.0 * 0.35
                 = 0.175 + 0.125 + 0.12 + 0.35
                 = 0.77
```

**Interpretation:** 0.77 -- MEDIUM-HIGH confidence. The result is well-grounded in citations, the "not mentioned" signal is reliable, but the response is shorter and we cannot verify mention clarity. This feels right: we're fairly confident the client is invisible for this query, but slightly less confident than when the client IS mentioned and we can verify it directly.

---

## 2. Finding-Level Confidence (per Report Claim)

Finding-level confidence answers: "How confident are we in THIS claim that appears in the report?" A finding aggregates multiple results.

### What Constitutes a "Finding"

In the current report-composer, findings map to these computed values:

| Finding | Source Function | Key Input |
|---------|----------------|-----------|
| Client mention rate (X%) | `composeVisibilitySection` | `scanComparison.clientMentionRate` |
| Visibility tier (strong/moderate/limited/minimal) | `mentionTier()` | `clientMentionRate` |
| Sentiment posture (positive/negative/neutral) | `sentimentWord()` | `avgSentimentScore` |
| Competitive gap (X leads by Ypp) | `composeCompetitorSection` | `entityMentions[]` |
| Citation gaps (N sources) | `composeCitationSection` | `citations.gapDomains` |
| Theme-level mention rate | `composeQueryIntentMapSection` | `queryThemeBreakdown` |
| Specific recommendations | `generateRecommendations` | Various thresholds |

### Factor Definitions

#### Factor 1: Sample Size (weight: 0.30)

How many results support this finding?

**Computation:**

```
// n = number of results that contribute to this finding
// For overall findings: n = scanComparison.completedQueries
// For theme findings: n = queryThemeStats.queryCount
// For competitor findings: n = completedQueries (all results are relevant)

if n == 0:
    sampleSize = 0.0
else if n == 1:
    sampleSize = 0.2    // single data point -- very low confidence
else if n <= 3:
    sampleSize = 0.4    // minimal sample
else if n <= 6:
    sampleSize = 0.6    // moderate sample
else if n <= 12:
    sampleSize = 0.8    // good sample
else if n <= 20:
    sampleSize = 0.9    // strong sample
else:
    sampleSize = 1.0    // large sample
```

These thresholds are calibrated to the seed data: 36 total queries, 6 per theme cluster. A single theme with 6 queries gets 0.6, which is correct -- it is enough for a directional signal but not enough for high confidence.

**Edge case:** A finding that spans all 36 seed queries (e.g., overall mention rate) gets n=36, so sampleSize = 1.0. This is appropriate because the overall mention rate is the most statistically grounded finding.

#### Factor 2: Cross-Query Consistency (weight: 0.25)

Do results agree with each other, or are they contradictory?

**Computation:**

For mention-rate findings (the most common):
```
// results = the ScanResultData[] array for this finding
mentionedCount = results.filter(r => r.mentioned).length
notMentionedCount = results.length - mentionedCount
mentionRate = mentionedCount / results.length

// Consistency is highest at extremes (all agree) and lowest at 50/50
// Use distance from 0.5 as a consistency proxy
mentionConsistency = abs(mentionRate - 0.5) * 2    // range [0, 1]
// 100% or 0% mention rate = 1.0 (all agree)
// 50% mention rate = 0.0 (maximum disagreement)
```

For sentiment findings:
```
sentimentScores = results.map(r => r.sentimentScore).filter(not null)
if sentimentScores.length < 2:
    sentimentConsistency = 0.3   // cannot assess agreement
else:
    // Standard deviation of sentiment scores
    mean = avg(sentimentScores)
    stdDev = sqrt(sum((s - mean)^2 for s in sentimentScores) / sentimentScores.length)

    // Lower stdDev = higher consistency
    // stdDev of 0 = perfect agreement (1.0)
    // stdDev of 1.0 (max possible for [-1,1] range) = no agreement (0.0)
    sentimentConsistency = max(0, 1.0 - stdDev)
```

For visibility findings:
```
visScores = results.map(r => r.visibilityScore).filter(not null)
if visScores.length < 2:
    visConsistency = 0.3
else:
    mean = avg(visScores)
    stdDev = sqrt(sum((v - mean)^2 for v in visScores) / visScores.length)
    // Normalize: stdDev of 50 (max possible for 0-100 range) = 0.0
    visConsistency = max(0, 1.0 - stdDev / 50)
```

The overall cross-query consistency for a finding depends on the finding type:
```
For mention-rate findings: crossQueryConsistency = mentionConsistency
For sentiment findings: crossQueryConsistency = sentimentConsistency
For visibility findings: crossQueryConsistency = visConsistency
For composite findings (e.g., competitive gap): average of applicable consistencies
```

**Edge cases:**
- All results have null scores: crossQueryConsistency = 0.3 (insufficient data).
- Only 1 result: crossQueryConsistency = 0.3 (cannot assess agreement).

#### Factor 3: Source Quality (weight: 0.20)

Are the results backed by authoritative sources?

**Computation:**

```
// Collect all citations across all results that contribute to this finding
allCitations = flatMap(results, r => r.citations)
allDomains = allCitations.map(c => c.domain).filter(notNull)

if allDomains.length == 0:
    sourceQuality = 0.2    // no citations at all -- low trust

else:
    uniqueDomains = deduplicate(allDomains)

    // Classify using KNOWN_SOURCE_TYPES from report-composer.ts
    knownCount = uniqueDomains.filter(d => d in KNOWN_SOURCE_TYPES).length
    knownRatio = knownCount / uniqueDomains.length

    // Diversity bonus: more unique sources = more trustworthy
    diversityBonus = min(0.15, uniqueDomains.length * 0.03)

    sourceQuality = min(1.0, 0.3 + knownRatio * 0.55 + diversityBonus)
```

**Worked example with seed data:**

For the "Engineering Culture" theme finding (6 queries):
- All citations across 6 results: glassdoor.com (6), linkedin.com (2), builtin.com (5), comparably.com (2), levels.fyi (2), teamblind.com (2), meridiantech.com (1), indeed.com (1)
- uniqueDomains = 8
- knownCount = 8 (all are in KNOWN_SOURCE_TYPES)
- knownRatio = 1.0
- diversityBonus = min(0.15, 8 * 0.03) = 0.15
- sourceQuality = min(1.0, 0.3 + 1.0 * 0.55 + 0.15) = 1.0

#### Factor 4: Mention Consistency (weight: 0.10)

Do the same entities get mentioned consistently across results? This catches cases where the model is hallucinating different company names or where mentions are unreliable.

**Computation:**

```
// For the client entity:
clientMentionedResults = results.filter(r => r.mentioned)
clientNotMentionedResults = results.filter(r => !r.mentioned)

// For each result, check: do the same competitors appear consistently?
// Extract competitor mentions from metadata
competitorSets = results.map(r => {
    mentions = extractCompetitorMentions(r.metadata)
    return Set(mentions.filter(m => m.mentioned).map(m => m.name))
})

if competitorSets.length < 2:
    mentionConsistency = 0.5    // cannot assess
else:
    // Jaccard similarity between consecutive result pairs
    pairwiseSimilarities = []
    for i in 0..competitorSets.length-1:
        for j in i+1..competitorSets.length-1:
            intersection = competitorSets[i] AND competitorSets[j]
            union = competitorSets[i] OR competitorSets[j]
            if union.size > 0:
                pairwiseSimilarities.push(intersection.size / union.size)

    if pairwiseSimilarities.length == 0:
        mentionConsistency = 0.5
    else:
        mentionConsistency = avg(pairwiseSimilarities)
```

**Edge cases:**
- No competitors in the assessment: mentionConsistency = 0.7 (neutral -- the absence of competitor data does not hurt confidence, but it does not help either).
- All results mention different competitor sets: mentionConsistency approaches 0, which correctly signals that the model's entity detection is inconsistent.

#### Factor 5: Sentiment Agreement (weight: 0.15)

Do results agree on whether sentiment is positive, negative, or neutral?

**Computation:**

```
sentimentScores = results.map(r => r.sentimentScore).filter(notNull)

if sentimentScores.length < 2:
    sentimentAgreement = 0.3

else:
    // Classify each score into a bucket for agreement checking.
    // Note: We use +/-0.1 here (not the +/-0.3 from sentimentWord) because
    // for AGREEMENT purposes, a score of 0.05 is effectively noise and should
    // be treated as neutral. The sentimentWord() thresholds are for DISPLAY,
    // not for statistical agreement.
    buckets = sentimentScores.map(s => {
        if s > 0.1: return "positive"
        if s < -0.1: return "negative"
        return "neutral"
    })

    // What fraction are in the majority bucket?
    counts = countByBucket(buckets)
    majorityFraction = max(counts.values()) / buckets.length

    sentimentAgreement = majorityFraction
    // 100% agree = 1.0
    // 50/50 split = 0.5
    // 33/33/33 three-way split = 0.33
```

### Finding-Level Confidence Formula

```
findingConfidence = (
    sampleSize          * 0.30 +
    crossQueryConsistency * 0.25 +
    sourceQuality       * 0.20 +
    mentionConsistency  * 0.10 +
    sentimentAgreement  * 0.15
)

// Clamp to [0, 1]
findingConfidence = max(0, min(1, findingConfidence))
```

### Optional: Use Result-Level Confidence as a Refinement

The finding-level confidence can also incorporate the result-level confidences:

```
avgResultConfidence = avg(resultConfidence for each result in this finding)

// Blend: 80% finding-level factors, 20% result-level quality
adjustedFindingConfidence = findingConfidence * 0.80 + avgResultConfidence * 0.20
```

This ensures that a finding built from individually unreliable results gets penalized even if the sample size and consistency look good at the aggregate level.

### Worked Example: "Client Mention Rate" Finding (Seed Data)

The overall mention rate finding uses all 36 results.
- Meridian mentioned in 17/36 results -> mentionRate = 0.472

```
sampleSize: n = 36 -> 1.0

crossQueryConsistency:
  mentionConsistency = abs(0.472 - 0.5) * 2 = abs(-0.028) * 2 = 0.056
  (Near 50/50 split = low consistency -- the model is inconsistent about including Meridian)

sourceQuality:
  All 36 results have citations from known domains -> ~1.0

mentionConsistency (entity):
  Competitors appear fairly consistently across results (Apex appears in ~25/36) -> ~0.6

sentimentAgreement:
  Scores range from -0.1 to 0.7. Most are positive (0.3-0.7) or zero.
  Majority bucket = "positive" at ~47% + "neutral" at ~47% -> majority ~0.47

findingConfidence = 1.0 * 0.30 + 0.056 * 0.25 + 1.0 * 0.20 + 0.6 * 0.10 + 0.47 * 0.15
                  = 0.30 + 0.014 + 0.20 + 0.06 + 0.071
                  = 0.645
```

**Interpretation:** 0.645 -- MEDIUM confidence. This is correct and meaningful: we have strong sample size and source quality, but the CONSISTENCY of mentions is low (nearly 50/50), which should make us less confident in the exact percentage. The report should say "approximately 47%" with a MEDIUM confidence qualifier, not "47% (high confidence)."

### Worked Example: "Hiring Process Visibility" Theme Finding (Seed Data)

Theme: Hiring Process & Candidate Experience. 6 queries, Meridian mentioned in 5/6 = 83%.

```
sampleSize: n = 6 -> 0.6

crossQueryConsistency:
  mentionConsistency = abs(0.833 - 0.5) * 2 = 0.667
  (Strong majority agree Meridian should be mentioned here)

sourceQuality:
  Citations include glassdoor.com, linkedin.com, indeed.com, builtin.com, meridiantech.com, leetcode.com, levels.fyi
  7 unique, all known -> ~1.0

mentionConsistency (entity):
  Apex mentioned in 4/6, VeloChain in 2/6, NovaBridge in 1/6, Forge in 1/6
  Moderate overlap -> ~0.45

sentimentAgreement:
  Scores: 0.7, 0.5, 0.6, 0.4, 0.6, 0.0
  Buckets: positive, positive, positive, positive, positive, neutral
  Majority = positive at 5/6 = 0.833

findingConfidence = 0.6 * 0.30 + 0.667 * 0.25 + 1.0 * 0.20 + 0.45 * 0.10 + 0.833 * 0.15
                  = 0.18 + 0.167 + 0.20 + 0.045 + 0.125
                  = 0.717
```

**Interpretation:** 0.717 -- MEDIUM confidence, trending HIGH. The consistency is strong (5/6 agree), sentiment agreement is strong, but sample size (6) keeps it from reaching HIGH. This is correct: we can say with reasonable confidence that Meridian has strong visibility in hiring process queries, but we should qualify the claim because 6 queries is a moderate sample.

---

## 3. Confidence Tiers

### Tier Definitions

| Tier | Score Range | Meaning for Enterprise Client | Report Language |
|------|-----------|-------------------------------|-----------------|
| **HIGH** | >= 0.75 | Multiple independent signals agree. The finding is well-supported and actionable. Client can cite this in board presentations and hiring strategy documents. | "Our assessment confirms...", "This finding is well-supported across [N] queries...", "The evidence consistently shows..." |
| **MEDIUM** | >= 0.50, < 0.75 | Directional signal with some uncertainty. The finding is likely correct but the exact magnitude may vary. Client should treat this as strong guidance, not a precise measurement. | "Our analysis indicates...", "Results suggest...", "Based on [N] evaluated queries, [finding]...", "The data points toward..." |
| **LOW** | < 0.50 | Preliminary signal only. Insufficient data or contradictory results. Client should not make strategic decisions based solely on this finding. | "Initial signals suggest...", "Preliminary analysis indicates...", "Based on limited data, [finding] -- we recommend expanding the query set before drawing conclusions.", "Early indicators point to..." |

### Why These Boundaries

**0.75 for HIGH:** Requires strong agreement across factors. In the seed data, only findings with 10+ results AND high consistency reach this. This prevents the system from declaring HIGH confidence on a theme with only 6 queries, which is appropriate for a $10K+ enterprise report.

**0.50 for MEDIUM:** A finding at 0.50 has at least some supporting evidence across multiple factors. Below 0.50, the system genuinely does not know -- either the data is insufficient or the results are contradictory.

### What Clients See

In the report sections generated by `composeReport`, confidence tiers would modify language:

**Visibility Section (composeVisibilitySection):**
- HIGH: "Our assessment confirms that [clientName] holds [tier] visibility..."
- MEDIUM: "Based on [N] evaluated queries, [clientName] appears to have [tier] visibility..."
- LOW: "Preliminary analysis across [N] queries suggests [tier] visibility, though additional data would strengthen this finding..."

**Competitor Section (composeCompetitorSection):**
- HIGH: "[CompetitorName] consistently outperforms [clientName] by [gap]pp across [N] queries..."
- MEDIUM: "[CompetitorName] appears to lead [clientName] by approximately [gap]pp..."
- LOW: "Initial signals suggest [CompetitorName] may have stronger visibility, though the gap ([gap]pp) is based on limited data..."

**Recommendation Priorities (generateRecommendations):**
- Recommendations derived from HIGH-confidence findings keep their computed priority.
- Recommendations derived from MEDIUM-confidence findings: cap at HIGH (never CRITICAL).
- Recommendations derived from LOW-confidence findings: cap at MEDIUM, and append a qualifier: "This recommendation is based on preliminary findings. We recommend expanding the assessment to validate before committing resources."

---

## 4. Heuristic + LLM Composite Score

### Architecture

The system has two scoring paths:

1. **Heuristic path** (always available): `analyzeResponse()` in `scan-analysis.ts` produces `visibilityScore`, `sentimentScore`, `mentioned`, and `competitorMentions`. This runs on every result.

2. **LLM validation path** (optional): When LLM analysis is enabled, a separate LLM call can validate the heuristic scores. This is not yet implemented but is on the roadmap.

### LLM Validation Score Definition

When available, the LLM validation produces:
- `llmMentionConfirmed: boolean` -- Does the LLM agree the client is/isn't mentioned?
- `llmVisibilityScore: number (0-100)` -- LLM's assessment of visibility
- `llmSentimentScore: number (-1 to 1)` -- LLM's assessment of sentiment
- `llmConfidence: number (0 to 1)` -- The LLM's self-reported confidence

### Composite Score Computation

#### Case 1: Only Heuristic Available (Current State)

```
compositeConfidence = heuristicConfidence   // no adjustment
```

The heuristic confidence IS the result-level confidence from Section 1. No additional work needed.

#### Case 2: Both Heuristic and LLM Available

```
// Agreement check
mentionAgreement = (heuristic.mentioned === llm.llmMentionConfirmed)
visibilityDelta = abs(heuristic.visibilityScore - llm.llmVisibilityScore) / 100
sentimentDelta = abs(heuristic.sentimentScore - llm.llmSentimentScore) / 2  // normalize to 0-1

agreementScore = (
    (mentionAgreement ? 1.0 : 0.0) * 0.50 +
    (1.0 - visibilityDelta) * 0.25 +
    (1.0 - sentimentDelta) * 0.25
)

if agreementScore >= 0.8:
    // Strong agreement: boost confidence
    compositeConfidence = min(1.0, heuristicConfidence * 0.4 + llmConfidence * 0.6)
else if agreementScore >= 0.5:
    // Moderate agreement: weighted average
    compositeConfidence = heuristicConfidence * 0.5 + llmConfidence * 0.5
else:
    // Disagreement: penalize and take the LOWER of the two
    compositeConfidence = min(heuristicConfidence, llmConfidence) * 0.7
    // Also flag this result for manual review
    flagForReview = true
```

### Why This Weighting

- **LLM gets more weight when they agree (0.6 vs 0.4):** The LLM understands context, sarcasm, indirect mentions, and citation-only mentions that the heuristic cannot detect. When both systems agree, the LLM's nuanced understanding should carry more weight.
- **Equal weight when moderately aligned (0.5/0.5):** Neither system is clearly right; average them.
- **Minimum with penalty when they disagree:** Disagreement itself is a signal that something is wrong. Taking the lower value with a 30% penalty prevents overclaiming. The flagging ensures a human can review.

### Disagreement Cases

| Heuristic Says | LLM Says | Resolution |
|----------------|----------|------------|
| Mentioned (vis 65) | Not mentioned | Trust LLM (heuristic may have matched a substring). Flag for review. |
| Not mentioned (vis 0) | Mentioned (vis 40) | Trust LLM (heuristic may have missed a paraphrase/abbreviation). Flag for review. |
| Positive sentiment (+0.6) | Negative sentiment (-0.3) | Trust neither. Use lower confidence, flag. This may indicate sarcasm or mixed content. |
| Similar scores | Similar scores | Agreement. Use composite. |

---

## 5. Anti-Overclaim Rules

These rules are hard constraints that override the computed confidence score. They prevent the system from making claims stronger than the evidence supports.

### Rule 1: Minimum Result Count for HIGH Confidence

```
if n < 5:
    findingConfidence = min(findingConfidence, 0.74)   // cap at MEDIUM
if n < 3:
    findingConfidence = min(findingConfidence, 0.49)   // cap at LOW
if n == 1:
    findingConfidence = min(findingConfidence, 0.35)   // floor for single-result findings
```

**Rationale:** No matter how good a single result looks, one data point cannot justify HIGH confidence in an enterprise report. A client paying $10K+ deserves claims backed by at least 5 independent queries.

**Impact on seed data:** Theme-level findings (6 queries each) can reach at most MEDIUM. Overall findings (36 queries) can reach HIGH. This is correct.

### Rule 2: Contradiction Ceiling

```
// If mention results are contradictory (near 50/50 split):
if 0.35 <= mentionRate <= 0.65 AND n >= 4:
    findingConfidence = min(findingConfidence, 0.65)   // soft cap at MEDIUM
    // Append to finding: "Results show inconsistent mention patterns across queries."
```

**Rationale:** A 47% mention rate across 36 queries means the model sometimes includes the company and sometimes doesn't. We're confident in the inconsistency but should not be confident in the exact percentage. The report should convey "approximately half" rather than "47% (high confidence)."

### Rule 3: Sentiment Contradiction Penalty

```
sentimentScores = results.map(r => r.sentimentScore).filter(notNull)
if sentimentScores.length >= 3:
    positiveCount = sentimentScores.filter(s => s > 0.1).length
    negativeCount = sentimentScores.filter(s => s < -0.1).length

    if positiveCount > 0 AND negativeCount > 0:
        contradictionRatio = min(positiveCount, negativeCount) / sentimentScores.length
        sentimentFindingConfidence *= (1.0 - contradictionRatio * 0.5)
        // 50/50 positive/negative -> 25% penalty
        // 80/20 split -> 10% penalty
```

**Rationale:** If some queries produce positive sentiment and others produce negative, the average sentiment is meaningless. A sentiment of +0.1 (slightly positive) that is the average of +0.6 and -0.4 is not actually "slightly positive" -- it's "mixed."

### Rule 4: Citation-Free Results Penalty

```
citedResultCount = results.filter(r => r.citations.length > 0).length
citedRatio = citedResultCount / results.length

if citedRatio < 0.3:
    findingConfidence *= 0.8   // 20% penalty
    // Most results are ungrounded
```

**Rationale:** Without citations, we cannot verify what the AI model based its claims on. This is especially dangerous for sentiment and competitive claims.

### Rule 5: Stale Data Penalty (Future-Proofing)

```
// When scan timestamps are available:
oldestResult = min(results.map(r => r.createdAt))
daysSinceScan = (now - oldestResult) / (24 * 60 * 60 * 1000)

if daysSinceScan > 180:
    findingConfidence *= 0.7
    // Append: "This finding is based on data collected over 6 months ago. AI model behavior
    //          may have changed. We recommend a fresh assessment."
else if daysSinceScan > 90:
    findingConfidence *= 0.85
    // Append: "This finding is based on data from a previous quarter."
```

### Rule 6: Single-Source Dominance Penalty

```
// If one domain accounts for >80% of all citations in the finding:
domainCounts = countBy(allCitations.map(c => c.domain))
totalCitations = allCitations.length
maxDomainCount = max(domainCounts.values())

if totalCitations > 0 AND maxDomainCount / totalCitations > 0.8:
    findingConfidence *= 0.85
    // Source diversity is low -- one platform dominates the evidence base
```

**Rationale:** If 90% of citations are from glassdoor.com, the finding reflects Glassdoor's content, not a broad AI consensus. This is still useful but less reliable than findings backed by diverse sources.

### Rule 7: Recommendation Priority Ceiling

Recommendations generated by `generateRecommendations()` should respect confidence:

```
For each recommendation:
    relatedFindingConfidence = confidence of the finding that triggered this recommendation

    if relatedFindingConfidence.tier == LOW:
        recommendation.priority = min(recommendation.priority, "MEDIUM")
        recommendation.description += " (This recommendation is based on preliminary findings.)"

    if relatedFindingConfidence.tier == MEDIUM:
        recommendation.priority = min(recommendation.priority, "HIGH")
        // CRITICAL recommendations require HIGH-confidence findings

    // HIGH-confidence findings: no adjustment
```

**Specific mapping to current code:**

| Recommendation Trigger | Related Finding | Confidence Check |
|----------------------|-----------------|-----------------|
| `sc.citations.gapDomains.length > 0` | Citation gap analysis | Finding confidence of citation findings |
| `top.mentionRate > sc.clientMentionRate` | Competitive gap | Finding confidence of competitor comparison |
| `sc.clientMentionRate < 0.5` | Overall mention rate | Finding confidence of mention rate |
| `sc.avgSentimentScore < 0` | Sentiment posture | Finding confidence of sentiment analysis |

---

## 6. Validation of the Scoring System

### Expected Results on Seed Data

Running the confidence scoring system on the seed data should produce these expected outcomes. Any significant deviation indicates a calibration problem.

#### Overall Findings (all 36 queries)

| Finding | Expected Tier | Rationale |
|---------|--------------|-----------|
| Client mention rate (47%) | MEDIUM | Strong sample (36), but near-50/50 consistency drags it down. |
| Average visibility score (varies) | MEDIUM | Moderate sample, mixed scores across themes. |
| Sentiment posture (slightly positive) | MEDIUM | Mix of positive, neutral, and slightly negative scores. |
| Apex Cloud competitive gap (+28pp) | HIGH | 36 queries, Apex mentioned in ~75% consistently, strong separation. |
| Citation gap count (7 domains) | HIGH | Binary presence/absence on specific platforms is reliable. |

#### Theme-Level Findings (6 queries each)

| Theme | Mention Rate | Expected Tier | Rationale |
|-------|-------------|--------------|-----------|
| Engineering Culture | 50% (3/6) | MEDIUM | Near 50/50 split, small sample. |
| Compensation | 17% (1/6) | LOW-MEDIUM | Very small positive sample (1 mention), large sample of absences. Borderline. |
| Hiring Process | 83% (5/6) | MEDIUM | Strong consistency but only 6 queries (Rule 1 caps at MEDIUM). |
| Role Expectations | 67% (4/6) | MEDIUM | Reasonable consistency, moderate sample. |
| Culture & WLB | 17% (1/6) | LOW-MEDIUM | Similar to Compensation. |
| Competitor Comparison | 50% (3/6) | MEDIUM | Near 50/50 split, small sample. |

#### Result-Level Confidence Distribution

Across the 36 seed results, the expected distribution:
- Results where client IS mentioned with citations: 0.75 - 0.90 (HIGH)
- Results where client is NOT mentioned but has citations: 0.65 - 0.80 (MEDIUM to HIGH)
- Results where client is NOT mentioned with few citations: 0.50 - 0.65 (MEDIUM)

No result in the seed data should have confidence below 0.40, because all have substantive responses and at least some citations.

### Sanity Checks

These checks should run after every confidence computation. If any fails, log a warning.

#### Check 1: No HIGH Confidence with n < 5

```
assert: for all findings where confidence >= 0.75:
    contributingResults.length >= 5
```

If violated: Rule 1 is not being applied.

#### Check 2: Confidence Monotonic with Sample Size (Weak)

```
// For findings of the same type with similar consistency:
// More data should never DECREASE confidence (holding other factors equal)
// This is a weak check -- consistency can cause larger samples to have lower confidence
```

#### Check 3: Contradiction Ceiling Respected

```
assert: for all findings where 0.35 <= mentionRate <= 0.65 AND n >= 4:
    findingConfidence <= 0.65
```

#### Check 4: No Confidence Outside [0, 1]

```
assert: for all resultConfidence: 0 <= resultConfidence <= 1
assert: for all findingConfidence: 0 <= findingConfidence <= 1
```

#### Check 5: Result-Level Confidence Correlates with Data Quality

```
// Results with more citations should generally have higher confidence
// Results with longer responses should generally have higher confidence
// These are statistical checks, not hard constraints
correlate(resultConfidence, citationCount)  -> should be positive
correlate(resultConfidence, response.length) -> should be positive
```

#### Check 6: LOW-Confidence Findings Should Trigger Qualification Language

```
assert: for all report sections where underlying finding has confidence.tier == LOW:
    section.body contains one of: "preliminary", "initial", "limited data", "suggest"
```

### Detecting Unintuitive Results

The system should flag (log, not crash) when:

1. **A well-cited result gets LOW confidence:** This could happen if the response is very short. Check if `responseQuality` is dragging down an otherwise strong result.

2. **A finding with 100% mention rate gets MEDIUM confidence:** Likely due to small sample size (Rule 1). This is correct behavior but should be logged so it can be explained to clients who ask "why isn't 100% mention rate high confidence?"

3. **Two themes with similar mention rates get different confidence tiers:** This would indicate that consistency, source quality, or sentiment agreement varies between themes. Log the factor breakdown so the difference can be explained.

4. **A CRITICAL recommendation is attached to a LOW-confidence finding:** Rule 7 should prevent this. If it happens, there is a bug in the anti-overclaim logic.

5. **Average result confidence diverges from finding confidence by more than 0.3:** This could indicate that the finding-level factors are overriding the result quality signal. The 80/20 blending ratio may need adjustment.

### Calibration Process

Before implementing, validate on the seed data by computing all scores manually and checking against the expected outcomes above. Adjust weights if:

1. The overall mention rate finding scores above 0.75 (it should not, due to near-50/50 inconsistency).
2. The Apex competitive gap finding scores below 0.75 (it should be HIGH -- the gap is clear and consistent).
3. Any theme finding with 6 queries scores above 0.74 (Rule 1 should prevent this).
4. The Compensation theme finding (1/6 mentions) scores above 0.50 (it should be LOW or LOW-MEDIUM).

If any of these expectations are violated, adjust the factor weights or anti-overclaim rule thresholds before shipping.

---

## 7. Integration Points (Implementation Reference)

This section is NOT a change spec. It identifies where the confidence system would connect to existing code when implemented.

### New Types Needed

```typescript
interface ResultConfidence {
  overall: number;              // 0-1
  factors: {
    responseQuality: number;
    mentionClarity: number;
    scoreExtremity: number;
    citationPresence: number;
  };
}

interface FindingConfidence {
  overall: number;              // 0-1
  tier: "HIGH" | "MEDIUM" | "LOW";
  factors: {
    sampleSize: number;
    crossQueryConsistency: number;
    sourceQuality: number;
    mentionConsistency: number;
    sentimentAgreement: number;
  };
  antiOverclaimRulesApplied: string[];  // Which rules fired
}
```

### Where Confidence Is Computed

| Computation | Module | Function |
|-------------|--------|----------|
| Result-level confidence | `scan-analysis.ts` (or new `scan-confidence.ts`) | After `analyzeResponse()` runs |
| Finding-level confidence | `scan-comparison.ts` (or new `scan-confidence.ts`) | After `computeScanComparison()` runs |
| Anti-overclaim rules | `report-composer.ts` | Before `generateRecommendations()` and inside section generators |
| Tier classification | New utility | Pure function: score -> tier |
| Report language modulation | `report-composer.ts` | Inside `composeVisibilitySection()`, `composeSummary()`, etc. |

### Schema Impact

`ScanResult` could gain an optional `confidence` JSON field to cache the result-level confidence (avoiding recomputation). Alternatively, confidence can be computed at report generation time from the existing fields, which avoids a migration. The latter is simpler and avoids stale cache issues.

The `Report.metadata` JSON field could store finding-level confidences, making them available for the UI without recomputation.

### What Changes in Report Output

The `ComposedReport` type would need:
- `findingConfidences: Map<string, FindingConfidence>` -- one per finding
- Each `ReportSection` gets an optional `confidenceTier` field
- `GeneratedRecommendation` gets an optional `evidenceConfidence` field

The narrative functions (`composeVisibilitySection`, `composeSummary`, etc.) would read the confidence tier and select language accordingly, as specified in Section 3.
