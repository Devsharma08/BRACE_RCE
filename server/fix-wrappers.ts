import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const snippets = await prisma.codeSnippet.findMany({
        where: { language: 'javascript' }
    });
    
    let updated = 0;
    for (const s of snippets) {
        if (!s.code) continue;
        
        // Extract function name and args
        // Matches: var funcName = function(arg1, arg2)
        const match = s.code.match(/var\s+(\w+)\s*=\s*function\s*\((.*?)\)/);
        if (!match) continue;
        
        const funcName = match[1];
        const argsStr = match[2].trim();
        const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];
        
        let wrapperCode = `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (input.length < ${args.length}) process.exit(0);\n`;
        
        for (let i = 0; i < args.length; i++) {
            wrapperCode += `const ${args[i]} = JSON.parse(input[${i}]);\n`;
        }
        
        wrapperCode += `const res = ${funcName}(${args.join(', ')});\n`;
        wrapperCode += `console.log(JSON.stringify(res).replace(/\\s/g, ''));`;
        
        // Update it
        await prisma.codeSnippet.update({
            where: { id: s.id },
            data: { wrapperCode }
        });
        updated++;
    }
    console.log(`Updated ${updated} javascript wrappers.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
