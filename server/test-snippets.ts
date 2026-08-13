import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const snippets = await prisma.codeSnippet.findMany({ select: { wrapperCode: true, problem: { select: { name: true } }, language: true } });
    console.log(snippets.filter(s => s.language === 'javascript' && s.wrapperCode && s.wrapperCode.includes('Wrapper')));
}
run();
