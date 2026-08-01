/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { House } from "lucide-react";
import { FileNamesContext, type FileEntry } from "../context/fileNamesContext";
import { CodeContext } from "../context/codeContext";
import { UserResponseContext } from "../context/responseContent";
import { executeCode, fetchFileContent, fetchFileNames } from "../features/terminal/api";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import EmptyTerminalState from "../features/terminal/components/EmptyTerminalState";
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

const Terminal = () => {
   const [searchParams, setSearchParams] = useSearchParams();
   const queryFile = searchParams.get("file");
   const [loading, setLoading] = useState<boolean>(false);
   const [filesLoading, setFilesLoading] = useState<boolean>(true);
   const [isExecuting, setIsExecuting] = useState(false);
   const [executingMode, setExecutingMode] = useState<ExecutionMode | null>(null);
   const [outputText, setOutputText] = useState<string>("");
   const [resLoading, setResponseLoading] = useState<boolean>(false);
   const [isCustomInputRun, setIsCustomInputRun] = useState<boolean>(false);
   const [selectedFileName, setSelectedFileName] = useState<string>("");
   
   // context states
   const {
      filesData,
      setFilesData
   } = useContext(FileNamesContext);
   
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

   // selection b/w output or test cases
   const [isOutputActive, setIsOutputActive] = useState<boolean>(true);

   // problem definition data
   const [fileData, setFileData] = useState<FileContentResponse | null>(null);

   // terminal mode 
   const [selectedMode, setSelectedMode] = useState<"files-mode" | "terminal-mode">("terminal-mode");
   const [dismissRotationAlert, setDismissRotationAlert] = useState<boolean>(false);

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
   const pendingFileParamRef = useRef<string | null>(null);

   // filter files accoring to difficulty level
   const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");

    const handleResetCode = useCallback(async () => {
       if (!activeFile) return;

       if (isLocalFile(activeFile)) {
          // Reset local file to empty string template
          const localKey = getLocalStorageKey(activeFile);
          const existing = readLocalFile(activeFile);
          if (existing) {
             localStorage.setItem(
                localKey,
                JSON.stringify({
                   ...existing,
                   content: "",
                   updatedAt: Date.now(),
                })
             );
          }
          setCode("");
       } else {
          // Seed/Repository file - Re-fetch clean template from backend
          setLoading(true);
          try {
             const fileContent = await fetchFileContent(activeFile, selectedFileName || undefined);
             const nextCode = fileContent.content || "";
             setCode(nextCode);
          } catch (error) {
             console.error("Failed to reset template:", error);
          } finally {
             setLoading(false);
          }
       }
    }, [activeFile, selectedFileName, setCode]);
   

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
         }),
      );
   }, []);
   
   // console.log("activeFile", activeFile, fileData);

     const handleFileClick = useCallback(async (oid: string, name: string) => {
        const requestId = fileLoadRequestRef.current + 1;
        fileLoadRequestRef.current = requestId;
        pendingFileParamRef.current = name;

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

        // Immediately clear problem details to prevent stale layout leakage from previous files
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
           const fileContent = await fetchFileContent(oid, name);
           if (fileLoadRequestRef.current !== requestId) {
              return;
           }
           const nextTestCases = buildProblemTestCases(fileContent);
           const nextLanguage = detectLanguageFromFileName(name);
           const nextCode = fileContent.content || "";

           setFileData(fileContent);
           setTestCases(nextTestCases);
           setLanguage(nextLanguage);
           setCode(nextCode);
           setCustomInput("");
           setCustomInputActive(false);
           setIsCustomInputRun(false);
        } catch {
           if (fileLoadRequestRef.current !== requestId) {
              return;
           }
           setFileData(null);
           setCode("error some thing wen't wrong");
           setStatus("ERROR");
        }
        finally {
           if (fileLoadRequestRef.current === requestId) {
              setLoading(false);
           }
        }
     }, [setSearchParams, setOutput, setActiveFile, setFileData, setTestCases, setCode, setLanguage, setCustomInput, setCustomInputActive, setIsCustomInputRun, setStatus]);


   // function to run the code 
    const handleRunCode = useCallback(async (nextCode: string, nextLanguage: SupportedLanguage, oid: string, mode: ExecutionMode = "RUN") => {
       const customInputValue = customInputActive ? customInput.trim() : "";
       const isCustomExecution = customInputValue.length > 0;
       setIsCustomInputRun(isCustomExecution);

       setResponseLoading(true);
       setIsExecuting(true);
       setExecutingMode(mode);
       setStatus("LOADING");

       try {
          const data = await executeCode({ code: nextCode, language: nextLanguage, oid, mode, customInput: customInputValue, fileName: selectedFileName || undefined });
          setOutput(data);
          setStatus("SUCCESS");
          setOutputText(formatExecutionOutput(data, mode));
       } catch (error) {
          const message = error instanceof Error ? error.message : "something went wrong";
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
    }, [customInput, customInputActive, selectedFileName, setOutput, setCustomInput, setIsCustomInputRun, setStatus]);

   // console.log("fileData", fileNamesData);

   const loadLocalFiles = useCallback(() => {
      const localFiles: FileEntry[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
         const key = localStorage.key(index);
         if (!key?.startsWith(LOCAL_FILE_STORAGE_PREFIX)) continue;

         const raw = localStorage.getItem(key);
         if (!raw) continue;

         try {
            const parsed = JSON.parse(raw) as { name: string; content: string; language: SupportedLanguage };
            const oid = key.replace(LOCAL_FILE_STORAGE_PREFIX, "");
            localFiles.push({
               name: parsed.name,
               oid,
               type: parsed.language === "java" ? "text/java" : "text/javascript",
               isLocal: true,
            });
         } catch {
            // ignore invalid local file entries
         }
      }
      return localFiles;
   }, []);

    useEffect(() => {
       // Clear persistent context and local state on mount to prevent leakage from previous problems
       setCode("");
       setActiveFile("");
       setSelectedFileName("");
       setTestCases([]);
       setOutput(null);
       setOutputText("");
       setCustomInput("");
       setCustomInputActive(false);
       setIsCustomInputRun(false);
    }, [setCode, setActiveFile, setTestCases, setOutput, setCustomInput, setCustomInputActive]);

   useEffect(() => {
      let cancelled = false;

      const loadFileNames = async () => {
         await Promise.resolve();
         const localFiles = loadLocalFiles();
         if (cancelled) return;

         setFilesLoading(true);
         setFilesData(localFiles);
         setStatus("LOADING");

         try {
            const data = await fetchFileNames();
            if (cancelled) return;
            setFilesData([...localFiles, ...data]);
            setStatus("SUCCESS");
         } catch {
            if (cancelled) return;
            setFilesData(localFiles);
            setStatus("ERROR");
         } finally {
            if (!cancelled) {
               setFilesLoading(false);
            }
         }
      };

      void loadFileNames();

      return () => {
         cancelled = true;
      };
   }, [loadLocalFiles, setFilesData, setStatus]);

   useEffect(() => {
      if (pendingFileParamRef.current && pendingFileParamRef.current !== queryFile) {
         return;
      }

      if (pendingFileParamRef.current === queryFile) {
         pendingFileParamRef.current = null;
      }

      if (!filesLoading && filesData.length > 0 && queryFile) {
         const matched = filesData.find(
            (file) => file.name.toLowerCase() === queryFile.toLowerCase() || file.oid === queryFile
         );
         if (matched && (activeFile !== matched.oid || selectedFileName !== matched.name)) {
            void handleFileClick(matched.oid, matched.name);
         }
      }
   }, [filesLoading, filesData, queryFile, activeFile, selectedFileName, handleFileClick]);

   // console.log("filesData", filesData);

    const handleCodeChange = useCallback((nextCode: string) => {
       setCode(nextCode);
    }, [setCode]);

   useEffect(() => {
      if (!activeFile || !isLocalFile(activeFile)) {
         return;
      }

      const timeoutId = window.setTimeout(() => {
         saveLocalFileContent(activeFile, code);
      }, 200);

      return () => window.clearTimeout(timeoutId);
   }, [activeFile, code, saveLocalFileContent]);

   const activeFileEntry =
      filesData.find((file) => file.oid === activeFile && file.name === selectedFileName) ??
      filesData.find((file) => file.oid === activeFile);
   const activeFileName = selectedFileName || activeFileEntry?.name || "Editor";
   const activeFileKey = activeFile ? `${activeFile}:${activeFileName}` : "";

   const handleCreateLocalFile = (name: string) => {
      const normalizedName = name.trim();
      const languageFromName = detectLanguageFromFileName(normalizedName);
      const oid = `${LOCAL_FILE_ID_PREFIX}${crypto.randomUUID?.() ?? Date.now().toString()}`;
      const localFile = {
         name: normalizedName,
         content: "",
         language: languageFromName,
         createdAt: Date.now(),
         updatedAt: Date.now(),
      };

      localStorage.setItem(getLocalStorageKey(oid), JSON.stringify(localFile));
      setFilesData([
         ...filesData,
         {
            name: normalizedName,
            oid,
            type: languageFromName === "java" ? "text/java" : "text/javascript",
            isLocal: true,
         },
      ]);

      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set("file", normalizedName);
         return next;
      });

      setActiveFile(oid);
      setSelectedFileName(normalizedName);
      setFileData({
         content: "",
         test_cases: [],
         id: oid,
         problem_definition: "",
         difficulty_level: "",
      });
      setTestCases([]);
      setLanguage(languageFromName);
      setCode("");
      setCustomInput("");
      setCustomInputActive(false);
      setIsCustomInputRun(false);
   };

   const handleDeleteLocalFile = useCallback((oid: string) => {
      if (!oid) return;

      localStorage.removeItem(getLocalStorageKey(oid));
      setFilesData(filesData.filter((file) => file.oid !== oid));

      if (activeFile !== oid) {
         return;
      }

      setActiveFile("");
      setSelectedFileName("");
      setFileData(null);
      setTestCases([]);
      setLanguage("javascript");
      setCode("");
      setOutput(null);
      setOutputText("");
      setCustomInput("");
      setCustomInputActive(false);
      setIsCustomInputRun(false);
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.delete("file");
         return next;
      });
   }, [
      activeFile,
      filesData,
      setActiveFile,
      setCode,
      setCustomInput,
      setCustomInputActive,
      setFilesData,
      setLanguage,
      setOutput,
      setSearchParams,
      setTestCases,
   ]);

   return (
      <div className='flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[#08090a] fui-grid-bg text-white md:flex-row'>
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
            onCreateFile={handleCreateLocalFile}
            onDeleteLocalFile={handleDeleteLocalFile}
            isLoadingFiles={filesLoading}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
         />

         <main className='flex min-h-0 min-w-0 flex-1 flex-col bg-black/40'>
            <div className="flex w-full items-center justify-between gap-3 border-b border-white/5 bg-[#0b0c0e] px-3 py-2 text-xs font-mono text-cyan-400/80 sm:px-4">
               <div className="flex min-w-0 items-center gap-2">
                  <Link
                     to="/"
                     title="Go to home"
                     className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-none border border-cyan-500/25 bg-cyan-950/10 px-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-all duration-150 hover:border-cyan-400 hover:bg-cyan-950/20 active:scale-95"
                  >
                     <House className="h-3.5 w-3.5" />
                     <span className="hidden sm:inline">[ HOME ]</span>
                  </Link>
                  <span className="truncate">SYS // TERMINAL_WORKSPACE</span>
               </div>
               <span className="truncate text-slate-500 uppercase">{filesLoading ? "SYNCING..." : activeFileName}</span>
            </div>

            <div className='flex-1 min-h-0 relative'>
               {loading && <LoadingOverlay label="Loading file content..." />}

               <div className='absolute inset-0 flex flex-col min-h-0'>
                  {activeFile ? (
                     <>
                        <EditorToolbar
                           activeFile={activeFile}
                           disabled={resLoading}
                           executingMode={executingMode}
                           language={language}
                           setLanguage={setLanguage}
                           sidebarWidth={sidebarWidth}
                           setSidebarWidth={setSidebarWidth}
                           setCode={setCode}
                           fileName={activeFileName}
                           onRun={() => void handleRunCode(code, language, activeFile, "RUN")}
                           onSubmit={() => void handleRunCode(code, language, activeFile, "SUBMIT")}
                           onFormat={handleFormatCode}
                           onReset={handleResetCode}
                        />

                        <div className='flex-1 min-h-0 grid' style={{ gridTemplateRows: "minmax(0, 1fr) auto" }}>
                           <div className="min-h-0 overflow-hidden">
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
                           />
                        </div>
                     </>
                  ) : (
                     <EmptyTerminalState />
                  )}
               </div>
            </div>
         </main>

         {/* ⚠️ FUI Dynamic Portrait Layout Rotation Warning Overlay */}
         {!dismissRotationAlert && (
            <div className="portrait-rotate-warning fixed inset-0 z-[9999] hidden flex-col items-center justify-center bg-[#08090a]/90 p-6 text-center font-mono backdrop-blur-md select-none">
               {/* Styling animations and media queries */}
               <style dangerouslySetInnerHTML={{__html: `
                  @keyframes portraitDeviceRotate {
                     0%, 100% {
                        transform: rotate(0deg);
                     }
                     40%, 60% {
                        transform: rotate(90deg);
                     }
                  }
                  .animate-portrait-rotate {
                     animation: portraitDeviceRotate 3.5s ease-in-out infinite;
                  }
                  @media (max-width: 767px) and (orientation: portrait) {
                     .portrait-rotate-warning {
                        display: flex !important;
                     }
                  }
               `}} />

               {/* Ambient glowing border box */}
               <div className="relative max-w-sm rounded-none border border-cyan-500/30 bg-[#0c0d10] p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col items-center text-center">
                  
                  {/* Cyber corner L-brackets */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400"></div>

                  {/* Rotating device visual animation */}
                  <div className="w-16 h-16 rounded-none bg-cyan-950/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 relative overflow-hidden">
                     <svg 
                        className="w-8 h-8 animate-portrait-rotate" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                     >
                        <rect x="5" y="2" width="14" height="20" rx="2" className="origin-center" />
                        <path d="M12 18h.01" />
                     </svg>
                  </div>

                  {/* Warning headers */}
                  <span className="text-[10px] text-cyan-400/60 font-bold tracking-[0.25em] mb-2 uppercase select-none">
                     // SYS // PORTRAIT_LAYOUT_DETECTED
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 leading-relaxed">
                     Rotate Device for Landscape Workspace
                  </h3>
                  
                  {/* Details */}
                  <p className="text-[10px] text-slate-400 leading-relaxed uppercase mb-6 tracking-wide">
                     The Monaco Editor and telemetry consoles require a horizontal layout to display constraints, codes, and test cases side-by-side. Please rotate your device.
                  </p>

                  {/* Snappy action button to bypass */}
                  <button
                     onClick={() => setDismissRotationAlert(true)}
                     className="group relative inline-flex items-center justify-center gap-2 border border-cyan-500/35 bg-cyan-950/10 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-950/20 py-2.5 px-5 font-mono text-[10px] font-bold tracking-[0.15em] text-cyan-400 transition-all duration-300 cursor-pointer select-none rounded-none w-full"
                  >
                     <span>[ CONTINUE_IN_PORTRAIT ]</span>
                  </button>
               </div>
            </div>
         )}
      </div>
   );

}

export default Terminal;
