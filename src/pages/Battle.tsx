import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "../components/ui/Skeleton";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/socketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import OutputPanel from "../features/terminal/components/OutputPanel";
import { useTerminalLayout } from "../features/terminal/hooks/useTerminalLayout";
import type { SupportedLanguage, ExecutionResult } from "../features/terminal/types";
import { executeCode } from "../features/terminal/api";
import {
  Code,
  Activity,
  Trophy,
  Skull,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Play,
  Clock,
  StopCircle,
  Lock,
  Terminal,
  Flag,
} from "lucide-react";
import { api } from "../config/api";
import { NotesPanel } from "../components/ui/NotesPanel";


interface BattleMessage {
  id: string;
  socketId: string;
  content: string;
  createdAt: string;
}

const ProblemHintsAccordion = ({ hints }: { hints?: any }) => {
  const [unlockedCount, setUnlockedCount] = useState<number>(0);

  const parsedHints = useMemo(() => {
    if (Array.isArray(hints) && hints.length > 0) return hints;
    if (typeof hints === "string" && hints.trim().length > 0) return [hints];
    return [
      "Analyze input data constraints and identify potential edge cases (e.g. empty inputs, zero values, or single element arrays).",
      "Consider using an efficient data structure (such as a Hash Map, Two-Pointers, or Sliding Window) to reduce time complexity.",
      "Optimal Strategy: Aim for O(N) time complexity and O(1) auxiliary space where feasible."
    ];
  }, [hints]);

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-950/5 p-4 font-mono text-xs mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1">
          ⚡ PROBLEM HINTS & BLUEPRINT ({unlockedCount}/{parsedHints.length})
        </span>
        {unlockedCount < parsedHints.length && (
          <button
            type="button"
            onClick={() => setUnlockedCount((prev) => Math.min(parsedHints.length, prev + 1))}
            className="text-[9px] font-bold text-amber-300 border border-amber-500/30 bg-amber-950/20 px-2 py-0.5 uppercase tracking-wider hover:bg-amber-950/50 transition-all cursor-pointer"
          >
            [ REVEAL HINT #{unlockedCount + 1} ]
          </button>
        )}
      </div>

      {unlockedCount === 0 ? (
        <div className="text-[10px] text-slate-500 italic">
          Hints are locked to encourage independent problem-solving. Click above to unlock hints step-by-step.
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {parsedHints.slice(0, unlockedCount).map((hintText, idx) => (
            <div key={`hint-${idx}`} className="border-l-2 border-amber-400 bg-black/40 p-2.5 text-[10px] text-amber-200/90 leading-relaxed">
              <span className="font-bold text-amber-400 block mb-0.5">// HINT #{idx + 1}</span>
              {hintText}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getLanguageStarterCode = (lang: SupportedLanguage, problemName?: string) => {
  switch (lang) {
    case "python":
      return `# Write your Python solution for ${problemName || "problem"}\ndef solution():\n    pass\n`;
    case "c++":
      return `// Write your C++ solution for ${problemName || "problem"}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n`;
    case "java":
      return `// Write your Java solution for ${problemName || "problem"}\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`;
    case "c":
      return `// Write your C solution for ${problemName || "problem"}\n#include <stdio.h>\n\nint main() {\n    return 0;\n}\n`;
    case "javascript":
    default:
      return `// Write your JavaScript solution for ${problemName || "problem"}\nfunction solution() {\n  \n}\n`;
  }
};

const getProblemSnippet = (problem: any, lang: SupportedLanguage) => {
  if (!problem) return getLanguageStarterCode(lang);
  const snippet = problem.code_snippets?.find(
    (s: any) => s.language?.toLowerCase() === lang.toLowerCase() || (lang === "c++" && s.language?.toLowerCase() === "cpp")
  );
  return snippet?.code || getLanguageStarterCode(lang, problem.name);
};

export const Battle = () => {
  const { roomId } = useParams<{ roomId: string }>(); // roomId is actually roomCode for custom rooms
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // --- ROOM / EVENT STATE ---
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [battleState, setBattleState] = useState<any>({ status: "WAITING" });
  const [isHost, setIsHost] = useState(false);
  const [battleResult, setBattleResult] = useState<"WON" | "LOST" | null>(null);
  const [isBattleMenuOpen, setIsBattleMenuOpen] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<any>(null);
  const [, setMyUserId] = useState<string>("");

  // --- PROBLEM STATE ---
  const [problems, setProblems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeProblem = problems[currentIndex];

  const [code, setCode] = useState<string>("// Initialization...");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- TIMERS ---
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState<number | null>(
    null,
  );
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number | null>(
    null,
  );

  // Store codes for each problem
  const [codes, setCodes] = useState<Record<string, string>>({});
  // Store local start times per problem when first visited
  const [problemStartTimes, setProblemStartTimes] = useState<
    Record<string, number>
  >({});
  const [countdown, setCountDown] = useState<number>(0);

  // --- CHAT STATE ---
  const [battleMessages, setBattleMessages] = useState<BattleMessage[]>([]);
  const [newBattleMessage, setNewBattleMessage] = useState("");
  const [activePanelTab, setActivePanelTab] = useState<"PROBLEM" | "CHAT">(
    "PROBLEM",
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  // terminal
  const [isTerminal, setIsTerminal] = useState<boolean>(true);
  const [terminalOutput, setTerminalOutput] = useState(
    "// COMPILATION LOGS WILL BE DISPLAYED HERE",
  );
  const [executionOutput, setExecutionOutput] = useState<ExecutionResult | null>(null);
  const [isOutputActive, setIsOutputActive] = useState<boolean>(true);
  const [customInput, setCustomInput] = useState<string>("");
  const [customInputActive, setCustomInputActive] = useState<boolean>(false);
  const [isCustomInputRun, setIsCustomInputRun] = useState<boolean>(false);

  const formatEditorRef = useRef<(() => void) | null>(null);

  const {
    outputHeight,
    sidebarWidth,
    setOutputHeight,
    setSidebarWidth,
    startOutputDragging,
    startSidebarDragging,
  } = useTerminalLayout();

  const handleRunSingleTestCase = async (index: number) => {
    if (!activeProblem?.test_cases?.[index]) return;
    const targetCase = activeProblem.test_cases[index];
    const inputString = targetCase.input || "";

    setIsSubmitting(true);
    setIsCustomInputRun(true);

    try {
      const res = await executeCode({
        code,
        language,
        oid: activeProblem.github_oid || "local-battle",
        fileName: activeProblem.name,
        mode: "RUN",
        customInput: inputString,
      });
      setExecutionOutput(res);
      setTerminalOutput(
        res.status === "PASSED"
          ? "Single test case execution passed."
          : "Single test case execution returned errors or output mismatch."
      );
    } catch (err: any) {
      setTerminalOutput(`ERROR: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: remainingTimeData } = useQuery({
    queryKey: ["room-time-left", roomId],
    enabled: Boolean(roomId),
    queryFn: async () => {
      const res = await api.get(`/room/time-left`, { params: { roomId } });
      if (res.data?.status === "success" && res.data?.remainingSeconds !== undefined) {
        return res.data.remainingSeconds;
      }
      return null;
    },
  });

  useEffect(() => {
    if (remainingTimeData !== undefined && remainingTimeData !== null) {
      setLocalTimeRemaining(remainingTimeData);
    }
  }, [remainingTimeData]);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const [roomRes, profileRes] = await Promise.all([
          api.get(`/rooms/live/${roomId}`),
          api.get("/profile"),
        ]);

        const roomData = roomRes.data.room;
        setRoom(roomData);
        const myId = profileRes.data.data.id;
        setMyUserId(myId);
        setIsHost(myId === roomData.hostId);

        let targetProblems = [];
        if (roomData.type === "ONE_VS_ONE") {
          targetProblems = [roomData.commonProblem];
          setProblems(targetProblems);
          const oppPerf = roomData.performances?.find(
            (p: any) => p.user.id !== myId,
          );
          setOpponent(oppPerf?.user || null);
        } else {
          targetProblems = roomData.problems;
          setProblems(targetProblems);
        }

        // Initialize codes
        const initialCodes: Record<string, string> = {};
        targetProblems.forEach((p: any) => {
          if (!p) return;
          const jsSnip = p.code_snippets?.find(
            (s: any) => s.language === "javascript",
          );
          initialCodes[p.id] = jsSnip ? jsSnip.code : "// Write your code here";
        });
        setCodes(initialCodes);
      } catch (err: any) {
        console.error("Failed to load room", err);
        alert(
          `Could not join room: ${err.response?.data?.message || err.message}`,
        );
        navigate("/lobby");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, navigate]);

  // Setup Sockets
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("join_battle", roomId);

    socket.on("battle_starting", (data: { countdownSeconds?: number }) => {
      setCountDown(data?.countdownSeconds || 3);
    });

    socket.on("battle_state", (data) => {
      setBattleState((prev: any) => {
        if (prev.status === "WAITING" && data.status === "IN_PROGRESS") {
          setCountDown(3);
        }
        return data;
      });
      if (data.remainingSeconds !== undefined) {
        setLocalTimeRemaining(data.remainingSeconds);
      }
      if (
        data.status === "FINISHED" ||
        (data.remainingSeconds !== undefined && data.remainingSeconds <= 0)
      ) {
        setBattleResult("LOST"); // Default to lost if time's up
        setIsBattleMenuOpen(true);
      }
    });

    socket.on("receive_battle_message", (msg) => {
      setBattleMessages((prev) => [...prev, msg]);
    });

    socket.on("battle_update", (data) => {
      if (data.result === "OPPONENT_WON") {
        setBattleResult("LOST");
        setIsBattleMenuOpen(true);
      }
      if (data.result === "OPPONENT_SURRENDERED") {
        setBattleResult("WON");
        setIsBattleMenuOpen(true);
      }
    });

    return () => {
      socket.emit("leave_room", roomId);
      socket.off("battle_starting");
      socket.off("battle_state");
      socket.off("receive_battle_message");
      socket.off("battle_update");
    };
  }, [socket, roomId]);

  // Handle 3-second Get Ready Countdown before event begins
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle Timers
  useEffect(() => {
    if (localTimeRemaining === null || localTimeRemaining <= 0) return;
    const timer = setInterval(() => {
      setLocalTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setBattleResult("LOST");
          setIsBattleMenuOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [localTimeRemaining]);

  // Update editor when active problem changes
  useEffect(() => {
    if (activeProblem && codes[activeProblem.id]) {
      setCode(codes[activeProblem.id]);
      console.log("active problem:", activeProblem.test_cases);
    }
  }, [activeProblem, codes]);

  // Handlers
  const handleStartOperation = () => {
    setCountDown(3);
    socket?.emit("start_event", roomId);
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    const snippet = getProblemSnippet(activeProblem, newLang);
    setCode(snippet);
    if (activeProblem) {
      setCodes((prev) => ({ ...prev, [activeProblem.id]: snippet }));
    }
  };

  const handleResetCode = () => {
    const snippet = getProblemSnippet(activeProblem, language);
    setCode(snippet);
    if (activeProblem) {
      setCodes((prev) => ({ ...prev, [activeProblem.id]: snippet }));
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (activeProblem) {
      setCodes((prev) => ({ ...prev, [activeProblem.id]: newCode }));
    }
  };

  const handleBattleMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBattleMessage.trim()) return;
    socket?.emit("send_battle_message", { roomId, content: newBattleMessage });
    setNewBattleMessage("");
  };

  const isBattleActive =
    battleState.status === "IN_PROGRESS" &&
    battleResult === null &&
    (localTimeRemaining === null || localTimeRemaining > 0);

  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);

  const handleSurrenderClick = () => {
    setIsSurrenderModalOpen(true);
  };

  const handleConfirmSurrender = () => {
    if (!socket || !roomId) return;
    socket.emit("surrender_match", { roomId });
    socket.emit("surrender_battle", roomId);
    setBattleResult("LOST");
    setIsSurrenderModalOpen(false);
    setIsBattleMenuOpen(true);
  };

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setIsSubmitting(true);
    setIsTerminal(true);
    setTerminalOutput("Executing code and running test cases...");

    // Reset test case statuses for active problem before running
    setProblems((prev) => {
      const newProblems = [...prev];
      const currentProb = { ...newProblems[currentIndex] };
      currentProb.test_cases = (currentProb.test_cases || []).map(
        (tc: any) => ({
          ...tc,
          status: undefined,
          output: undefined,
          runtimeError: undefined,
        }),
      );
      newProblems[currentIndex] = currentProb;
      return newProblems;
    });

    try {
      const res = await executeCode({
        code,
        language,
        oid: activeProblem.github_oid || activeProblem.id,
        mode: "SUBMIT",
      });

      setExecutionOutput(res);

      if (res.details) {
        setProblems((prev) => {
          const newProblems = [...prev];
          const currentProb = { ...newProblems[currentIndex] };
          const newTestCases = [...(currentProb.test_cases || [])];

          res.details?.forEach((detail) => {
            const tcIndex = detail.testCaseIndex;
            if (newTestCases[tcIndex]) {
              newTestCases[tcIndex] = {
                ...newTestCases[tcIndex],
                status: detail.passed ? "PASSED" : "FAILED",
                output: detail.output || "",
                runtimeError: detail.runtimeError || "",
              };
            }
          });

          currentProb.test_cases = newTestCases;
          newProblems[currentIndex] = currentProb;
          return newProblems;
        });
      }

      const isBattleActive =
        battleState.status === "IN_PROGRESS" &&
        battleResult === null &&
        (localTimeRemaining === null || localTimeRemaining > 0);

      if (res.status === "PASSED") {
        setTerminalOutput("SUCCESS: All test cases passed!");
        if (isBattleActive) {
          setTimeout(() => {
            setIsBattleMenuOpen(true);
          }, 1000);
          socket?.emit("battle_action", {
            roomId,
            status: "Passed tests!",
            progress: 100,
            result: "OPPONENT_WON",
          });
          setBattleResult("WON");
        }
      } else {
        setTerminalOutput(
          `Execution Finished: ${res.passedCases || 0} / ${res.totalCases || 0} cases passed.`,
        );
        if (isBattleActive) {
          socket?.emit("battle_action", {
            roomId,
            status: "Failed tests...",
            progress: 50,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setTerminalOutput(
        `COMPILATION/RUNTIME ERROR:\n${err.message || String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return "10:00";
    const totalSecs = Math.max(0, Math.floor(seconds));
    const m = Math.floor(totalSecs / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading || !room) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex w-full h-screen bg-[#050505] overflow-hidden relative">
      {countdown > 0 && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in select-none">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/40 text-cyan-400 font-mono text-xs tracking-[0.3em] uppercase mb-6 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            OPERATIVE ALERT // BATTLE COMMENCING
          </div>
          <h2 className="text-3xl font-black text-white font-mono mb-6 tracking-[0.4em] uppercase">
            GET READY
          </h2>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
            <div
              key={countdown}
              className="text-9xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-300 to-cyan-500 animate-bounce drop-shadow-[0_0_50px_rgba(34,211,238,0.9)]"
            >
              {countdown}
            </div>
          </div>
          <p className="mt-8 font-mono text-xs text-cyan-400/70 tracking-widest uppercase">
            PREPARE YOUR EDITOR // INITIALIZING WORKSPACE
          </p>
        </div>
      )}

      {/* LEFT PANEL */}
      <div
        style={{ width: isPanelOpen ? `${sidebarWidth}px` : "0px" }}
        className="relative z-20 h-full transition-[width] duration-300 ease-in-out shrink-0"
      >
        <div className="w-full h-full bg-[#0b0c0e] border-r border-cyan-500/20 shadow-2xl overflow-hidden relative">
          <div className="flex flex-col h-full" style={{ width: `${sidebarWidth}px` }}>
            {/* HOST HEADER */}
            <div className="p-4 border-b border-cyan-500/20 bg-black/40">
              {battleState.status === "WAITING" && (
                <div className="text-center py-2">
                  <p className="text-amber-400 font-mono text-xs tracking-widest mb-3">
                    WAITING FOR OPERATIVES
                  </p>
                  {isHost ? (
                    <button
                      onClick={handleStartOperation}
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Play className="w-4 h-4" /> START OPERATION
                    </button>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      Waiting for host to begin...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* PROBLEM NAV GRID OR OPPONENT PROFILE */}
            {room?.type === "ONE_VS_ONE" && opponent ? (
              <div className="p-4 border-b border-rose-500/20 bg-rose-950/10 flex items-center gap-4">
                <img
                  src={opponent.avatarUrl}
                  alt="Opponent"
                  className="w-12 h-12 rounded-full border border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                />
                <div>
                  <p className="text-[10px] text-rose-500 tracking-widest font-bold">
                    VS OPPONENT
                  </p>
                  <p className="font-mono text-white text-sm font-bold">
                    {opponent.username}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Rating: {opponent.rating || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-cyan-500/20 bg-cyan-950/10">
                <p className="text-xs text-slate-500 tracking-widest mb-3">
                  MISSION PLAYLIST ({problems.length})
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {problems.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`shrink-0 w-10 h-10 rounded-lg border font-mono font-bold transition-all flex items-center justify-center
                      ${currentIndex === idx ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-black/50 border-slate-700 text-slate-400 hover:border-cyan-500/50"}
                    `}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB HEADERS */}
            <div className="flex border-b border-cyan-500/20 bg-black/40">
              <button
                onClick={() => setActivePanelTab("PROBLEM")}
                className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "PROBLEM" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
              >
                <Code className="w-4 h-4 mx-auto mb-1" /> PROBLEM
              </button>
              <button
                onClick={() => setActivePanelTab("CHAT")}
                className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "CHAT" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
              >
                <MessageSquare className="w-4 h-4 mx-auto mb-1" /> CHAT
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col">
              {activePanelTab === "PROBLEM" ? (
                <div className="border border-white/10 w-full rounded-lg p-5 bg-black/40 shadow-inner h-max">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                    <h3 className="font-mono text-sm text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
                      <Code className="w-4 h-4" />{" "}
                      {activeProblem?.name || "Select Problem"}
                    </h3>
                    <span
                      className={`text-[10px] tracking-widest px-2 py-0.5 rounded font-bold
                    ${activeProblem?.difficulty_level === "HARD" ? "bg-rose-500/20 text-rose-400" : activeProblem?.difficulty_level === "MEDIUM" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}
                  `}
                    >
                      {activeProblem?.difficulty_level}
                    </span>
                  </div>
                  <div
                    className="text-sm text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{
                      __html:
                        activeProblem?.problem_definition || "No definition.",
                    }}
                  />

                  {/* PROGRESSIVE HINTS & BLUEPRINT */}
                  <ProblemHintsAccordion hints={activeProblem?.problem_hints} />

                  {/* TEST CASES SECTION */}
                  {activeProblem?.test_cases &&
                    activeProblem.test_cases.length > 0 && (
                      <div className="mt-8">
                        <h4 className="font-mono text-cyan-500 font-bold text-sm tracking-widest mb-4 border-b border-cyan-500/20 pb-2">
                          PUBLIC EXAMPLES
                        </h4>
                        <div className="flex flex-col gap-4">
                          {activeProblem.test_cases
                            .slice(0, 2)
                            .map((tc: any, index: number) => (
                              <div
                                key={tc.id}
                                className="bg-black/60 border border-white/5 rounded-lg p-4 font-mono text-xs shadow-inner"
                              >
                                <p className="text-slate-500 tracking-widest mb-2 font-bold">
                                  EXAMPLE {index + 1}
                                </p>
                                <div className="mb-3">
                                  <span className="text-cyan-600 block mb-1">
                                    Input:
                                  </span>
                                  <pre className="text-slate-300 bg-black/40 p-2 rounded border border-white/5 whitespace-pre-wrap break-all">
                                    {tc.input}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-emerald-600 block mb-1">
                                    Expected Output:
                                  </span>
                                  <pre className="text-emerald-400 bg-black/40 p-2 rounded border border-white/5 whitespace-pre-wrap break-all">
                                    {tc.expectedOutput}
                                  </pre>
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-center">
                          <p className="text-amber-500/80 font-mono text-xs tracking-widest font-bold">
                            TOTAL TEST CASES TO PASS:{" "}
                            {activeProblem.test_cases.length}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                    {battleMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`px-3 py-2 rounded-xl max-w-[85%] font-mono text-sm ${msg.socketId === socket?.id ? "bg-cyan-900/40 border border-cyan-500/30 text-cyan-100 self-end" : "bg-slate-800/50 border border-slate-700 text-slate-300 self-start"}`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    onSubmit={handleBattleMessage}
                    className="mt-auto flex gap-2 pt-2 border-t border-cyan-500/20"
                  >
                    <input
                      type="text"
                      value={newBattleMessage}
                      onChange={(e) => setNewBattleMessage(e.target.value)}
                      placeholder="TRANSMIT..."
                      className="flex-1 bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-3 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* MOUSE DRAG RESIZE HANDLE */}
          {isPanelOpen && (
            <div
              onMouseDown={startSidebarDragging}
              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-cyan-400/50 active:bg-cyan-400 z-40 transition-colors group flex items-center justify-center"
              title="Drag to resize panel"
            >
              <div className="w-0.5 h-12 bg-cyan-500/40 group-hover:bg-cyan-300 rounded" />
            </div>
          )}
        </div>

        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-30 bg-[#0b0c0e] border border-cyan-500/30 text-cyan-400 p-2 rounded-r-lg hover:bg-cyan-900/40 hover:text-cyan-300 transition-all shadow-[4px_0_15px_rgba(0,0,0,0.5)] left-full`}
        >
          {isPanelOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300 min-w-0 pb-24">
        {/* ── TOP HEADER BAR WITH TIMERS & WORKSPACE METRICS ── */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-cyan-500/20 bg-[#0b0c0e] font-mono text-xs z-30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              {activeProblem?.name || "BATTLE ARENA"}
            </span>
            {problems.length > 1 && (
              <span className="text-[10px] text-slate-500 border border-white/10 bg-black/40 px-2 py-0.5">
                PROBLEM {currentIndex + 1} OF {problems.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {problems.length > 1 && globalTimeRemaining !== null && (
              <div className="flex items-center gap-1.5 border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-[11px] font-bold text-cyan-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">GLOBAL:</span>
                <span className={globalTimeRemaining < 60 ? "text-rose-400 animate-pulse" : "text-cyan-300"}>
                  {formatTime(globalTimeRemaining)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-[11px] font-bold text-emerald-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">
                {problems.length > 1 ? "PROBLEM:" : "TIME LEFT:"}
              </span>
              <span className={localTimeRemaining !== null && localTimeRemaining < 60 ? "text-rose-400 animate-pulse" : "text-emerald-300"}>
                {formatTime(localTimeRemaining)}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
          {battleState.status === "WAITING" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-[#0a0b0e] border border-cyan-500/30 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto max-w-sm">
                <Lock className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white tracking-widest mb-2 font-mono">
                  SYSTEM LOCKED
                </h3>
                <p className="text-slate-400 text-sm font-sans mb-6">
                  Editor will unlock when the host initiates the operation.
                </p>
              </div>
            </div>
          )}
          {localTimeRemaining === 0 &&
            battleState.status === "IN_PROGRESS" &&
            !battleResult && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-[#0a0b0e] border border-rose-500/30 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto max-w-sm">
                  <StopCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white tracking-widest mb-2 font-mono">
                    TIME EXPIRED
                  </h3>
                  <p className="text-slate-400 text-sm font-sans">
                    You failed to crack this problem in time. Move to the next
                    one.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-transparent border-3 border-dashed border-rose-500/30 mt-3 hover:bg-rose-500 border border-rose-500/30 trasnition-color duration-300 text-white px-2 py-1 rounded-xl font-mono font-bold"
                  >
                    Home
                  </button>
                </div>
              </div>
            )}
        </div>
        {/* ── EDITOR TOOLBAR ── */}
        <EditorToolbar
          activeFile={activeProblem?.id || "battle-file"}
          fileName={activeProblem?.name || "BATTLE_SOLUTION"}
          disabled={isSubmitting}
          executingMode={isSubmitting ? "RUN" : null}
          language={language}
          setLanguage={handleLanguageChange}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
          setCode={setCode}
          onRun={handleRunCode}
          onSubmit={handleRunCode}
          onFormat={() => formatEditorRef.current?.()}
          onReset={handleResetCode}
          onToggleNotes={() => setIsNotesOpen((prev) => !prev)}
          isNotesOpen={isNotesOpen}
          onExit={() => {
            if (isBattleActive) {
              handleSurrenderClick();
            } else {
              navigate("/dashboard");
            }
          }}
        />

        {/* monaco editor */}
        <div className="flex-1 min-h-0">
          <MonacoIDE
            code={code}
            language={language}
            oid="battle-file"
            fileKey="battle"
            onCodeChange={handleCodeChange}
            handleRunCode={handleRunCode as any}
            onFormatMount={(formatAction) => {
              formatEditorRef.current = formatAction;
            }}
            isDisabled={
              countdown > 0 &&
              countdown <= 10 &&
              battleState.status === "IN_PROGRESS"
            }
          />
        </div>
        {/* terminal output panel */}
        <OutputPanel
          isExecuting={isSubmitting}
          isOutputActive={isOutputActive}
          isCustomInputRun={isCustomInputRun}
          output={executionOutput}
          outputHeight={outputHeight}
          outputText={terminalOutput}
          testCases={activeProblem?.test_cases || []}
          customInput={customInput}
          customInputActive={customInputActive}
          onResizeStart={startOutputDragging}
          setOutputHeight={setOutputHeight}
          setCustomInput={setCustomInput}
          setCustomInputActive={setCustomInputActive}
          setIsOutputActive={setIsOutputActive}
          onRunSingleTestCase={handleRunSingleTestCase}
        />
      </div>

      {/* GLOBAL SCRATCHPAD NOTES PANEL */}
      <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />

      {isBattleMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none p-4">
          <div className="flex flex-col items-center justify-center p-8 bg-[#0b0c0e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden pointer-events-auto">
            <div
              className={`absolute top-0 w-full h-1 bg-gradient-to-r ${battleResult === "WON" ? "from-cyan-400 to-emerald-500" : "from-rose-500 to-orange-500"}`}
            />
            <div className="relative mb-6">
              <div
                className={`absolute inset-0 blur-xl ${battleResult === "WON" ? "bg-cyan-500/30" : "bg-rose-500/30"}`}
              />
              {battleResult === "WON" ? (
                <Trophy className="w-16 h-16 text-cyan-400 relative z-10" />
              ) : (
                <Skull className="w-16 h-16 text-rose-500 relative z-10" />
              )}
            </div>
            <h2
              className={`font-mono text-3xl font-bold tracking-widest mb-3 ${battleResult === "WON" ? "text-cyan-400" : "text-rose-500"}`}
            >
              {battleResult === "WON"
                ? "OPERATION SUCCESSFUL"
                : "SYSTEM FAILURE"}
            </h2>
            <p className="text-slate-400 text-sm mb-8 font-sans">
              {battleResult === "WON"
                ? "You completed the operation."
                : "Time expired or opponent optimized faster."}
            </p>
            <div className="flex-1 flex justify-between gap-4 w-full">
              <button
                onClick={() => navigate("/")}
                className="w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all border border-cyan-500/50 bg-cyan-900/40 text-cyan-100 hover:bg-cyan-600"
              >
                [ RETURN TO MAINFRAME ]
              </button>
              <button
                onClick={() => setIsBattleMenuOpen(false)}
                className="w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700"
              >
                [ CLOSE MENU ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SURRENDER CONFIRMATION MODAL */}
      {isSurrenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center justify-center p-8 bg-[#0b0c0e] border border-rose-500/30 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            <Flag className="w-12 h-12 text-rose-400 mb-4" />
            <h3 className="font-mono text-xl font-bold tracking-widest text-white mb-2 uppercase">
              CONFIRM SURRENDER
            </h3>
            <p className="text-slate-400 text-xs font-sans mb-6 leading-relaxed">
              Are you sure you want to forfeit this battle? Your opponent will be declared the victor.
            </p>
            <div className="flex items-center gap-3 w-full font-mono text-xs">
              <button
                onClick={handleConfirmSurrender}
                className="flex-1 py-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
              >
                [ SURRENDER ]
              </button>
              <button
                onClick={() => setIsSurrenderModalOpen(false)}
                className="flex-1 py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
              >
                [ CANCEL ]
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Battle;
