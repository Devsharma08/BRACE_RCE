// Skill-Based ELO & Rating Tier System (ROADMAP §1)

// Pure, dependency-free functions so they can be unit-tested without a DB.
// Ratings are *derived* from existing UserPersonalPerformance rows, so no
// Prisma migration is required: every user starts at BASE_RATING and each
// finished performance adjusts the rating sequentially.

export const BASE_RATING = 1000;
export const K_FACTOR = 32;

export type MatchOutcome = "WIN" | "LOSS" | "DRAW" | "BOTH_LOST";

/** 
 * Outcome resolution for 1v1 battle.
 * - Normal cases preserved (WIN/LOSS/DRAW)
 * - New: when both players fail to pass (no row / absent), it's BOTH_LOST
 *   instead of DRAW, with points deduction for both players.
 */
export function resolveBattleOutcome(
  myPassed: boolean,
  opponentPassed: boolean | null
): MatchOutcome {
  if (opponentPassed === null || opponentPassed === undefined) {
    return myPassed ? "WIN" : "LOSS";
  }
  if (myPassed && !opponentPassed) return "WIN";
  if (!myPassed && opponentPassed) return "LOSS";
  // Both passed or both failed → previously DRAW, now BOTH_LOST with penalty
  return "BOTH_LOST";
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
 * Explicit win / tie / loss points model (Task 3).
 *
 * ELO above stays as the secondary derived rating so existing rating
 * displays keep working. These helpers give battles an explicit,
 * difficulty-scaled points layer on top:
 *
 * - Win  (you PASS, opponent FAILED/absent): +basePoints scaled by difficulty
 * - Tie  (both PASS or both FAILED):          0 delta, minus focus-penalty
 * - Loss:                                    -basePoints (floored to 0 at apply)
 * - Both Lost:                               -basePoints - penalty (negative points)
 *
 * Focus-penalty percentage is always applied against the max award for the
 * difficulty — never against the raw delta — so a penalty hurts a win as
 * much as it hurts a tie.
 */
export const BATTLE_BASE_POINTS = 100;

export function pointsForDifficulty(difficulty?: string | null): number {
  const d = (difficulty ?? "").toUpperCase();
  if (d === "EASY") return BATTLE_BASE_POINTS;
  if (d === "HARD") return BATTLE_BASE_POINTS * 3;
  // MEDIUM / ANY / unknown all pay the medium award.
  return BATTLE_BASE_POINTS * 2;
}

/** Max award for a difficulty — the base the focus penalty is cut from. */
export function maxAwardForDifficulty(difficulty?: string | null): number {
  return pointsForDifficulty(difficulty);
}

/** Focus-penalty deduction: penalty% of the max award (not of the delta). */
export function focusPenaltyDeduction(maxAward: number, penaltyPercent?: number | null): number {
  const pct = Math.max(0, Math.min(100, penaltyPercent ?? 0));
  if (pct === 0 || maxAward <= 0) return 0;
  return Math.floor((maxAward * pct) / 100);
}

/** Resolve a 1v1 outcome from pass flags.
 * `opponentPassed === null` means the opponent is absent / has no row yet —
 * a pass then counts as a win, a non-pass as a loss.
 * Same result on both sides (both PASS or both FAILED) is a tie.
 * New: both failed → BOTH_LOST with penalty.
 */

export interface BattlePointsResult {
  outcome: MatchOutcome;
  maxAward: number;
  delta: number;
  penaltyDeduction: number;
  /** Delta with the penalty cut. Can be negative if both players "both lost". */
  finalPoints: number;
}

/** 
 * Explicit points for one player: 
 * - win = +max, tie = 0, loss = -max, both_lost = -max - penalty
 * Then subtract penalty% of max and floor at 0 *unless* both_lost, 
 * then allow negative to represent penalty.
 */
export function calculateBattlePoints(
  outcome: MatchOutcome,
  difficulty?: string | null,
  focusPenaltyPercent?: number | null,
  allowNegative?: boolean
): BattlePointsResult {
  const maxAward = maxAwardForDifficulty(difficulty);
  const penaltyDeduction = focusPenaltyDeduction(maxAward, focusPenaltyPercent);
  const delta = outcome === "WIN" ? maxAward : outcome === "LOSS" ? -maxAward : outcome === "BOTH_LOST" ? -maxAward : 0;
  const finalPoints = allowNegative && outcome === "BOTH_LOST"
    ? -maxAward - penaltyDeduction
    : Math.max(0, delta - penaltyDeduction);
  return { outcome, maxAward, delta, penaltyDeduction, finalPoints };
}

/** Standard ELO delta, adjusted by:
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

/** Maps performance status to MatchOutcome for ELO purposes. */
export function outcomeFromStatus(status: string | null | undefined): MatchOutcome | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "WON" || s === "PASSED" || s === "COMPLETED") return "WIN";
  if (s === "LOST" || s === "FAILED" || s === "SURRENDER" || s === "TIMEOUT") return "LOSS";
  if (s === "DRAW" || s === "TIED" || s === "TIE") return "DRAW";
  return null; // PENDING and friends do not move rating
}
