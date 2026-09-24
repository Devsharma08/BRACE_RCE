import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
import { rawProblems as problems } from "./leetcodeProblems.js";

async function seedLearningPaths() {
  console.log("\n🌱 Seeding learning paths...");

  // Clear existing learning paths
  await prisma.learningItem.deleteMany();
  await prisma.userLearningProgress.deleteMany();
  await prisma.userLearningSummary.deleteMany();

  // Create learning path items in order
  const learningItems = await Promise.all([
    prisma.learningItem.create({
      data: {
        name: 'Arrays',
        order: 1,
        category: 'Fundamentals',
        description: 'Master array operations, indexing, and basic manipulations. The foundation of all data structures.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Stack',
        order: 2,
        category: 'Linear Data Structures',
        description: 'LIFO (Last In First Out) data structure. Learn push, pop, peek operations.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Queue',
        order: 3,
        category: 'Linear Data Structures',
        description: 'FIFO (First In First Out) data structure. Learn enqueue, dequeue operations.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Linked List',
        order: 4,
        category: 'Linear Data Structures',
        description: 'Dynamic data structure with nodes connected by pointers.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Hash Table',
        order: 5,
        category: 'Data Structures',
        description: 'Key-value storage with O(1) average time complexity.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Tree',
        order: 6,
        category: 'Non-Linear Data Structures',
        description: 'Hierarchical data structure with nodes and edges.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Binary Search Tree',
        order: 7,
        category: 'Non-Linear Data Structures',
        description: 'Sorted tree structure with O(log n) operations.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Heap',
        order: 8,
        category: 'Non-Linear Data Structures',
        description: 'Complete binary tree with heap property.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Graph',
        order: 9,
        category: 'Non-Linear Data Structures',
        description: 'Network of nodes and edges. Master DFS, BFS, Dijkstra.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Trie',
        order: 10,
        category: 'Advanced Data Structures',
        description: 'Prefix tree for efficient string operations.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Segment Tree',
        order: 11,
        category: 'Advanced Data Structures',
        description: 'Tree for range queries and updates.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
    prisma.learningItem.create({
      data: {
        name: 'Fenwick Tree',
        order: 12,
        category: 'Advanced Data Structures',
        description: 'Efficient data structure for prefix sums.',
        prerequisites: [],
        nextStructures: [],
      },
    }),
  ]);

  // Update prerequisites and nextStructures based on order
  for (let i = 0; i < learningItems.length; i++) {
    const item = learningItems[i];
    const prereqs = i > 0 ? [learningItems[i - 1].id] : [];
    const next = i < learningItems.length - 1 ? [learningItems[i + 1].id] : [];

    await prisma.learningItem.update({
      where: { id: item.id },
      data: { prerequisites: prereqs, nextStructures: next },
    });
  }

  console.log('✅ Learning paths seeded successfully!');
  console.log(`  Created ${learningItems.length} learning items`);
}

async function main() {
  console.log("🌱 Starting seed for LeetCode problems...\n");
  console.log("📡 Connecting to:", process.env.DIRECT_URL?.replace(/:([^@]+)@/, ":***@"));

  console.log("🗑️  Wiping old records...");
  await prisma.problem.deleteMany();

  for (const p of problems) {
    const { test_cases, code_snippets, ...problemData } = p;

    const problem = await prisma.problem.upsert({
      where: { problem_number: problemData.problem_number },
      update: problemData,
      create: problemData,
    });

    await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
    await prisma.codeSnippet.deleteMany({ where: { problemId: problem.id } });

    await prisma.testCase.createMany({
      data: test_cases.map((tc) => ({ ...tc, problemId: problem.id })),
    });
    await prisma.codeSnippet.createMany({
      data: code_snippets.map((cs) => ({ ...cs, problemId: problem.id })),
    });

    console.log(`✅ Seeded: [#${problem.problem_number}] ${problem.name} (${problem.difficulty_level})`);
  }

  await seedLearningPaths();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
