import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const problems = await prisma.problem.findMany();
  let count = 0;

  for (const p of problems) {
    // Generate 13 more test cases
    const newCases = [];
    for (let i = 1; i <= 13; i++) {
      if (p.name.includes("Two Sum")) {
        newCases.push({
          input: `[${i}, ${i+1}, ${i+2}, ${i+3}]\n${i + (i+3)}\n`,
          expectedOutput: `[0, 3]\n`,
          is_public: true,
          problemId: p.id
        });
      } else {
        newCases.push({
          input: `[${i}, ${i * 2}, ${i * 3}]\n${i * 10}\n`,
          expectedOutput: `[${i}, ${i}]\n`,
          is_public: true,
          problemId: p.id
        });
      }
    }
    await prisma.testCase.createMany({ data: newCases });
    count += newCases.length;
  }
  
  console.log(`Added ${count} dummy test cases across all problems!`);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});
