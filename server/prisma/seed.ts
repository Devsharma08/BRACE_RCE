import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
import { rawProblems as problems } from "./leetcodeProblems.js";
import { LEARNING_PATH_BLUEPRINT } from "./learningPathsData.js";
import { displayProblemName } from "../src/utils/problemName.js";

async function seedLearningPaths() {
  console.log("\n🌱 Seeding learning paths...");

  // Clear existing learning paths
  await prisma.learningItem.deleteMany();
  await prisma.userLearningProgress.deleteMany();
  await prisma.userLearningSummary.deleteMany();

  // Problem lookup is keyed by the stable LeetCode number, never by the
  // user-facing title or the legacy filename-style name.
  const problems = await prisma.problem.findMany({
    where: { isCustom: false },
    select: { id: true, problem_number: true },
  });
  const problemIdByLc = new Map<number, string>();
  for (const problem of problems) {
    if (problem.problem_number != null) problemIdByLc.set(problem.problem_number, problem.id);
  }

  // Pass 1 — create items with their problem links (LEARNING_PATH_BLUEPRINT)
  const itemIdByName = new Map<string, string>();
  for (const blueprint of LEARNING_PATH_BLUEPRINT) {
    const problemIds = blueprint.lcNumbers
      .map((lc) => problemIdByLc.get(lc))
      .filter((id): id is string => Boolean(id));
    const item = await prisma.learningItem.create({
      data: {
        name: blueprint.name,
        order: blueprint.order,
        category: blueprint.category,
        description: blueprint.description,
        problemIds,
      },
    });
    itemIdByName.set(blueprint.name, item.id);
  }

  // Pass 2 — resolve prerequisites / nextStructures names to LearningItem ids
  for (const blueprint of LEARNING_PATH_BLUEPRINT) {
    const id = itemIdByName.get(blueprint.name)!;
    const resolve = (names: string[]) =>
      names.map((name) => itemIdByName.get(name)).filter((value): value is string => Boolean(value));
    await prisma.learningItem.update({
      where: { id },
      data: {
        prerequisites: resolve(blueprint.prerequisites),
        nextStructures: resolve(blueprint.nextStructures),
      },
    });
  }

  const problemLinks = LEARNING_PATH_BLUEPRINT.reduce((total, b) => total + b.lcNumbers.length, 0);
  console.log("✅ Learning paths seeded successfully!");
  console.log(`  Created ${itemIdByName.size} learning items with ${problemLinks} problem links`);
}

async function main() {
  console.log("🌱 Starting seed for LeetCode problems...\n");
  console.log("📡 Connecting to:", process.env.DIRECT_URL?.replace(/:([^@]+)@/, ":***@"));

  console.log("🗑️  Wiping old records...");
  await prisma.problem.deleteMany();

  for (const p of problems) {
    const { test_cases, code_snippets, ...problemData } = p;
    const canonicalProblemData = {
      ...problemData,
      name: displayProblemName(problemData.name, problemData.problem_number, problemData.problem_definition),
    };

    const problem = await prisma.problem.upsert({
      where: { problem_number: canonicalProblemData.problem_number },
      update: canonicalProblemData,
      create: canonicalProblemData,
    });

    await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
    await prisma.codeSnippet.deleteMany({ where: { problemId: problem.id } });

    await prisma.testCase.createMany({
      data: test_cases.map((tc) => ({ ...tc, problemId: problem.id })),
    });
    await prisma.codeSnippet.createMany({
      data: code_snippets.map((cs) => ({ ...cs, problemId: problem.id })),
    });

    console.log(`✅ Seeded: [#${problem.problem_number}] ${problem.name} (${problem.difficulty_level})`);
  }

  // Overlay rich HTML descriptions (with embedded Example Input/Output blocks)
  // from problems_seed.json. leetcodeProblems.ts only carries plain one-liners;
  // PracticeSidebar/Battle render problem_definition as HTML and expect the
  // examples to be embedded there.
  try {
    const richPath = path.resolve(process.cwd(), "../problems_seed.json");
    const richData = JSON.parse(fs.readFileSync(richPath, "utf8"));
    const richByNum = new Map<number, string>(
      (richData.problems ?? [])
        .filter((rp: { problem_number?: number; problem_definition?: string }) =>
          rp?.problem_number != null &&
          typeof rp.problem_definition === "string" &&
          rp.problem_definition.includes("<"))
        .map((rp: { problem_number: number; problem_definition: string }) => [rp.problem_number, rp.problem_definition])
    );
    let overlaid = 0;
    const seeded = await prisma.problem.findMany({ select: { id: true, problem_number: true } });
    for (const prob of seeded) {
      const richDef = prob.problem_number != null ? richByNum.get(prob.problem_number) : undefined;
      if (richDef) {
        await prisma.problem.update({ where: { id: prob.id }, data: { problem_definition: richDef } });
        overlaid++;
      }
    }
    console.log(`📝 Overlaid rich descriptions: ${overlaid} (${richByNum.size} available in JSON)`);
  } catch {
    console.warn("⚠️  problems_seed.json not found — skipping rich description overlay");
  }

  await seedLearningPaths();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
