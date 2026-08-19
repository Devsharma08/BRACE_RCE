/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { House, StickyNote, Code2 } from "lucide-react";
import { CodeContext } from "../context/codeContext";
import { UserResponseContext } from "../context/responseContent";
import { executeCode, fetchFileContent, fetchFileNames } from "../features/terminal/api";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
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

const Terminal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Problem ID from search params: ?oid=... or ?problemId=... or ?file=...
  const problemOid =
    searchParams.get("oid") ||
    searchParams.get("problemId") ||
    searchParams.get("id") ||
    searchParams.get("file") ||
    "";

  const [loading, setLoading] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingMode, setExecutingMode] = useState<ExecutionMode | null>(null);
  const [outputText, setOutputText] = useState<string>("");
  const [resLoading, setResponseLoading] = useState<boolean>(false);
  const [isCustomInputRun, setIsCustomInputRun] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  // Context states
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
    setSidebarWidth,
  } = useTerminalLayout();

  const { setStatus } = useContext(UserResponseContext);
  const formatEditorRef = useRef<(() => void) | null>(null);

  // Format code helper
  const handleFormatCode = useCallback(() => {
    formatEditorRef.current?.();
  }, []);

  // Reset code to original backend template
  const handleResetCode = useCallback(async () => {
    if (!activeFile) return;
    setLoading(true);
    try {
      const fileContent = await fetchFileContent(activeFile, selectedFileName || undefined);
      setCode(fileContent.content || "");
    } catch (error) {
      console.error("Failed to reset template:", error);
    } finally {
      setLoading(false);
    }
  }, [activeFile, selectedFileName, setCode]);

  // Load problem by OID or ID on mount / searchParam change
  useEffect(() => {
    let isCancelled = false;

    const loadTargetProblem = async () => {
      setLoading(true);
      setOutput(null);
      setOutputText("");

      try {
        let targetOid = problemOid;

        // If no problem ID provided, fetch default first problem from system
        if (!targetOid) {
          const systemFiles = await fetchFileNames();
          if (systemFiles.length > 0) {
            targetOid = systemFiles[0].oid;
            setSelectedFileName(systemFiles[0].name);
          }
        }

        if (!targetOid) {
          setLoading(false);
          return;
        }

        const fileContent = await fetchFileContent(targetOid);
        if (isCancelled) return;

        const nextTestCases = buildProblemTestCases(fileContent);
        const fileName = fileContent.name || `Problem_${targetOid.slice(0, 6)}`;
        const nextLanguage = detectLanguageFromFileName(fileName);
        const nextCode = fileContent.content || "";

        setActiveFile(targetOid);
        setSelectedFileName(fileName);
        setFileData(fileContent);
        setTestCases(nextTestCases);
        setLanguage(nextLanguage);
        setCode(nextCode);
        setCustomInput("");
        setCustomInputActive(false);
        setIsCustomInputRun(false);
      } catch (err) {
        console.error("Error loading problem in terminal:", err);
        setStatus("ERROR");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadTargetProblem();

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

  // Single test case runner
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

  const handleCodeChange = useCallback(
    (nextCode: string) => {
      setCode(nextCode);
    },
    [setCode]
  );

  const activeFileName = selectedFileName || fileData?.name || "Problem Workspace";
  const activeFileKey = activeFile ? `${activeFile}:${activeFileName}` : "";

  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[#08090a] text-white font-mono select-none">
      {/* HEADER NAVBAR */}
      <header className="flex w-full items-center justify-between gap-3 border-b border-white/5 bg-[#0b0c0e] px-4 py-2 text-xs font-mono text-cyan-400/80">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            title="Exit to Dashboard"
            className="inline-flex h-7 items-center justify-center gap-1.5 border border-cyan-500/25 bg-cyan-950/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-all hover:border-cyan-400 hover:bg-cyan-950/20 active:scale-95"
          >
            <House className="h-3.5 w-3.5" />
            <span>[ EXIT TO DASHBOARD ]</span>
          </Link>

          <span className="text-slate-600">|</span>

          <span className="text-white font-bold tracking-wider flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span>{activeFileName}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {fileData?.difficulty_level && (
            <span className="text-[10px] px-2 py-0.5 border border-amber-500/30 bg-amber-950/30 text-amber-400 font-bold uppercase">
              {fileData.difficulty_level}
            </span>
          )}
        </div>
      </header>

      {/* MAIN SINGLE WORKSPACE CONTENT */}
      <main className="flex-1 min-h-0 relative flex flex-col bg-black/40">
        {loading && <LoadingOverlay label="Loading problem workspace..." />}

        <div className="absolute inset-0 flex flex-col min-h-0">
          {/* EDITOR TOOLBAR (Languages, Clear, Indentation, Notes, Run - NO Submit) */}
          <EditorToolbar
            activeFile={activeFile}
            disabled={resLoading || loading}
            executingMode={executingMode}
            language={language}
            setLanguage={setLanguage}
            sidebarWidth={sidebarWidth}
            setSidebarWidth={setSidebarWidth}
            setCode={setCode}
            fileName={activeFileName}
            onRun={() => void handleRunCode(code, language, activeFile, "RUN")}
            onFormat={handleFormatCode}
            onReset={handleResetCode}
            onToggleNotes={() => setIsNotesOpen((prev) => !prev)}
            isNotesOpen={isNotesOpen}
            onExit={() => navigate("/dashboard")}
          />

          {/* MONACO IDE & OUTPUT PANEL SPLIT */}
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

            {/* OUTPUT PANEL */}
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
        </div>
      </main>

      {/* GLOBAL SCRATCHPAD NOTES PANEL */}
      <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
};

export default Terminal;
