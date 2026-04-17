import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  withRetry,
  isTransientError,
  extractRetryAfterMs,
  computeBackoffMs,
} from "../llm-retry";

// ── Helpers ───────────────────────────────────────────────────

function makeHttpError(status: number, headers?: Record<string, string>): Error & { status: number; headers?: Record<string, string> } {
  const err = Object.assign(new Error(`HTTP ${status}`), { status, headers });
  return err;
}

function makeNodeError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/** No-op sleep that resolves immediately — use with fake timers or for speed. */
const noSleep = (_ms: number): Promise<void> => Promise.resolve();

/** Deterministic random returning 0 → no jitter, backoff = exact base value. */
const zeroRandom = () => 0.5; // (2 * 0.5 - 1) = 0 → zero jitter

// ── isTransientError ─────────────────────────────────────────

describe("isTransientError", () => {
  it("returns true for 429", () => {
    expect(isTransientError(makeHttpError(429))).toBe(true);
  });

  it("returns true for 503", () => {
    expect(isTransientError(makeHttpError(503))).toBe(true);
  });

  it("returns true for 500", () => {
    expect(isTransientError(makeHttpError(500))).toBe(true);
  });

  it("returns false for 400", () => {
    expect(isTransientError(makeHttpError(400))).toBe(false);
  });

  it("returns false for 401", () => {
    expect(isTransientError(makeHttpError(401))).toBe(false);
  });

  it("returns false for 403", () => {
    expect(isTransientError(makeHttpError(403))).toBe(false);
  });

  it("returns false for 404", () => {
    expect(isTransientError(makeHttpError(404))).toBe(false);
  });

  it("returns false for 422", () => {
    expect(isTransientError(makeHttpError(422))).toBe(false);
  });

  it("returns true for ECONNRESET node code", () => {
    expect(isTransientError(makeNodeError("ECONNRESET"))).toBe(true);
  });

  it("returns true for ETIMEDOUT node code", () => {
    expect(isTransientError(makeNodeError("ETIMEDOUT"))).toBe(true);
  });

  it("returns false for TypeError (code bug)", () => {
    expect(isTransientError(new TypeError("Cannot read property 'x' of null"))).toBe(false);
  });

  it("returns false for plain string", () => {
    expect(isTransientError("something went wrong")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTransientError(null)).toBe(false);
  });
});

// ── extractRetryAfterMs ───────────────────────────────────────

describe("extractRetryAfterMs", () => {
  it("parses integer seconds from retry-after header", () => {
    const err = makeHttpError(429, { "retry-after": "30" });
    expect(extractRetryAfterMs(err)).toBe(30_000);
  });

  it("parses float seconds", () => {
    const err = makeHttpError(429, { "retry-after": "1.5" });
    expect(extractRetryAfterMs(err)).toBe(1500);
  });

  it("returns null when no headers", () => {
    expect(extractRetryAfterMs(makeHttpError(429))).toBeNull();
  });

  it("returns null for non-object", () => {
    expect(extractRetryAfterMs("oops")).toBeNull();
  });

  it("returns null for unparseable header value", () => {
    const err = makeHttpError(429, { "retry-after": "not-a-number-or-date" });
    expect(extractRetryAfterMs(err)).toBeNull();
  });

  it("returns 0 for a past HTTP-date", () => {
    const pastDate = new Date(Date.now() - 5000).toUTCString();
    const err = makeHttpError(429, { "retry-after": pastDate });
    const result = extractRetryAfterMs(err);
    expect(result).toBe(0);
  });
});

// ── computeBackoffMs ─────────────────────────────────────────

describe("computeBackoffMs", () => {
  it("attempt 0: base 1000ms ± 200ms", () => {
    // Run 50 times and check all results are in range
    for (let i = 0; i < 50; i++) {
      const ms = computeBackoffMs(0);
      expect(ms).toBeGreaterThanOrEqual(800);
      expect(ms).toBeLessThanOrEqual(1200);
    }
  });

  it("attempt 1: base 2000ms ± 400ms", () => {
    for (let i = 0; i < 50; i++) {
      const ms = computeBackoffMs(1);
      expect(ms).toBeGreaterThanOrEqual(1600);
      expect(ms).toBeLessThanOrEqual(2400);
    }
  });

  it("attempt 2: base 4000ms ± 800ms", () => {
    for (let i = 0; i < 50; i++) {
      const ms = computeBackoffMs(2);
      expect(ms).toBeGreaterThanOrEqual(3200);
      expect(ms).toBeLessThanOrEqual(4800);
    }
  });
});

