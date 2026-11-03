import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

function resolveDatabaseUrl(): string | undefined {
  // If a remote cloud database URL is provided (Postgres, Turso, Supabase, etc.)
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return process.env.DATABASE_URL;
  }

  // Vercel Serverless environment: local root filesystem is strictly read-only
  // SQLite must be copied to writable /tmp directory to avoid "Error code 14: Unable to open the database file"
  if (process.env.VERCEL) {
    const tmpDbPath = path.join("/tmp", "wellness.db");

    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), "prisma", "wellness.db"),
        path.join(__dirname, "..", "..", "prisma", "wellness.db"),
        path.join(__dirname, "prisma", "wellness.db"),
        path.resolve("./prisma/wellness.db"),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDbPath);
            fs.chmodSync(tmpDbPath, 0o666);
            break;
          } catch {
            // continue checking other candidates
          }
        }
      }
    }

    return `file:${tmpDbPath}`;
  }

  return process.env.DATABASE_URL || "file:./wellness.db";
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Optimize SQLite Concurrency (WAL Mode + 5-second Busy Timeout) to prevent SQLITE_BUSY locks
if (!dbUrl || dbUrl.startsWith("file:")) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;").catch(() => {});
}
