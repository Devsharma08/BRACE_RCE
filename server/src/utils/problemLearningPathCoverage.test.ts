import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";
import { LEARNING_PATH_BLUEPRINT } from "../../prisma/learningPathsData.js";

const HISTORICAL_124_NUMBERS = new Set([
  ...Array.from({ length: 34 }, (_, index) => index + 1),
  ...Array.from({ length: 90 }, (_, index) => index + 100),
]);

const currentSeedNumbers = (): Set<number> => {
  const seedPath = path.resolve(process.cwd(), "../problems_seed.json");
  const payload = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    problems?: Array<{ problem_number?: number }>;
  };
  return new Set(
    (payload.problems ?? [])
      .map((problem) => problem.problem_number)
      .filter((problemNumber): problemNumber is number => typeof problemNumber === "number"),
  );
};

describe("learning-path problem coverage", () => {
  test("maps every original 124-problem number", () => {
    const mapped = new Set(LEARNING_PATH_BLUEPRINT.flatMap((item) => item.lcNumbers));
    expect([...HISTORICAL_124_NUMBERS].filter((number) => !mapped.has(number))).toEqual([]);
  });

  test("maps every problem in the current seed JSON", () => {
    const mapped = new Set(LEARNING_PATH_BLUEPRINT.flatMap((item) => item.lcNumbers));
    expect([...currentSeedNumbers()].filter((number) => !mapped.has(number))).toEqual([]);
  });
});
