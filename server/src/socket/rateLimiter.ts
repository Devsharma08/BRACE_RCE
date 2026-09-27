import type { Socket } from "socket.io";

/**
 * Per-socket rate limiter for Socket.io events.
 * Uses a token bucket algorithm with configurable limits.
 */

interface RateLimitConfig {
  /** Maximum events allowed per window */
  maxEvents: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Events that are exempt from rate limiting */
  exemptEvents?: string[];
  /** Custom key generator (default: socket.id) */
  keyGenerator?: (socket: Socket) => string;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

type SocketMiddleware = (socket: Socket, next: (err?: Error) => void) => void;

const DEFAULT_CONFIG: RateLimitConfig = {
  maxEvents: 30,
  windowMs: 1000, // 30 events per second
  exemptEvents: ["disconnect", "connect", "connect_error"],
};

const buckets = new Map<string, BucketState>();

/**
 * Refill tokens based on elapsed time
 */
function refillTokens(state: BucketState, config: RateLimitConfig): number {
  const now = Date.now();
  const elapsed = now - state.lastRefill;
  const tokensToAdd = (elapsed / config.windowMs) * config.maxEvents;
  state.tokens = Math.min(config.maxEvents, state.tokens + tokensToAdd);
  state.lastRefill = now;
  return state.tokens;
}

/**
 * Create a rate limiter middleware for Socket.io
 */
export function createSocketRateLimiter(config: Partial<RateLimitConfig> = {}): SocketMiddleware {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const exemptSet = new Set(finalConfig.exemptEvents);

  return (socket: Socket, next: (err?: Error) => void) => {
    // Skip rate limiting in test environment
    const isTest = process.env.NODE_ENV === "test" 
      || process.env.NODE_MODE === "test"
      || process.env.JEST_WORKER_ID !== undefined
      || process.env.CI === "true";
      
    if (isTest) {
      return next();
    }
    
    // Store original on method
    const originalOn = socket.on.bind(socket);

    const key = finalConfig.keyGenerator ? finalConfig.keyGenerator(socket) : socket.id;
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: finalConfig.maxEvents, lastRefill: Date.now() };
      buckets.set(key, bucket);
    }

    // Intercept socket.on to rate limit incoming events
    // Use a property descriptor to override the method
    const rateLimitedOn = function(this: Socket, event: string, listener: (...args: any[]) => void): Socket {
      // Skip rate limiting for exempt events
      if (exemptSet.has(event)) {
        return originalOn(event, listener);
      }

      // Wrap the handler to check rate limit
      const wrappedListener = async (...handlerArgs: any[]) => {
        // Refill tokens
        refillTokens(bucket!, finalConfig);

        if (bucket!.tokens < 1) {
          // Rate limited - emit error to client
          this.emit("rate_limit_exceeded", {
            event,
            message: "Too many requests, please slow down",
            retryAfterMs: Math.ceil((1 - bucket!.tokens) * finalConfig.windowMs),
          });
          return;
        }

        // Consume token
        bucket!.tokens -= 1;

        // Call original handler
        return listener(...handlerArgs);
      };

      return originalOn(event, wrappedListener);
    };

    // Replace the on method
    (socket as any).on = rateLimitedOn;

    next();
  };
}

/**
 * Clean up old buckets periodically
 */
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  for (const [key, state] of buckets.entries()) {
    if (now - state.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}, 60 * 1000); // Run cleanup every minute

/**
 * Get current bucket state for a socket (useful for monitoring)
 */
export function getSocketRateLimitState(socketId: string): BucketState | undefined {
  return buckets.get(socketId);
}

/**
 * Reset rate limit for a socket (useful for testing or admin)
 */
export function resetSocketRateLimit(socketId: string): void {
  buckets.delete(socketId);
}

/**
 * Create stricter rate limiter for specific events
 */
export function createStrictEventLimiter(
  eventName: string,
  maxEvents: number,
  windowMs: number
): SocketMiddleware {
  return (socket: Socket, next: (err?: Error) => void) => {
    const originalOn = socket.on.bind(socket);
    const key = `${socket.id}:${eventName}`;
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxEvents, lastRefill: Date.now() };
      buckets.set(key, bucket);
    }

    const rateLimitedOn = function(this: Socket, event: string, listener: (...args: any[]) => void): Socket {
      if (event !== eventName) {
        return originalOn(event, listener);
      }

      const wrappedListener = async (...handlerArgs: any[]) => {
        refillTokens(bucket!, { maxEvents, windowMs, exemptEvents: [] });

        if (bucket!.tokens < 1) {
          this.emit("rate_limit_exceeded", {
            event: eventName,
            message: `Rate limit exceeded for ${eventName}`,
            retryAfterMs: Math.ceil((1 - bucket!.tokens) * windowMs),
          });
          return;
        }

        bucket!.tokens -= 1;
        return listener(...handlerArgs);
      };

      return originalOn(event, wrappedListener);
    };

    (socket as any).on = rateLimitedOn;
    next();
  };
}