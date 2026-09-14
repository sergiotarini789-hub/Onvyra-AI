/**
 * Structured logging - no secrets in logs
 * Production should ship to centralized logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL as LogLevel;
  if (["debug", "info", "warn", "error"].includes(level)) return level;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getLogLevel()];
}

function sanitizeMetadata(metadata: any): any {
  if (!metadata) return metadata;
  
  const sensitiveKeys = [
    "password", "passwordHash", "secret", "token", "accessToken", "refreshToken",
    "apiKey", "api_key", "authorization", "cookie", "jwt", "creditCard",
    "stripe", "openai", "hubspot",
  ];
  
  const sanitized = { ...metadata };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(s => lowerKey.includes(s.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  }
  
  return sanitized;
}

function formatLog(level: LogLevel, message: string, metadata?: any) {
  const timestamp = new Date().toISOString();
  const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...(sanitized ? { metadata: sanitized } : {}),
    env: process.env.NODE_ENV,
  };
  
  // In production, this would ship to external service
  const logString = JSON.stringify(logEntry);
  
  switch (level) {
    case "debug":
      if (shouldLog("debug")) console.debug(logString);
      break;
    case "info":
      if (shouldLog("info")) console.info(logString);
      break;
    case "warn":
      if (shouldLog("warn")) console.warn(logString);
      break;
    case "error":
      if (shouldLog("error")) console.error(logString);
      break;
  }
}

export const logger = {
  debug: (message: string, metadata?: any) => formatLog("debug", message, metadata),
  info: (message: string, metadata?: any) => formatLog("info", message, metadata),
  warn: (message: string, metadata?: any) => formatLog("warn", message, metadata),
  error: (message: string, metadata?: any) => formatLog("error", message, metadata),
  
  // Specific loggers for audit and security
  audit: (event: string, orgId: string, userId?: string, metadata?: any) => {
    formatLog("info", `AUDIT: ${event}`, { orgId, userId, event, ...sanitizeMetadata(metadata) });
  },
  
  security: (event: string, metadata?: any) => {
    formatLog("warn", `SECURITY: ${event}`, sanitizeMetadata(metadata));
  },
  
  performance: (operation: string, durationMs: number, metadata?: any) => {
    formatLog("info", `PERF: ${operation} took ${durationMs}ms`, { operation, durationMs, ...sanitizeMetadata(metadata) });
  },
  
  billing: (event: string, orgId: string, metadata?: any) => {
    formatLog("info", `BILLING: ${event}`, { orgId, event, ...sanitizeMetadata(metadata) });
  },
};

export function withPerformanceLogging<T>(operation: string, fn: () => Promise<T>, metadata?: any): Promise<T> {
  const start = Date.now();
  return fn()
    .then(result => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.performance(operation, duration, { ...metadata, slow: true });
      } else {
        logger.debug(`PERF: ${operation} took ${duration}ms`, metadata);
      }
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      logger.error(`PERF: ${operation} failed after ${duration}ms`, { ...metadata, error: (error as Error).message });
      throw error;
    });
}
