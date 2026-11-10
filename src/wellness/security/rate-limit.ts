/**
 * Zero-dependency in-memory sliding-window rate limiter for sensitive endpoints
 * (Sign-In, Password Reset, Registration, Cron/Notification ticks).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((entry: RateLimitEntry, key: string) => {
      entry.timestamps = entry.timestamps.filter((t: number) => now - t < 15 * 60 * 1000);
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
  const entry = rateLimitStore.get(identifier) || { timestamps: [] };

  // Filter timestamps within the current sliding window
  entry.timestamps = entry.timestamps.filter((t: number) => now - t < options.windowMs);

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
