import fs from 'fs';
import path from 'path';
import { prisma } from "./src/lib/prisma.js";
import { Level } from "./src/generated/prisma/client.js";

async function main() {
    console.log("Loading JSON files...");
    
    const problemsData = JSON.parse(fs.readFileSync('/home/ec2-user/Problem.json', 'utf8'));
    const testCasesData = JSON.parse(fs.readFileSync('/home/ec2-user/TestCase.json', 'utf8'));
    const codeSnippetsData = JSON.parse(fs.readFileSync('/home/ec2-user/CodeSnippet.json', 'utf8'));
    const learningItemsData = JSON.parse(fs.readFileSync('/home/ec2-user/LearningItem.json', 'utf8'));

    console.log(`Loaded ${problemsData.length} problems`);
    console.log(`Loaded ${testCasesData.length} test cases`);
    console.log(`Loaded ${codeSnippetsData.length} code snippets`);
    console.log(`Loaded ${learningItemsData.length} learning items`);

    console.log("\nClearing database...");
    await prisma.testCase.deleteMany({});
    await prisma.codeSnippet.deleteMany({});
    await prisma.problem.deleteMany({});
    await prisma.learningItem.deleteMany({});
    console.log("Database cleared.");

    console.log("\nSeeding problems...");
    let problemCount = 0;
    for (const p of problemsData) {
        const difficulty = p.difficulty_level?.toUpperCase() || Level.MEDIUM;
        await prisma.problem.create({
            data: {
                id: p.id,
                name: p.name,
                problem_number: p.problem_number ?? null,
                github_oid: p.github_oid || null,
                problem_definition: p.problem_definition,
                problem_hints: p.problem_hints || [],
                difficulty_level: difficulty,
                isCustom: p.isCustom ?? false,
                creatorId: p.creatorId ?? null,
            }
        });
        problemCount++;
        if (problemCount % 50 === 0) console.log(`  Seeded ${problemCount} problems...`);
    }
    console.log(`Seeded ${problemCount} problems.`);

    console.log("\nSeeding test cases...");
    let tcCount = 0;
    for (const tc of testCasesData) {
        await prisma.testCase.create({
            data: {
                id: tc.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                is_public: tc.is_public ?? false,
                problemId: tc.problemId,
            }
        });
        tcCount++;
        if (tcCount % 1000 === 0) console.log(`  Seeded ${tcCount} test cases...`);
    }
    console.log(`Seeded ${tcCount} test cases.`);

    console.log("\nSeeding code snippets...");
    let snippetCount = 0;
    for (const cs of codeSnippetsData) {
        await prisma.codeSnippet.create({
            data: {
                id: cs.id,
                language: cs.language,
                code: cs.code,
                wrapperCode: cs.wrapperCode ?? null,
                problemId: cs.problemId,
            }
        });
        snippetCount++;
        if (snippetCount % 100 === 0) console.log(`  Seeded ${snippetCount} snippets...`);
    }
    console.log(`Seeded ${snippetCount} code snippets.`);

    console.log("\nSeeding learning items...");
    let liCount = 0;
    for (const li of learningItemsData) {
        await prisma.learningItem.create({
            data: {
                id: li.id,
                name: li.name,
                order: li.order ?? 0,
                category: li.category ?? null,
                description: li.description ?? null,
                problemIds: li.problemIds ?? [],
            }
        });
        liCount++;
    }
    console.log(`Seeded ${liCount} learning items.`);

    console.log("\n=== SEEDING COMPLETE ===");
    console.log(`Problems: ${problemCount}`);
    console.log(`Test Cases: ${tcCount}`);
    console.log(`Code Snippets: ${snippetCount}`);
    console.log(`Learning Items: ${liCount}`);
}

main()
    .catch((e) => {
        console.error("Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });