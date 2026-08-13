import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.testCase.deleteMany({
    where: {
      input: "[1, 2, 3]",
      expectedOutput: "10",
    }
  });
  console.log(`Deleted ${result.count} dummy test cases.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
