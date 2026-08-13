const { PrismaClient } = require("./server/node_modules/@prisma/client");
const prisma = new PrismaClient();
prisma.event.findFirst({
  orderBy: { createdAt: 'desc' },
  include: { commonProblem: true, problems: true }
}).then(e => {
  if(e.commonProblem) {
    console.log("Recent problem:", e.commonProblem.name, e.commonProblem.problem_number);
  } else if (e.problems && e.problems.length > 0) {
    console.log("Recent problem:", e.problems[0].name, e.problems[0].problem_number);
  } else {
    console.log("No problems found in recent event");
  }
}).catch(console.error);
