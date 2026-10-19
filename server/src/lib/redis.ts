import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let _client: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (!_client) {
    _client = createClient({
      url: REDIS_URL,
    });
    _client.on("error", (err: Error) => logger.error(`Redis client error: ${err.message}`));
    _client.on("connect", () => logger.info("Redis: connected"));
    _client.on("reconnecting", (delay: number) => logger.info(`Redis: reconnecting in ${delay}ms`));
  }
  if (!_client.isOpen) {
    void _client.connect().catch((err: Error) => logger.error(`Redis connect error: ${err.message}`));
  }
  return _client;
}

export async function closeRedisClient(): Promise<void> {
  if (_client && _client.isOpen) {
    await _client.quit();
    _client = null;
  }
}

export async function checkRedisHealth(): Promise<{ backend: "redis" | "memory"; healthy: boolean; latencyMs?: number }> {
  try {
    const start = Date.now();
    const client = getRedisClient();
    if (!client.isOpen) {
      return { backend: "memory", healthy: true, latencyMs: Date.now() - start };
    }
    await client.ping();
    return { backend: "redis", healthy: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { backend: "memory", healthy: false };
  }
}
