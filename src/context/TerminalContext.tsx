import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { SupportedLanguage, ExecutionResult } from "../features/terminal/types";

export type TestCase = {
  input: string;
  expectedOutput: string;
  problemId?: string;
  /**
   * False when the server withheld this case's input/expected output. The card
   * still renders so the list shows all 15, but there is no input on the client
   * to run for that case.
   */
  isPublic?: boolean;
};

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
  setActiveProblemId: (id: string | null) => void;

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
};

export const TerminalProvider = ({ children }: { children: ReactNode }) => {
  // Code editor state
  const [codeByLanguage, setCodeByLanguage] = useState<Record<SupportedLanguage, string>>(initialCodeByLanguage);
  const [language, setLanguageState] = useState<SupportedLanguage>("javascript");
  const [code, setCodeState] = useState("");

  // Tracks which problem the codeByLanguage cache belongs to. When the
  // problem changes, the cache is cleared so stale code from a previous
  // problem is never restored for a different one.
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);

  // Reset the per-language cache whenever the active problem changes. The
  // useEffect below (code → codeByLanguage[language]) repopulates the current
  // language on the next tick, so the new problem's starter code is restored
  // for all other languages instead of bleeding from the previous problem.
  useEffect(() => {
    setCodeByLanguage(initialCodeByLanguage);
  }, [activeProblemId]);

  // Sync code → codeByLanguage for current language
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

  // When language changes, restore saved code for that language. The per-problem
  // cache reset above ensures this only returns code from the SAME problem.
  const changeLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    const savedCode = codeByLanguage[newLang];
    if (savedCode) {
      setCodeState(savedCode);
    } else {
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
    setActiveProblemId,
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
  setActiveProblemId: () => {},
  filesData: [],
  setFilesData: () => {},
  responseContent: "",
  status: "IDLE",
  setStatus: () => {},
  setResponseContent: () => {},
});