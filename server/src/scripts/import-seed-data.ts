import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from "../lib/prisma.js";
import { Level } from "../generated/prisma/client.js";

interface ProblemData {
    id: string;
    name: string;
    problem_number?: number | null;
    github_oid?: string | null;
    problem_definition: string;
    problem_hints: string[];
    difficulty_level: string;
    creatorId?: string | null;
    isCustom: boolean;
    timeLimitMs?: number | null;
    createdAt: string;
    updatedAt: string;
    data_structure?: string | null;
}

interface CodeSnippetData {
    id: string;
    language: string;
    code: string;
    wrapperCode?: string | null;
    problemId: string;
}

interface LearningItemData {
    id: string;
    name: string;
    order: number;
    category: string;
    description?: string | null;
    problemIds: string[];
    prerequisites: string[];
    nextStructures: string[];
    createdAt: string;
    updatedAt: string;
}

async function truncateTables() {
    console.log('Truncating existing data...');
    
    // Delete in correct order to respect foreign key constraints
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE "CodeSubmission", "TestCase", "LearningItem", "UserPersonalPerformance", "UserLearningProgress", "UserProblemProgress", "EventBlock", "TemplateSubscription", "MatchmakingQueue", "ReportMessage", "QuestionReport", "Feedback", "Message", "Notification", "Event", "CodeSnippet", "Problem", "UserLearningSummary", "User", "Setting", "ExecutionLog", "ExecutionQuota" CASCADE;
    `);
    
    console.log('Tables truncated successfully.');
}

async function importLearningItems(items: LearningItemData[]) {
    console.log(`Importing ${items.length} LearningItems...`);
    let success = 0;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
            await prisma.learningItem.create({
                data: {
                    id: item.id,
                    name: item.name,
                    order: item.order,
                    category: item.category,
                    description: item.description || null,
                    problemIds: item.problemIds || [],
                    prerequisites: item.prerequisites || [],
                    nextStructures: item.nextStructures || [],
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                },
            });
            success++;
            if ((i + 1) % 5 === 0) {
                console.log(`  [${i + 1}/${items.length}] Imported LearningItem: ${item.name}`);
            }
        } catch (e: any) {
            console.error(`  [X] Failed on LearningItem ${item.name}:`, e.message);
        }
    }
    
    console.log(`Imported ${success}/${items.length} LearningItems successfully.`);
    return success;
}

async function importCodeSnippets(snippets: CodeSnippetData[]) {
    console.log(`Importing ${snippets.length} CodeSnippets...`);
    
    // Create in batches for performance
    const batchSize = 100;
    let success = 0;
    
    for (let i = 0; i < snippets.length; i += batchSize) {
        const batch = snippets.slice(i, i + batchSize);
        try {
            await prisma.codeSnippet.createMany({
                data: batch.map((s) => ({
                    id: s.id,
                    language: s.language,
                    code: s.code,
                    wrapperCode: s.wrapperCode || null,
                    problemId: s.problemId,
                })),
                skipDuplicates: true,
            });
            success += batch.length;
            console.log(`  Imported batch ${Math.floor(i / batchSize) + 1}: ${success}/${snippets.length} snippets`);
        } catch (e: any) {
            console.error(`  [X] Batch failed at offset ${i}:`, e.message);
            // Try individual import for the failed batch
            for (const s of batch) {
                try {
                    await prisma.codeSnippet.create({
                        data: {
                            id: s.id,
                            language: s.language,
                            code: s.code,
                            wrapperCode: s.wrapperCode || null,
                            problem: { connect: { id: s.problemId } },
                        },
                    });
                    success++;
                } catch (individualError: any) {
                    console.error(`    [X] Failed on snippet ${s.id}:`, individualError.message);
                }
            }
        }
    }
    
    console.log(`Imported ${success}/${snippets.length} CodeSnippets successfully.`);
    return success;
}

async function importProblems(problems: ProblemData[]) {
    console.log(`Importing ${problems.length} Problems...`);
    let success = 0;
    
    for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        try {
            const difficulty = (p.difficulty_level?.toUpperCase() || 'MEDIUM') as Level;
            
            await prisma.problem.create({
                data: {
                    id: p.id,
                    name: p.name,
                    problem_number: p.problem_number ?? null,
                    github_oid: p.github_oid || null,
                    problem_definition: p.problem_definition,
                    problem_hints: p.problem_hints || [],
                    difficulty_level: difficulty,
                    creatorId: p.creatorId || null,
                    isCustom: p.isCustom ?? false,
                    timeLimitMs: p.timeLimitMs ?? 600000,
                    data_structure: p.data_structure || null,
                    createdAt: new Date(p.createdAt),
                    updatedAt: new Date(p.updatedAt),
                },
            });
            success++;
            if ((i + 1) % 20 === 0) {
                console.log(`  [${i + 1}/${problems.length}] Imported Problem: ${p.name}`);
            }
        } catch (e: any) {
            console.error(`  [X] Failed on problem ${p.name}:`, e.message);
        }
    }
    
    console.log(`Imported ${success}/${problems.length} Problems successfully.`);
    return success;
}

async function verifyIntegrity() {
    console.log('\nVerifying data integrity...');
    
    // Verify problems with snippets
    const problemsWithSnippets = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT p.id) as count FROM "Problem" p 
        INNER JOIN "CodeSnippet" cs ON cs."problemId" = p.id
    `;
    console.log(`  Problems with code snippets: ${Number(problemsWithSnippets[0]?.count || 0)}`);
    
    // Check orphans
    const orphanSnippets = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count FROM "CodeSnippet" cs 
        LEFT JOIN "Problem" p ON p.id = cs."problemId" 
        WHERE p.id IS NULL
    `;
    console.log(`  Orphan code snippets: ${Number(orphanSnippets[0]?.count || 0)}`);
    
    // Check learning items with valid problem refs
    const validLearning = await prisma.learningItem.count({
        where: {
            problemIds: { hasSome: await getProblemIds() }
        }
    });
    console.log(`  Learning items with valid problem refs: ${validLearning}`);
    
    // Final counts
    const counts = {
        problems: await prisma.problem.count(),
        codeSnippets: await prisma.codeSnippet.count(),
        learningItems: await prisma.learningItem.count(),
        users: await prisma.user.count(),
    };
    
    console.log('\nFinal database counts:');
    console.log(`  Problems: ${counts.problems}`);
    console.log(`  CodeSnippets: ${counts.codeSnippets}`);
    console.log(`  LearningItems: ${counts.learningItems}`);
    console.log(`  Users: ${counts.users}`);
}

async function getProblemIds(): Promise<string[]> {
    const problems = await prisma.problem.findMany({ select: { id: true } });
    return problems.map(p => p.id);
}

async function main() {
    const downloadsDir = '/home/devsharma08/Downloads';
    
    // Load JSON files
    console.log('Loading JSON files...');
    const problems: ProblemData[] = JSON.parse(
        fs.readFileSync(path.join(downloadsDir, 'Problem.json'), 'utf8')
    );
    const snippets: CodeSnippetData[] = JSON.parse(
        fs.readFileSync(path.join(downloadsDir, 'CodeSnippet.json'), 'utf8')
    );
    const learningItems: LearningItemData[] = JSON.parse(
        fs.readFileSync(path.join(downloadsDir, 'LearningItem.json'), 'utf8')
    );
    
    console.log(`Loaded: ${problems.length} problems, ${snippets.length} snippets, ${learningItems.length} learning items\n`);
    
    // Truncate existing data
    await truncateTables();
    
    // Import in order: Problems first, then CodeSnippets, then LearningItems
    const problemCount = await importProblems(problems);
    const snippetCount = await importCodeSnippets(snippets);
    const learningCount = await importLearningItems(learningItems);
    
    // Verify
    await verifyIntegrity();
    
    console.log('\n=== Import Summary ===');
    console.log(`Problems: ${problemCount}/${problems.length}`);
    console.log(`CodeSnippets: ${snippetCount}/${snippets.length}`);
    console.log(`LearningItems: ${learningCount}/${learningItems.length}`);
    console.log('=== Done ===');
}

main()
    .catch(e => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());