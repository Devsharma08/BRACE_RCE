import pino from "pino";
import type { Logger as PinoLogger } from "pino";

/**
 * Structured logger using Pino.
 * Produces JSON logs in production, pretty-printed in development.
 */

const isDevelopment = process.env.NODE_MODE !== "production";

let logger: PinoLogger;

if (isDevelopment) {
  logger = pino({
    level: process.env.LOG_LEVEL || "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
} else {
  logger = pino({
    level: process.env.LOG_LEVEL || "info",
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: "brace-rce-server",
      version: process.env.npm_package_version || "unknown",
    },
  });
}

/**
 * Create a child logger with additional context.
 * Useful for adding request IDs, user IDs, etc.
 */
export function createChildLogger(bindings: Record<string, any>): PinoLogger {
  return logger.child(bindings);
}

/**
 * Log levels: trace, debug, info, warn, error, fatal
 */
export { logger };

/**
 * Helper to log HTTP requests with correlation ID
 */
export function logRequest(req: any, res: any, next: any) {
  const start = Date.now();
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  
  // Add request ID to response header
  res.setHeader("x-request-id", requestId);
  
  // Create child logger with request context
  const reqLogger = logger.child({
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Attach logger to request for use in route handlers
  req.log = reqLogger;

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    reqLogger.info(
      { 
        statusCode: res.statusCode,
        durationMs: duration,
        contentLength: res.get("content-length"),
      },
      `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`
    );
  });

  next();
}

/**
 * Helper to log errors with context
 */
export function logError(err: Error, context?: Record<string, any>) {
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      ...context,
    },
    err.message
  );
}

/**
 * Helper to log business events
 */
export function logEvent(event: string, data: Record<string, any>) {
  logger.info({ event, ...data }, event);
}

export default logger;