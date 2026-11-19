import { NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { reportServerError } from "@/wellness/observability";

export const dynamic = "force-dynamic";

const DB_HEALTH_TIMEOUT_MS = 3000;

/**
 * GET /api/health
 * Readiness & liveness probe for load balancers, uptime monitors, and deployment health checks.
 * Never leaks connection strings or stack traces.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB_TIMEOUT")), DB_HEALTH_TIMEOUT_MS)
      ),
    ]);

    return NextResponse.json(
      {
        status: "ok",
        db: "up",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (err) {
    reportServerError("health", "db_health_check", err, { latencyMs: Date.now() - startedAt });
    return NextResponse.json(
      {
        status: "degraded",
        db: "down",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
