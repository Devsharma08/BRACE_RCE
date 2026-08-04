import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const perfs = await prisma.userPersonalPerformance.findMany({ include: { event: { include: { commonProblem: true }} }});
  console.log(JSON.stringify(perfs, null, 2));
}
main()
