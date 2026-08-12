import { PrismaClient } from "./src/generated/prisma/index.js";
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://neondb_owner:npg_tgoKU4F9QjqV@ep-small-wind-aovkqpej.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" } } });
async function main() {
  const p = await prisma.problem.findUnique({
    where: { github_oid: "3589b6cae424511420a375ea3d0929cf6d0e473b" },
    include: { code_snippets: true }
  });
  console.log(JSON.stringify(p?.code_snippets, null, 2));
}
main().finally(() => prisma.$disconnect());
