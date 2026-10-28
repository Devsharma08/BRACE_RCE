import "dotenv/config";
import { prisma } from "../lib/prisma.js";

/**
 * Fixes `timeLimitMs` on all problems based on their `difficulty_level`.
 *
 * Current state: all 209 problems have a common default of 600000ms (10 min).
 * Target state (matching seed data & difficultyTime.ts utility):
 *   EASY   → 900000ms  (15 minutes)
 *   MEDIUM → 1200000ms (20 minutes)
 *   HARD   → 1500000ms (25 minutes)
 *
 * Only updates rows whose current `timeLimitMs` differs from the target,
 * so re-running is safe (idempotent).
 *
 * Usage (from server directory):
 *   npx tsx src/scripts/fix_problem_time_limits.ts --dry   # report only
 *   npx tsx src/scripts/fix_problem_time_limits.ts         # apply updates
 */

const TARGET_LIMITS: Record<string, number> = {
  EASY: 15 * 60 * 1000,   // 900000  — 15 minutes
  MEDIUM: 20 * 60 * 1000, // 1200000 — 20 minutes
  HARD: 25 * 60 * 1000,   // 1500000 — 25 minutes,
};

async function main() {
  const dryRun = process.argv.includes("--dry");

  // Fetch all problems with id, difficulty_level, timeLimitMs
  const problems = await prisma.problem.findMany({
    select: { id: true, name: true, difficulty_level: true, timeLimitMs: true },
    orderBy: { difficulty_level: "asc" },
  });

  console.log(`[fix-time-limits] Found ${problems.length} problems`);

  // Group by difficulty for reporting
  const byDifficulty: Record<string, { total: number; needsUpdate: number }> = {};
  for (const p of problems) {
    if (!byDifficulty[p.difficulty_level]) {
      byDifficulty[p.difficulty_level] = { total: 0, needsUpdate: 0 };
    }
    byDifficulty[p.difficulty_level].total += 1;
  }

  console.log("\n[fix-time-limits] Current distribution:");
  for (const [level, stats] of Object.entries(byDifficulty).sort()) {
    const target = TARGET_LIMITS[level];
    console.log(
      `  ${level}: ${stats.total} problems, target timeLimitMs = ${target}ms (${
        (target / 60000).toFixed(0)
      } min)`,
    );
  }

  // Determine which need updates
  const toUpdate = problems.filter((p) => {
    const target = TARGET_LIMITS[p.difficulty_level];
    return p.timeLimitMs !== target;
  });

  console.log(`\n[fix-time-limits] ${toUpdate.length} problems need timeLimitMs update`);
  console.log(`[fix-time-limits] ${
    problems.length - toUpdate.length
  } problems already have correct timeLimitMs`);

  if (dryRun) {
    console.log("\n[fix-time-limits] DRY RUN — no changes applied.");
    console.log("Would update the following problems:");
    for (const p of toUpdate.slice(0, 20)) {
      const target = TARGET_LIMITS[p.difficulty_level];
      console.log(
        `  ${p.id} | ${p.name} | ${p.difficulty_level} | ${p.timeLimitMs} → ${target}ms`,
      );
    }
    if (toUpdate.length > 20) {
      console.log(`  ... and ${toUpdate.length - 20} more`);
    }
    await prisma.$disconnect();
    return;
  }

  // Apply updates
  let updated = 0;
  let errors = 0;

  for (const p of toUpdate) {
    const target = TARGET_LIMITS[p.difficulty_level];
    try {
      await prisma.problem.update({
        where: { id: p.id },
        data: { timeLimitMs: target },
      });
      updated += 1;
      if (updated % 25 === 0) {
        console.log(`  ... updated ${updated}/${toUpdate.length}`);
      }
    } catch (e) {
      errors += 1;
      console.error(`  ✗ Failed to update ${p.id}: ${e}`);
    }
  }

  console.log(
    `\n[fix-time-limits] Complete: ${updated} updated, ${errors} errors, ${problems.length - toUpdate.length} already correct.`,
  );

  // Verify
  const verify = await prisma.problem.findMany({
    select: { id: true, difficulty_level: true, timeLimitMs: true },
  });
  const mismatched = verify.filter((p) => {
    const target = TARGET_LIMITS[p.difficulty_level];
    return p.timeLimitMs !== target;
  });
  if (mismatched.length > 0) {
    console.warn(
      `[fix-time-limits] WARNING: ${mismatched.length} problems still have mismatched timeLimitMs after update.`,
    );
    for (const p of mismatched.slice(0, 10)) {
      console.warn(`  ${p.id} | ${p.difficulty_level} | ${p.timeLimitMs}ms`);
    }
  } else {
    console.log("[fix-time-limits] Verification: all problems have correct timeLimitMs.");
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("[fix-time-limits] Fatal error:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());