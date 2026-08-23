import fs from 'fs';
import path from 'path';
import { prisma } from "./lib/prisma.js";
import { Level } from "./generated/prisma/client.js";
import { WrapperGenerator } from "./utils/wrapperGenerator.js";

async function main() {
    console.log("Loading problems_seed.json...");
    const filePath = path.join(process.cwd(), '../problems_seed.json');
    if (!fs.existsSync(filePath)) {
        console.error("problems_seed.json not found!");
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const problems = data.problems;
    console.log(`Found ${problems.length} problems to seed. Starting...`);
    
    let success = 0;
    for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        try {
            const { test_cases, code_snippets, ...problemData } = p;
            const difficulty = problemData.difficulty_level?.toUpperCase() || Level.MEDIUM;
            
            const problem = await prisma.problem.upsert({
                where: { problem_number: problemData.problem_number || -1 },
                update: {
                    name: problemData.name,
                    github_oid: problemData.github_oid || null,
                    problem_definition: problemData.problem_definition,
                    problem_hints: problemData.problem_hints || [],
                    difficulty_level: difficulty,
                    isCustom: false,
                    creatorId: null
                },
                create: {
                    name: problemData.name,
                    problem_number: problemData.problem_number,
                    github_oid: problemData.github_oid || null,
                    problem_definition: problemData.problem_definition,
                    problem_hints: problemData.problem_hints || [],
                    difficulty_level: difficulty,
                    isCustom: false,
                    creatorId: null
                },
            });
            
            const generatedSnippets = problemData.signature ? WrapperGenerator.generateAll(problemData.signature) : null;
            const finalSnippets = code_snippets || generatedSnippets;
            
            if (test_cases) {
                await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
                await prisma.testCase.createMany({
                    data: test_cases.map((tc: any) => ({ ...tc, problemId: problem.id })),
                });
            }
            if (finalSnippets) {
                await prisma.codeSnippet.deleteMany({ where: { problemId: problem.id } });
                await prisma.codeSnippet.createMany({
                    data: finalSnippets.map((cs: any) => ({ ...cs, problemId: problem.id })),
                });
            }
            console.log(`[${i + 1}/${problems.length}] Seeded: ${problem.name}`);
            success++;
        } catch(e: any) {
            console.error(`[X] Failed on problem ${p.name}:`, e.message);
        }
    }
    console.log(`Successfully seeded ${success} problems to the database!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
