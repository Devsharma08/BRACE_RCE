import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Lazily-initialized Prisma client.
 *
 * This module used to throw at import time when neither DIRECT_URL nor
 * DATABASE_URL was set. That broke every no-database consumer of any module
 * that (transitively) imports it — e.g. CI's `verify_wrapper_shapes` step,
 * which only needs the pure `prepareFinalCode` from `codeExecution.ts` but
 * crashed on import because `codeExecution.ts` imports `prisma` at module top.
 *
 * Nothing here connects at import time anymore. The real client is created on
 * first property access; if no connection string is configured at that point,
 * the same error is thrown — so a misconfigured production still fails fast,
 * but only when the database is actually used.
 */
function createClient(): PrismaClient {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL must be configured before Prisma starts.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    errorFormat: "pretty",
  });
}

let cached: PrismaClient | null = null;

function ensureClient(): PrismaClient {
  if (!cached) cached = createClient();
  return cached;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureClient(), prop, receiver);
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(ensureClient(), prop, value, receiver);
  },
  has(_target, prop) {
    return Reflect.has(ensureClient(), prop);
  },
});
