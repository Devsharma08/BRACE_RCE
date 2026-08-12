import { PrismaClient } from "./server/src/generated/prisma/index.js";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST/YOUR_DB_NAME?sslmode=require"
    }
  }
});

async function main() {
  const p = await prisma.problem.findUnique({
    where: { github_oid: "9ff218f50d90a252c692372a7ace7772a4b36a92" },
    include: { code_snippets: true }
  });

  if (p) {
    const jsSnippet = p.code_snippets.find(s => s.language === "javascript");
    if (jsSnippet) {
      await prisma.codeSnippet.update({
        where: { id: jsSnippet.id },
        data: {
          wrapperCode: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length < 2) process.exit(0);
const points = JSON.parse(input[0]);
const k = parseInt(input[1]);
const res = kClosest(points, k);
console.log(JSON.stringify(res));`
        }
      });
      console.log("Wrapper updated successfully for K Closest Points to Origin!");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
