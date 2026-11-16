/**
 * Bounded in-memory sliding-window rate limiter for sensitive endpoints
 * (Sign-In, Password Reset, Registration, Uploads, Cron/Notification ticks).
 * Caps total tracked keys to prevent unbounded memory growth under spray attacks.
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
