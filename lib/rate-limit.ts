// --- In-memory rate limiter ---
// Simple per-IP sliding-window counter. No Redis / external store.
// Used by create-payment and submit-analysis routes.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodically sweep expired entries to avoid unbounded memory growth.
const SWEEP_MS = 5 * 60 * 1000;
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < SWEEP_MS * 2);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, SWEEP_MS);
if (sweepTimer.unref) sweepTimer.unref();

/**
 * Check whether key (typically an IP) has exceeded the rate limit.
 *
 * @param key       Unique identifier (e.g. client IP)
 * @param maxReqs   Maximum requests allowed within the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxReqs: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  const count = entry.timestamps.length;
  const allowed = count < maxReqs;

  if (allowed) {
    entry.timestamps.push(now);
  }

  // Retry-After: seconds until the oldest timestamp slides out of the window
  const retryAfter = allowed
    ? 0
    : Math.max(1, Math.ceil((entry.timestamps[0] + windowMs - now) / 1000));

  return {
    allowed,
    remaining: Math.max(0, maxReqs - count - (allowed ? 1 : 0)),
    retryAfter,
  };
}

/**
 * Extract the most useful client-ip identifier from a Request.
 * Checks x-forwarded-for first, then x-real-ip, then falls back to "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}
