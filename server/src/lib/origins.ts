/**
 * Read allowed origins from env (ALLOWED_ORIGINS is a comma-separated list).
 * Values are normalised (quotes stripped, trimmed, trailing slashes removed,
 * duplicates removed) because browsers send the `Origin` header bare — e.g.
 * `http://localhost:5173` — so a configured `"http://localhost:5173/"` would
 * otherwise never match and every preflight would fail silently.
 *
 * Shared by app.ts (CORS), index.ts (socket.io CORS), and
 * middleware/executionGuard.ts (server-side Origin enforcement on /execute).
 */
export const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const origins = envOrigins
    ? envOrigins.split(",")
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

  return Array.from(
    new Set(
      origins
        .map((o) => o.trim().replace(/^[\"']|[\"']$/g, "").replace(/\/+$/, ""))
        .filter(Boolean)
    )
  );
};