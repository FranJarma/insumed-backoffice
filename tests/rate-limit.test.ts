import test from "node:test";
import assert from "node:assert/strict";
import { hitRateLimit, resetRateLimitStoreForTests } from "@/lib/rate-limit";

test("hitRateLimit blocks after max attempts inside the same window", () => {
  resetRateLimitStoreForTests();

  const first = hitRateLimit("login:test", { maxAttempts: 2, windowMs: 60_000 });
  const second = hitRateLimit("login:test", { maxAttempts: 2, windowMs: 60_000 });
  const third = hitRateLimit("login:test", { maxAttempts: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test("hitRateLimit keeps counters isolated by key", () => {
  resetRateLimitStoreForTests();

  const a = hitRateLimit("upload:user-a", { maxAttempts: 1, windowMs: 60_000 });
  const b = hitRateLimit("upload:user-b", { maxAttempts: 1, windowMs: 60_000 });
  const aSecond = hitRateLimit("upload:user-a", { maxAttempts: 1, windowMs: 60_000 });

  assert.equal(a.allowed, true);
  assert.equal(b.allowed, true);
  assert.equal(aSecond.allowed, false);
});
