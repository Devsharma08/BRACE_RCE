process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/brace_db";
process.env.DIRECT_URL = process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/brace_db";
process.env.JWT_SECRET = process.env.JWT_SECRET || "development-only-secret-key";
// The /execute route's in-memory burst limiter defaults to 15/min in
// production; test files issue many requests from one IP, so raise the
// ceiling before the route module (and its limiter) is imported.
process.env.EXECUTE_RATE_MAX = process.env.EXECUTE_RATE_MAX || "500";
