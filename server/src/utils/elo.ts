/**
 * Skill-Based ELO & Rating Tier System (ROADMAP §1)
 *
 * Pure, dependency-free functions so they can be unit-tested without a DB.
 * Ratings are *derived* from existing UserPersonalPerformance rows, so no
 * Prisma migration is required: every user starts at BASE_RATING and each
 * finished performance adjusts the rating sequentially.
 */

export const BASE_RATING = 1000;
export const K_FACTOR = 32;

export type MatchOutcome = "WIN" | "LOSS" | "DRAW";

/** Performance statuses that count as a win / loss for rating purposes. */
export function outcomeFromStatus(status: string | null | undefined): MatchOutcome | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "WON" || s === "PASSED" || s === "COMPLETED") return "WIN";
  if (s === "LOST" || s === "FAILED" || s === "SURRENDER" || s === "TIMEOUT") return "LOSS";
  return null; // PENDING and friends do not move rating
}

export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function actualScore(outcome: MatchOutcome): number {
  if (outcome === "WIN") return 1;
  if (outcome === "LOSS") return 0;
  return 0.5;
}

/**
 * Standard ELO delta, adjusted by:
 *  - timeBonus: faster wins gain slightly more (0..K*0.25)
 *  - attemptPenalty: extra submission attempts reduce gains (up to K*0.25)
 */
export function calculateEloDelta(
  playerRating: number,
  opponentRating: number,
  outcome: MatchOutcome,
  opts: { timeTakenMs?: number | null; totalTimeLimitMs?: number | null; attempts?: number | null } = {},
): number {
  const expected = expectedScore(playerRating, opponentRating);
  const actual = actualScore(outcome);
  let delta = K_FACTOR * (actual - expected);

  if (outcome === "WIN") {
    const { timeTakenMs, totalTimeLimitMs, attempts } = opts;
    if (typeof timeTakenMs === "number" && typeof totalTimeLimitMs === "number" && totalTimeLimitMs > 0) {
      const speedRatio = Math.max(0, Math.min(1, 1 - timeTakenMs / totalTimeLimitMs));
      delta += Math.round(speedRatio * (K_FACTOR * 0.25));
    }
    if (typeof attempts === "number" && attempts > 1) {
      delta -= Math.min(K_FACTOR * 0.25, (attempts - 1) * 2);
    }
  }

  return Math.round(delta);
}

export type RatingTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Cyber-Master";

export function getTierForRating(rating: number): RatingTier {
  if (rating >= 1800) return "Cyber-Master";
  if (rating >= 1500) return "Platinum";
  if (rating >= 1300) return "Gold";
  if (rating >= 1100) return "Silver";
  return "Bronze";
}

export interface RatedPerformance {
  status: string;
  timeTakenMs?: number | null;
  attemptCount?: number | null;
  opponentRating?: number | null;
}

/** Fold a user's finished performances (oldest → newest) into a rating. */
export function computeRatingFromHistory(performances: RatedPerformance[]): number {
  let rating = BASE_RATING;
  for (const p of performances) {
    const outcome = outcomeFromStatus(p.status);
    if (!outcome) continue;
    const opponent = typeof p.opponentRating === "number" ? p.opponentRating : BASE_RATING;
    rating += calculateEloDelta(rating, opponent, outcome, {
      timeTakenMs: p.timeTakenMs ?? undefined,
      attempts: p.attemptCount ?? undefined,
    });
    rating = Math.max(100, rating); // floor so ratings never go degenerate
  }
  return Math.round(rating);
}
