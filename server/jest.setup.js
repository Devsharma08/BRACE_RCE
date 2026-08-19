process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/brace_db";
process.env.DIRECT_URL = process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/brace_db";
process.env.JWT_SECRET = process.env.JWT_SECRET || "development-only-secret-key";
