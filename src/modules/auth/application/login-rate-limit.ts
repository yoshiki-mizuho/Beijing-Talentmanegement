const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 10 * 60 * 1000;

type LoginAttemptState = {
  count: number;
  firstFailedAt: number;
  lockedUntil: number | null;
};

const attemptsByKey = new Map<string, LoginAttemptState>();

export type LoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function buildLoginRateLimitKey(ipAddress: string, email: string) {
  return `${ipAddress.trim() || "unknown"}:${email.trim().toLowerCase()}`;
}

export function checkLoginRateLimit(
  key: string,
  now = Date.now()
): LoginRateLimitResult {
  const attempt = attemptsByKey.get(key);

  if (!attempt) {
    return { allowed: true };
  }

  if (attempt.lockedUntil && attempt.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((attempt.lockedUntil - now) / 1000)
    };
  }

  if (now - attempt.firstFailedAt > WINDOW_MS) {
    attemptsByKey.delete(key);
  }

  return { allowed: true };
}

export function recordLoginFailure(key: string, now = Date.now()) {
  const current = attemptsByKey.get(key);

  if (!current || now - current.firstFailedAt > WINDOW_MS) {
    attemptsByKey.set(key, {
      count: 1,
      firstFailedAt: now,
      lockedUntil: null
    });
    return;
  }

  const count = current.count + 1;

  attemptsByKey.set(key, {
    count,
    firstFailedAt: current.firstFailedAt,
    lockedUntil: count >= MAX_FAILED_ATTEMPTS ? now + LOCK_MS : null
  });
}

export function resetLoginFailures(key: string) {
  attemptsByKey.delete(key);
}

export function resetAllLoginRateLimitStateForTest() {
  attemptsByKey.clear();
}
