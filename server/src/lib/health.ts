import type { Request, Response } from "express";
import { prisma } from "./prisma.js";
import { checkCacheHealth } from "./cache.js";
import { logger } from "./logger.js";
import { checkRedisHealth } from "./redis.js";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    cache: ComponentHealth;
    redis: ComponentHealth;
    piston: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

// In-memory cache for health check results (10 second TTL)
let healthCheckCache: { result: HealthCheckResult; expiresAt: number } | null = null;
const HEALTH_CHECK_CACHE_TTL_MS = 10_000; // 10 seconds

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    // Simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: latency > 1000 ? "degraded" : "healthy",
      latencyMs: latency,
      message: latency > 1000 ? "Database responding slowly" : "Database connected",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : "Database connection failed",
      details: { error: String(error) },
    };
  }
}

/**
 * Check Piston API availability
 */
async function checkPiston(): Promise<ComponentHealth> {
  const pistonUrl = process.env.PISTON_URL || "http://127.0.0.1:2000";
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${pistonUrl}/api/v2/runtimes`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - start;
    
    if (!response.ok) {
      return {
        status: "unhealthy",
        latencyMs: latency,
        message: `Piston API returned ${response.status}`,
        details: { status: response.status },
      };
    }
    
    const runtimes: any = await response.json();
    
    return {
      status: latency > 5000 ? "degraded" : "healthy",
      latencyMs: latency,
      message: `Piston API responding (${runtimes?.length || 0} runtimes available)`,
      details: { runtimesCount: runtimes?.length || 0 },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : "Piston API unreachable",
      details: { error: String(error) },
    };
  }
}

/**
 * Deep health check endpoint with caching
 */
export async function deepHealthCheck(_req: Request, res: Response) {
  // Return cached result if available and not expired
  if (healthCheckCache && Date.now() < healthCheckCache.expiresAt) {
    return res.status(200).json(healthCheckCache.result);
  }
  
  const start = Date.now();
  
  // Run all checks in parallel
  const [database, cacheRaw, redisHealth, piston] = await Promise.all([
    checkDatabase(),
    checkCacheHealth(),
    checkRedisHealth(),
    checkPiston(),
  ]);

  const cache: ComponentHealth = {
    status: cacheRaw.healthy ? "healthy" : "unhealthy",
    message: `Cache backend: ${cacheRaw.backend}`,
    details: { backend: cacheRaw.backend },
  };

  const redis: ComponentHealth = {
    status: redisHealth.healthy ? "healthy" : "unhealthy",
    latencyMs: redisHealth.latencyMs,
    message: `Redis backend: ${redisHealth.backend}`,
    details: { backend: redisHealth.backend },
  };

  const statuses = [database, cache, redis, piston].map((c) => c.status);
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  
  if (statuses.includes("unhealthy")) {
    overallStatus = "unhealthy";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
    checks: {
      database,
      cache,
      redis,
      piston,
    },
  };

  healthCheckCache = {
    result,
    expiresAt: Date.now() + HEALTH_CHECK_CACHE_TTL_MS,
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  logger.info(
    {
      overallStatus,
      durationMs: Date.now() - start,
      checks: {
        database: database.status,
        cache: cache.status,
        redis: redis.status,
        piston: piston.status,
      },
    },
    `Health check: ${overallStatus}`
  );

  res.status(statusCode).json(result);
}

/**
 * Simple liveness probe (for Kubernetes)
 */
export function livenessCheck(_req: Request, res: Response) {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

/**
 * Readiness probe (for Kubernetes)
 */
export async function readinessCheck(_req: Request, res: Response) {
  const [database, cache, redisHealth] = await Promise.all([
    checkDatabase(),
    checkCacheHealth(),
    checkRedisHealth(),
  ]);

  const ready = database.status !== "unhealthy" && cache.healthy && redisHealth.healthy;

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not ready",
    timestamp: new Date().toISOString(),
    checks: {
      database: database.status,
      cache: cache.healthy ? "healthy" : "unhealthy",
      redis: redisHealth.healthy ? "healthy" : "unhealthy",
    },
  });
}

/**
 * Startup probe (for Kubernetes)
 */
export function startupCheck(_req: Request, res: Response) {
  // Server is started if we can respond
  res.status(200).json({
    status: "started",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}