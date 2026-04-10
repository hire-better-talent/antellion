// ── Enums (mirror Prisma — keeps core free of @prisma/client) ──

export type LLMProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "MANUAL";
export type EvidenceStatus = "DRAFT" | "APPROVED" | "SUPERSEDED" | "REJECTED";

// ── Evidence record ──

export interface ScanEvidenceRecord {
  id: string;
  scanResultId: string;
  version: number;

  // Provenance: what was asked
  promptText: string;
  promptVersion: string | null;

  // Provenance: who answered
  provider: LLMProvider;
  modelName: string;
  modelVersion: string | null;
  temperature: number | null;
  topP: number | null;
  maxTokens: number | null;
  systemPrompt: string | null;
  parameters: Record<string, unknown> | null;

  // Raw output
  rawResponse: string;
  rawTokenCount: number | null;
  promptTokens: number | null;
  latencyMs: number | null;

  // Execution
  executedAt: Date;

  // Review state
  status: EvidenceStatus;
  approvedAt: Date | null;
  approvedById: string | null;

  // Analyst overlay
  analystNotes: string | null;
  confidenceScore: number | null;
  analystConfidence: number | null;

  // Extracted data
  extractedSources: { domain: string; url: string }[] | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ── Report evidence link ──

export interface ReportEvidenceLink {
  id: string;
  reportId: string;
  scanEvidenceId: string;
  sectionHeading: string | null;
  claimText: string | null;
  evidenceRole: string | null;
  sortOrder: number;
  createdAt: Date;
}

// ── Evidence creation input ──

export interface CreateEvidenceInput {
  scanResultId: string;
  promptText: string;
  promptVersion?: string;
  provider: LLMProvider;
  modelName: string;
  modelVersion?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
  parameters?: Record<string, unknown>;
  rawResponse: string;
  rawTokenCount?: number;
  promptTokens?: number;
  latencyMs?: number;
  executedAt: Date;
  extractedSources?: { domain: string; url: string }[];
}

// ── Evidence transition context ──

export interface EvidenceTransitionContext {
  actorId: string;
  actorRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  scanAnalystId: string | null;
  note?: string;
}

// ── Evidence transition result ──

export interface EvidenceTransitionResult {
  newStatus: EvidenceStatus;
  sideEffects: Array<{
    type: "set_field";
    field: string;
    value: unknown;
  }>;
  auditEntry: {
    entityType: "SCAN_EVIDENCE";
    entityId: string;
    actorId: string;
    fromStatus: string;
    toStatus: string;
    action: string;
    note?: string;
  };
}

// ── Report evidence creation input ──

export interface CreateReportEvidenceInput {
  reportId: string;
  scanEvidenceId: string;
  sectionHeading?: string;
  claimText?: string;
  evidenceRole?: string;
  sortOrder?: number;
}
