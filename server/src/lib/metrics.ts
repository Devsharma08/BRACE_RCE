import client from "prom-client";

/**
 * Prometheus metrics collection.
 * Exposes /metrics endpoint for Prometheus scraping.
 */

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (Node.js process metrics)
client.collectDefaultMetrics({ register, prefix: "node_" });

// Custom metrics
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestSize = new client.Histogram({
  name: "http_request_size_bytes",
  help: "Size of HTTP request bodies in bytes",
  labelNames: ["method", "route"],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

export const httpResponseSize = new client.Histogram({
  name: "http_response_size_bytes",
  help: "Size of HTTP response bodies in bytes",
  labelNames: ["method", "route"],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// WebSocket metrics
export const wsConnectionsActive = new client.Gauge({
  name: "ws_connections_active",
  help: "Number of active WebSocket connections",
  labelNames: ["namespace"],
  registers: [register],
});

export const wsConnectionsTotal = new client.Counter({
  name: "ws_connections_total",
  help: "Total number of WebSocket connections",
  labelNames: ["namespace", "event"],
  registers: [register],
});

export const wsMessagesTotal = new client.Counter({
  name: "ws_messages_total",
  help: "Total number of WebSocket messages",
  labelNames: ["namespace", "direction", "event"],
  registers: [register],
});

export const wsMessageSize = new client.Histogram({
  name: "ws_message_size_bytes",
  help: "Size of WebSocket messages in bytes",
  labelNames: ["namespace", "direction", "event"],
  buckets: [100, 1000, 10000, 100000],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "model"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const dbQueriesTotal = new client.Counter({
  name: "db_queries_total",
  help: "Total number of database queries",
  labelNames: ["operation", "model", "status"],
  registers: [register],
});

export const dbPoolConnections = new client.Gauge({
  name: "db_pool_connections",
  help: "Number of database pool connections",
  labelNames: ["state"], // active, idle, waiting
  registers: [register],
});

// Cache metrics
export const cacheHitsTotal = new client.Counter({
  name: "cache_hits_total",
  help: "Total number of cache hits",
  labelNames: ["namespace"],
  registers: [register],
});

export const cacheMissesTotal = new client.Counter({
  name: "cache_misses_total",
  help: "Total number of cache misses",
  labelNames: ["namespace"],
  registers: [register],
});

export const cacheOperationsDuration = new client.Histogram({
  name: "cache_operation_duration_seconds",
  help: "Duration of cache operations in seconds",
  labelNames: ["operation", "namespace"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
  registers: [register],
});

// Code execution metrics
export const codeExecutionsTotal = new client.Counter({
  name: "code_executions_total",
  help: "Total number of code executions",
  labelNames: ["language", "mode", "status"],
  registers: [register],
});

export const codeExecutionDuration = new client.Histogram({
  name: "code_execution_duration_seconds",
  help: "Duration of code execution in seconds",
  labelNames: ["language", "mode"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const codeExecutionQueueSize = new client.Gauge({
  name: "code_execution_queue_size",
  help: "Current size of code execution queue",
  registers: [register],
});

// Piston API metrics
export const pistonRequestsTotal = new client.Counter({
  name: "piston_requests_total",
  help: "Total number of Piston API requests",
  labelNames: ["status"],
  registers: [register],
});

export const pistonRequestDuration = new client.Histogram({
  name: "piston_request_duration_seconds",
  help: "Duration of Piston API requests in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const pistonCircuitBreakerState = new client.Gauge({
  name: "piston_circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
  registers: [register],
});

// Battle/match metrics
export const battlesTotal = new client.Counter({
  name: "battles_total",
  help: "Total number of battles",
  labelNames: ["type", "result"],
  registers: [register],
});

export const battleDuration = new client.Histogram({
  name: "battle_duration_seconds",
  help: "Duration of battles in seconds",
  labelNames: ["type"],
  buckets: [10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [register],
});

export const activeBattles = new client.Gauge({
  name: "active_battles",
  help: "Number of currently active battles",
  registers: [register],
});

// Authentication metrics
export const authAttemptsTotal = new client.Counter({
  name: "auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["type", "result"],
  registers: [register],
});

export const activeUsers = new client.Gauge({
  name: "active_users",
  help: "Number of currently active users",
  registers: [register],
});

// Rate limiting metrics
export const rateLimitHitsTotal = new client.Counter({
  name: "rate_limit_hits_total",
  help: "Total number of rate limit hits",
  labelNames: ["endpoint", "type"],
  registers: [register],
});

/**
 * Middleware to collect HTTP metrics
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = process.hrtime.bigint();
    const route = req.route?.path || req.originalUrl || req.url;

    res.on("finish", () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = {
        method: req.method,
        route: route,
        status_code: res.statusCode,
      };

      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, duration);

      // Request/response size
      const reqSize = req.headers["content-length"] ? parseInt(req.headers["content-length"], 10) : 0;
      const resSize = res.get("content-length") ? parseInt(res.get("content-length")!, 10) : 0;
      
      if (reqSize > 0) httpRequestSize.observe({ method: req.method, route }, reqSize);
      if (resSize > 0) httpResponseSize.observe({ method: req.method, route }, resSize);
    });

    next();
  };
}

/**
 * Get metrics for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.clear();
  client.collectDefaultMetrics({ register, prefix: "node_" });
}

export { register };
export default register;