import { randomInt } from "node:crypto";

/** Generate a 6-digit numeric one-time password. */
export function generateOtp(): string {
  return String(randomInt(100000, 1_000_000));
}
