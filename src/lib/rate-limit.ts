/**
 * In-memory sliding window rate limiter for API routes.
 * NOTE: This is per-process only — not shared across multiple
 * Next.js server instances. Suitable for moderate traffic;
 * replace with Redis if horizontal scaling is needed.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check whether `key` is within the allowed `limit` per `windowMs`.
 * Returns `true` if the request is allowed, `false` if rate-limited.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (entry === undefined || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
