import { createContext } from "react";

export type TestCase = { input: string; expectedOutput: string; problemId?: string };

export type CodeContextType = {
    code: string;
    language: string;
    setCode: (code: string) => void;
    setLanguage: (language: string) => void;
    testCases: TestCase[];
    setTestCases: (testCases: TestCase[]) => void;
    activeFile: string;
    output: unknown;
    setActiveFile: (activeFile: string) => void;
    setOutput: (output: unknown) => void;
}

export const CodeContext = createContext<CodeContextType>({
    code: "",
    language: "",
    setCode: () => {},
    setLanguage: () => {},
    testCases: [],
    setTestCases: () => {},
    activeFile: "",
    output: null,
    setActiveFile: () => {},
    setOutput: () => {},
});
