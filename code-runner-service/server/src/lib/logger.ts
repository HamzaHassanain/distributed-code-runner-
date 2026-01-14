/**
 * @intent Structured Logging System
 *
 * Features:
 * - JSON-formatted logs for easy parsing
 * - Log levels with environment-configurable threshold
 * - Component prefixes for filtering
 * - Request ID correlation support
 * - Timestamp included in every log
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.CRITICAL]: 'CRITICAL',
};

// Parse LOG_LEVEL from environment (default: INFO in production, DEBUG in development)
function getConfiguredLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  switch (envLevel) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'CRITICAL': return LogLevel.CRITICAL;
    default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }
}

const configuredLevel = getConfiguredLogLevel();

// Request context for correlation
let requestContext: { requestId?: string } = {};

export function setRequestContext(ctx: { requestId?: string }) {
  requestContext = ctx;
}

export function clearRequestContext() {
  requestContext = {};
}

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  requestId?: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  // For development, use human-readable format
  if (process.env.LOG_FORMAT === 'pretty') {
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr = entry.error ? ` Error: ${entry.error.message}` : '';
    const reqIdStr = entry.requestId ? ` [req:${entry.requestId}]` : '';
    return `[${entry.timestamp}] [${entry.level}] [${entry.component}]${reqIdStr} ${entry.message}${dataStr}${errorStr}`;
  }

  // For production, use JSON format for log aggregation
  return JSON.stringify(entry);
}

function log(level: LogLevel, component: string, message: string, data?: Record<string, any>, error?: Error) {
  if (level < configuredLevel) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LOG_LEVEL_NAMES[level],
    component,
    message,
  };

  if (requestContext.requestId) {
    entry.requestId = requestContext.requestId;
  }

  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  const formatted = formatLog(entry);

  // Use appropriate console method based on level
  if (level >= LogLevel.ERROR) {
    console.error(formatted);
  } else if (level === LogLevel.WARN) {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * @intent Create a logger for a specific component.
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, data?: Record<string, any>) => log(LogLevel.DEBUG, component, message, data),
    info: (message: string, data?: Record<string, any>) => log(LogLevel.INFO, component, message, data),
    warn: (message: string, data?: Record<string, any>, error?: Error) => log(LogLevel.WARN, component, message, data, error),
    error: (message: string, data?: Record<string, any>, error?: Error) => log(LogLevel.ERROR, component, message, data, error),
    critical: (message: string, data?: Record<string, any>, error?: Error) => log(LogLevel.CRITICAL, component, message, data, error),
  };
}

// Pre-configured loggers for common components
export const logger = {
  server: createLogger('Server'),
  judge0: createLogger('Judge0'),
  db: createLogger('MongoDB'),
  auth: createLogger('Auth'),
  rateLimit: createLogger('RateLimit'),
  playground: createLogger('Playground'),
  batch: createLogger('Batch'),
};

export default logger;
