import { describe, test, expect } from "@jest/globals";
import {
  BASE_RATING,
  calculateEloDelta,
  computeRatingFromHistory,
  expectedScore,
  getTierForRating,
  outcomeFromStatus,
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
