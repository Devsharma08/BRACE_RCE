import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
import { rawProblems as problems } from "./leetcodeProblems.js";

async function main() {
  console.log("🌱 Starting seed for LeetCode problems...\n");
  console.log("📡 Connecting to:", process.env.DIRECT_URL?.replace(/:([^@]+)@/, ":***@"));

  console.log("🗑️  Wiping old records...");
  await prisma.problem.deleteMany();

  for (const p of problems) {
    const { test_cases, code_snippets, ...problemData } = p;

    const problem = await prisma.problem.upsert({
      where: { problem_number: problemData.problem_number },
      update: problemData,
      create: problemData,
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

  console.log("\n🎉 Seed complete!");
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
