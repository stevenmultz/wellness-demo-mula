import { PrismaClient, type Prisma } from "@prisma/client";

function resolveDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

const dbUrl = resolveDatabaseUrl();

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
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
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
