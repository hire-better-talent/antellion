import { PrismaClient } from "@prisma/client";

export type { PrismaClient } from "@prisma/client";

export interface PrismaClientOptions {
  logQueries?: boolean;
}

/**
 * Create a new PrismaClient instance. Useful for workers, scripts,
 * and tests that need isolated connections.
 */
export function createPrismaClient(
  opts: PrismaClientOptions = {},
): PrismaClient {
  return new PrismaClient({
    log: opts.logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

// ─── Global singleton (safe for Next.js HMR) ───────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient({
    logQueries: process.env.NODE_ENV === "development",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
