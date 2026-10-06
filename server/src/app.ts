import express, { type Express } from "express";
import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from 'helmet';
import compression from 'compression';
import { randomBytes } from "crypto";

import { executeRouter } from "./routes/execute.js";
import { authRouter } from "./routes/auth.js";
import { friendsRouter } from "./routes/friends.js";
import profileRouter from "./routes/profile.js";
import { roomsRouter } from "./routes/room.js";
import { problemsRouter } from "./routes/problems.js";
import analyticsRouter from "./routes/analytics.js";
import leaderboardRouter from "./routes/leaderboard.js";
import roadmapRouter from "./routes/roadmap.js";
import { adminRouter } from "./routes/admin.js";
import { learningItemsRouter } from "./routes/learning-items.js";
import { learningPathsRouter } from "./routes/learning-paths.js";
import { notificationsRouter } from "./routes/notifications.js";
import { feedbackRouter } from "./routes/feedback.js";

import { logger, logRequest } from "./lib/logger.js";
import { metricsMiddleware, getMetrics, getMetricsContentType } from "./lib/metrics.js";
import { deepHealthCheck, livenessCheck, readinessCheck, startupCheck } from "./lib/health.js";
import { sentryRequestHandler, sentryErrorHandler } from "./lib/sentry.js";
import { setupSwagger } from "./lib/swagger.js";
import { getAllowedOrigins } from "./lib/origins.js";

/**
 * API version prefix - change here to version all routes at once.
 */
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

// getAllowedOrigins lives in ./lib/origins.js so middleware (executionGuard)
// can share it without importing this module — that would be an import cycle.
// Re-exported here so existing importers (index.ts, app.cors.test.ts) keep working.
export { getAllowedOrigins };

/** CSRF cookie name */
const CSRF_COOKIE_NAME = "csrf_token";
/** Header name for CSRF token */
const CSRF_HEADER_NAME = "x-csrf-token";

/** Routes that don't require CSRF protection (public auth endpoints, health checks). */
const CSRF_EXEMPT_PATHS = [
  `${API_PREFIX}/auth/signup`,
  `${API_PREFIX}/auth/signin`,
  `${API_PREFIX}/auth/signout`,
  `${API_PREFIX}/auth/google`,
  "/api/auth/signup",   // legacy
  "/api/auth/signin",   // legacy
  "/api/auth/signout",  // legacy
  "/api/auth/google",   // legacy
  `${API_PREFIX}/execute`,
  "/api/execute",       // legacy
  `${API_PREFIX}/csrf-token`,  // CSRF token endpoint
  "/api/csrf-token",   // legacy CSRF token endpoint
  "/health",
  "/live",
  "/ready",
  "/startup",
  "/metrics",
];

/** Safe methods that don't require CSRF protection */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Generate a secure random CSRF token */
function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Timing-safe string comparison */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** CSRF protection middleware using double-submit cookie pattern */
function csrfMiddleware() {
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = isProd ? "none" : "lax";
  const secure = isProd;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for safe methods
    if (SAFE_METHODS.has(req.method)) {
      // Still ensure token exists for future requests
      if (!req.cookies?.[CSRF_COOKIE_NAME]) {
        const token = generateCsrfToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
          httpOnly: false, // JavaScript must read this to send in header
          sameSite,
          secure,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }
      return next();
    }

    // Skip for exempt paths
    if (CSRF_EXEMPT_PATHS.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Get token from cookie and header
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    // If no cookie token, generate one (first visit)
    if (!cookieToken) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        sameSite,
        secure,
        maxAge: 24 * 60 * 60 * 1000,
      });
      // For the first mutating request after token generation, allow it but warn
      console.warn("[csrf] No CSRF cookie found, generated new token for", req.path);
      return next();
    }

    // Verify header token matches cookie token
    if (!headerToken || !timingSafeEqual(cookieToken, headerToken)) {
      return res.status(403).json({
        status: "error",
        message: "Invalid CSRF token",
      });
    }

    next();
  };
}

