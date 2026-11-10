import { PrismaClient } from "@prisma/client";

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
