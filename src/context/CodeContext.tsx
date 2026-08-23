import { createContext } from "react";
import type { SupportedLanguage, ExecutionResult } from "../features/terminal/types";

export type TestCase = { input: string; expectedOutput: string; problemId?: string };

export type CodeContextType = {
    code: string;
    language: SupportedLanguage;
    setCode: (code: string) => void;
    setLanguage: (language: SupportedLanguage) => void;
    testCases: TestCase[];
    setTestCases: (testCases: TestCase[]) => void;
    activeFile: string;
    output: ExecutionResult | null;
    setActiveFile: (activeFile: string) => void;
    setOutput: (output: ExecutionResult | null) => void;
    customInput: string;
    setCustomInput: (input: string) => void;
    customInputActive: boolean;
    setCustomInputActive: (active: boolean) => void;
}

export const CodeContext = createContext<CodeContextType>({
    code: "",
    language: "javascript",
    setCode: () => {},
    setLanguage: () => {},
    testCases: [],
    setTestCases: () => {},
    activeFile: "",
    output: null,
    setActiveFile: () => {},
    setOutput: () => {},
    customInput: "",
    setCustomInput: () => {},
    customInputActive: false,
    setCustomInputActive: () => {}
});
