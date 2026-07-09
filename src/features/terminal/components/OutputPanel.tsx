import { Loader2 } from "lucide-react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type { ExecutionResult, ProblemTestCase } from "../types";

type OutputPanelProps = {
  isExecuting: boolean;
  isOutputActive: boolean;
  output: ExecutionResult | null;
  outputHeight: number;
  outputText: string;
  testCases: ProblemTestCase[];
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
  setIsOutputActive: Dispatch<SetStateAction<boolean>>;
};

const getTabClassName = (isActive: boolean) =>
  `mx-2 bg-indigo-500/10 cursor-pointer active:scale-95 transition-transform duration-100 font-semibold border-2 px-2 rounded-sm uppercase ${
    isActive ? "text-indigo-400 border-indigo-500" : "text-slate-500 border-white/10"
  }`;

const OutputPanel = ({
  isExecuting,
  isOutputActive,
  output,
  outputHeight,
  outputText,
  testCases,
  onResizeStart,
  setIsOutputActive,
}: OutputPanelProps) => {
  const getResultForCase = (index: number) => {
    return output?.details?.find((detail) => detail.testCaseIndex === index);
  };

  return (
    <>
      <div
        onMouseDown={onResizeStart}
        className="w-full h-1.5 hover:bg-indigo-500/50 cursor-row-resize transition-colors z-10"
      />
      <div
        style={{ height: `${outputHeight}px` }}
        className="shrink-0 bg-[#1e1e1e] border-t border-white/10 p-4 font-mono text-sm overflow-y-auto"
      >
        <div className="text-slate-500 text-md mb-2 border-b border-white/10 pb-1 flex justify-start items-center">
          <button onClick={() => setIsOutputActive(true)} className={getTabClassName(isOutputActive)}>
            Output
          </button>
          <button onClick={() => setIsOutputActive(false)} className={getTabClassName(!isOutputActive)}>
            Test Cases
          </button>
        </div>

        {isExecuting ? (
          <div className="flex items-center gap-2 text-indigo-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Executing...</span>
          </div>
        ) : isOutputActive ? (
          <pre className="whitespace-pre-wrap text-gray-300">
            {outputText || "// Output will appear here after running the code"}
          </pre>
        ) : (
          <div className="space-y-4">
            {testCases.length === 0 ? (
              <p className="text-slate-500">No test cases loaded.</p>
            ) : (
              testCases.map((item, index) => {
                const match = getResultForCase(index);
                const borderClassName = match
                  ? match.passed
                    ? "border-green-500"
                    : "border-red-500"
                  : "border-white/10";

                return (
                  <div key={`${item.input}-${index}`} className={`output flex border-2 flex-col p-3 rounded-md gap-2 ${borderClassName}`}>
                    <p className="border border-white/10 text-start rounded-sm p-1.5 text-sm font-medium bg-white/5">
                      <span className="text-slate-400 font-semibold">Input:</span> {item.input}
                    </p>
                    <p className="text-sm font-medium">
                      <span className="text-slate-400 font-semibold">Expected Output:</span> {item.expectedOutput}
                    </p>

                    {match && (
                      <>
                        <p className="text-sm font-medium">
                          <span className="text-slate-400 font-semibold">Actual Output:</span>{" "}
                          <span className={match.passed ? "text-green-400" : "text-red-400"}>
                            {match.output || (match.runtimeError ? "Error" : "empty")}
                          </span>
                        </p>
                        {match.runtimeError && (
                          <p className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-2 rounded whitespace-pre-wrap">
                            <span className="font-bold">Error:</span> {match.runtimeError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default OutputPanel;
