import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./src/generated/prisma/client.js";
import * as fs from 'fs';
import * as path from 'path';

function createClient(): PrismaClient {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL must be configured before Prisma starts.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    errorFormat: "pretty",
  });
}

const prisma = createClient();

interface ProblemJson {
  id: string;
  name: string;
  problem_number: number | null;
  github_oid: string | null;
  problem_definition: string;
  problem_hints: string[];
  difficulty_level: 'EASY' | 'MEDIUM' | 'HARD';
  creatorId: string | null;
  isCustom: boolean;
  timeLimitMs: number | null;
  data_structure: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CodeSnippetJson {
  id: string;
  language: string;
  code: string;
  wrapperCode: string | null;
  problemId: string;
}

interface LearningItemJson {
  id: string;
  name: string;
  order: number;
  category: string;
  description: string | null;
  problemIds: string[];
  prerequisites: string[];
  nextStructures: string[];
  createdAt: string;
  updatedAt: string;
}

async function importProblems() {
  console.log('📥 Importing Problems...');
  const filePath = path.join('/home/devsharma08/Downloads', 'Problem.json');
  const data: ProblemJson[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const problem of data) {
    try {
      const existing = await prisma.problem.findUnique({
        where: { id: problem.id }
      });
      
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.problem.create({
        data: {
          id: problem.id,
          name: problem.name,
          problem_number: problem.problem_number,
          github_oid: problem.github_oid,
          problem_definition: problem.problem_definition,
          problem_hints: problem.problem_hints,
          difficulty_level: problem.difficulty_level,
          creatorId: problem.creatorId,
          isCustom: problem.isCustom,
          timeLimitMs: problem.timeLimitMs ?? 600000,
          data_structure: problem.data_structure,
          createdAt: new Date(problem.createdAt),
          updatedAt: new Date(problem.updatedAt),
        }
      });
      imported++;
      
      if (imported % 50 === 0) {
        console.log(`  Imported ${imported} problems...`);
      }
    } catch (error) {
      console.error(`  ❌ Error importing problem ${problem.id}:`, error);
      errors++;
    }
  }
  
  console.log(`✅ Problems: ${imported} imported, ${skipped} skipped, ${errors} errors`);
  return { imported, skipped, errors };
}

async function importCodeSnippets() {
  console.log('📥 Importing CodeSnippets...');
  const filePath = path.join('/home/devsharma08/Downloads', 'CodeSnippet.json');
  const data: CodeSnippetJson[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 100;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    for (const snippet of batch) {
      try {
        const problem = await prisma.problem.findUnique({
          where: { id: snippet.problemId }
        });
        
        if (!problem) {
          console.warn(`  ⚠️ Problem ${snippet.problemId} not found for snippet ${snippet.id}, skipping`);
          skipped++;
          continue;
        }

        const existing = await prisma.codeSnippet.findUnique({
          where: { id: snippet.id }
        });
        
        if (existing) {
          skipped++;
          continue;
        }

        await prisma.codeSnippet.create({
          data: {
            id: snippet.id,
            language: snippet.language,
            code: snippet.code,
            wrapperCode: snippet.wrapperCode,
            problemId: snippet.problemId,
          }
        });
        imported++;
      } catch (error) {
        console.error(`  ❌ Error importing snippet ${snippet.id}:`, error);
        errors++;
      }
    }
    
    if ((i + batchSize) % 200 === 0 || i + batchSize >= data.length) {
      console.log(`  Imported ${Math.min(i + batchSize, data.length)} snippets...`);
    }
  }
  
  console.log(`✅ CodeSnippets: ${imported} imported, ${skipped} skipped, ${errors} errors`);
  return { imported, skipped, errors };
}

async function importLearningItems() {
  console.log('📥 Importing LearningItems...');
  const filePath = path.join('/home/devsharma08/Downloads', 'LearningItem.json');
  const data: LearningItemJson[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of data) {
    try {
      const existing = await prisma.learningItem.findUnique({
        where: { id: item.id }
      });
      
      if (existing) {
        skipped++;
        continue;
      }

      let validProblemIds = item.problemIds || [];
      
      if (validProblemIds.length > 0) {
        const problems = await prisma.problem.findMany({
          where: { id: { in: validProblemIds } },
          select: { id: true }
        });
        const foundIds = new Set(problems.map(p => p.id));
        validProblemIds = validProblemIds.filter(id => foundIds.has(id));
        
        if (validProblemIds.length !== (item.problemIds || []).length) {
          console.warn(`  ⚠️ LearningItem ${item.id}: ${(item.problemIds || []).length - validProblemIds.length} problemIds not found, using valid ones only`);
        }
      }
      
      await prisma.learningItem.create({
        data: {
          id: item.id,
          name: item.name,
          order: item.order,
          category: item.category,
          description: item.description,
          problemIds: validProblemIds,
          prerequisites: item.prerequisites || [],
          nextStructures: item.nextStructures || [],
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }
      });
      imported++;
    } catch (error) {
      console.error(`  ❌ Error importing learning item ${item.id}:`, error);
      errors++;
    }
  }
  
  console.log(`✅ LearningItems: ${imported} imported, ${skipped} skipped, ${errors} errors`);
  return { imported, skipped, errors };
}

async function verifyImport() {
  console.log('\n🔍 Verifying import...');
  
  const problemCount = await prisma.problem.count();
  const snippetCount = await prisma.codeSnippet.count();
  const learningCount = await prisma.learningItem.count();
  
  const snippetsWithProblems = await prisma.codeSnippet.count({
    where: { problem: { isNot: null } }
  });
  
  const learningItemsWithProblems = await prisma.learningItem.findMany({
    where: { problemIds: { isEmpty: false } },
    select: { id: true, problemIds: true }
  });
  
  let totalProblemRefs = 0;
  let validProblemRefs = 0;
  
  for (const item of learningItemsWithProblems) {
    totalProblemRefs += item.problemIds.length;
    const problems = await prisma.problem.findMany({
      where: { id: { in: item.problemIds } },
      select: { id: true }
    });
    validProblemRefs += problems.length;
  }
  
  console.log(`  Problems: ${problemCount}`);
  console.log(`  CodeSnippets: ${snippetCount} (${snippetsWithProblems} linked to problems)`);
  console.log(`  LearningItems: ${learningCount}`);
  console.log(`  LearningItem problem references: ${validProblemRefs}/${totalProblemRefs} valid`);
  
  const orphanedSnippets = await prisma.codeSnippet.findMany({
    where: { problem: null },
    select: { id: true, problemId: true }
  });
  
  if (orphanedSnippets.length > 0) {
    console.warn(`  ⚠️ ${orphanedSnippets.length} code snippets reference non-existent problems`);
  }
}

async function main() {
  console.log('========================================');
  console.log('  JSON Data Import to PostgreSQL');
  console.log('========================================\n');
  
  try {
    await importProblems();
    await importCodeSnippets();
    await importLearningItems();
    await verifyImport();
    
    console.log('\n========================================');
    console.log('  Import Complete!');
    console.log('========================================');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
