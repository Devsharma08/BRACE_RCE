import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./src/generated/prisma/client.js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Real test cases keyed by problem name substring (case insensitive match)
const REAL_TEST_CASES: Record<string, { input: string; expectedOutput: string }[]> = {
  "two sum": [
    { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
    { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
    { input: "[3,3]\n6", expectedOutput: "[0,1]" },
    { input: "[1,5,3,7]\n8", expectedOutput: "[1,2]" },
    { input: "[0,4,3,0]\n0", expectedOutput: "[0,3]" },
    { input: "[-1,-2,-3,-4,-5]\n-8", expectedOutput: "[2,4]" },
    { input: "[1000000000,1000000000]\n2000000000", expectedOutput: "[0,1]" },
    { input: "[2,5,5,11]\n10", expectedOutput: "[1,2]" },
    { input: "[1,2,3,4,5]\n9", expectedOutput: "[3,4]" },
    { input: "[5,75,25]\n100", expectedOutput: "[1,2]" },
    { input: "[2,3,1,7]\n4", expectedOutput: "[1,2]" },
    { input: "[0,0]\n0", expectedOutput: "[0,1]" },
    { input: "[1,2]\n3", expectedOutput: "[0,1]" },
    { input: "[4,5,6,7]\n11", expectedOutput: "[0,3]" },
    { input: "[100,200,300]\n500", expectedOutput: "[1,2]" },
  ],
  "rotate array": [
    { input: "[1,2,3,4,5,6,7]\n3", expectedOutput: "[5,6,7,1,2,3,4]" },
    { input: "[-1,-100,3,99]\n2", expectedOutput: "[3,99,-1,-100]" },
    { input: "[1,2]\n3", expectedOutput: "[2,1]" },
    { input: "[1]\n0", expectedOutput: "[1]" },
    { input: "[1,2,3]\n1", expectedOutput: "[3,1,2]" },
    { input: "[1,2,3,4,5]\n5", expectedOutput: "[1,2,3,4,5]" },
    { input: "[1,2,3,4,5]\n2", expectedOutput: "[4,5,1,2,3]" },
    { input: "[1,2,3,4,5,6]\n4", expectedOutput: "[3,4,5,6,1,2]" },
    { input: "[10,20,30]\n6", expectedOutput: "[10,20,30]" },
    { input: "[0,-1,2,-3]\n1", expectedOutput: "[-3,0,-1,2]" },
    { input: "[1,2,3,4,5,6,7,8]\n5", expectedOutput: "[4,5,6,7,8,1,2,3]" },
    { input: "[5]\n1", expectedOutput: "[5]" },
    { input: "[1,2,3]\n0", expectedOutput: "[1,2,3]" },
    { input: "[-1,0,1]\n2", expectedOutput: "[0,1,-1]" },
    { input: "[1,2,3,4]\n4", expectedOutput: "[1,2,3,4]" },
  ],
  "reverse string": [
    { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]' },
    { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]' },
    { input: '["a"]', expectedOutput: '["a"]' },
    { input: '["a","b"]', expectedOutput: '["b","a"]' },
    { input: '["A","b","c","d"]', expectedOutput: '["d","c","b","A"]' },
    { input: '["1","2","3","4","5"]', expectedOutput: '["5","4","3","2","1"]' },
    { input: '["r","a","c","e","c","a","r"]', expectedOutput: '["r","a","c","e","c","a","r"]' },
    { input: '["z","y","x"]', expectedOutput: '["x","y","z"]' },
  ],
  "palindrome number": [
    { input: "121", expectedOutput: "true" },
    { input: "-121", expectedOutput: "false" },
    { input: "10", expectedOutput: "false" },
    { input: "0", expectedOutput: "true" },
    { input: "1221", expectedOutput: "true" },
    { input: "12321", expectedOutput: "true" },
    { input: "-101", expectedOutput: "false" },
    { input: "1", expectedOutput: "true" },
    { input: "11", expectedOutput: "true" },
    { input: "100", expectedOutput: "false" },
    { input: "9", expectedOutput: "true" },
    { input: "1000021", expectedOutput: "false" },
    { input: "99999", expectedOutput: "true" },
    { input: "12", expectedOutput: "false" },
    { input: "1001", expectedOutput: "true" },
  ],
  "valid parentheses": [
    { input: '"()"', expectedOutput: "true" },
    { input: '"()[]{}"', expectedOutput: "true" },
    { input: '"(]"', expectedOutput: "false" },
    { input: '"([)]"', expectedOutput: "false" },
    { input: '"{[]}"', expectedOutput: "true" },
    { input: '""', expectedOutput: "true" },
    { input: '"["', expectedOutput: "false" },
    { input: '"]"', expectedOutput: "false" },
    { input: '"({})"', expectedOutput: "true" },
    { input: '"((("', expectedOutput: "false" },
    { input: '"((()))"', expectedOutput: "true" },
    { input: '"{}"', expectedOutput: "true" },
    { input: '"(("', expectedOutput: "false" },
    { input: '"){}"', expectedOutput: "false" },
    { input: '"{[()]}"', expectedOutput: "true" },
  ],
  "maximum subarray": [
    { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" },
    { input: "[1]", expectedOutput: "1" },
    { input: "[5,4,-1,7,8]", expectedOutput: "23" },
    { input: "[-1]", expectedOutput: "-1" },
    { input: "[-2,-1]", expectedOutput: "-1" },
    { input: "[0]", expectedOutput: "0" },
    { input: "[1,2,3,4,5]", expectedOutput: "15" },
    { input: "[-1,-2,-3,-4]", expectedOutput: "-1" },
    { input: "[1,-1,1,-1,1]", expectedOutput: "1" },
    { input: "[-2,1]", expectedOutput: "1" },
    { input: "[2,-1,2,3,-4]", expectedOutput: "6" },
    { input: "[-2,2,5,-11,6]", expectedOutput: "7" },
    { input: "[100,-200,300]", expectedOutput: "300" },
    { input: "[-3,4,-1,2,1,-5]", expectedOutput: "6" },
    { input: "[0,0,0,0]", expectedOutput: "0" },
  ],
  "best time to buy": [
    { input: "[7,1,5,3,6,4]", expectedOutput: "5" },
    { input: "[7,6,4,3,1]", expectedOutput: "0" },
    { input: "[1,2]", expectedOutput: "1" },
    { input: "[2,4,1]", expectedOutput: "2" },
    { input: "[3,3]", expectedOutput: "0" },
    { input: "[1]", expectedOutput: "0" },
    { input: "[2,1,2,1,0,1,2]", expectedOutput: "2" },
    { input: "[1,2,3,4,5]", expectedOutput: "4" },
    { input: "[3,1,4,1,5,9]", expectedOutput: "8" },
    { input: "[1,2,3,2,3]", expectedOutput: "2" },
    { input: "[6,1,3,2,4,7]", expectedOutput: "6" },
    { input: "[3,2,1]", expectedOutput: "0" },
    { input: "[5,11,3,50,60,90]", expectedOutput: "87" },
    { input: "[1,3,2,5,4]", expectedOutput: "4" },
    { input: "[2,2]", expectedOutput: "0" },
  ],
  "contains duplicate": [
    { input: "[1,2,3,1]", expectedOutput: "true" },
    { input: "[1,2,3,4]", expectedOutput: "false" },
    { input: "[1,1,1,3,3,4,3,2,4,2]", expectedOutput: "true" },
    { input: "[]", expectedOutput: "false" },
    { input: "[1]", expectedOutput: "false" },
    { input: "[0]", expectedOutput: "false" },
    { input: "[-1,-1]", expectedOutput: "true" },
    { input: "[1,2,3,4,5,6,7,8,9,10]", expectedOutput: "false" },
    { input: "[5,5]", expectedOutput: "true" },
    { input: "[1,2,1]", expectedOutput: "true" },
    { input: "[10,20,30,40,50]", expectedOutput: "false" },
    { input: "[3,1,4,1,5,9,2,6]", expectedOutput: "true" },
    { input: "[2,14,18,22,100]", expectedOutput: "false" },
    { input: "[0,0]", expectedOutput: "true" },
    { input: "[-2,-1,0,1,2]", expectedOutput: "false" },
  ],
  "missing number": [
    { input: "[3,0,1]", expectedOutput: "2" },
    { input: "[0,1]", expectedOutput: "2" },
    { input: "[9,6,4,2,3,5,7,0,1]", expectedOutput: "8" },
    { input: "[0]", expectedOutput: "1" },
    { input: "[1]", expectedOutput: "0" },
    { input: "[0,2]", expectedOutput: "1" },
    { input: "[3,1,2]", expectedOutput: "0" },
    { input: "[0,1,3]", expectedOutput: "2" },
    { input: "[2,0,3]", expectedOutput: "1" },
    { input: "[1,2,3,4,5,6,7,8,9,10]", expectedOutput: "0" },
    { input: "[0,1,2,3,5]", expectedOutput: "4" },
    { input: "[5,4,3,2,1]", expectedOutput: "0" },
    { input: "[0,1,2,4,5]", expectedOutput: "3" },
    { input: "[4,0,2,1]", expectedOutput: "3" },
    { input: "[0,1,2,3,4,6]", expectedOutput: "5" },
  ],
  "merge sorted": [
    { input: "[1,2,3,0,0,0]\n3\n[2,5,6]\n3", expectedOutput: "[1,2,2,3,5,6]" },
    { input: "[1]\n1\n[]\n0", expectedOutput: "[1]" },
    { input: "[0]\n0\n[1]\n1", expectedOutput: "[1]" },
    { input: "[1,2,4,0,0,0]\n3\n[3,5,6]\n3", expectedOutput: "[1,2,3,4,5,6]" },
    { input: "[2,0]\n1\n[1]\n1", expectedOutput: "[1,2]" },
    { input: "[4,5,6,0,0,0]\n3\n[1,2,3]\n3", expectedOutput: "[1,2,3,4,5,6]" },
    { input: "[1,0]\n1\n[2]\n1", expectedOutput: "[1,2]" },
    { input: "[0,0,0]\n0\n[1,2,3]\n3", expectedOutput: "[1,2,3]" },
    { input: "[1,2,3,0,0,0]\n3\n[4,5,6]\n3", expectedOutput: "[1,2,3,4,5,6]" },
    { input: "[-1,0,0,3,3,3,0,0,0]\n6\n[1,2,2]\n3", expectedOutput: "[-1,0,0,1,2,2,3,3,3]" },
    { input: "[1,4,7,0,0,0]\n3\n[2,5,8]\n3", expectedOutput: "[1,2,4,5,7,8]" },
    { input: "[5,6,7,0,0,0]\n3\n[1,2,3]\n3", expectedOutput: "[1,2,3,5,6,7]" },
    { input: "[1,1,0]\n2\n[1]\n1", expectedOutput: "[1,1,1]" },
    { input: "[2,3,0,0]\n2\n[1,4]\n2", expectedOutput: "[1,2,3,4]" },
    { input: "[0,0]\n0\n[1,2]\n2", expectedOutput: "[1,2]" },
  ],
  "climbing stairs": [
    { input: "1", expectedOutput: "1" },
    { input: "2", expectedOutput: "2" },
    { input: "3", expectedOutput: "3" },
    { input: "4", expectedOutput: "5" },
    { input: "5", expectedOutput: "8" },
    { input: "6", expectedOutput: "13" },
    { input: "7", expectedOutput: "21" },
    { input: "8", expectedOutput: "34" },
    { input: "9", expectedOutput: "55" },
    { input: "10", expectedOutput: "89" },
    { input: "15", expectedOutput: "987" },
    { input: "20", expectedOutput: "10946" },
    { input: "30", expectedOutput: "1346269" },
    { input: "35", expectedOutput: "14930352" },
    { input: "45", expectedOutput: "1836311903" },
  ],
  "single number": [
    { input: "[2,2,1]", expectedOutput: "1" },
    { input: "[4,1,2,1,2]", expectedOutput: "4" },
    { input: "[1]", expectedOutput: "1" },
    { input: "[0,1,0]", expectedOutput: "1" },
    { input: "[3,3,7,7,10]", expectedOutput: "10" },
    { input: "[-1,-1,9]", expectedOutput: "9" },
    { input: "[5,1,5,2,2]", expectedOutput: "1" },
    { input: "[7]", expectedOutput: "7" },
    { input: "[1,4,4,1,7]", expectedOutput: "7" },
    { input: "[6,5,6]", expectedOutput: "5" },
    { input: "[2,3,3]", expectedOutput: "2" },
    { input: "[-5,-3,-5]", expectedOutput: "-3" },
    { input: "[100,200,100]", expectedOutput: "200" },
    { input: "[8,7,8,7,6]", expectedOutput: "6" },
    { input: "[1,2,3,2,1,3,9]", expectedOutput: "9" },
  ],
  "reverse linked list": [
    { input: "[1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]" },
    { input: "[1,2]", expectedOutput: "[2,1]" },
    { input: "[]", expectedOutput: "[]" },
    { input: "[1]", expectedOutput: "[1]" },
    { input: "[3,2,1]", expectedOutput: "[1,2,3]" },
    { input: "[1,3,5,7,9]", expectedOutput: "[9,7,5,3,1]" },
    { input: "[2,4,6]", expectedOutput: "[6,4,2]" },
    { input: "[10,20,30,40]", expectedOutput: "[40,30,20,10]" },
    { input: "[-1,-2,-3]", expectedOutput: "[-3,-2,-1]" },
    { input: "[0,1]", expectedOutput: "[1,0]" },
  ],
  "fibonacci number": [
    { input: "0", expectedOutput: "0" },
    { input: "1", expectedOutput: "1" },
    { input: "2", expectedOutput: "1" },
    { input: "3", expectedOutput: "2" },
    { input: "4", expectedOutput: "3" },
    { input: "5", expectedOutput: "5" },
    { input: "6", expectedOutput: "8" },
    { input: "7", expectedOutput: "13" },
    { input: "8", expectedOutput: "21" },
    { input: "9", expectedOutput: "34" },
    { input: "10", expectedOutput: "55" },
    { input: "11", expectedOutput: "89" },
    { input: "12", expectedOutput: "144" },
    { input: "15", expectedOutput: "610" },
    { input: "20", expectedOutput: "6765" },
  ],
};

async function main() {
  console.log("🔍 Fetching problems from database...");
  const problems = await prisma.problem.findMany({ select: { id: true, name: true } });
  console.log(`📦 Found ${problems.length} problems`);

  // Step 1: Delete ALL existing test cases
  const deleted = await prisma.testCase.deleteMany({});
  console.log(`🗑️  Deleted ${deleted.count} old test cases`);

  // Step 2: Seed real ones
  let seeded = 0;
  for (const problem of problems) {
    const nameLower = problem.name.toLowerCase();
    let matched: string | null = null;
    for (const key of Object.keys(REAL_TEST_CASES)) {
      if (nameLower.includes(key)) {
        matched = key;
        break;
      }
    }
    if (matched) {
      const cases = REAL_TEST_CASES[matched];
      await prisma.testCase.createMany({
        data: cases.map(tc => ({
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      });
      console.log(`  ✅ Seeded ${cases.length} cases for: ${problem.name}`);
      seeded += cases.length;
    } else {
      console.log(`  ⚠️  No matching test cases for: ${problem.name}`);
    }
  }

  console.log(`\n🎉 Done! Seeded ${seeded} real test cases across all matched problems.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
