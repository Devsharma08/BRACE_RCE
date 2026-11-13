import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://brace_user:BraceDb2024Secure@localhost:5432/brace_rce";

const pool = new Pool({
  connectionString,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  errorFormat: "pretty",
});

async function main() {
  const p = await prisma.problem.findUnique({
    where: { id: "37027170-b895-40c7-b132-cb2d3d5dd16d" },
    include: { test_cases: true, code_snippets: { where: { language: "cpp" } } }
  });
  console.log(JSON.stringify(p, null, 2));
}

main().finally(() => prisma.$disconnect());