/** Endpoint to get current CSRF token (for SPA initialization) */
function csrfTokenEndpoint(req: Request, res: Response) {
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = isProd ? "none" : "lax";
  const secure = isProd;
  
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite,
      secure,
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  res.json({ csrfToken: token });
}

export const createApp = (): Express => {
  const app = express();
  app.set("trust proxy", 1);
  
  // Request logging middleware (must be early)
  app.use(logRequest);
  
  // Metrics collection middleware
  app.use(metricsMiddleware());
  
  // Sentry request handler (captures request context for errors)
  app.use(sentryRequestHandler());

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  
  // CORS middleware MUST be before routes to handle preflight requests
  const allowedOrigins = getAllowedOrigins();
  
  // Manual CORS handling - handles both preflight and actual requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Set CORS headers for allowed origins
    if (origin && allowedOrigins.includes(origin)) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-csrf-token,X-Requested-With',
        'Access-Control-Expose-Headers': 'x-request-id',
        'Vary': 'Origin, Accept-Encoding',
      });
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    
    next();
  });
  
  // Helmet AFTER CORS so it doesn't strip CORS headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  app.use(compression({ threshold: 1024 }));
  
  // With `withCredentials: true` on the client (see src/config/api.ts) the auth
  // cookie must ride along, and browsers reject a `*` wildcard
  // Access-Control-Allow-Origin for credentialed requests. So instead of a
  // wildcard we echo the caller's origin back, but only when it is on the
  // allow-list. Requests with no Origin header (same-origin, curl, server to
  // server) are not CORS requests and are always let through.
  
  app.use(csrfMiddleware());
  // Expose CSRF token endpoint for SPA initialization
  app.get(`${API_PREFIX}/csrf-token`, csrfTokenEndpoint);
  // Legacy CSRF token endpoint for backward compatibility
  app.get("/api/csrf-token", csrfTokenEndpoint);
  
  // Health check endpoints (no CSRF, no auth)
  app.get("/live", livenessCheck);
  app.get("/ready", readinessCheck);
  app.get("/startup", startupCheck);
  app.get("/health", deepHealthCheck);
  
  // Prometheus metrics endpoint
  app.get("/metrics", async (_req: Request, res: Response) => {
    res.set("Content-Type", getMetricsContentType());
    res.send(await getMetrics());
  });

  // Swagger API documentation (dev only)
  if (process.env.NODE_MODE !== 'production') {
    setupSwagger(app);
  }
  
  // API routes
  app.use(`${API_PREFIX}/execute`, executeRouter);
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/friends`, friendsRouter);
  app.use(`${API_PREFIX}/profile`, profileRouter);
  app.use(`${API_PREFIX}/rooms`, roomsRouter);
  app.use(`${API_PREFIX}/problems`, problemsRouter);
  app.use(`${API_PREFIX}/analytics`, analyticsRouter);
  app.use(`${API_PREFIX}/leaderboard`, leaderboardRouter);
  app.use(`${API_PREFIX}/roadmap`, roadmapRouter);
  app.use(`${API_PREFIX}/admin`, adminRouter);
  app.use(`${API_PREFIX}/notifications`, notificationsRouter);
  app.use(`${API_PREFIX}/feedback`, feedbackRouter);
  app.use(`${API_PREFIX}/learning-items`, learningItemsRouter);
  app.use(`${API_PREFIX}/learning-paths`, learningPathsRouter);

  // Legacy API routes (non-versioned) - for backward compatibility with existing frontend
  app.use("/api/execute", executeRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/friends", friendsRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/problems", problemsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/roadmap", roadmapRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/learning-items", learningItemsRouter);
  app.use("/api/learning-paths", learningPathsRouter);

  // Sentry error handler (must be after all routes) - disabled in test mode
  if (process.env.NODE_MODE !== 'test' && !process.env.JEST_WORKER_ID) {
    app.use(sentryErrorHandler());
  }

  return app;
};