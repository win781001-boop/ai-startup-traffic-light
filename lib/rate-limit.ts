// --- Rate limiter: dual-backend (Upstash Redis REST + memory fallback) ---
//
// Backend is selected at module load time based on env vars:
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  -> Upstash REST
//   otherwise                                              -> in-memory Map
//
// If the Upstash backend fails at runtime, it falls back to the in-memory
// limiter for that request so that a transient Redis outage does not take
// down the whole endpoint.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

// --- Backend detection (module-level, runs once on first import) ---

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const useUpstash = UPSTASH_URL.length > 0 && UPSTASH_TOKEN.length > 0;

// --- Memory backend ---

interface RateLimitEntry {
  timestamps: number[];
}

const memStore = new Map<string, RateLimitEntry>();

// Periodically sweep expired entries to avoid unbounded memory growth.
const SWEEP_MS = 5 * 60 * 1000;
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < SWEEP_MS * 2);
    if (entry.timestamps.length === 0) memStore.delete(key);
  }
}, SWEEP_MS);
if (sweepTimer.unref) sweepTimer.unref();

export function checkRateLimitMemory(
  key: string,
  maxReqs: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let entry = memStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memStore.set(key, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  const count = entry.timestamps.length;
  const allowed = count < maxReqs;

  if (allowed) {
    entry.timestamps.push(now);
  }

  const retryAfter = allowed
    ? 0
    : Math.max(1, Math.ceil((entry.timestamps[0] + windowMs - now) / 1000));

  return {
    allowed,
    remaining: Math.max(0, maxReqs - count - (allowed ? 1 : 0)),
    retryAfter,
  };
}

// --- Upstash Redis REST backend ---

const RATELIMIT_PREFIX = "ratelimit:";

/**
 * Execute one or more Redis commands via the Upstash REST API.
 * Returns an array of result values (plain values, not the wrapper objects).
 */
export async function upstashExec(
  commands: string[][],
): Promise<unknown[]> {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + UPSTASH_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands.length === 1 ? commands[0] : commands),
  });

  if (!res.ok) {
    throw new Error("Upstash responded " + res.status);
  }

  const data: unknown = await res.json();

  // Normalise response to always return an array of plain values.
  // Upstash REST API v2 wraps each element in { result, error }.
  // v1 returns a flat array of values.
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (item !== null && typeof item === "object" && "result" in item) {
        return (item as Record<string, unknown>).result;
      }
      return item;
    });
  }

  // Single command response (not wrapped in array)
  if (data !== null && typeof data === "object" && "result" in data) {
    return [(data as Record<string, unknown>).result];
  }

  return [data];
}

export async function checkRateLimitUpstash(
  key: string,
  maxReqs: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = RATELIMIT_PREFIX + key;
  const minScore = nowSec - windowSec;

  // Step 1: remove expired entries + get current count
  const results = await upstashExec([
    ["ZREMRANGEBYSCORE", redisKey, "0", String(minScore)],
    ["ZCARD", redisKey],
  ]);

  const count = typeof results[1] === "number" ? results[1] : 0;
  const allowed = count < maxReqs;

  if (allowed) {
    // Step 2: record this request + set TTL
    const member = nowMs + ":" + Math.random().toString(36).slice(2, 8);
    await upstashExec([
      ["ZADD", redisKey, String(nowSec), member],
      ["EXPIRE", redisKey, String(windowSec + 60)],
    ]);
  }

  // Retry-After: approximate seconds until window resets
  const retryAfter = allowed
    ? 0
    : Math.max(1, windowSec + 1);

  return {
    allowed,
    remaining: Math.max(0, maxReqs - count - (allowed ? 1 : 0)),
    retryAfter,
  };
}

// --- Public API ---

/**
 * Check whether a key (typically an IP) has exceeded the rate limit.
 *
 * Automatically uses Upstash Redis REST when env vars are configured,
 * otherwise falls back to an in-memory store. If the Upstash backend
 * fails, it falls back to memory for that request.
 *
 * @param key       Unique identifier (e.g. client IP)
 * @param maxReqs   Maximum requests allowed within the window
 * @param windowMs  Window duration in milliseconds
 */
export async function checkRateLimit(
  key: string,
  maxReqs: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (useUpstash) {
    try {
      return await checkRateLimitUpstash(key, maxReqs, windowMs);
    } catch (err) {
      console.warn("[rate-limit] Upstash error, falling back to memory:", err instanceof Error ? err.message : err);
      // fall through to memory
    }
  }
  return checkRateLimitMemory(key, maxReqs, windowMs);
}

// --- Test helpers (exported for unit-test use only) ---
// Exported for unit-test use only - resets the memory store between tests.

// --- Daily counter (for Public Beta daily analysis limits + similar use cases) ---
// Dual-backend: Upstash Redis REST or in-memory Map with TTL.
// Used before beta auto-create payment to cap daily global and per-IP usage.

interface DailyCounterEntry {
  value: number;
  expiresAt: number;
}
const dailyCounterMemStore = new Map<string, DailyCounterEntry>();

/**
 * Check and increment a daily counter.
 *
 * Returns { allowed: boolean, remaining: number }.
 * - allowed=true: under limit, counter has been incremented; caller should proceed.
 * - allowed=false: at or over limit, counter NOT incremented; caller should reject.
 *
 * TTL: 48 hours (172800s) so the counter survives a full day gap.
 * Upstash pattern: GET to check, INCR+EXPIRE to increment (not atomic at the
 * check-vs-increment boundary, matching existing Tavily budget pattern).
 * Memory pattern: in-memory Map with expiry, local to each serverless instance.
 *
 * When limit <= 0 the counter is effectively disabled (always returns allowed).
 */
export async function checkDailyCounter(
  key: string,
  limit: number,
  ttlSeconds: number = 172800
): Promise<{ allowed: boolean; remaining: number }> {
  if (limit <= 0) return { allowed: true, remaining: Infinity };

  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const useUpstash = UPSTASH_URL.length > 0 && UPSTASH_TOKEN.length > 0;

  if (useUpstash) {
    try {
      const results = await upstashExec([["GET", key]]);
      const current = typeof results[0] === "string" ? parseInt(results[0], 10) : 0;
      if (current >= limit) {
        return { allowed: false, remaining: 0 };
      }
      await upstashExec([
        ["INCR", key],
        ["EXPIRE", key, String(ttlSeconds)],
      ]);
      return { allowed: true, remaining: Math.max(0, limit - current - 1) };
    } catch (err) {
      console.warn("[daily-counter] Upstash error, falling back to memory:", err instanceof Error ? err.message : err);
    }
  }

  // Memory fallback
  const now = Date.now();
  let entry = dailyCounterMemStore.get(key);
  if (!entry || now >= entry.expiresAt) {
    entry = { value: 0, expiresAt: now + ttlSeconds * 1000 };
    dailyCounterMemStore.set(key, entry);
  }
  if (entry.value >= limit) {
    return { allowed: false, remaining: 0 };
  }
  entry.value++;
  return { allowed: true, remaining: Math.max(0, limit - entry.value) };
}

/** Reset the daily counter memory store (unit-test use only). */
export function _resetDailyCounterStore(): void {
  dailyCounterMemStore.clear();
}

// Exported for unit-test use only - resets the memory store between tests.
export function _resetMemoryStore(): void {
  memStore.clear();
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
