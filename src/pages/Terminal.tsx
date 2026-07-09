import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { FileNamesContext } from "../context/fileNamesContext";
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
import type { ExecutionMode, ExecutionResult, ProblemTestCase, SupportedLanguage } from "../features/terminal/types";

const Terminal = () => {
   const [code, setCode] = useState<string>("");
   const [language, setLanguage] = useState<SupportedLanguage>("java");
   const [loading, setLoading] = useState<boolean>(false);
   const [activeFile, setActiveFile] = useState<string | null>(null);
   const [isExecuting, setIsExecuting] = useState(false);
   const [outputText, setOutputText] = useState<string>("");
   const [output, setOutput] = useState<ExecutionResult | null>(null);
   const [resLoading, setResponseLoading] = useState<boolean>(false);

   // selection b/w output or test cases
   const [isOutputActive, setIsOutputActive] = useState<boolean>(true);

   // testcases
   const [testCases, setTestCases] = useState<ProblemTestCase[]>([]);

   const {
      outputHeight,
      sidebarWidth,
      startOutputDragging,
      startSidebarDragging,
   } = useTerminalLayout();

   // context states
   const {
      filesData,
      setFilesData
   } = useContext(FileNamesContext);

   const { setStatus } = useContext(UserResponseContext);
   const { setCode: setContextCode, setLanguage: setContextLanguage, setTestCases: setContextTestCases, setActiveFile: setContextActiveFile, setOutput: setContextOutput } = useContext(CodeContext);

   const executeCache = useRef<Map<string, ExecutionResult>>(new Map());

   // function to fetch code and test cases when a file is clicked
   const handleFileClick = useCallback(async (oid: string, name: string) => {
      setOutput(null);
      setOutputText("");
      setContextOutput(null);
      setLoading(true);
      setActiveFile(oid);

      try {
         const data = await fetchFileContent(oid);
         const nextTestCases = buildProblemTestCases(data);
         const nextLanguage = detectLanguageFromFileName(name);
         const nextCode = data.content || "";

         setTestCases(nextTestCases);
         setLanguage(nextLanguage);
         setCode(nextCode);
         setContextCode(nextCode);
         setContextLanguage(nextLanguage);
         setContextTestCases(nextTestCases);
         setContextActiveFile(oid);
      } catch {
         setCode("error some thing wen't wrong");
         setStatus("ERROR");
      }
      finally {
         setLoading(false);
      }
   }, [setContextActiveFile, setContextCode, setContextLanguage, setContextOutput, setContextTestCases, setStatus]);


   // function to run the code 
   const handleRunCode = useCallback(async (nextCode: string, nextLanguage: SupportedLanguage, oid: string, mode: ExecutionMode = "RUN") => {
      const cacheKey = `${oid}-${nextLanguage}-${mode}-${nextCode}`;
      const cached = executeCache.current.get(cacheKey);
      if (cached) {
         setOutput(cached);
         setContextOutput(cached);
         setStatus("SUCCESS");
         setOutputText(formatExecutionOutput(cached, mode));
         return;
      }

      setResponseLoading(true);
      setIsExecuting(true);
      setStatus("LOADING");

      try {
         const data = await executeCode({ code: nextCode, language: nextLanguage, oid, mode });
         executeCache.current.set(cacheKey, data);
         setOutput(data);
         setContextOutput(data);
         setStatus("SUCCESS");
         setOutputText(formatExecutionOutput(data, mode));
      } catch (error) {
         const message = error instanceof Error ? error.message : "something went wrong";
         setOutputText(`ERROR: ${message}`);
         setOutput(null);
         setStatus("ERROR");
      } finally {
         setIsExecuting(false);
         setResponseLoading(false);
      }
   }, [setContextOutput, setStatus]);

   // function to fetch file names
   const handleFetchFileNames = useCallback(async () => {
      try {
         const data = await fetchFileNames();
         setFilesData(data);
         setStatus("SUCCESS");
      } catch {
         setStatus("ERROR");
      }
   }, [setFilesData, setStatus]);

   useEffect(() => {
      void handleFetchFileNames();
   }, [handleFetchFileNames]);

   const handleCodeChange = useCallback((nextCode: string) => {
      setCode(nextCode);
      setContextCode(nextCode);
   }, [setContextCode]);

   const activeFileName = filesData.find((file) => file.oid === activeFile)?.name || "Editor";


   return (
      <>
         <div className='flex h-screen bg-[#1e1e1e] text-white pt-16'>
            <FileExplorer
               activeFile={activeFile}
               files={filesData}
               onFileClick={handleFileClick}
               onResizeStart={startSidebarDragging}
               sidebarWidth={sidebarWidth}
            />

            {/* monaco editor area */}
            <main className='relative flex-1 flex flex-col min-h-0 bg-[#1e1e1e]'>
               {loading && <LoadingOverlay />}

               <div className='flex-1 flex flex-col min-h-0'>
                  {activeFile ? (
                     <>
                        <EditorToolbar
                           disabled={resLoading}
                           fileName={activeFileName}
                           onRun={() => void handleRunCode(code, language, activeFile, "RUN")}
                           onSubmit={() => void handleRunCode(code, language, activeFile, "SUBMIT")}
                        />

                        <div className="flex-1 relative min-h-0">
                           <MonacoIDE
                              handleRunCode={handleRunCode}
                              language={language}
                              code={code}
                              oid={activeFile}
                              onCodeChange={handleCodeChange}
                           />
                        </div>

                        <OutputPanel
                           isExecuting={isExecuting}
                           isOutputActive={isOutputActive}
                           output={output}
                           outputHeight={outputHeight}
                           outputText={outputText}
                           testCases={testCases}
                           onResizeStart={startOutputDragging}
                           setIsOutputActive={setIsOutputActive}
                        />
                     </>
                  ) : (
                     <EmptyTerminalState />
                  )}
               </div>
            </main>

         </div>
      </>
   );

}

export default Terminal;
