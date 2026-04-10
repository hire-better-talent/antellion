// ── QA status and outcome enums (mirrors Prisma — keeps core free of @prisma/client) ──

export type QAStatus = "PENDING" | "PASS" | "FAIL" | "CONDITIONAL_PASS";
export type QACheckOutcome = "PASS" | "FAIL" | "WARNING" | "SKIPPED";
export type QACheckSeverity = "BLOCKING" | "WARNING" | "INFO";

// ── Check result ──

export interface QACheckResult {
  checkKey: string;
  category: string;
  severity: QACheckSeverity;
  outcome: QACheckOutcome;
  detail: string | null;
  expected: string | null;
  actual: string | null;
}

// ── Check context (all data needed to run checks, fetched by the caller) ──

export interface QACheckContext {
  report: {
    id: string;
    summary: string | null;
    metadata: Record<string, unknown> | null;
  };
  scanRuns: Array<{
    id: string;
    status: string;
    queryCount: number;
    resultCount: number;
  }>;
  scanResults: Array<{
    id: string;
    scanRunId: string;
    status: string; // ScanResultStatus
    mentioned: boolean;
    visibilityScore: number | null;
    sentimentScore: number | null;
    response: string;
    metadata: unknown;
    citations: Array<{ domain: string | null }>;
  }>;
  evidence: Array<{
    id: string;
    scanResultId: string;
    status: string; // EvidenceStatus
    confidenceScore: number | null;
  }>;
  client: {
    name: string;
    competitors: Array<{ name: string }>;
  };
}

// ── Run result ──

export interface QARunResult {
  checks: QACheckResult[];
  status: QAStatus;
}

// ── Check function signature ──

export type QACheckFn = (ctx: QACheckContext) => QACheckResult;
