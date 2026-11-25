import { PrismaClient, type Prisma } from "@prisma/client";
import { getDatabaseUrl, isDevelopmentEnv } from "./config";

/**
 * Ensures PgBouncer-backed serverless URLs do not deadlock on `Promise.all`
 * queries when `connection_limit=1` is set in env.
 */
function normalizePoolUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const parsed = new URL(rawUrl);
    const isPgBouncer = parsed.searchParams.get("pgbouncer") === "true";
    const limit = Number.parseInt(parsed.searchParams.get("connection_limit") || "", 10);
    if (isPgBouncer && (!Number.isFinite(limit) || limit < 5)) {
      parsed.searchParams.set("connection_limit", "5");
      if (!parsed.searchParams.has("pool_timeout")) {
        parsed.searchParams.set("pool_timeout", "20");
      }
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

const dbUrl = normalizePoolUrl(getDatabaseUrl());

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl
      ? {
          db: {
            url: dbUrl,
          },
        }
      : undefined,
    log: isDevelopmentEnv() ? ["warn", "error"] : ["error"],
  });

// Always reuse client instance in serverless environments to prevent connection exhaustion
globalForPrisma.prisma = prisma;

/**
 * Serializes quota checks per program: concurrent enroll/approve/confirm transactions queue on
 * this row lock, so a count-then-write sequence cannot oversell a cohort (default READ COMMITTED
 * isolation does not prevent that on its own). Must be called first inside a transaction.
 */
export async function lockProgramRow(
  tx: Prisma.TransactionClient,
  programId: string
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM programs WHERE id = ${programId} FOR UPDATE`;
}

/**
 * Serializes entitlement & tracking-pass updates per user so concurrent grants/revocations
 * never compute stale `trackingAccessUntil` values.
 *
 * DEADLOCK PREVENTION RULE:
 * Whenever a transaction locks BOTH a program row and a user row, ALWAYS call
 * `lockProgramRow(tx, programId)` BEFORE `lockUserRow(tx, userId)`.
 */
export async function lockUserRow(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
}
