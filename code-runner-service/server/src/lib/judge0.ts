/**
 * @intent Judge0 Service for code execution.
 *
 * Features:
 * - Circuit breaker pattern to protect against Judge0 failures
 * - Connection pooling with keep-alive
 * - Concurrency limiter (semaphore pattern)
 * - Synchronous wait mode for immediate results
 */

import fetch from "node-fetch";
import { Agent as HttpAgent } from "http";
import { ENV } from "../config/env";
import { logger } from "./logger";

// ========================================
// TYPES
// ========================================

export interface Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

export interface SubmissionResult {
  token?: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
}

// ========================================
// CIRCUIT BREAKER
// ========================================

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  openDurationMs: number;
  halfOpenMaxRequests: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  openDurationMs: 30000,
  halfOpenMaxRequests: 2,
};

/**
 * @intent Circuit breaker to protect against Judge0 failures.
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private openedAt: number | null = null;
  private halfOpenRequestsInFlight: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  canProceed(): { allowed: boolean; reason?: string } {
    switch (this.state) {
      case CircuitState.CLOSED:
        return { allowed: true };

      case CircuitState.OPEN:
        const now = Date.now();
        if (this.openedAt && (now - this.openedAt) >= this.config.openDurationMs) {
          this.transitionTo(CircuitState.HALF_OPEN);
          logger.judge0.info('Circuit transitioning to HALF_OPEN', { cooldownMs: this.config.openDurationMs });
        } else {
          const remainingMs = this.openedAt
            ? this.config.openDurationMs - (now - this.openedAt)
            : this.config.openDurationMs;
          return {
            allowed: false,
            reason: `Circuit OPEN - Judge0 unavailable. Retry in ${Math.ceil(remainingMs / 1000)}s`,
          };
        }
      // Fall through to HALF_OPEN

      case CircuitState.HALF_OPEN:
        if (this.halfOpenRequestsInFlight >= this.config.halfOpenMaxRequests) {
          return {
            allowed: false,
            reason: `Circuit HALF_OPEN - testing recovery`,
          };
        }
        this.halfOpenRequestsInFlight++;
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequestsInFlight = Math.max(0, this.halfOpenRequestsInFlight - 1);

      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        logger.judge0.info('Circuit recovery confirmed - closing');
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  recordFailure(reason: string): void {
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequestsInFlight = Math.max(0, this.halfOpenRequestsInFlight - 1);
      logger.judge0.warn('Failure during HALF_OPEN - re-opening circuit', { reason });
      this.tripCircuit(reason);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.consecutiveFailures >= this.config.failureThreshold) {
        logger.judge0.error('Failure threshold exceeded - opening circuit', { reason, threshold: this.config.failureThreshold });
        this.tripCircuit(reason);
      }
    }
  }

  private tripCircuit(reason: string): void {
    this.openedAt = Date.now();
    this.halfOpenRequestsInFlight = 0;
    this.transitionTo(CircuitState.OPEN);
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.CLOSED) {
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses = 0;
      this.openedAt = null;
      this.halfOpenRequestsInFlight = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses = 0;
      this.halfOpenRequestsInFlight = 0;
    }

    logger.judge0.info('Circuit state transition', { from: oldState, to: newState });
  }

  getStatus() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  static isCircuitTripError(err: any): boolean {
    if (err.code === 'ECONNRESET' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'ETIMEDOUT' ||
        err.message?.includes('socket hang up') ||
        err.message?.includes('timeout')) {
      return true;
    }

    if (err.message?.includes('HTTP 5')) {
      return true;
    }

    if (err.message?.includes('HTTP 4')) {
      return false;
    }

    return true;
  }
}

// Global circuit breaker instance
const judge0CircuitBreaker = new CircuitBreaker();

export function getCircuitBreakerStatus() {
  return judge0CircuitBreaker.getStatus();
}

// ========================================
// CONNECTION POOLING
// ========================================

const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: 65000,
});

function getAgent(url: string) {
  return httpAgent;
}

// ========================================
// CONCURRENCY LIMITER (Semaphore)
// ========================================

const MAX_CONCURRENT_JUDGE0_TASKS = 20;
let activeJudge0Tasks = 0;
const waitQueue: Array<() => void> = [];

async function acquireJudge0Slot(): Promise<void> {
  if (activeJudge0Tasks < MAX_CONCURRENT_JUDGE0_TASKS) {
    activeJudge0Tasks++;
    return;
  }

  await new Promise<void>((resolve) => {
    waitQueue.push(resolve);
  });
  activeJudge0Tasks++;
}

function releaseJudge0Slot(): void {
  activeJudge0Tasks = Math.max(0, activeJudge0Tasks - 1);

  if (waitQueue.length > 0) {
    const next = waitQueue.shift();
    if (next) next();
  }
}

export function getJudge0RateLimiterStatus() {
  return {
    active: activeJudge0Tasks,
    waiting: waitQueue.length,
    max: MAX_CONCURRENT_JUDGE0_TASKS,
  };
}

// ========================================
// JUDGE0 SERVICE
// ========================================

class Judge0Service {
  private baseUrl: string;
  private authToken?: string;
  private timeout: number = 60000;

  constructor() {
    this.baseUrl = ENV.JUDGE0_URL;
    this.authToken = ENV.JUDGE0_AUTHN_TOKEN;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.authToken) headers["X-Auth-Token"] = this.authToken;
    return headers;
  }

  /**
   * @intent Check Judge0 health by querying workers endpoint.
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    reason?: string;
    workers?: number;
  }> {
    try {
      const url = `${this.baseUrl}/workers`;
      const res = await fetch(url, {
        headers: this.buildHeaders(),
        agent: getAgent(url),
      });

      if (!res.ok) {
        logger.judge0.error('Health check failed', { status: res.status });
        return { healthy: false, reason: `Judge0 returned ${res.status}` };
      }

      const workers = (await res.json()) as any[];

      if (!workers || workers.length === 0) {
        return { healthy: true, workers: 0 };
      }

      const mainQueue = workers[0];
      const { available, idle, working } = mainQueue || {};
      const totalWorkers = (available || 0) + (idle || 0) + (working || 0);

      return { healthy: true, workers: totalWorkers };
    } catch (err: any) {
      logger.judge0.error('Health check failed', {}, err);
      return { healthy: false, reason: err.message };
    }
  }

  /**
   * @intent Submit code to Judge0 for execution (synchronous wait mode).
   */
  async submitCode(submission: Submission): Promise<SubmissionResult> {
    const circuitCheck = judge0CircuitBreaker.canProceed();
    if (!circuitCheck.allowed) {
      throw new Error(`[CircuitBreaker] ${circuitCheck.reason}`);
    }

    const headers = this.buildHeaders();
    const url = `${this.baseUrl}/submissions?base64_encoded=true&wait=true`;

    await acquireJudge0Slot();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...submission,
          source_code: Buffer.from(submission.source_code).toString("base64"),
          stdin: submission.stdin
            ? Buffer.from(submission.stdin).toString("base64")
            : undefined,
        }),
        agent: getAgent(url),
      });

      if (!response.ok) {
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch (e) {}

        logger.judge0.error('submitCode failed', { status: response.status, body: errorBody });
        throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`);
      }

      const data: any = await response.json();

      const result = {
        ...data,
        stdout: this.decodeBase64(data.stdout),
        stderr: this.decodeBase64(data.stderr),
        compile_output: this.decodeBase64(data.compile_output),
        message: this.decodeBase64(data.message),
      };

      judge0CircuitBreaker.recordSuccess();
      return result;
    } catch (err: any) {
      if (CircuitBreaker.isCircuitTripError(err)) {
        judge0CircuitBreaker.recordFailure(err.message);
      }
      logger.judge0.error('submitCode error', {}, err);
      throw err;
    } finally {
      releaseJudge0Slot();
    }
  }

  /**
   * @intent Get available languages from Judge0.
   */
  async getLanguages() {
    const url = `${this.baseUrl}/languages`;
    const headers = this.buildHeaders();
    const res = await fetch(url, { headers, agent: getAgent(url) });
    if (!res.ok)
      throw new Error(`Failed to fetch languages: ${res.statusText}`);
    return await res.json();
  }

  private decodeBase64(str: string | null): string | null {
    if (!str) return null;
    return Buffer.from(str, "base64").toString("utf8");
  }
}

export const judge0Service = new Judge0Service();
