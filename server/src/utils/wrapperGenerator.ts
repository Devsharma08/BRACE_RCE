export interface ArgumentSignature {
    name: string;
    type: string; // "int", "string", "boolean", "int[]", "int[][]", "string[]", etc.
}

export interface ProblemSignature {
    funcName: string;
    returnType: string;
    args: ArgumentSignature[];
}

export class WrapperGenerator {
    static generateAll(sig: ProblemSignature) {
        return [
            { language: "javascript", ...this.generateJavaScript(sig) },
            { language: "python", ...this.generatePython(sig) },
            // Java and C++ support for complex JSON deserialization requires more extensive boilerplates,
            // we will provide basic shells for them in this initial version.
            { language: "java", ...this.generateJava(sig) },
            { language: "cpp", ...this.generateCpp(sig) },
            { language: "c", ...this.generateC(sig) }
        ];
    }

    static generateJavaScript(sig: ProblemSignature) {
        const argNames = sig.args.map(a => a.name).join(", ");
        
        let code = `var ${sig.funcName} = function(${argNames}) {\n    \n};`;
        
        let wrapperCode = `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length < ${sig.args.length}) process.exit(0);
`;

        for (let i = 0; i < sig.args.length; i++) {
            wrapperCode += `const ${sig.args[i].name} = JSON.parse(input[${i}]);\n`;
        }

        wrapperCode += `const res = ${sig.funcName}(${argNames});\n`;
        wrapperCode += `console.log(JSON.stringify(res).replace(/\\s/g, ''));`;

        return { code, wrapperCode };
    }

    static generatePython(sig: ProblemSignature) {
        const argNames = sig.args.map(a => a.name).join(", ");
        
        let code = `def ${sig.funcName}(${argNames}):\n    pass`;
        
        let wrapperCode = `import sys, json\n`;
        wrapperCode += `input_lines = sys.stdin.read().strip().split('\\n')\n`;
        wrapperCode += `if len(input_lines) < ${sig.args.length}: sys.exit(0)\n`;
        
        for (let i = 0; i < sig.args.length; i++) {
            wrapperCode += `${sig.args[i].name} = json.loads(input_lines[${i}])\n`;
        }

        wrapperCode += `res = ${sig.funcName}(${argNames})\n`;
        wrapperCode += `print(json.dumps(res).replace(' ', ''))`;

        return { code, wrapperCode };
    }

    static generateJava(sig: ProblemSignature) {
        const argNames = sig.args.map(a => `${a.type} ${a.name}`).join(", ");
        let code = `class Solution {\n    public ${sig.returnType} ${sig.funcName}(${argNames}) {\n        return null;\n    }\n}`;
        let wrapperCode = `// Generic Java wrapper requires custom JSON parser. \n// Please override this wrapper if using complex array inputs.\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: Implement parsing\n    }\n}`;
        return { code, wrapperCode };
    }

    static generateCpp(sig: ProblemSignature) {
        const argNames = sig.args.map(a => `${a.type} ${a.name}`).join(", ");
        let code = `class Solution {\npublic:\n    ${sig.returnType} ${sig.funcName}(${argNames}) {\n        \n    }\n};`;
        let wrapperCode = `// Generic C++ wrapper requires custom JSON parser.\nint main() {\n    return 0;\n}`;
        return { code, wrapperCode };
    }

    static generateC(sig: ProblemSignature) {
        const argNames = sig.args.map(a => `${a.type} ${a.name}`).join(", ");
        let code = `${sig.returnType} ${sig.funcName}(${argNames}) {\n    \n}`;
        let wrapperCode = `// Generic C wrapper requires custom JSON parser.\nint main() {\n    return 0;\n}`;
        return { code, wrapperCode };
    }
}
