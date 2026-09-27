import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

/**
 * Custom span helpers for business logic tracing.
 * Use these to add manual spans around important operations.
 */

const tracer = trace.getTracer('brace-rce-business');

/**
 * Wrap an async function with a span.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(name, { kind: SpanKind.INTERNAL, attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : String(error) 
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a span for database operations
 */
export async function withDbSpan<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`db.${operation}.${model}`, async (span) => {
    span.setAttribute('db.operation', operation);
    span.setAttribute('db.model', model);
    return fn();
  });
}

/**
 * Create a span for external API calls (Piston, etc.)
 */
export async function withExternalSpan<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`external.${service}.${operation}`, async (span) => {
    span.setAttribute('external.service', service);
    span.setAttribute('external.operation', operation);
    return fn();
  });
}

/**
 * Create a span for code execution
 */
export async function withExecutionSpan<T>(
  language: string,
  mode: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`code.execution`, async (span) => {
    span.setAttribute('execution.language', language);
    span.setAttribute('execution.mode', mode);
    return fn();
  });
}

/**
 * Create a span for battle/match operations
 */
export async function withBattleSpan<T>(
  battleType: string,
  operation: string,
  fn: (span: any) => Promise<T>
): Promise<T> {
  return withSpan(`battle.${battleType}.${operation}`, async (span) => {
    span.setAttribute('battle.type', battleType);
    span.setAttribute('battle.operation', operation);
    return fn(span);
  });
}

/**
 * Add user context to current span
 */
export function addUserContext(userId: string, username?: string): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.setAttribute('user.id', userId);
    if (username) span.setAttribute('user.username', username);
  }
}

/**
 * Add request context to current span
 */
export function addRequestContext(req: any): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.originalUrl || req.url);
    span.setAttribute('http.route', req.route?.path);
    if (req.userId) span.setAttribute('user.id', req.userId);
  }
}

/**
 * Get current trace ID for logging correlation
 */
export function getTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext()?.traceId;
}

/**
 * Get current span ID
 */
export function getSpanId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext()?.spanId;
}

export { tracer };
export default tracer;