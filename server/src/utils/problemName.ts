import fs from "node:fs";
import path from "node:path";

/**
 * Problem rows created by the original filename-based seeder used names such as
 * `LeetCode-01E`. Keep that convention out of the application API: the seed
 * JSON is the title source, while `problem_number` remains the stable ID used
 * by learning paths and execution routing.
 */
let titleIndex: Map<number, string> | undefined;

const loadTitleIndex = (): Map<number, string> => {
  if (titleIndex) return titleIndex;

  titleIndex = new Map<number, string>();
  const candidates = [
    path.resolve(process.cwd(), "problems_seed.json"),
    path.resolve(process.cwd(), "../problems_seed.json"),
  ];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const payload = JSON.parse(fs.readFileSync(file, "utf8")) as {
        problems?: Array<{ problem_number?: number; name?: string }>;
      };
      for (const problem of payload.problems ?? []) {
        if (typeof problem.problem_number === "number" && problem.name) {
          titleIndex.set(problem.problem_number, problem.name);
        }
      }
      break;
    } catch {
      // A deployment may not ship the seed JSON. The definition fallback below
      // still handles the common one-line legacy records.
    }
  }

  return titleIndex;
};

const legacyNumber = (name: string): number | undefined => {
  const match = name.trim().match(/^LeetCode-?(\d+)(?:[EMH])?$/i);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

const titleFromDefinition = (definition?: string | null): string | undefined => {
  if (!definition) return undefined;
  const plain = definition
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const separator = plain.indexOf(" - ");
  return separator > 0 ? plain.slice(0, separator).trim() : undefined;
};

/** Return the user-facing title for a system problem without changing its ID. */
export const displayProblemName = (
  name: string,
  problemNumber?: number | null,
  definition?: string | null,
): string => {
  const encodedNumber = legacyNumber(name);
  if (encodedNumber === undefined) return name;

  const canonical = typeof problemNumber === "number"
    ? loadTitleIndex().get(problemNumber)
    : loadTitleIndex().get(encodedNumber);
  return canonical ?? titleFromDefinition(definition) ?? name;
};

type ProblemNameFields = {
  name: string;
  problem_number?: number | null;
  problem_definition?: string | null;
};

/** Add the display title to a Prisma-shaped payload without mutating it. */
export const withDisplayProblemName = <T extends ProblemNameFields>(problem: T): T => ({
  ...problem,
  name: displayProblemName(problem.name, problem.problem_number, problem.problem_definition),
});