// ── withRetry ─────────────────────────────────────────────────

describe("withRetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns immediately on first-attempt success without calling sleep", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn, "[test]", { sleepFn });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeHttpError(429))
      .mockResolvedValueOnce("success");

    const result = await withRetry(fn, "[test]", { sleepFn, randomFn: zeroRandom });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    // Zero jitter with attempt 0: base = 1000ms, jitter factor with rand=0.5 → 0 → 1000ms
    expect(sleepFn).toHaveBeenCalledWith(1000);
  });

  it("retries on 429 with Retry-After header and uses that value instead of backoff", async () => {
    const sleepFn = vi.fn(noSleep);
    const rateLimitErr = makeHttpError(429, { "retry-after": "5" });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce("done");

    await withRetry(fn, "[test]", { sleepFn, randomFn: zeroRandom });

    expect(sleepFn).toHaveBeenCalledWith(5000); // 5 seconds from header
  });

  it("uses Retry-After when it is larger than computed backoff", async () => {
    const sleepFn = vi.fn(noSleep);
    // 60 seconds >> 1000ms base backoff
    const rateLimitErr = makeHttpError(429, { "retry-after": "60" });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce("done");

    await withRetry(fn, "[test]", { sleepFn });

    expect(sleepFn).toHaveBeenCalledWith(60_000);
  });

  it("does NOT retry on 400 — fails immediately", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi.fn().mockRejectedValue(makeHttpError(400));

    await expect(withRetry(fn, "[test]", { sleepFn })).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("does NOT retry on 401", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi.fn().mockRejectedValue(makeHttpError(401));

    await expect(withRetry(fn, "[test]", { sleepFn })).rejects.toMatchObject({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 422", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi.fn().mockRejectedValue(makeHttpError(422));

    await expect(withRetry(fn, "[test]", { sleepFn })).rejects.toMatchObject({ status: 422 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exhausts all retries (max 4 attempts) and throws the final error", async () => {
    const sleepFn = vi.fn(noSleep);
    const err = makeHttpError(429);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(
      withRetry(fn, "[test]", { maxRetries: 3, sleepFn, randomFn: zeroRandom }),
    ).rejects.toMatchObject({ status: 429 });

    // 1 initial + 3 retries = 4 total attempts
    expect(fn).toHaveBeenCalledTimes(4);
    // 3 sleeps between attempts
    expect(sleepFn).toHaveBeenCalledTimes(3);
  });

  it("exponential backoff doubles each retry (no jitter)", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeHttpError(503))
      .mockRejectedValueOnce(makeHttpError(503))
      .mockRejectedValueOnce(makeHttpError(503))
      .mockResolvedValueOnce("finally");

    await withRetry(fn, "[test]", { sleepFn, randomFn: zeroRandom });

    const delays = sleepFn.mock.calls.map((c) => c[0]);
    // attempt 0 → 1000ms, attempt 1 → 2000ms, attempt 2 → 4000ms
    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it("retries on ECONNRESET network error", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNodeError("ECONNRESET"))
      .mockResolvedValueOnce("recovered");

    const result = await withRetry(fn, "[test]", { sleepFn, randomFn: zeroRandom });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on ETIMEDOUT network error", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNodeError("ETIMEDOUT"))
      .mockResolvedValueOnce("ok");

    await withRetry(fn, "[test]", { sleepFn, randomFn: zeroRandom });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("scan continues after all retries exhausted (caller catches error)", async () => {
    // Simulates the scan-worker behavior: executeQuery throws, Promise.allSettled
    // catches it and continues — we verify withRetry surfaces the error cleanly.
    const sleepFn = vi.fn(noSleep);
    const fn = vi.fn().mockRejectedValue(makeHttpError(429));

    const results = await Promise.allSettled([
      withRetry(fn, "[slot-1]", { maxRetries: 3, sleepFn, randomFn: zeroRandom }),
      Promise.resolve("slot-2-ok"),
    ]);

    expect(results[0]!.status).toBe("rejected");
    expect(results[1]!.status).toBe("fulfilled");
    if (results[1]!.status === "fulfilled") {
      expect(results[1]!.value).toBe("slot-2-ok");
    }
  });

  it("500 server error is retried", async () => {
    const sleepFn = vi.fn(noSleep);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeHttpError(500))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, "[test]", { sleepFn, randomFn: zeroRandom });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
