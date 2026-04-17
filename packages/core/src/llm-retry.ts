/**
 * Exponential backoff retry helper for LLM provider calls.
 *
 * Handles transient HTTP errors (429, 500, 503) and network failures.
 * Respects the `Retry-After` header when the provider sends one.
 * Permanent errors (400, 401, 403, 404, 422) are never retried.
 *
 * Pure module — no SDK dependencies. Testable with fake timers.
 */

// ── Constants ─────────────────────────────────────────────────

const MAX_RETRIES = 3; // max 4 total attempts (attempt 0 + 3 retries)
const BASE_DELAY_MS = 1000;
const JITTER_FACTOR = 0.2; // ±20%

// ── Error classification ──────────────────────────────────────

/**
 * HTTP status codes that should trigger a retry.
 * 429 = rate limit, 500 = server error (usually transient for OpenAI),
 * 503 = service unavailable.
 */
const TRANSIENT_STATUS_CODES = new Set([429, 500, 503]);

/**
 * Node.js error codes that indicate a transient network condition.
 */
const TRANSIENT_NODE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNABORTED",
  "ENOTFOUND", // DNS hiccup
  "ECONNREFUSED",
  "ERR_NETWORK",
]);

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
  headers?: Record<string, string | string[] | undefined>;
  error?: {
    headers?: Record<string, string | string[] | undefined>;
  };
}

function extractStatus(err: unknown): number | null {
  if (err == null || typeof err !== "object") return null;
  const e = err as HttpLikeError;
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  return null;
}

function extractNodeCode(err: unknown): string | null {
  if (err == null || typeof err !== "object") return null;
  const e = err as HttpLikeError;
  if (typeof e.code === "string") return e.code;
  return null;
}

/**
 * Returns true if the error is transient and the call should be retried.
 */
export function isTransientError(err: unknown): boolean {
  const status = extractStatus(err);
  if (status !== null) {
    return TRANSIENT_STATUS_CODES.has(status);
  }

  // Network-level errors have no HTTP status; classify by Node code or message.
  const code = extractNodeCode(err);
  if (code !== null && TRANSIENT_NODE_CODES.has(code)) return true;

  if (err instanceof Error) {
    const msg = err.message.toUpperCase();
    if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("TIMEOUT")) {
      return true;
    }
  }

  return false;
}

// ── Retry-After header extraction ─────────────────────────────

/**
 * Extract the `Retry-After` value from an error's response headers.
 * Returns milliseconds, or null if the header is absent / unparseable.
 *
 * Supports both integer (seconds) and HTTP-date formats.
 */
export function extractRetryAfterMs(err: unknown): number | null {
  if (err == null || typeof err !== "object") return null;
  const e = err as HttpLikeError;

  // OpenAI SDK surfaces headers on the error object directly.
  // Anthropic SDK also exposes headers on the error. Check both locations.
  const headers: Record<string, string | string[] | undefined> | undefined =
    e.headers ?? e.error?.headers;

  if (!headers) return null;

  // Header names may be lower-cased depending on the SDK.
  const raw =
    headers["retry-after"] ??
    headers["Retry-After"] ??
    headers["x-ratelimit-reset-requests"] ??
    undefined;

  if (raw === undefined) return null;

  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;

  // Integer: number of seconds to wait.
  const seconds = Number(value);
  if (!isNaN(seconds) && isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  // HTTP-date format: "Wed, 21 Oct 2025 07:28:00 GMT"
  const date = Date.parse(value);
  if (!isNaN(date)) {
    const waitMs = date - Date.now();
    return waitMs > 0 ? waitMs : 0;
  }

  return null;
}

// ── Backoff computation ───────────────────────────────────────

/**
 * Compute the delay in ms for a given retry attempt (0-indexed).
 * Doubles from BASE_DELAY_MS with ±JITTER_FACTOR randomness.
 *
 * attempt 0 → 800–1200 ms
 * attempt 1 → 1600–2400 ms
 * attempt 2 → 3200–4800 ms
 */
export function computeBackoffMs(attempt: number): number {
  const base = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = base * JITTER_FACTOR * (2 * Math.random() - 1); // ±20%
  return Math.round(base + jitter);
}

// ── sleep ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Public API ────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number;
  /** Override for testing — replace Math.random for deterministic jitter. */
  randomFn?: () => number;
  /** Override for testing — replace setTimeout. */
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Wrap an async LLM call with exponential backoff retry on transient errors.
 *
 * Only the `fn` call is retried — not any surrounding DB writes or transforms.
 * Permanent errors (4xx other than 429) propagate immediately without retry.
 *
 * @param fn        The async function to call (usually the raw provider API call).
 * @param label     Short label for log messages (e.g. "[openai]").
 * @param options   Optional overrides for maxRetries, jitter, and sleep (for tests).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const sleepFn = options?.sleepFn ?? sleep;
  const randomFn = options?.randomFn;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Permanent error or last attempt — give up immediately.
      if (!isTransientError(err) || attempt === maxRetries) {
        throw err;
      }

      // Compute delay: prefer Retry-After header, fall back to exponential backoff.
      const retryAfterMs = extractRetryAfterMs(err);
      let delayMs: number;

      if (retryAfterMs !== null && retryAfterMs > 0) {
        delayMs = retryAfterMs;
      } else {
        const base = BASE_DELAY_MS * Math.pow(2, attempt);
        const rand = randomFn !== undefined ? randomFn() : Math.random();
        const jitter = base * JITTER_FACTOR * (2 * rand - 1);
        delayMs = Math.round(base + jitter);
      }

      console.log(
        `  ${label} Transient error (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs}ms...`,
      );

      await sleepFn(delayMs);
    }
  }

  // Should be unreachable — the loop always either returns or throws.
  throw lastError;
}
