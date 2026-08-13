const { PrismaClient } = require("./server/node_modules/@prisma/client");
const prisma = new PrismaClient();
prisma.problem.findMany({ include: { test_cases: true } }).then(p => {
  console.log(p.map(x => ({ name: x.name, total: x.test_cases.length, public: x.test_cases.filter(t => t.is_public).length })))
}).catch(console.error);
