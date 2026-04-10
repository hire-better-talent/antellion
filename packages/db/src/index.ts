export { prisma, createPrismaClient } from "./client";
export type { PrismaClient, PrismaClientOptions } from "./client";

// ─── Model types ────────────────────────────────────────────
export type {
  Organization,
  User,
  Client,
  Competitor,
  RoleProfile,
  QueryCluster,
  Query,
  ScanRun,
  ScanResult,
  CitationSource,
  ContentAsset,
  Report,
  Recommendation,
  ReportQA,
  QACheckResult,
  Lead,
} from "@prisma/client";

// ─── Enum types ─────────────────────────────────────────────
export type {
  UserRole,
  ScanRunStatus,
  ContentAssetType,
  ReportStatus,
  RecommendationCategory,
  RecommendationPriority,
  RecommendationStatus,
  QAStatus,
  QACheckOutcome,
} from "@prisma/client";

// ─── Prisma utility types ───────────────────────────────────
export { Prisma } from "@prisma/client";
