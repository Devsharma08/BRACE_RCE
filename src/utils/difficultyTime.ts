/**
 * Difficulty-based time limit resolver for battle events.
 *
 * Precedence:
 *  1. Per-problem `timeLimitMs` (authoritative, set by problem author)
 *  2. Difficulty-based default (EASY=15min, MEDIUM=20min, HARD=25min)
 *  3. Final fallback: 10 minutes (600000 ms)
 *
 * This replaces the previous hardcoded 10-minute default so that each
 * problem difficulty gets an appropriate time budget automatically.
 */

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "ANY" | string;

// Difficulty-based defaults in milliseconds
const DIFFICULTY_DEFAULTS_MS: Record<string, number> = {
  EASY: 15 * 60 * 1000,    // 15 minutes
  MEDIUM: 20 * 60 * 1000, // 20 minutes
  HARD: 25 * 60 * 1000,   // 25 minutes
  ANY: 20 * 60 * 1000,    // 20 minutes
};

const FALLBACK_TIME_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Resolve the time limit for a battle problem.
 *
 * @param difficulty - The problem's difficulty level (EASY/MEDIUM/HARD/ANY)
 * @param problemTimeLimitMs - Per-problem override (takes precedence if set)
 * @returns Time limit in milliseconds
 */
export function getTimeLimitByDifficulty(
  difficulty: DifficultyLevel | undefined | null,
  problemTimeLimitMs: number | undefined | null
): number {
  // 1. Per-problem timeLimitMs is authoritative when present
  if (typeof problemTimeLimitMs === "number" && problemTimeLimitMs > 0) {
    return problemTimeLimitMs;
  }

  // 2. Difficulty-based default
  if (difficulty && DIFFICULTY_DEFAULTS_MS[difficulty] !== undefined) {
    return DIFFICULTY_DEFAULTS_MS[difficulty];
  }

  // 3. Final fallback
  return FALLBACK_TIME_LIMIT_MS;
}

/**
 * Format milliseconds as MM:SS string.
 */
export function formatMsToMMSS(ms: number | null): string {
  if (ms === null || ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}