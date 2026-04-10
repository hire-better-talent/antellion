import { describe, it, expect } from "vitest";
import {
  classifyStability,
  aggregateQueryResults,
  computeMultiRunAnalysis,
  groupResultsByQuery,
  type StabilityClassification,
  type MultiRunResultInput,
  type QueryResultSet,
} from "../multi-run-aggregation";

// ─── Fixtures ────────────────────────────────────────────────

function makeResult(
  overrides: Partial<MultiRunResultInput> = {},
): MultiRunResultInput {
  return {
    scanRunId: "run-1",
    mentioned: false,
    visibilityScore: null,
    sentimentScore: null,
    citationDomains: [],
    metadata: null,
    ...overrides,
  };
}

function makeResultSet(
  overrides: Partial<Omit<QueryResultSet, "results">> & {
    results?: Partial<MultiRunResultInput>[];
  } = {},
): QueryResultSet {
  const { results: resultOverrides = [], ...rest } = overrides;
  return {
    queryId: "q-1",
    queryText: "Does Acme hire software engineers?",
    stage: "DISCOVERY",
    clusterId: "cluster-1",
    clusterName: "Engineering Discovery",
    results: resultOverrides.map((r, i) =>
      makeResult({ scanRunId: `run-${i + 1}`, ...r }),
    ),
    ...rest,
  };
}

// ─── classifyStability ───────────────────────────────────────

describe("classifyStability", () => {
  it("0 runs → UNVALIDATED", () => {
    expect(classifyStability(0, 0)).toBe("UNVALIDATED");
  });

  it("1 run → UNVALIDATED regardless of mention rate", () => {
    expect(classifyStability(0, 1)).toBe("UNVALIDATED");
    expect(classifyStability(1, 1)).toBe("UNVALIDATED");
  });

  it("2 runs, both mentioned (mentionRate=1) → STABLE_PRESENCE", () => {
    expect(classifyStability(1, 2)).toBe("STABLE_PRESENCE");
  });

  it("2 runs, neither mentioned (mentionRate=0) → STABLE_ABSENCE", () => {
    expect(classifyStability(0, 2)).toBe("STABLE_ABSENCE");
  });

  it("2 runs, one mentioned (mentionRate=0.5) → VOLATILE_PRESENCE", () => {
    expect(classifyStability(0.5, 2)).toBe("VOLATILE_PRESENCE");
  });

  it("3 runs, all mentioned (mentionRate=1) → STABLE_PRESENCE", () => {
    expect(classifyStability(1, 3)).toBe("STABLE_PRESENCE");
  });

  it("3 runs, 2 mentioned (mentionRate≈0.6667) → VOLATILE_PRESENCE (just below 0.67 threshold)", () => {
    // 2/3 ≈ 0.6667 in IEEE 754, which is strictly less than 0.67
    expect(classifyStability(2 / 3, 3)).toBe("VOLATILE_PRESENCE");
  });

  it("3 runs, 1 mentioned (mentionRate≈0.33) → VOLATILE_PRESENCE", () => {
    expect(classifyStability(1 / 3, 3)).toBe("VOLATILE_PRESENCE");
  });

  it("3 runs, 0 mentioned (mentionRate=0) → STABLE_ABSENCE", () => {
    expect(classifyStability(0, 3)).toBe("STABLE_ABSENCE");
  });

  it("mentionRate just below 0.67 → VOLATILE_PRESENCE", () => {
    expect(classifyStability(0.66, 3)).toBe("VOLATILE_PRESENCE");
  });

  it("mentionRate exactly 0.67 → STABLE_PRESENCE", () => {
    expect(classifyStability(0.67, 3)).toBe("STABLE_PRESENCE");
  });
});

// ─── aggregateQueryResults ───────────────────────────────────

