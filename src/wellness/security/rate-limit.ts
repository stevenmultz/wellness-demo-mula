import { prisma } from "../db";

/**
 * Bounded in-memory sliding-window rate limiter + PostgreSQL distributed fixed-window limiter
 * for multi-instance serverless endpoints (Sign-In, Password Reset, Registration, Uploads, Webhooks).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const MAX_RATE_LIMIT_KEYS = 10_000;
const STALE_WINDOW_MS = 15 * 60 * 1000;

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((entry: RateLimitEntry, key: string) => {
      entry.timestamps = entry.timestamps.filter((t: number) => now - t < STALE_WINDOW_MS);
      if (entry.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  windowMs: number; // e.g. 60_000 for 1 minute
  maxRequests: number; // e.g. 5 attempts per window
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  // Evict oldest entry when capacity is reached to keep memory strictly bounded
  if (!existing && rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) {
    const oldestKey = rateLimitStore.keys().next().value;
    if (oldestKey !== undefined) {
      rateLimitStore.delete(oldestKey);
    }
  }

  const entry = existing || { timestamps: [] };

  // Filter timestamps within the current sliding window
  entry.timestamps = entry.timestamps.filter((t: number) => now - t < options.windowMs);

  // Re-insert so Map iteration order approximates LRU
  if (existing) {
    rateLimitStore.delete(identifier);
  }

  if (entry.timestamps.length >= options.maxRequests) {
    const oldest = entry.timestamps[0];
    const resetMs = Math.max(0, options.windowMs - (now - oldest));
    rateLimitStore.set(identifier, entry);
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: options.maxRequests - entry.timestamps.length,
    resetMs: options.windowMs,
  };
}

/** Clear a rate-limit bucket (e.g. per-account credential counter after successful sign-in). */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/** Exposed for unit testing of capacity bounds. */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Distributed PostgreSQL rate limiter safe across Vercel serverless isolates.
 * Falls back to in-memory `checkRateLimit` if the database is unreachable in offline tests.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const now = new Date();
  const windowExpiresAt = new Date(now.getTime() + options.windowMs);

  try {
    const rows = await prisma.$queryRaw<Array<{ hits: number; expires_at: Date }>>`
      INSERT INTO "rate_limit_buckets" ("key", "hits", "window_start_at", "expires_at")
      VALUES (${identifier}, 1, ${now}, ${windowExpiresAt})
      ON CONFLICT ("key") DO UPDATE
      SET
        "hits" = CASE
          WHEN "rate_limit_buckets"."expires_at" <= ${now} THEN 1
          ELSE "rate_limit_buckets"."hits" + 1
        END,
        "window_start_at" = CASE
          WHEN "rate_limit_buckets"."expires_at" <= ${now} THEN ${now}
          ELSE "rate_limit_buckets"."window_start_at"
        END,
        "expires_at" = CASE
          WHEN "rate_limit_buckets"."expires_at" <= ${now} THEN ${windowExpiresAt}
          ELSE "rate_limit_buckets"."expires_at"
        END
      RETURNING "hits", "expires_at"
    `;

    const row = rows[0];
    if (!row) {
      return checkRateLimit(identifier, options);
    }

    const resetMs = Math.max(0, new Date(row.expires_at).getTime() - now.getTime());
    if (row.hits > options.maxRequests) {
      return { allowed: false, remaining: 0, resetMs };
    }
    return {
      allowed: true,
      remaining: Math.max(0, options.maxRequests - row.hits),
      resetMs,
    };
  } catch {
    return checkRateLimit(identifier, options);
  }
}

export async function resetDistributedRateLimit(identifier: string): Promise<void> {
  resetRateLimit(identifier);
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { key: identifier } });
  } catch {
    // Non-critical cleanup
  }
}
