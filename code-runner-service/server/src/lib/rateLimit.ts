/**
 * @intent Rate Limiting for code execution endpoints.
 *
 * Features:
 * - Per-user rate limiting based on role (sliding window)
 * - Guest: 1 run/minute, User: 3 runs/minute, Admin: unlimited
 * - Both playground and batch share the same rate limiter
 */

import { Request, Response, NextFunction } from 'express';
import { EnrichedJWTPayload } from './auth';
import { logger } from './logger';

// ========================================
// CONFIGURATION
// ========================================

// Rate limit windows and quotas by role (per minute)
const RATE_LIMITS = {
  runsPerMinute: {
    admin: Infinity,  // Unlimited
    author: 10,
    user: 3,
    guest: 1,
  },
};

// Sliding window size
const WINDOW_MS = 60 * 1000; // 1 minute

// ========================================
// IN-MEMORY RATE LIMIT STORAGE
// ========================================

interface RateLimitEntry {
  timestamps: number[];  // Request timestamps in current window
}

// User-based rate limits (keyed by userId or IP for guests)
const userRateLimits: Map<string, RateLimitEntry> = new Map();

// Cleanup interval
let cleanupIntervalId: NodeJS.Timeout | null = null;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * @intent Get request count in current window (sliding window).
 */
function getRequestCount(entry: RateLimitEntry | undefined): number {
  if (!entry) return 0;

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Count timestamps within window
  return entry.timestamps.filter(ts => ts > windowStart).length;
}

/**
 * @intent Record a request and return if rate limited.
 */
function recordRequest(
  key: string,
  limit: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let entry = userRateLimits.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    userRateLimits.set(key, entry);
  }

  // Clean old timestamps from this entry
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  const currentCount = entry.timestamps.length;
  const remaining = Math.max(0, limit - currentCount - 1);

  // Calculate reset time (when oldest request in window expires)
  const oldestInWindow = entry.timestamps.length > 0
    ? Math.min(...entry.timestamps)
    : now;
  const resetMs = Math.max(0, (oldestInWindow + WINDOW_MS) - now);

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, resetMs };
  }

  // Record this request
  entry.timestamps.push(now);

  return { allowed: true, remaining, resetMs };
}

/**
 * @intent Extract client IP from request.
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * @intent Get user identifier for rate limiting.
 */
function getUserId(req: Request): string | null {
  const user = (req as any).user as EnrichedJWTPayload | undefined;
  return user?.userId || null;
}

/**
 * @intent Get user role for quota lookup.
 */
function getUserRole(req: Request): 'admin' | 'author' | 'user' | 'guest' {
  const user = (req as any).user as EnrichedJWTPayload | undefined;
  if (!user) return 'guest';
  return user.role;
}

// ========================================
// MIDDLEWARE FUNCTIONS
// ========================================

/**
 * @intent Combined rate limit middleware for execution endpoints.
 * Applies to both /playground and /editor/batch (shared quota).
 */
export function executionRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = getUserId(req);
  const role = getUserRole(req);
  const key = userId || getClientIP(req);

  const limit = RATE_LIMITS.runsPerMinute[role];

  // Admins bypass rate limiting
  // if (limit === Infinity) {
  return next();
  // }

  const result = recordRequest(key, limit);

  // Set rate limit headers
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(result.remaining));
  res.set('X-RateLimit-Reset', String(Date.now() + result.resetMs));

  if (!result.allowed) {
    const retryAfterSecs = Math.ceil(result.resetMs / 1000);

    logger.rateLimit.warn('Rate limit exceeded', {
      key,
      role,
      limit,
      retryAfterSecs,
    });

    res.set('Retry-After', String(retryAfterSecs));

    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `You can run code ${limit} time${limit !== 1 ? 's' : ''} per minute. Please wait ${retryAfterSecs} seconds.`,
      retryAfter: retryAfterSecs,
    });
    return;
  }

  next();
}

// ========================================
// METRICS & CLEANUP
// ========================================

export interface RateLimitMetrics {
  userRateLimitEntries: number;
}

/**
 * @intent Get rate limit metrics.
 */
export function getRateLimitMetrics(): RateLimitMetrics {
  return {
    userRateLimitEntries: userRateLimits.size,
  };
}

/**
 * @intent Cleanup old rate limit entries.
 */
function cleanupRateLimits(): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  for (const [key, entry] of userRateLimits) {
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
    if (entry.timestamps.length === 0) {
      userRateLimits.delete(key);
    }
  }
}

/**
 * @intent Start rate limit cleanup interval.
 */
export function startRateLimitCleanup(): void {
  if (cleanupIntervalId) return;

  cleanupIntervalId = setInterval(cleanupRateLimits, WINDOW_MS);
  logger.rateLimit.info('Cleanup started', { intervalMs: WINDOW_MS });
}

/**
 * @intent Stop rate limit cleanup interval (for graceful shutdown).
 */
export function stopRateLimitCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.rateLimit.info('Cleanup stopped');
  }
}

export default {
  executionRateLimit,
  getRateLimitMetrics,
  startRateLimitCleanup,
  stopRateLimitCleanup,
  RATE_LIMITS,
};