describe("aggregateQueryResults", () => {
  it("single result: correct metrics, isValidated=false, stability=UNVALIDATED", () => {
    const resultSet = makeResultSet({
      results: [{ mentioned: true, visibilityScore: 60, sentimentScore: 0.8 }],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.runCount).toBe(1);
    expect(agg.mentionRate).toBe(1);
    expect(agg.avgVisibilityScore).toBe(60);
    expect(agg.avgSentimentScore).toBe(0.8);
    expect(agg.isValidated).toBe(false);
    expect(agg.stability).toBe("UNVALIDATED");
  });

  it("two results both mentioned: mentionRate=1, STABLE_PRESENCE, isValidated=true", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: true },
        { scanRunId: "run-2", mentioned: true },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.runCount).toBe(2);
    expect(agg.mentionRate).toBe(1);
    expect(agg.stability).toBe("STABLE_PRESENCE");
    expect(agg.isValidated).toBe(true);
  });

  it("two results neither mentioned: mentionRate=0, STABLE_ABSENCE", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: false },
        { scanRunId: "run-2", mentioned: false },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.runCount).toBe(2);
    expect(agg.mentionRate).toBe(0);
    expect(agg.stability).toBe("STABLE_ABSENCE");
  });

  it("three results mixed (2 mentioned): correct rate, VOLATILE_PRESENCE (2/3 < 0.67 threshold)", () => {
    // 2/3 ≈ 0.6667 in IEEE 754, which is strictly less than the 0.67 threshold
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: true },
        { scanRunId: "run-2", mentioned: true },
        { scanRunId: "run-3", mentioned: false },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.runCount).toBe(3);
    expect(agg.mentionRate).toBeCloseTo(2 / 3);
    expect(agg.stability).toBe("VOLATILE_PRESENCE");
  });

  it("three results mixed (1 mentioned): VOLATILE_PRESENCE", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: true },
        { scanRunId: "run-2", mentioned: false },
        { scanRunId: "run-3", mentioned: false },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.mentionRate).toBeCloseTo(1 / 3);
    expect(agg.stability).toBe("VOLATILE_PRESENCE");
  });

  it("some null visibility scores: averages only non-null values", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", visibilityScore: 60 },
        { scanRunId: "run-2", visibilityScore: 80 },
        { scanRunId: "run-3", visibilityScore: null },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.avgVisibilityScore).toBe(70);
  });

  it("all null visibility scores: avgVisibilityScore=null", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", visibilityScore: null },
        { scanRunId: "run-2", visibilityScore: null },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.avgVisibilityScore).toBeNull();
  });

  it("some null sentiment scores: averages only non-null values", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", sentimentScore: 0.4 },
        { scanRunId: "run-2", sentimentScore: null },
        { scanRunId: "run-3", sentimentScore: 0.8 },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.avgSentimentScore).toBeCloseTo(0.6);
  });

  it("all null sentiment scores: avgSentimentScore=null", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", sentimentScore: null },
        { scanRunId: "run-2", sentimentScore: null },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.avgSentimentScore).toBeNull();
  });

  it("citation domains deduplicated across runs", () => {
    const resultSet = makeResultSet({
      results: [
        {
          scanRunId: "run-1",
          citationDomains: ["linkedin.com", "glassdoor.com"],
        },
        {
          scanRunId: "run-2",
          citationDomains: ["glassdoor.com", "indeed.com"],
        },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.allCitationDomains).toHaveLength(3);
    expect(agg.allCitationDomains).toContain("linkedin.com");
    expect(agg.allCitationDomains).toContain("glassdoor.com");
    expect(agg.allCitationDomains).toContain("indeed.com");
  });

  it("no citation domains across runs: empty array", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", citationDomains: [] },
        { scanRunId: "run-2", citationDomains: [] },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.allCitationDomains).toHaveLength(0);
  });

  it("visibilityVariance: correct sample variance for 3 values", () => {
    // Values: 40, 60, 80 — mean 60, deviations: -20, 0, +20
    // sample variance: (400 + 0 + 400) / 2 = 400
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", visibilityScore: 40 },
        { scanRunId: "run-2", visibilityScore: 60 },
        { scanRunId: "run-3", visibilityScore: 80 },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.visibilityVariance).toBeCloseTo(400);
  });

  it("visibilityVariance: 0 when fewer than 2 non-null values", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", visibilityScore: 60 },
        { scanRunId: "run-2", visibilityScore: null },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.visibilityVariance).toBe(0);
  });

  it("visibilityVariance: 0 when all null", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", visibilityScore: null },
        { scanRunId: "run-2", visibilityScore: null },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.visibilityVariance).toBe(0);
  });

  it("mentionConsistency: 1.0 when all results mention client (unanimous presence)", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: true },
        { scanRunId: "run-2", mentioned: true },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.mentionConsistency).toBe(1);
  });

  it("mentionConsistency: 1.0 when no results mention client (unanimous absence)", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: false },
        { scanRunId: "run-2", mentioned: false },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.mentionConsistency).toBe(1);
  });

  it("mentionConsistency: 0.0 when perfectly split (50/50)", () => {
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: true },
        { scanRunId: "run-2", mentioned: false },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.mentionConsistency).toBe(0);
  });

  it("mentionConsistency: intermediate value for partial agreement", () => {
    // 2 out of 3 mentioned → mentionRate = 2/3
    // consistency = 1 - 2 * min(2/3, 1/3) = 1 - 2/3 ≈ 0.333
    const resultSet = makeResultSet({
      results: [
        { scanRunId: "run-1", mentioned: true },
        { scanRunId: "run-2", mentioned: true },
        { scanRunId: "run-3", mentioned: false },
      ],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.mentionConsistency).toBeCloseTo(1 / 3);
  });

  it("preserves queryId, queryText, stage, clusterId, clusterName", () => {
    const resultSet = makeResultSet({
      queryId: "q-42",
      queryText: "Is Acme a great place to work?",
      stage: "EVALUATION",
      clusterId: "cl-7",
      clusterName: "Culture Fit",
      results: [{ scanRunId: "run-1" }],
    });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.queryId).toBe("q-42");
    expect(agg.queryText).toBe("Is Acme a great place to work?");
    expect(agg.stage).toBe("EVALUATION");
    expect(agg.clusterId).toBe("cl-7");
    expect(agg.clusterName).toBe("Culture Fit");
  });

  it("zero results: runCount=0, mentionRate=0, both averages null", () => {
    const resultSet = makeResultSet({ results: [] });
    const agg = aggregateQueryResults(resultSet);

    expect(agg.runCount).toBe(0);
    expect(agg.mentionRate).toBe(0);
    expect(agg.avgVisibilityScore).toBeNull();
    expect(agg.avgSentimentScore).toBeNull();
    expect(agg.visibilityVariance).toBe(0);
    expect(agg.stability).toBe("UNVALIDATED");
    expect(agg.isValidated).toBe(false);
  });
});

