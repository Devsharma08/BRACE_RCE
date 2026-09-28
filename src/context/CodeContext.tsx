import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

  // Per-language code preservation
  codeByLanguage: Record<SupportedLanguage, string>;
  setCodeForLanguage: (lang: SupportedLanguage, code: string) => void;
  getCodeForLanguage: (lang: SupportedLanguage) => string;
};

const initialCodeByLanguage: Record<SupportedLanguage, string> = {
  javascript: "",
  python: "",
  "c++": "",
  java: "",
  c: "",
  c11: "",
};

export const CodeProvider = ({ children }: { children: ReactNode }) => {
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

  return (
    <CodeContext.Provider value={{
      code,
      setCode: setCodeState,
      language,
      setLanguage: changeLanguage,
      codeByLanguage,
      setCodeForLanguage,
      getCodeForLanguage,
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
    }}>
      {children}
    </CodeContext.Provider>
  );
};

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
  setCustomInputActive: () => {},
  codeByLanguage: initialCodeByLanguage,
  setCodeForLanguage: () => {},
  getCodeForLanguage: () => "",
});