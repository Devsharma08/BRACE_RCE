import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

/**
 * OpenTelemetry tracing setup.
 * Provides distributed tracing for HTTP requests and Socket.io events.
 * Exports metrics to Prometheus format.
 */

// Enable internal diagnostics in development
if (process.env.NODE_MODE !== 'production') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

// Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter(
  { port: 9464 }, // metrics available at http://localhost:9464/metrics
  () => console.log('[tracing] Prometheus exporter started on port 9464')
);

// SDK configuration
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'brace-rce-server',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || 'unknown',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_MODE || 'development',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable some noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      
      // Explicitly configure key instrumentations
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-socket.io': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
    }),
  ],
  metricReader: prometheusExporter,
});

/**
 * Initialize tracing. Call this early in your application startup.
 */
export function initTracing(): NodeSDK {
  try {
    sdk.start();
    console.log('[tracing] OpenTelemetry initialized');
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => console.log('[tracing] Shutdown complete'))
        .catch((err) => console.error('[tracing] Shutdown error:', err))
        .finally(() => process.exit(0));
    });
    
    return sdk;
  } catch (error) {
    console.error('[tracing] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Get the SDK instance for advanced usage
 */
export function getTracingSDK(): NodeSDK {
  return sdk;
}

/**
 * Create a custom span for business logic
 */
export { trace, context, SpanStatusCode } from '@opentelemetry/api';

export default sdk;