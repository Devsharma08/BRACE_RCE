import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

/**
 * Sentry error tracking and performance monitoring.
 * Initializes only when SENTRY_DSN is configured.
 */

let sentryInitialized = false;

/**
 * Initialize Sentry SDK
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.info('[sentry] SENTRY_DSN not configured, skipping initialization');
    return false;
  }

  if (sentryInitialized) {
    logger.warn('[sentry] Already initialized');
    return true;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_MODE || 'development',
      release: process.env.npm_package_version || 'unknown',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_MODE === 'production' ? 0.1 : 1.0,
      profileSessionSampleRate: process.env.NODE_MODE === 'production' ? 0.1 : 1.0,
      
      // Enable profiling
      integrations: [
        nodeProfilingIntegration(),
      ],
      
      // Filter sensitive data
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_MODE !== 'production' && !process.env.SENTRY_SEND_IN_DEV) {
          return null;
        }
        
        // Filter out known noise
        const error = hint.originalException;
        if (error instanceof Error) {
          // Skip certain error types
          if (error.message.includes('ECONNREFUSED') && error.message.includes('Piston')) {
            return null; // Piston connection errors are expected sometimes
          }
          if (error.message.includes('jwt expired') || error.message.includes('invalid token')) {
            return null; // Auth errors are normal
          }
        }
        
        // Scrub sensitive data from request
        if (event.request) {
          // Remove auth headers
          if (event.request.headers) {
            const headers = event.request.headers as Record<string, string | undefined>;
            delete headers.authorization;
            delete headers.cookie;
            delete headers['x-csrf-token'];
          }
          // Remove sensitive body fields
          if (event.request.data && typeof event.request.data === 'object') {
            const data = event.request.data as Record<string, unknown>;
            const sensitiveFields = ['password', 'token', 'secret', 'credential'];
            for (const field of sensitiveFields) {
              if (data[field]) {
                data[field] = '[REDACTED]';
              }
            }
          }
        }
        
        return event;
      },
      
      // Additional context
      initialScope: {
        tags: {
          service: 'brace-rce-server',
        },
      },
    });
    
    sentryInitialized = true;
    logger.info('[sentry] Initialized successfully');
    return true;
  } catch (error: unknown) {
    logger.error({ err: error, msg: '[sentry] Failed to initialize' });
    return false;
  }
}

/**
 * Express error handler middleware for Sentry
 * Must be placed AFTER all other middleware but BEFORE other error handlers
 */
export function sentryErrorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Don't send 404s to Sentry
    if (error.message === 'Not Found') {
      return next(error);
    }
    // Don't send validation errors
    if (error.name === 'ZodError') {
      return next(error);
    }
    
    // Capture to Sentry
    if (sentryInitialized) {
      Sentry.captureException(error);
    }
    
    next(error);
  };
}

/**
 * Sentry request handler middleware
 * Captures request context for errors
 */
export function sentryRequestHandler() {
  // Skip in test environment
  const isTest = process.env.NODE_MODE === 'test' 
    || process.env.JEST_WORKER_ID !== undefined
    || process.env.CI === 'true';
    
  if (isTest) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  
  // Use Sentry's built-in Express integration if available
  const expressIntegration = (Sentry as any).expressIntegration;
  if (expressIntegration) {
    const handler = expressIntegration();
    if (typeof handler?.requestHandler === 'function') {
      return handler.requestHandler();
    }
  }
  return (req: Request, res: Response, next: NextFunction) => next();
}

/**
 * Custom error capture with additional context
 */
export function captureError(error: Error, context?: Record<string, any>, user?: { id: string; username?: string }): string {
  if (!sentryInitialized) {
    logger.error({ err: error, ...(context ?? {}), msg: 'Sentry not initialized, logging locally' });
    return '';
  }
  
  return Sentry.captureException(error, {
    extra: context,
    user: user ? { id: user.id, username: user.username } : undefined,
  });
}

/**
 * Capture message with level
 */
export function captureMessage(message: string, level: 'info' | 'warn' | 'error' = 'info', context?: Record<string, any>): string {
  if (!sentryInitialized) {
    if (level === 'error') {
      logger.error({ ...(context ?? {}), msg: message });
    } else if (level === 'warn') {
      logger.warn({ ...(context ?? {}), msg: message });
    } else {
      logger.info({ ...(context ?? {}), msg: message });
    }
    return '';
  }
  
  return Sentry.captureMessage(message, { level: level as any, extra: context });
}

/**
 * Set user context for current scope
 */
export function setSentryUser(user: { id: string; username?: string; email?: string } | null): void {
  if (!sentryInitialized) return;
  
  Sentry.setUser(user ?? null);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(breadcrumb: { category?: string; message: string; level?: 'info' | 'warning' | 'error'; data?: Record<string, any> }): void {
  if (!sentryInitialized) return;
  
  Sentry.addBreadcrumb(breadcrumb as any);
}

/**
 * Create a Sentry transaction for custom performance monitoring
 * Not available in current Sentry version, use OpenTelemetry instead
 */
export function startSentryTransaction(_name: string, _op: string, _data?: Record<string, any>): undefined {
  // Use OpenTelemetry for custom transactions instead
  return undefined;
}

/**
 * Get current Sentry trace context for logging correlation
 */
export function getSentryTraceContext(): { traceId?: string; spanId?: string } {
  try {
    const scope = Sentry.getCurrentScope?.();
    if (!scope) return {};
    
    // Access internal span property if available
    const span = (scope as any).span;
    if (span) {
      const spanContext = span.spanContext?.();
      return {
        traceId: spanContext?.traceId,
        spanId: spanContext?.spanId,
      };
    }
  } catch {
    // Ignore errors
  }
  return {};
}

/**
 * Flush Sentry events (call on shutdown)
 */
export async function flushSentry(timeout = 5000): Promise<boolean> {
  if (!sentryInitialized) return true;
  
  return Sentry.flush(timeout);
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return sentryInitialized;
}

export { Sentry };
export default Sentry;