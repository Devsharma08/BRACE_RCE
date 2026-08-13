import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./src/generated/prisma/client.js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type TC = { input: string; expectedOutput: string };

const CASES: Record<string, TC[]> = {
  // LeetCode-853M = Car Fleet (duplicate record)
  "LeetCode-853M": [
    { input: "12\n[10,8,0,5,3]\n[2,4,1,1,3]", expectedOutput: "3" },
    { input: "10\n[3]\n[3]", expectedOutput: "1" },
    { input: "100\n[0,2,4]\n[4,2,1]", expectedOutput: "1" },
    { input: "10\n[8,3,7,4,6,5]\n[4,4,4,4,4,4]", expectedOutput: "6" },
    { input: "20\n[6,2,17]\n[3,9,2]", expectedOutput: "2" },
  ],
  // LeetCode-271M = Encode and Decode Strings
  "LeetCode-271M": [
    { input: '["Hello","World"]', expectedOutput: '["Hello","World"]' },
    { input: '[""]', expectedOutput: '[""]' },
    { input: '["a"]', expectedOutput: '["a"]' },
    { input: '["lint","code","love","you"]', expectedOutput: '["lint","code","love","you"]' },
    { input: '["we","say",":","yes"]', expectedOutput: '["we","say",":","yes"]' },
    { input: '["hello","world","!"]', expectedOutput: '["hello","world","!"]' },
    { input: '["a","b","c"]', expectedOutput: '["a","b","c"]' },
    { input: '["",""]', expectedOutput: '["",""]' },
  ],
  // LeetCode-277M = Find the Celebrity
  "LeetCode-277M": [
    { input: "[[1,1,0],[0,1,0],[1,1,1]]", expectedOutput: "1" },
    { input: "[[1,0,1],[1,1,0],[0,1,1]]", expectedOutput: "-1" },
    { input: "[[1]]", expectedOutput: "0" },
    { input: "[[1,0],[1,1]]", expectedOutput: "0" },
    { input: "[[1,1],[0,1]]", expectedOutput: "1" },
  ],
  // LeetCode-759H = Employee Free Time (complex interval problem)
  "LeetCode-759H": [
    { input: "[[[1,3],[6,7]],[[2,4]],[[2,5],[9,12]]]", expectedOutput: "[[5,6],[7,9]]" },
    { input: "[[[1,3],[6,7]],[[2,4]]]", expectedOutput: "[[4,6]]" },
    { input: "[[[1,2],[2,3],[3,4]],[[1,4]]]", expectedOutput: "[]" },
    { input: "[[[1,3]],[[3,5]]]", expectedOutput: "[]" },
    { input: "[[[1,2]],[[3,4]]]", expectedOutput: "[[2,3]]" },
  ],
  // JS functional problems — test with simple JSON
  "Debounce": [
    { input: '1000\n[100,200,300]', expectedOutput: "1" },
    { input: '500\n[100,600]', expectedOutput: "2" },
    { input: '200\n[50,100,150,800]', expectedOutput: "2" },
  ],
  "Cache With Time Limit": [
    { input: '"set"\n1\n42\n1000\n"get"\n1\n"count"', expectedOutput: "[true,42,1]" },
    { input: '"set"\n1\n42\n50\n"get"\n1\n"count"', expectedOutput: "[true,-1,0]" },
    { input: '"set"\n1\n1\n1000\n"set"\n1\n2\n1000\n"get"\n1\n"count"', expectedOutput: "[true,false,1,1]" },
  ],
  "Promise Time Limit": [
    { input: '1000\n100', expectedOutput: '"resolved"' },
    { input: '50\n100', expectedOutput: '"Time Limit Exceeded"' },
    { input: '500\n200', expectedOutput: '"resolved"' },
  ],
  "Execute Asynchronous Functions in Parallel": [
    { input: '[100,200,300]', expectedOutput: "[100,200,300]" },
    { input: '[200]', expectedOutput: "[200]" },
    { input: '[]', expectedOutput: "[]" },
  ],
  "Join Two Arrays by ID": [
    { input: '[{"id":1,"x":1},{"id":2,"x":9}]\n[{"id":3,"x":5}]', expectedOutput: '[{"id":1,"x":1},{"id":2,"x":9},{"id":3,"x":5}]' },
    { input: '[{"id":1,"x":1},{"id":2,"x":9}]\n[{"id":1,"y":3}]', expectedOutput: '[{"id":1,"x":1,"y":3},{"id":2,"x":9}]' },
    { input: '[{"id":1,"b":{"b":94},"v":[4,4],"y":48}]\n[{"id":1,"b":{"c":84},"v":[1,3]}]', expectedOutput: '[{"id":1,"b":{"c":84},"v":[1,3],"y":48}]' },
    { input: '[]\n[]', expectedOutput: '[]' },
    { input: '[{"id":1}]\n[{"id":2}]', expectedOutput: '[{"id":1},{"id":2}]' },
  ],
  // LeetCode-2705M = Compact Object
  "LeetCode-2705M": [
    { input: '{"a":null,"b":{"c":1,"d":false,"e":"hello"},"f":[null,1,2,null]}', expectedOutput: '{"b":{"c":1,"e":"hello"},"f":[1,2]}' },
    { input: '[null, 0, false, 1]', expectedOutput: "[1]" },
    { input: '{"a":{"b":{"c":{"d":{},"e":1}}},"f":null}', expectedOutput: '{"a":{"b":{"c":{"e":1}}}}' },
  ],
  // LeetCode-2721M = Execute Async Functions in Parallel
  "LeetCode-2721M": [
    { input: '[100,200,300]', expectedOutput: "[100,200,300]" },
    { input: '[200]', expectedOutput: "[200]" },
    { input: '[]', expectedOutput: "[]" },
  ],
  // LeetCode-2622M = Cache With Time Limit
  "LeetCode-2622M": [
    { input: '"set"\n1\n42\n1000\n"get"\n1\n"count"', expectedOutput: "[true,42,1]" },
    { input: '"set"\n1\n42\n50\n"get"\n1\n"count"', expectedOutput: "[true,-1,0]" },
    { input: '"set"\n1\n1\n1000\n"set"\n1\n2\n1000\n"get"\n1\n"count"', expectedOutput: "[true,false,1,1]" },
  ],
  // LeetCode-2637M = Promise Time Limit
  "LeetCode-2637M": [
    { input: '1000\n100', expectedOutput: '"resolved"' },
    { input: '50\n100', expectedOutput: '"Time Limit Exceeded"' },
    { input: '500\n200', expectedOutput: '"resolved"' },
  ],
};

async function main() {
  console.log("🔍 Fetching final remaining problems...");
  const problems = await prisma.problem.findMany({
    select: { id: true, name: true },
    where: { test_cases: { none: {} } }
  });
  console.log(`📦 Found ${problems.length} problems with no test cases\n`);

  let seeded = 0;
  for (const problem of problems) {
    const cases = CASES[problem.name];
    if (cases && cases.length > 0) {
      await prisma.testCase.createMany({
        data: cases.map(tc => ({
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      });
      console.log(`  ✅ ${cases.length} cases → ${problem.name}`);
      seeded += cases.length;
    } else {
      console.log(`  ⚠️  No match: ${problem.name}`);
    }
  }

  // Final summary
  const total = await prisma.testCase.count();
  const covered = await prisma.problem.count({ where: { test_cases: { some: {} } } });
  const allProblems = await prisma.problem.count();
  console.log(`\n🎉 Added ${seeded} test cases this run.`);
  console.log(`📊 TOTAL: ${total} test cases across ${covered}/${allProblems} problems.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
