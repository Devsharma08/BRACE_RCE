import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { SupportedLanguage, ExecutionResult } from "../features/terminal/types";

export type TestCase = { input: string; expectedOutput: string; problemId?: string };

// Terminal-specific types
export type FileEntry = {
  name: string;
  oid: string;
  downloadUrl?: string;
  type?: string;
  path?: string;
  isLocal?: boolean;
  data_structure?: string;
  difficulty_level?: string;
  diffculty_level?: string; // Legacy typo handler
  language?: string;
};

export type ResponseStatus = "SUCCESS" | "ERROR" | "LOADING" | "IDLE";

export type TerminalContextType = {
  // Code editor state
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

  // Per-language code preservation
  codeByLanguage: Record<SupportedLanguage, string>;
  setCodeForLanguage: (lang: SupportedLanguage, code: string) => void;
  getCodeForLanguage: (lang: SupportedLanguage) => string;

  // File explorer
  filesData: FileEntry[];
  setFilesData: (filesData: FileEntry[]) => void;

  // Response status
  responseContent: string;
  status: ResponseStatus;
  setStatus: (status: ResponseStatus) => void;
  setResponseContent: (responseContent: string) => void;
};

const initialCodeByLanguage: Record<SupportedLanguage, string> = {
  javascript: "",
  python: "",
  "c++": "",
  java: "",
  c: "",
  c11: "",
};

export const TerminalProvider = ({ children }: { children: ReactNode }) => {
  // Code editor state
  const [codeByLanguage, setCodeByLanguage] = useState<Record<SupportedLanguage, string>>(initialCodeByLanguage);
  const [language, setLanguageState] = useState<SupportedLanguage>("javascript");
  const [code, setCodeState] = useState("");

  // Sync code ↔ codeByLanguage for current language
  useEffect(() => {
    setCodeByLanguage(prev => ({ ...prev, [language]: code }));
  }, [code, language]);

  const setCodeForLanguage = useCallback((lang: SupportedLanguage, newCode: string) => {
    setCodeByLanguage(prev => ({ ...prev, [lang]: newCode }));
    if (lang === language) setCodeState(newCode);
  }, [language]);

  const getCodeForLanguage = useCallback((lang: SupportedLanguage) => {
    return codeByLanguage[lang] || "";
  }, [codeByLanguage]);

  // When language changes, restore saved code for that language
  const changeLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    const savedCode = codeByLanguage[newLang];
    if (savedCode) {
      setCodeState(savedCode);
    } else {
      // Only use boilerplate if NO previous code exists for this language
      // The boilerplate will be set by the consumer (Terminal.tsx)
      setCodeState("");
    }
  }, [codeByLanguage]);

  // File explorer
  const [filesData, setFilesData] = useState<FileEntry[]>([]);

  // Response status
  const [responseContent, setResponseContent] = useState("");
  const [status, setStatus] = useState<ResponseStatus>("IDLE");

  // Test cases
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  // Active file
  const [activeFile, setActiveFile] = useState<string>("");

  // Output
  const [output, setOutput] = useState<ExecutionResult | null>(null);

  // Custom input
  const [customInput, setCustomInput] = useState<string>("");
  const [customInputActive, setCustomInputActive] = useState<boolean>(false);

  const contextValue = useMemo(() => ({
    code,
    setCode: setCodeState,
    language,
    setLanguage: changeLanguage,
    testCases,
    setTestCases,
    activeFile,
    output,
    setActiveFile,
    setOutput,
    customInput,
    setCustomInput,
    customInputActive,
    setCustomInputActive,
    codeByLanguage,
    setCodeForLanguage,
    getCodeForLanguage,
    filesData,
    setFilesData,
    responseContent,
    status,
    setStatus,
    setResponseContent,
  }), [
    code,
    language,
    testCases,
    activeFile,
    output,
    customInput,
    customInputActive,
    codeByLanguage,
    filesData,
    responseContent,
    status,
  ]);

  return (
    <TerminalContext.Provider value={contextValue}>
      {children}
    </TerminalContext.Provider>
  );
};

export const TerminalContext = createContext<TerminalContextType>({
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
  setCustomInputActive: () => {},
  codeByLanguage: initialCodeByLanguage,
  setCodeForLanguage: () => {},
  getCodeForLanguage: () => "",
  filesData: [],
  setFilesData: () => {},
  responseContent: "",
  status: "IDLE",
  setStatus: () => {},
  setResponseContent: () => {},
});