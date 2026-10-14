import { describe, test, expect } from "@jest/globals";
import {
  BASE_RATING,
  BATTLE_BASE_POINTS,
  calculateBattlePoints,
  calculateEloDelta,
  computeRatingFromHistory,
  expectedScore,
  focusPenaltyDeduction,
  getTierForRating,
  maxAwardForDifficulty,
  outcomeFromStatus,
  pointsForDifficulty,
  resolveBattleOutcome,
} from "./elo.js";

describe("ELO Rating System (ROADMAP §1)", () => {
  test("win against equal opponent gains rating, loss loses rating", () => {
    const winDelta = calculateEloDelta(BASE_RATING, BASE_RATING, "WIN");
    const lossDelta = calculateEloDelta(BASE_RATING, BASE_RATING, "LOSS");
    expect(winDelta).toBeGreaterThan(0);
    expect(lossDelta).toBeLessThan(0);
  });

  test("beating a stronger opponent gains more than beating a weaker one", () => {
    const upset = calculateEloDelta(1000, 1400, "WIN");
    const expected = calculateEloDelta(1400, 1000, "WIN");
    expect(upset).toBeGreaterThan(expected);
  });

  test("expectedScore is symmetric around 0.5", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
  });

  test("outcomeFromStatus maps performance statuses", () => {
    expect(outcomeFromStatus("WON")).toBe("WIN");
    expect(outcomeFromStatus("PASSED")).toBe("WIN");
    expect(outcomeFromStatus("FAILED")).toBe("LOSS");
    expect(outcomeFromStatus("SURRENDER")).toBe("LOSS");
    expect(outcomeFromStatus("PENDING")).toBeNull();
  });

  test("fast wins earn a speed bonus, many attempts reduce gains", () => {
    const fast = calculateEloDelta(1000, 1000, "WIN", { timeTakenMs: 60_000, totalTimeLimitMs: 600_000, attempts: 1 });
    const slowMany = calculateEloDelta(1000, 1000, "WIN", { timeTakenMs: 590_000, totalTimeLimitMs: 600_000, attempts: 6 });
    expect(fast).toBeGreaterThan(slowMany);
  });

  test("computeRatingFromHistory folds wins and losses sequentially", () => {
    const rating = computeRatingFromHistory([
      { status: "WON" },
      { status: "WON" },
      { status: "LOST" },
    ]);
    expect(rating).toBeGreaterThan(BASE_RATING);
  });

  test("tier thresholds match roadmap divisions", () => {
    expect(getTierForRating(900)).toBe("Bronze");
    expect(getTierForRating(1150)).toBe("Silver");
    expect(getTierForRating(1350)).toBe("Gold");
    expect(getTierForRating(1600)).toBe("Platinum");
    expect(getTierForRating(1900)).toBe("Cyber-Master");
  });
});

describe("Battle points model (Task 3)", () => {
  test("difficulty scales the max award", () => {
    expect(pointsForDifficulty("EASY")).toBe(BATTLE_BASE_POINTS);
    expect(pointsForDifficulty("MEDIUM")).toBe(BATTLE_BASE_POINTS * 2);
    expect(pointsForDifficulty("HARD")).toBe(BATTLE_BASE_POINTS * 3);
    expect(maxAwardForDifficulty("MEDIUM")).toBe(pointsForDifficulty("MEDIUM"));
  });

  test("outcome resolves win / tie / loss from pass flags", () => {
    expect(resolveBattleOutcome(true, false)).toBe("WIN");
    expect(resolveBattleOutcome(false, true)).toBe("LOSS");
    expect(resolveBattleOutcome(true, true)).toBe("DRAW");
    expect(resolveBattleOutcome(false, false)).toBe("DRAW");
    expect(resolveBattleOutcome(true, null)).toBe("WIN");
    expect(resolveBattleOutcome(false, null)).toBe("LOSS");
  });

  test("win pays +max, tie pays 0, loss floors at 0", () => {
    const max = pointsForDifficulty("MEDIUM");
    expect(calculateBattlePoints("WIN", "MEDIUM").finalPoints).toBe(max);
    expect(calculateBattlePoints("DRAW", "MEDIUM").finalPoints).toBe(0);
    expect(calculateBattlePoints("LOSS", "MEDIUM").finalPoints).toBe(0);
    expect(calculateBattlePoints("LOSS", "MEDIUM").delta).toBe(-max);
  });

  test("focus penalty is cut from the max award, never below 0", () => {
    const max = pointsForDifficulty("HARD");
    const win = calculateBattlePoints("WIN", "HARD", 10);
    expect(win.penaltyDeduction).toBe(focusPenaltyDeduction(max, 10));
    expect(win.finalPoints).toBe(max - win.penaltyDeduction);
    // A penalised tie still floors at 0 rather than going negative.
    expect(calculateBattlePoints("DRAW", "HARD", 50).finalPoints).toBe(0);
  });
});