// ─── computeMultiRunAnalysis ─────────────────────────────────

describe("computeMultiRunAnalysis", () => {
  it("empty input → zero totals, effectiveScanRunCount=1", () => {
    const analysis = computeMultiRunAnalysis([]);

    expect(analysis.totalQueries).toBe(0);
    expect(analysis.validatedQueryCount).toBe(0);
    expect(analysis.validationRate).toBe(0);
    expect(analysis.effectiveScanRunCount).toBe(1);
    expect(analysis.perQueryAggregations).toHaveLength(0);
    expect(analysis.stageSummaries).toHaveLength(0);
    expect(analysis.stabilityDistribution.STABLE_PRESENCE).toBe(0);
    expect(analysis.stabilityDistribution.VOLATILE_PRESENCE).toBe(0);
    expect(analysis.stabilityDistribution.STABLE_ABSENCE).toBe(0);
    expect(analysis.stabilityDistribution.UNVALIDATED).toBe(0);
  });

  it("all single-run queries → validationRate=0, effectiveScanRunCount=1", () => {
    const querySets = [
      makeResultSet({ queryId: "q-1", results: [{ scanRunId: "run-1", mentioned: true }] }),
      makeResultSet({ queryId: "q-2", results: [{ scanRunId: "run-1", mentioned: false }] }),
    ];
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.totalQueries).toBe(2);
    expect(analysis.validatedQueryCount).toBe(0);
    expect(analysis.validationRate).toBe(0);
    expect(analysis.effectiveScanRunCount).toBe(1);
    expect(analysis.stabilityDistribution.UNVALIDATED).toBe(2);
  });

  it("all multi-run queries → validationRate=1, effectiveScanRunCount=2", () => {
    const querySets = [
      makeResultSet({
        queryId: "q-1",
        results: [
          { scanRunId: "run-1", mentioned: true },
          { scanRunId: "run-2", mentioned: true },
        ],
      }),
      makeResultSet({
        queryId: "q-2",
        results: [
          { scanRunId: "run-1", mentioned: false },
          { scanRunId: "run-2", mentioned: false },
        ],
      }),
    ];
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.validationRate).toBe(1);
    expect(analysis.effectiveScanRunCount).toBe(2);
    expect(analysis.validatedQueryCount).toBe(2);
  });

  it("70% validated → effectiveScanRunCount=2 (meets 0.7 threshold)", () => {
    // 7 validated, 3 single-run → validationRate = 0.7
    const querySets: QueryResultSet[] = [];
    for (let i = 0; i < 7; i++) {
      querySets.push(
        makeResultSet({
          queryId: `q-${i}`,
          results: [
            { scanRunId: "run-1", mentioned: true },
            { scanRunId: "run-2", mentioned: false },
          ],
        }),
      );
    }
    for (let i = 7; i < 10; i++) {
      querySets.push(
        makeResultSet({
          queryId: `q-${i}`,
          results: [{ scanRunId: "run-1", mentioned: true }],
        }),
      );
    }
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.validationRate).toBe(0.7);
    expect(analysis.effectiveScanRunCount).toBe(2);
  });

  it("69% validated → effectiveScanRunCount=1 (below 0.7 threshold)", () => {
    // 69 validated, 31 single-run → validationRate = 0.69
    const querySets: QueryResultSet[] = [];
    for (let i = 0; i < 69; i++) {
      querySets.push(
        makeResultSet({
          queryId: `q-${i}`,
          results: [
            { scanRunId: "run-1", mentioned: true },
            { scanRunId: "run-2", mentioned: false },
          ],
        }),
      );
    }
    for (let i = 69; i < 100; i++) {
      querySets.push(
        makeResultSet({
          queryId: `q-${i}`,
          results: [{ scanRunId: "run-1", mentioned: true }],
        }),
      );
    }
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.validationRate).toBe(0.69);
    expect(analysis.effectiveScanRunCount).toBe(1);
  });

  it("stabilityDistribution counts are correct", () => {
    const querySets = [
      // STABLE_PRESENCE
      makeResultSet({
        queryId: "q-1",
        results: [
          { scanRunId: "run-1", mentioned: true },
          { scanRunId: "run-2", mentioned: true },
        ],
      }),
      // STABLE_ABSENCE
      makeResultSet({
        queryId: "q-2",
        results: [
          { scanRunId: "run-1", mentioned: false },
          { scanRunId: "run-2", mentioned: false },
        ],
      }),
      // VOLATILE_PRESENCE
      makeResultSet({
        queryId: "q-3",
        results: [
          { scanRunId: "run-1", mentioned: true },
          { scanRunId: "run-2", mentioned: false },
        ],
      }),
      // UNVALIDATED
      makeResultSet({
        queryId: "q-4",
        results: [{ scanRunId: "run-1", mentioned: true }],
      }),
    ];
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.stabilityDistribution.STABLE_PRESENCE).toBe(1);
    expect(analysis.stabilityDistribution.STABLE_ABSENCE).toBe(1);
    expect(analysis.stabilityDistribution.VOLATILE_PRESENCE).toBe(1);
    expect(analysis.stabilityDistribution.UNVALIDATED).toBe(1);
  });

  it("stageSummaries grouped correctly by stage", () => {
    const querySets = [
      makeResultSet({
        queryId: "q-1",
        stage: "DISCOVERY",
        results: [
          { scanRunId: "run-1", mentioned: true },
          { scanRunId: "run-2", mentioned: true },
        ],
      }),
      makeResultSet({
        queryId: "q-2",
        stage: "DISCOVERY",
        results: [
          { scanRunId: "run-1", mentioned: false },
          { scanRunId: "run-2", mentioned: false },
        ],
      }),
      makeResultSet({
        queryId: "q-3",
        stage: "EVALUATION",
        results: [
          { scanRunId: "run-1", mentioned: true },
          { scanRunId: "run-2", mentioned: false },
        ],
      }),
    ];
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.stageSummaries).toHaveLength(2);

    const discovery = analysis.stageSummaries.find(
      (s) => s.stage === "DISCOVERY",
    );
    expect(discovery).toBeDefined();
    expect(discovery!.totalQueries).toBe(2);
    expect(discovery!.stablePresence).toBe(1);
    expect(discovery!.stableAbsence).toBe(1);
    expect(discovery!.volatilePresence).toBe(0);
    expect(discovery!.avgMentionRate).toBe(0.5);

    const evaluation = analysis.stageSummaries.find(
      (s) => s.stage === "EVALUATION",
    );
    expect(evaluation).toBeDefined();
    expect(evaluation!.totalQueries).toBe(1);
    expect(evaluation!.volatilePresence).toBe(1);
    expect(evaluation!.avgMentionRate).toBe(0.5);
  });

  it("multiple stages represented in stageSummaries", () => {
    const stages = ["DISCOVERY", "EVALUATION", "COMPARISON", "DECISION"];
    const querySets = stages.map((stage, i) =>
      makeResultSet({
        queryId: `q-${i}`,
        stage,
        results: [{ scanRunId: "run-1", mentioned: true }],
      }),
    );
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.stageSummaries).toHaveLength(4);
    const stageNames = analysis.stageSummaries.map((s) => s.stage);
    for (const stage of stages) {
      expect(stageNames).toContain(stage);
    }
  });

  it("null stages grouped as UNKNOWN in stageSummaries", () => {
    const querySets = [
      makeResultSet({
        queryId: "q-1",
        stage: null,
        results: [{ scanRunId: "run-1", mentioned: true }],
      }),
    ];
    const analysis = computeMultiRunAnalysis(querySets);

    const unknownStage = analysis.stageSummaries.find(
      (s) => s.stage === "UNKNOWN",
    );
    expect(unknownStage).toBeDefined();
    expect(unknownStage!.totalQueries).toBe(1);
  });

  it("perQueryAggregations has one entry per query set", () => {
    const querySets = [
      makeResultSet({ queryId: "q-1", results: [{ scanRunId: "run-1" }] }),
      makeResultSet({ queryId: "q-2", results: [{ scanRunId: "run-1" }] }),
      makeResultSet({ queryId: "q-3", results: [{ scanRunId: "run-1" }] }),
    ];
    const analysis = computeMultiRunAnalysis(querySets);

    expect(analysis.perQueryAggregations).toHaveLength(3);
  });
});

