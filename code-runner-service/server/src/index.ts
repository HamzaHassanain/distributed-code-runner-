import express from "express";
import cors from "cors";
import { ENV } from "./config/env";
import { connectDB, isDBConnected } from "./lib/db";
import { verifyToken } from "./lib/auth";
import { executionRateLimit, startRateLimitCleanup, stopRateLimitCleanup } from "./lib/rateLimit";
import { getCircuitBreakerStatus, judge0Service, getJudge0RateLimiterStatus } from "./lib/judge0";
import { logger } from "./lib/logger";
import { submitPlayground } from "./controllers/playground";
import { batchSubmit } from "./controllers/batch";

// ========================================
// GLOBAL ERROR HANDLERS
// ========================================

let isShuttingDown = false;
let serverStartedAt: Date | null = null;

process.on("unhandledRejection", (reason: any) => {
  logger.server.critical("Unhandled Promise Rejection", {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
});

process.on("uncaughtException", (error: Error) => {
  logger.server.critical("Uncaught Exception", {}, error);

  if (!isShuttingDown) {
    gracefulShutdown("uncaughtException");
  }
});

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.server.info("Already shutting down...");
    return;
  }

  isShuttingDown = true;
  logger.server.info(`Received ${signal}, initiating graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    logger.server.error("Shutdown timeout reached, forcing exit");
    process.exit(1);
  }, 30000);

  try {
    stopRateLimitCleanup();

    if (server) {
      logger.server.info("Closing HTTP server...");
      server.close();
    }

    logger.server.info("Exiting cleanly");
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err: any) {
    logger.server.error("Error during shutdown", {}, err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ========================================
// EXPRESS APP SETUP
// ========================================

const app = express();
let server: ReturnType<typeof app.listen>;

// CORS Configuration
app.use(
  cors({
    origin: ENV.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Shutdown-aware middleware
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.set('Retry-After', '30');
    return res.status(503).json({
      success: false,
      error: "Server is shutting down. Please retry after 30 seconds.",
      retryAfter: 30,
    });
  }
  next();
});

// Health check is always public
app.get("/health", (req, res) => {
  const circuitBreaker = getCircuitBreakerStatus();
  const dbConnected = isDBConnected();
  const judge0Status = getJudge0RateLimiterStatus();

  const isHealthy = dbConnected && circuitBreaker.state !== 'OPEN';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: serverStartedAt ? Math.floor((Date.now() - serverStartedAt.getTime()) / 1000) : 0,
    isShuttingDown,
    components: {
      database: dbConnected ? "connected" : "disconnected",
      judge0: circuitBreaker.state === 'OPEN' ? "unavailable" : "healthy",
    },
    judge0Status,
  });
});

// Authentication middleware
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // 1. Check for Service Token (Internal/Client-to-Service Trust)
  const serviceToken = req.headers["x-auth-token"];
  if (ENV.JUDGE0_AUTHN_TOKEN && serviceToken === ENV.JUDGE0_AUTHN_TOKEN) {
    // Valid service token - allow, but still try to extract user if present
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^[Bb]earer\s+/, "");
    if (token) {
       (req as any).user = verifyToken(token);
    } else {
       // Service call without user context (e.g. system tasks)
       (req as any).user = { userId: "system", role: "admin" }; 
    }
    return next();
  }

  // 2. If no valid service token, check for User JWT
  // (Optional: You could strictly enforce service token AND user token if desired)
  
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^[Bb]earer\s+/, "");

  if (!token) {
    (req as any).user = null;
    return next();
  }

  const user = verifyToken(token);
  if (!user) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }

  (req as any).user = user;
  next();
}

// Apply auth middleware to all routes except health
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  authMiddleware(req, res, next);
});

// Routes with rate limiting
app.post("/playground", executionRateLimit, submitPlayground);
app.post("/editor/batch", executionRateLimit, batchSubmit);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.server.error("Unhandled express error", {}, err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
);

// ========================================
// SERVER START
// ========================================

const PORT = ENV.PORT;
server = app.listen(PORT, async () => {
  serverStartedAt = new Date();
  logger.server.info(`Code Runner Service running on port ${PORT}`);

  // Connect to MongoDB (optional for playground-only usage)
  try {
    await connectDB();
  } catch (err: any) {
    logger.server.warn("MongoDB connection failed (non-fatal for playground)", { error: err.message });
  }

  // Check Judge0 health
  try {
    const judge0Health = await judge0Service.checkHealth();

    if (!judge0Health.healthy) {
      logger.server.warn(`Judge0 unhealthy: ${judge0Health.reason}`);
    } else {
      logger.judge0.info('Health check passed', { workers: judge0Health.workers });
    }
  } catch (err: any) {
    logger.server.warn(`Judge0 unreachable: ${err.message}`);
  }

  // Start rate limit cleanup
  startRateLimitCleanup();

  logger.server.info("Ready - all systems operational");
});
