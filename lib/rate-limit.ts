type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function hitRateLimit(key: string, config: RateLimitConfig) {
  const now = Date.now();
  pruneExpiredEntries(now);

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, nextEntry);
    return {
      allowed: true,
      remaining: Math.max(0, config.maxAttempts - nextEntry.count),
      retryAfterMs: config.windowMs,
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    allowed: current.count <= config.maxAttempts,
    remaining: Math.max(0, config.maxAttempts - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}

export function toRateLimitResponse(retryAfterMs: number) {
  return {
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}

export function resetRateLimitStoreForTests() {
  rateLimitStore.clear();
}