// ─── groupResultsByQuery ─────────────────────────────────────

describe("groupResultsByQuery", () => {
  it("groups results by queryId correctly", () => {
    const results = [
      {
        queryId: "q-1",
        scanRunId: "run-1",
        mentioned: true,
        visibilityScore: 70,
        sentimentScore: 0.6,
        citations: [{ domain: "linkedin.com" }],
        metadata: null,
      },
      {
        queryId: "q-2",
        scanRunId: "run-1",
        mentioned: false,
        visibilityScore: null,
        sentimentScore: null,
        citations: [],
        metadata: null,
      },
      {
        queryId: "q-1",
        scanRunId: "run-2",
        mentioned: false,
        visibilityScore: 30,
        sentimentScore: 0.2,
        citations: [{ domain: "glassdoor.com" }],
        metadata: null,
      },
    ];

    const queryLookup = new Map([
      [
        "q-1",
        {
          text: "Does Acme hire engineers?",
          stage: "DISCOVERY",
          clusterId: "cl-1",
          clusterName: "Engineering",
        },
      ],
      [
        "q-2",
        {
          text: "Is Acme a top employer?",
          stage: "EVALUATION",
          clusterId: "cl-2",
          clusterName: "Employer Brand",
        },
      ],
    ]);

    const querySets = groupResultsByQuery(results, queryLookup);

    expect(querySets).toHaveLength(2);

    const q1 = querySets.find((qs) => qs.queryId === "q-1");
    expect(q1).toBeDefined();
    expect(q1!.results).toHaveLength(2);
    expect(q1!.queryText).toBe("Does Acme hire engineers?");
    expect(q1!.stage).toBe("DISCOVERY");
    expect(q1!.clusterId).toBe("cl-1");

    const q2 = querySets.find((qs) => qs.queryId === "q-2");
    expect(q2).toBeDefined();
    expect(q2!.results).toHaveLength(1);
  });

  it("skips results for query IDs not in lookup", () => {
    const results = [
      {
        queryId: "q-unknown",
        scanRunId: "run-1",
        mentioned: true,
        visibilityScore: null,
        sentimentScore: null,
        citations: [],
        metadata: null,
      },
      {
        queryId: "q-1",
        scanRunId: "run-1",
        mentioned: false,
        visibilityScore: null,
        sentimentScore: null,
        citations: [],
        metadata: null,
      },
    ];

    const queryLookup = new Map([
      [
        "q-1",
        {
          text: "Some query",
          stage: null,
          clusterId: "cl-1",
          clusterName: "Cluster 1",
        },
      ],
    ]);

    const querySets = groupResultsByQuery(results, queryLookup);

    expect(querySets).toHaveLength(1);
    expect(querySets[0].queryId).toBe("q-1");
  });

  it("filters null domains from citations", () => {
    const results = [
      {
        queryId: "q-1",
        scanRunId: "run-1",
        mentioned: true,
        visibilityScore: null,
        sentimentScore: null,
        citations: [
          { domain: "linkedin.com" },
          { domain: null },
          { domain: "glassdoor.com" },
        ],
        metadata: null,
      },
    ];

    const queryLookup = new Map([
      [
        "q-1",
        {
          text: "Some query",
          stage: null,
          clusterId: "cl-1",
          clusterName: "Cluster 1",
        },
      ],
    ]);

    const querySets = groupResultsByQuery(results, queryLookup);

    expect(querySets[0].results[0].citationDomains).toEqual([
      "linkedin.com",
      "glassdoor.com",
    ]);
  });

  it("empty results array → empty output", () => {
    const queryLookup = new Map([
      [
        "q-1",
        {
          text: "Some query",
          stage: null,
          clusterId: "cl-1",
          clusterName: "Cluster 1",
        },
      ],
    ]);

    const querySets = groupResultsByQuery([], queryLookup);

    expect(querySets).toHaveLength(0);
  });

  it("empty query lookup → all results skipped", () => {
    const results = [
      {
        queryId: "q-1",
        scanRunId: "run-1",
        mentioned: true,
        visibilityScore: null,
        sentimentScore: null,
        citations: [],
        metadata: null,
      },
    ];

    const querySets = groupResultsByQuery(results, new Map());

    expect(querySets).toHaveLength(0);
  });

  it("result fields mapped correctly onto MultiRunResultInput", () => {
    const results = [
      {
        queryId: "q-1",
        scanRunId: "run-99",
        mentioned: true,
        visibilityScore: 55,
        sentimentScore: 0.7,
        citations: [{ domain: "indeed.com" }],
        metadata: { raw: "data" },
      },
    ];

    const queryLookup = new Map([
      [
        "q-1",
        {
          text: "Query text",
          stage: "DISCOVERY",
          clusterId: "cl-1",
          clusterName: "Cluster",
        },
      ],
    ]);

    const querySets = groupResultsByQuery(results, queryLookup);
    const result = querySets[0].results[0];

    expect(result.scanRunId).toBe("run-99");
    expect(result.mentioned).toBe(true);
    expect(result.visibilityScore).toBe(55);
    expect(result.sentimentScore).toBe(0.7);
    expect(result.citationDomains).toEqual(["indeed.com"]);
    expect(result.metadata).toEqual({ raw: "data" });
  });
});
