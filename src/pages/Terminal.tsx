/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { House } from "lucide-react";
import { FileNamesContext, type FileEntry } from "../context/fileNamesContext";
import { CodeContext } from "../context/codeContext";
import { UserResponseContext } from "../context/responseContent";
import { executeCode, fetchFileContent, fetchFileNames } from "../features/terminal/api";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import FileExplorer from "../features/terminal/components/FileExplorer";
import LoadingOverlay from "../features/terminal/components/LoadingOverlay";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import OutputPanel from "../features/terminal/components/OutputPanel";
import {
  buildProblemTestCases,
  detectLanguageFromFileName,
  formatExecutionOutput,
} from "../features/terminal/executionOutput";
import { useTerminalLayout } from "../features/terminal/hooks/useTerminalLayout";
import type { ExecutionMode, FileContentResponse, SupportedLanguage } from "../features/terminal/types";
import { NotesPanel } from "../components/ui/NotesPanel";

const LOCAL_FILE_ID_PREFIX = "local-";
const LOCAL_FILE_STORAGE_PREFIX = "localFile:";

const getLocalStorageKey = (oid: string) => `${LOCAL_FILE_STORAGE_PREFIX}${oid}`;
const isLocalFile = (oid: string | null): boolean => Boolean(oid && oid.startsWith(LOCAL_FILE_ID_PREFIX));

