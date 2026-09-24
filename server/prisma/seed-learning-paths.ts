/**
 * Idempotent population script for the learning & recommendation module.
 *
 *   cd server
 *   npx tsx prisma/seed-learning-paths.ts
 *   npx tsx prisma/seed-learning-paths.ts --demo-progress test@mail.com
 *
 * What it does
 * ------------
 * 1. Upserts the 12 learning items from LEARNING_PATH_BLUEPRINT (matched by
 *    name — existing ids are preserved so UserLearningProgress rows are never
 *    orphaned by a re-run).
 * 2. Links every item to real Problem rows (`problemIds`) via the seeded name
 *    convention ("LeetCode-01E" → LC 1) and the blueprint's lcNumbers.
 * 3. Wires prerequisites / nextStructures to LearningItem ids so
 *    GET /api/learning-paths can resolve prerequisitesDetails /
 *    nextStructuresDetails and drive its recommendation logic.
 * 4. With --demo-progress <email> it also seeds UserLearningProgress +
 *    UserLearningSummary for that user (first 3 items COMPLETED, 4th
 *    IN_PROGRESS) so the UI lock / complete states can be previewed.
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { LEARNING_PATH_BLUEPRINT } from "./learningPathsData.js";

const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const lcNumberOf = (name: string): number | null => {
  const match = name.match(/LeetCode-?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

async function main() {
  console.log("🧭 Populating learning paths (idempotent)...\n");

  const problems = await prisma.problem.findMany({
    where: { isCustom: false },
    select: { id: true, name: true },
  });
  const problemIdByLc = new Map<number, string>();
  for (const problem of problems) {
    const lc = lcNumberOf(problem.name);
    if (lc != null && !problemIdByLc.has(lc)) problemIdByLc.set(lc, problem.id);
  }
  console.log(`📚 Problem pool: ${problems.length} rows, ${problemIdByLc.size} resolvable LC numbers`);

  // ── Pass 1: items (problem links; ids preserved on update) ───────────────
  const itemIdByName = new Map<string, string>();
  const missingByItem = new Map<string, number[]>();

  for (const blueprint of LEARNING_PATH_BLUEPRINT) {
    const problemIds = blueprint.lcNumbers
      .map((lc) => problemIdByLc.get(lc))
      .filter((id): id is string => Boolean(id));
    const missing = blueprint.lcNumbers.filter((lc) => !problemIdByLc.has(lc));
    if (missing.length) missingByItem.set(blueprint.name, missing);

    const existing = await prisma.learningItem.findFirst({ where: { name: blueprint.name } });
    const item = existing
      ? await prisma.learningItem.update({
          where: { id: existing.id },
          data: {
            order: blueprint.order,
            category: blueprint.category,
            description: blueprint.description,
            problemIds,
          },
        })
      : await prisma.learningItem.create({
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

  // ── Pass 2: prerequisite / next-structure ids ────────────────────────────
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

  // ── Report ───────────────────────────────────────────────────────────────
  const items = await prisma.learningItem.findMany({ orderBy: { order: "asc" } });
  const nameById = new Map(items.map((item) => [item.id, item.name]));
  console.log(`\n✅ Learning items: ${items.length}`);
  for (const item of items) {
    const missing = missingByItem.get(item.name);
    console.log(
      `  ${String(item.order).padStart(2, "0")} ${item.name.padEnd(20)}` +
        ` problems:${String(item.problemIds.length).padStart(3)}` +
        ` | prereq: [${item.prerequisites.map((id) => nameById.get(id) ?? id).join(", ")}]` +
        ` | next: [${item.nextStructures.map((id) => nameById.get(id) ?? id).join(", ")}]` +
        (missing ? `  ⚠ missing LC ${missing.join(",")}` : ""),
    );
  }

  // ── Optional demo progress ───────────────────────────────────────────────
  const flagIndex = process.argv.indexOf("--demo-progress");
  if (flagIndex !== -1) {
    const email = process.argv[flagIndex + 1];
    if (!email) {
      console.warn("\n⚠️  --demo-progress needs an email argument");
    } else {
      const user = await prisma.user.findFirst({ where: { email }, select: { id: true, email: true } });
      if (!user) {
        console.warn(`\n⚠️  No user found for ${email}`);
      } else {
        const demoPlan = [
          ...items.slice(0, 3).map((item) => ({ item, status: "COMPLETED" })),
          ...(items[3] ? [{ item: items[3], status: "IN_PROGRESS" }] : []),
        ];
        for (const { item, status } of demoPlan) {
          await prisma.userLearningProgress.upsert({
            where: { userId_learningItemId: { userId: user.id, learningItemId: item.id } },
            create: {
              userId: user.id,
              learningItemId: item.id,
              progressStatus: status,
              lastVisited: new Date(),
            },
            update: { progressStatus: status, lastVisited: new Date() },
          });
        }
        await prisma.userLearningSummary.upsert({
          where: { userId: user.id },
          create: { userId: user.id, completedCount: 3 },
          update: { completedCount: 3, lastUpdated: new Date() },
        });
        console.log(`\n🎯 Demo progress for ${user.email}: 3 COMPLETED, 1 IN_PROGRESS, summary synced`);
      }
    }
  }

  console.log(
    "\nUserLearningProgress/UserLearningSummary stay API-driven (POST /learning-paths/:id/progress) unless --demo-progress is used.",
  );
}

main()
  .catch((error) => {
    console.error("Learning-path population failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
