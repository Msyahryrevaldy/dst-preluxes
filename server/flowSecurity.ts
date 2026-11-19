import crypto from 'node:crypto';

export function verifyBearerTokenConstantTime(
  authHeader: string | undefined,
  expectedSecret: string | undefined
): boolean {
  if (!expectedSecret || !expectedSecret.trim()) {
    return false;
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const provided = authHeader.slice('Bearer '.length).trim();
  if (!provided) {
    return false;
  }
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expectedSecret.trim(), 'utf8');
  if (a.length !== b.length) {
    // Perform a dummy comparison of equal length to avoid early-exit timing leak
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function isValidFlowProjectId(
  providedProjectId: unknown,
  expectedProjectId: string
): boolean {
  if (typeof providedProjectId !== 'string') return false;
  return providedProjectId.trim() === expectedProjectId.trim();
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 60, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): { allowed: boolean; remaining: number; resetMs: number } {
    const cutoff = now - this.windowMs;
    const prev = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);
    if (prev.length >= this.maxRequests) {
      const oldest = prev[0] ?? now;
      this.hits.set(key, prev);
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, oldest + this.windowMs - now),
      };
    }
    prev.push(now);
    this.hits.set(key, prev);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - prev.length),
      resetMs: this.windowMs,
    };
  }
}