const readLocalFile = (oid: string) => {
  const raw = localStorage.getItem(getLocalStorageKey(oid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { name: string; content: string; language: SupportedLanguage; createdAt: number; updatedAt: number };
  } catch {
    return null;
  }
};

// Boilerplate template generator for each supported language
const getLanguageStarterCode = (lang: SupportedLanguage, problemName?: string) => {
  switch (lang) {
    case "python":
      return `# Solution for ${problemName || "problem"}\ndef solution(*args):\n    pass\n`;
    case "c++":
      return `// Solution for ${problemName || "problem"}\n#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n`;
    case "java":
      return `// Solution for ${problemName || "problem"}\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`;
    case "c":
      return `// Solution for ${problemName || "problem"}\n#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    return 0;\n}\n`;
    case "javascript":
    default:
      return `/**\n * Solution for ${problemName || "problem"}\n */\nvar solution = function() {\n    \n};\n`;
  }
};

// Find matching code snippet from problem data or generate language boilerplate
const getProblemSnippet = (fileData: any, lang: SupportedLanguage, defaultContent?: string) => {
  if (!fileData) return defaultContent || getLanguageStarterCode(lang);

  // 1. Check code_snippets array from backend
  if (fileData.code_snippets && Array.isArray(fileData.code_snippets) && fileData.code_snippets.length > 0) {
    const matched = fileData.code_snippets.find(
      (s: any) =>
        s.language?.toLowerCase() === lang.toLowerCase() ||
        (lang === "c++" && s.language?.toLowerCase() === "cpp")
    );
    if (matched && matched.code) {
      return matched.code;
    }
  }

  // 2. If requested language matches native file extension language, return defaultContent
  const nativeLang = fileData.name ? detectLanguageFromFileName(fileData.name) : "javascript";
  if (defaultContent && (lang === nativeLang || lang === "javascript")) {
    return defaultContent;
  }

  // 3. If defaultContent exists (e.g. raw problem file from repository/DB), use defaultContent
  if (defaultContent && defaultContent.trim().length > 0) {
    return defaultContent;
  }

  return getLanguageStarterCode(lang, fileData.name);
};

const Terminal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL parameters for problem ID / file selection
  const problemOid =
    searchParams.get("oid") ||
    searchParams.get("problemId") ||
    searchParams.get("id") ||
    searchParams.get("file") ||
    "";

  // Single problem mode if explicit problem OID is provided in URL
  const isProblemWorkspaceMode = Boolean(searchParams.get("oid") || searchParams.get("problemId"));

  const [loading, setLoading] = useState<boolean>(true);
  const [filesLoading, setFilesLoading] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingMode, setExecutingMode] = useState<ExecutionMode | null>(null);
  const [outputText, setOutputText] = useState<string>("");
  const [resLoading, setResponseLoading] = useState<boolean>(false);
  const [isCustomInputRun, setIsCustomInputRun] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(!isProblemWorkspaceMode);

  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
  const [selectedMode, setSelectedMode] = useState<"files-mode" | "terminal-mode">("terminal-mode");

  // Context states
  const { filesData, setFilesData } = useContext(FileNamesContext);
  const {
    code,
    setCode,
    language,
    setLanguage,
    testCases,
    setTestCases,
    activeFile,
    setActiveFile,
    output,
    setOutput,
    customInput,
    setCustomInput,
    customInputActive,
    setCustomInputActive,
  } = useContext(CodeContext);

  const [isOutputActive, setIsOutputActive] = useState<boolean>(true);
  const [fileData, setFileData] = useState<FileContentResponse | null>(null);

  const {
    outputHeight,
    sidebarWidth,
    setOutputHeight,
    startOutputDragging,
    startSidebarDragging,
    setSidebarWidth,
  } = useTerminalLayout();

  const { setStatus } = useContext(UserResponseContext);
  const formatEditorRef = useRef<(() => void) | null>(null);
  const fileLoadRequestRef = useRef(0);

  const handleFormatCode = useCallback(() => {
    formatEditorRef.current?.();
  }, []);

  const saveLocalFileContent = useCallback((oid: string, content: string) => {
    const existing = readLocalFile(oid);
    if (!existing) return;
    localStorage.setItem(
      getLocalStorageKey(oid),
      JSON.stringify({
        ...existing,
        content,
        updatedAt: Date.now(),
      })
    );
  }, []);

  // Handle language change with automatic boilerplate template loading
  const handleLanguageChange = useCallback(
    (newLang: SupportedLanguage) => {
      setLanguage(newLang);
      const snippet = getProblemSnippet(fileData, newLang, fileData?.content);
      setCode(snippet);
    },
    [fileData, setLanguage, setCode]
  );

  const handleResetCode = useCallback(async () => {
    if (!activeFile) return;
    if (isLocalFile(activeFile)) {
      const localKey = getLocalStorageKey(activeFile);
      const existing = readLocalFile(activeFile);
      if (existing) {
        localStorage.setItem(
          localKey,
          JSON.stringify({ ...existing, content: "", updatedAt: Date.now() })
        );
      }
      setCode("");
    } else {
      setLoading(true);
      try {
        const fileContent = await fetchFileContent(activeFile, selectedFileName || undefined);
        const snippet = getProblemSnippet(fileContent, language, fileContent.content);
        setCode(snippet);
      } catch (error) {
        console.error("Failed to reset template:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [activeFile, selectedFileName, language, setCode]);

  // Click file handler in file explorer
  const handleFileClick = useCallback(
    async (oid: string, name: string) => {
      const requestId = fileLoadRequestRef.current + 1;
      fileLoadRequestRef.current = requestId;

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("file", name);
        return next;
      });

      setOutput(null);
      setOutputText("");
      setActiveFile(oid);
      setSelectedFileName(name);
      setLoading(!isLocalFile(oid));

      setFileData(null);
      setTestCases([]);
      setCode("");

      if (isLocalFile(oid)) {
        const localFile = readLocalFile(oid);
        const nextLanguage = localFile?.language ?? detectLanguageFromFileName(name);
        const nextCode = localFile?.content ?? "";

        setFileData({
          content: nextCode,
          test_cases: [],
          id: oid,
          problem_definition: "",
          difficulty_level: "",
        });
        setTestCases([]);
        setLanguage(nextLanguage);
        setCode(nextCode);
        setCustomInput("");
        setCustomInputActive(false);
        setIsCustomInputRun(false);
        setLoading(false);
        return;
      }

      try {
        const fetchName = (name && name !== oid) ? name : undefined;
        const fileContent = await fetchFileContent(oid, fetchName);
        if (fileLoadRequestRef.current !== requestId) return;

        const resolvedName = fileContent.name || name;
        const nextTestCases = buildProblemTestCases(fileContent);
        const nextLanguage = detectLanguageFromFileName(resolvedName);
        const snippet = getProblemSnippet(fileContent, nextLanguage, fileContent.content);

        setFileData(fileContent);
        setTestCases(nextTestCases);
        setLanguage(nextLanguage);
        setCode(snippet);
        if (resolvedName) setSelectedFileName(resolvedName);
        setCustomInput("");
        setCustomInputActive(false);
        setIsCustomInputRun(false);
      } catch (err) {
        console.error("Error loading file content for OID:", oid, err);
        if (fileLoadRequestRef.current !== requestId) return;
        setFileData(null);
        setCode("// Error loading problem file");
        setStatus("ERROR");
      } finally {
        if (fileLoadRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [setSearchParams, setOutput, setActiveFile, setFileData, setTestCases, setCode, setLanguage, setCustomInput, setCustomInputActive, setIsCustomInputRun, setStatus]
  );

  // Load system problem list & target file
  useEffect(() => {
    let isCancelled = false;

    const loadWorkspace = async () => {
      setFilesLoading(true);
      setLoading(true);

      try {
        const systemFiles = await fetchFileNames();
        if (isCancelled) return;
        setFilesData(systemFiles);

        let targetOid = problemOid;
        let targetName = searchParams.get("file") || searchParams.get("name") || "";

        if (targetOid || targetName) {
          const matched = systemFiles.find(
            (f: any) =>
              (targetOid && (f.oid === targetOid || f.id === targetOid)) ||
              (targetName && f.name.toLowerCase() === targetName.toLowerCase()) ||
              (targetName && f.name.toLowerCase().includes(targetName.toLowerCase())) ||
              (targetOid && f.name && f.name.toLowerCase().includes(targetOid.toLowerCase()))
          );
          if (matched) {
            targetOid = matched.oid || targetOid;
            targetName = matched.name;
          }
        } else if (systemFiles.length > 0) {
          targetOid = systemFiles[0].oid;
          targetName = systemFiles[0].name;
        }

        if (targetOid) {
          await handleFileClick(targetOid, targetName || targetOid);
        }
      } catch (err) {
        console.error("Error initializing terminal workspace:", err);
      } finally {
        if (!isCancelled) {
          setFilesLoading(false);
          setLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [problemOid]);

  // Execute Code handler
  const handleRunCode = useCallback(
    async (nextCode: string, nextLanguage: SupportedLanguage, oid: string, mode: ExecutionMode = "RUN") => {
      const customInputValue = customInputActive ? customInput.trim() : "";
      const isCustomExecution = customInputValue.length > 0;
      setIsCustomInputRun(isCustomExecution);

      setResponseLoading(true);
      setIsExecuting(true);
      setExecutingMode(mode);
      setStatus("LOADING");

      try {
        const data = await executeCode({
          code: nextCode,
          language: nextLanguage,
          oid,
          mode,
          customInput: customInputValue,
          fileName: selectedFileName || undefined,
        });
        setOutput(data);
        setStatus("SUCCESS");
        setOutputText(formatExecutionOutput(data, mode));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Execution failed";
        setOutputText(`ERROR: ${message}`);
        setOutput(null);
        setStatus("ERROR");
      } finally {
        setIsExecuting(false);
        setExecutingMode(null);
        setResponseLoading(false);
        setCustomInput("");
        if (!isCustomExecution) {
          setIsCustomInputRun(false);
        }
      }
    },
    [customInput, customInputActive, selectedFileName, setOutput, setCustomInput, setIsCustomInputRun, setStatus]
  );

  // Single Test Case Runner
  const handleRunSingleTestCase = useCallback(
    async (testCaseIndex: number) => {
      if (!testCases || !testCases[testCaseIndex]) return;
      const targetCase = testCases[testCaseIndex];
      const inputString = targetCase.input || "";

      setResponseLoading(true);
      setIsExecuting(true);
      setExecutingMode("RUN");
      setStatus("LOADING");
      setIsCustomInputRun(true);

      try {
        const data = await executeCode({
          code,
          language,
          oid: activeFile,
          mode: "RUN",
          customInput: inputString,
          fileName: selectedFileName || undefined,
        });
        setOutput(data);
        setStatus("SUCCESS");
        setOutputText(formatExecutionOutput(data, "RUN"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Execution failed";
        setOutputText(`ERROR: ${message}`);
        setOutput(null);
        setStatus("ERROR");
      } finally {
        setIsExecuting(false);
        setExecutingMode(null);
        setResponseLoading(false);
      }
    },
    [testCases, code, language, activeFile, selectedFileName, setOutput, setStatus]
  );

  const handleCodeChange = useCallback((nextCode: string) => {
    setCode(nextCode);
  }, [setCode]);

  const handleDeleteLocalFile = useCallback((oid: string) => {
    localStorage.removeItem(getLocalStorageKey(oid));
    setFilesData(filesData.filter((f) => f.oid !== oid));
  }, [setFilesData]);

  const activeFileName = selectedFileName || fileData?.name || "Problem Workspace";
  const activeFileKey = activeFile ? `${activeFile}:${activeFileName}` : "";

  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[#08090a] text-white font-mono select-none md:flex-row">
      {/* FILE EXPLORER */}
      {isFileExplorerOpen && (
        <FileExplorer
          activeFile={activeFile}
          activeFileName={activeFileName}
          files={filesData}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          fileData={fileData}
          language={language}
          testCaseCount={testCases.length}
          onFileClick={handleFileClick}
          onResizeStart={startSidebarDragging}
          sidebarWidth={sidebarWidth}
          onDeleteLocalFile={handleDeleteLocalFile}
          isLoadingFiles={filesLoading}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
        />
      )}

      {/* MAIN WORKSPACE CONTENT AREA */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-black/40">
        {/* HEADER BAR */}
        <div className="flex w-full items-center justify-between gap-3 border-b border-white/5 bg-[#0b0c0e] px-3 py-2 text-xs font-mono text-cyan-400/80 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/dashboard"
              title="Exit to Dashboard"
              className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-none border border-cyan-500/25 bg-cyan-950/10 px-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-all hover:border-cyan-400 hover:bg-cyan-950/20 active:scale-95"
            >
              <House className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">[ DASHBOARD ]</span>
            </Link>
            <span className="truncate">SYS // TERMINAL_WORKSPACE</span>
          </div>
          <div className="flex items-center gap-3">
            {fileData?.difficulty_level && (
              <span className="text-[10px] px-2 py-0.5 border border-amber-500/30 bg-amber-950/30 text-amber-400 font-bold uppercase">
                {fileData.difficulty_level}
              </span>
            )}
            <span className="truncate text-slate-500 uppercase">
              {filesLoading ? "SYNCING..." : activeFileName}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {loading && <LoadingOverlay label="Loading workspace..." />}

          <div className="absolute inset-0 flex flex-col min-h-0">
            {activeFile ? (
              <>
                {/* EDITOR TOOLBAR WITH AUTOMATIC BOILERPLATE LOADING ON LANGUAGE CHANGE */}
                <EditorToolbar
                  activeFile={activeFile}
                  disabled={resLoading || loading}
                  executingMode={executingMode}
                  language={language}
                  setLanguage={handleLanguageChange}
                  sidebarWidth={sidebarWidth}
                  setSidebarWidth={setSidebarWidth}
                  setCode={setCode}
                  fileName={activeFileName}
                  onRun={() => void handleRunCode(code, language, activeFile, "RUN")}
                  onSubmit={() => void handleRunCode(code, language, activeFile, "SUBMIT")}
                  showSubmit={!isProblemWorkspaceMode}
                  showFileExplorerToggle={true}
                  onToggleFileExplorer={() => setIsFileExplorerOpen((prev) => !prev)}
                  isFileExplorerOpen={isFileExplorerOpen}
                  onFormat={handleFormatCode}
                  onReset={handleResetCode}
                  onToggleNotes={() => setIsNotesOpen((prev) => !prev)}
                  isNotesOpen={isNotesOpen}
                  onExit={() => navigate("/dashboard")}
                />

                {/* MONACO IDE & OUTPUT PANEL */}
                <div className="flex-1 min-h-0 grid" style={{ gridTemplateRows: "minmax(0, 1fr) auto" }}>
                  <div className="h-full min-h-0 overflow-hidden">
                    <MonacoIDE
                      handleRunCode={handleRunCode}
                      language={language}
                      code={code}
                      oid={activeFile}
                      fileKey={activeFileKey}
                      onCodeChange={handleCodeChange}
                      onFormatMount={(formatAction) => {
                        formatEditorRef.current = formatAction;
                      }}
                    />
                  </div>

                  <OutputPanel
                    isExecuting={isExecuting}
                    isOutputActive={isOutputActive}
                    output={output}
                    outputHeight={outputHeight}
                    setOutputHeight={setOutputHeight}
                    outputText={outputText}
                    testCases={testCases}
                    customInput={customInput}
                    customInputActive={customInputActive}
                    isCustomInputRun={isCustomInputRun}
                    setCustomInput={setCustomInput}
                    setCustomInputActive={setCustomInputActive}
                    onResizeStart={startOutputDragging}
                    setIsOutputActive={setIsOutputActive}
                    onRunSingleTestCase={handleRunSingleTestCase}
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-cyan-500 font-mono">
                SELECT A FILE OR PROBLEM TO INITIALIZE WORKSPACE.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* GLOBAL SCRATCHPAD NOTES PANEL */}
      <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
};

export default Terminal;
