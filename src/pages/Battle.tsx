import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "../components/ui/Skeleton";
import { getInitialsAvatar } from "../utils/avatar";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import OutputPanel from "../features/terminal/components/OutputPanel";
import { useTerminalLayout } from "../features/terminal/hooks/useTerminalLayout";
import type { SupportedLanguage, ExecutionResult } from "../features/terminal/types";
import { executeCode } from "../features/terminal/api";
import { toast } from "sonner";
import { Bot, Clock, LayoutTemplate, Loader2, Lock, Play, Send, ShieldAlert, ShieldCheck, Skull, StopCircle, Swords, Terminal as TerminalIcon, Trophy, User, X, ChevronLeft, ChevronRight, MessageSquare, Flag, Code, Activity, Radio, Eye } from "lucide-react";
import { GlobalTimer, formatTime } from "../components/common/GlobalTimer";
import { api } from "../config/api";
import { NotesPanel, clearEventNotes } from "../components/ui/NotesPanel";
import { participantVerdict, verdictStyle } from "../utils/participantVerdict";
import { SpectatorReplayPanel } from "../components/features/SpectatorReplayPanel";
import { SoundToggle } from "../components/features/SoundToggle";
import { playBattleSound } from "../utils/battleSounds";
import { useFocusTelemetry } from "../hooks/useFocusTelemetry";
import { invalidateProblemQueries } from "../utils/problemCache";


interface BattleMessage {
  id: string;
  socketId: string;
  content: string;
  createdAt: string;
}

/**
 * Examples ship inside problem_definition HTML already — strip any embedded
 * "<h3>Example N</h3> … Input:/Output:" blocks so the panel never renders
 * examples twice (once in statement, once as separate cards).
 */
export const stripDuplicateExamples = (raw?: string | null): string => {
  if (!raw) return "";
  return raw
    .replace(/<h3[^>]*>\s*Example\s+\d+\s*<\/h3>[\s\S]*?(?=<h3[^>]*>|$)/gi, (block) =>
      /Input:|Output:|Explanation:/i.test(block) ? "" : block,
    )
    .trim();
};

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
    <div className="rounded-lg border border-accent-warning/20 bg-accent-warning/5 p-4 font-mono text-xs mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-accent-warning font-bold flex items-center gap-1">
          ⚡ PROBLEM HINTS & BLUEPRINT ({unlockedCount}/{parsedHints.length})
        </span>
        {unlockedCount < parsedHints.length && (
          <button
            type="button"
            onClick={() => setUnlockedCount((prev) => Math.min(parsedHints.length, prev + 1))}
            className="text-[9px] font-bold text-accent-warning border border-accent-warning/30 bg-accent-warning/10 px-2 py-0.5 uppercase tracking-wider hover:bg-accent-warning/20 transition-all cursor-pointer"
          >
            [ REVEAL HINT #{unlockedCount + 1} ]
          </button>
        )}
      </div>

      {unlockedCount === 0 ? (
        <div className="text-[10px] text-faint italic">
          Hints are locked to encourage independent problem-solving. Click above to unlock hints step-by-step.
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {parsedHints.slice(0, unlockedCount).map((hintText, idx) => (
            <div key={`hint-${idx}`} className="border-l-2 border-accent-warning bg-base/40 p-2.5 text-[10px] text-accent-warning/90 leading-relaxed">
              <span className="font-bold text-accent-warning block mb-0.5">// HINT #{idx + 1}</span>
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

// ── Spectate Live Intel View ────────────────────────────────────────────────
const SpectateView = ({
  room,
  playerProgress,
  battleState,
  onJoin,
}: {
  room: any;
  playerProgress: Record<string, { status: string; progress: number; linesWritten?: number }>;
  battleState: any;
  onJoin: () => void;
}) => {
  const navigate = useNavigate();
  const participants = room?.performances || [];
  return (
    <div className="min-h-screen bg-void text-fg font-mono flex flex-col items-center justify-center p-8 relative">
      {/* bg grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent-danger animate-pulse" />
              <span className="text-[10px] text-accent-danger/70 tracking-[0.3em] uppercase">LIVE SPECTATE MODE</span>
            </div>
            <h1 className="text-2xl font-black text-fg tracking-widest flex items-center gap-3">
              <Eye className="w-6 h-6 text-accent-danger" />
              {room?.name || "LIVE MATCH"}
            </h1>
            <p className="text-xs text-faint mt-1 tracking-wider">CODE: {room?.roomCode}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onJoin}
              className="text-xs font-bold tracking-widest border border-accent-primary/40 bg-accent-primary/10 text-accent-primary px-4 py-2 rounded-lg hover:bg-accent-primary hover:text-ink transition-all"
            >
              JOIN MATCH
            </button>
            <button
              onClick={() => navigate("/lobby")}
              className="text-xs font-bold tracking-widest border border-subtle-line bg-surface-hover/60 text-subtle px-4 py-2 rounded-lg hover:bg-surface-hover transition-all"
            >
              LOBBY
            </button>
          </div>
        </div>

        {/* Status banner */}
        <div className={`w-full py-2.5 px-4 rounded-lg mb-6 flex items-center justify-between text-xs font-bold tracking-widest ${
          battleState?.status === "IN_PROGRESS" ? "bg-accent-success/15 border border-accent-success/30 text-accent-success" :
          battleState?.status === "WAITING" ? "bg-accent-warning/15 border border-accent-warning/30 text-accent-warning" :
          "bg-surface-hover/60 border border-subtle-line text-subtle"
        }`}>
          <span>STATUS: {battleState?.status || "LOADING"}</span>
          {battleState?.startedAt && battleState?.totalDurationMs && (
            <GlobalTimer startedAt={battleState.startedAt} totalDurationMs={battleState.totalDurationMs} variant="compact" />
          )}
        </div>

        {/* Participants intel */}
        <div className="bg-void border border-subtle-line rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-subtle-line bg-base/40">
            <p className="text-[10px] text-faint tracking-widest">LIVE OPERATIVES ({participants.length})</p>
          </div>
          <div className="divide-y divide-subtle-line">
            {participants.length === 0 && (
              <div className="py-12 text-center text-faint text-xs tracking-widest">NO OPERATIVES REGISTERED</div>
            )}
            {participants.map((p: any) => {
              const uid = p.user?.id || p.userId;
              const intel = playerProgress[uid];
              const prog = intel?.progress ?? 0;
              return (
                <div key={uid} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={p.user?.avatarUrl || getInitialsAvatar(p.user?.username)}
                      alt=""
                      className="w-9 h-9 rounded-full border border-subtle-line"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-fg">{p.user?.username || "Unknown"}</p>
                      <p className="text-[10px] text-faint tracking-widest">
                        {intel?.status || "STANDBY"}{intel?.linesWritten !== undefined ? ` · ${intel.linesWritten} LINES` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      prog >= 100 ? "bg-accent-success/20 text-accent-success" :
                      prog > 0 ? "bg-accent-primary/20 text-accent-primary" :
                      "bg-surface-hover/60 text-faint"
                    }`}>{prog}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        prog >= 100 ? "bg-gradient-to-r from-accent-success to-accent-success" :
                        "bg-gradient-to-r from-accent-primary to-accent-primary"
                      }`}
                      style={{ width: `${prog}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[10px] text-faint tracking-widest mt-6">SPECTATE MODE · READ-ONLY · UPDATES IN REAL-TIME</p>
      </div>
    </div>
  );
};

// ── Main Battle Component ────────────────────────────────────────────────────
export const Battle = () => {
  const { roomId } = useParams<{ roomId: string }>(); // roomId is actually roomCode for custom rooms
  const navigate = useNavigate();
  const location = useLocation();
  const isSpectateMode = new URLSearchParams(location.search).get("spectate") === "true";
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
  const [myUserId, setMyUserId] = useState<string>("");
  const [myPerformanceId, setMyPerformanceId] = useState<string>("");

  // --- LIVE INTEL (opponent/player progress tracking) ---
  const [playerProgress, setPlayerProgress] = useState<Record<string, { status: string; progress: number; linesWritten?: number }>>({});
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState<any[]>([]);

  // --- PROBLEM STATE ---
  const [problems, setProblems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeProblem = problems[currentIndex];

  const [code, setCode] = useState<string>("// Initialization...");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Store codes for each problem
  const [codes, setCodes] = useState<Record<string, string>>({});
  // Store local start times per problem when first visited
  const [problemStartTimes, setProblemStartTimes] = useState<
    Record<string, number>
  >({});
  const [countdown, setCountDown] = useState<number>(0);
  const [commencing, setCommencing] = useState(false);
  const [focusFlash, setFocusFlash] = useState(false);
  const [focusLossCount, setFocusLossCount] = useState(0);

  // --- CHAT STATE ---
  const [battleMessages, setBattleMessages] = useState<BattleMessage[]>([]);
  const [newBattleMessage, setNewBattleMessage] = useState("");
  const [activePanelTab, setActivePanelTab] = useState<"PROBLEM" | "CHAT" | "OPPONENT_TELEMETRY">(
    "PROBLEM",
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  const battleActiveRef = useRef(false);
  battleActiveRef.current = battleState.status === "IN_PROGRESS" && !isSpectateMode;

  const handleFocusLoss = useCallback(() => {
    if (!battleActiveRef.current) return;
    setFocusLossCount((count) => count + 1);
    setFocusFlash(true);
    window.setTimeout(() => setFocusFlash(false), 650);
  }, []);

  // Focus-loss telemetry (ROADMAP §3) + battle sounds (ROADMAP §6)
  const focusTelemetry = useFocusTelemetry(!isSpectateMode && !loading, handleFocusLoss);

  // Used to invalidate the cached problem payloads after a SUBMIT writes progress.
  const queryClient = useQueryClient();

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
  const [runningTestCaseIndex, setRunningTestCaseIndex] = useState<number | null>(null);

  const formatEditorRef = useRef<(() => void) | null>(null);

  const {
    outputHeight,
    sidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setOutputHeight,
    setSidebarWidth,
    startOutputDragging,
    startSidebarDragging,
  } = useTerminalLayout({ autoCloseBelowPx: 220 });

  const handleRunSingleTestCase = useCallback(async (index: number) => {
    if (!activeProblem?.test_cases?.[index]) return;
    const targetCase = activeProblem.test_cases[index];
    const inputString = targetCase.input || "";
    setRunningTestCaseIndex(index);
    setIsSubmitting(true);
    setIsCustomInputRun(true); // Mark as single-test run so panel hides pass/fail counts
    try {
      const res = await executeCode({
        code,
        language,
        oid: activeProblem.github_oid || "local-battle",
        fileName: activeProblem.name,
        mode: "RUN",
        customInput: inputString,
      });

      // Normalize detail: set testCaseIndex to the card the user clicked
      const singleDetail = res?.details?.[0];
      const normalizedDetail = singleDetail ? { ...singleDetail, testCaseIndex: index } : null;

      setExecutionOutput((prev) => {
        const existingDetails = (prev?.details || []).filter((d) => d.testCaseIndex !== index);
        return {
          ...prev,
          ...res,
          details: normalizedDetail ? [...existingDetails, normalizedDetail] : existingDetails,
        };
      });

      // Set terminal output: show error OR output — never both
      if (singleDetail?.runtimeError) {
        setTerminalOutput(singleDetail.runtimeError);
      } else {
        setTerminalOutput(singleDetail?.output?.trim() || "// No output produced.");
      }
    } catch (err: any) {
      setTerminalOutput(`ERROR: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
      setRunningTestCaseIndex(null);
      // Keep isCustomInputRun=true so the panel knows it's a single-test run
    }
  }, [activeProblem, code, language]);


  const joinedRoomRef = useRef<string | null>(null);
  const myUserIdRef = useRef("");

  // Point 35: the room fetch goes through the query cache so navigating away
  // and back within gcTime re-seeds instantly instead of refetching.
  const { data: fetchedRoom, error: roomError } = useQuery({
    queryKey: ["battle-room", roomId, isSpectateMode],
    enabled: Boolean(roomId),
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      // Pass spectate flag so server won't auto-create a performance for spectators
      const spectateParam = isSpectateMode ? "?spectate=true" : "";
      const [roomRes, profileRes] = await Promise.all([
        api.get(`/rooms/live/${roomId}${spectateParam}`),
        api.get("/profile"),
      ]);
      return { room: roomRes.data.room, myId: profileRes.data.data.id as string };
    },
  });

  // A failed room load navigates back to the lobby (query-level error handling).
  useEffect(() => {
    if (!roomError) return;
    const err: any = roomError;
    console.error("Failed to load room", err);
    toast.error(`Could not join room: ${err.response?.data?.message || err.message}`);
    setLoading(false);
    navigate("/lobby");
  }, [roomError, navigate]);

  // Seed all local state from the fetched room (runs on every cache hit too).
  useEffect(() => {
    if (!fetchedRoom) return;
    const roomData = fetchedRoom.room;
    const myId = fetchedRoom.myId;

    setRoom(roomData);
    setMyUserId(myId);
    myUserIdRef.current = myId;
    setIsHost(myId === roomData.hostId);

    // Store all participants for host panel
    setRoomParticipants(roomData.performances || []);

    // find and store current performance ID
    // Server auto-creates a performance for the host on first visit (non-spectate)
    const myPerf = roomData.performances?.find((p: any) => (p.user?.id === myId || p.userId === myId));
    if (myPerf) setMyPerformanceId(myPerf.id);

    // Seed live telemetry so a mid-battle joiner/reconnector sees the last
    // known status instead of blank bars until the next battle_update.
    const initialProgress: Record<string, { status: any; progress: number; linesWritten: number }> = {};
    (roomData.performances || []).forEach((p: any) => {
      initialProgress[p.userId] = { status: p.status, progress: 0, linesWritten: 0 };
    });
    setPlayerProgress(initialProgress);

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
    setLoading(false);
  }, [fetchedRoom]);

  // Setup Sockets
  useEffect(() => {
    if (!socket || !roomId) return;

    // Join exactly once per connection. socket.io rooms are per-connection, so
    // a mid-battle reconnect (new socket id) must rejoin or the client silently
    // stops receiving battle events — the connect handler below covers that.
    const joinRoom = () => {
      joinedRoomRef.current = roomId;
      socket.emit("join_battle", roomId);
    };
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    socket.on("battle_starting", (data: { countdownSeconds?: number }) => {
      setCountDown(data?.countdownSeconds || 3);
      playBattleSound("tick");
    });

    socket.on("battle_state", (data) => {
      // Countdown values come exclusively from battle_starting; no verdict is
      // set here — battle_state carries no per-player outcome.
      setBattleState(data);
    });

    socket.on("receive_battle_message", (msg) => {
      setBattleMessages((prev) => [...prev, msg]);
    });

    socket.on("battle_update", (data) => {
      // Update live intel for this player
      setPlayerProgress((prev) => ({
        ...prev,
        [data.userId]: {
          status: data.status,
          progress: data.progress,
          linesWritten: data.linesWritten
        }
      }));
      if (data.result === "OPPONENT_WON") {
        setBattleResult("LOST");
        setIsBattleMenuOpen(true);
      }
      if (data.result === "OPPONENT_SURRENDERED") {
        setBattleResult("WON");
        setIsBattleMenuOpen(true);
      }
    });

    socket.on("you_were_kicked", () => {
      toast.error("You have been removed from this match by the host.");
      navigate("/lobby");
    });

    socket.on("player_kicked", (data: { userId: string }) => {
      setRoomParticipants((prev) => prev.filter((p) => p.userId !== data.userId && p.user?.id !== data.userId));
    });

    socket.on("participants_updated", (data: { performances: any[] }) => {
      if (data?.performances) {
        setRoomParticipants(data.performances);
        setBattleState((prev: any) => ({ ...prev, participants: data.performances }));
      }
    });

    // HOST/ADMIN terminated the group — treat like host_end_match completion.
    socket.on("group_terminated", (data: { roomId: string }) => {
      if (String(data.roomId).replace("room-", "") === String(roomId).replace("room-", "")) {
        setBattleResult("LOST");
        setBattleState((prev: any) => ({ ...prev, status: "FINISHED" }));
        setIsBattleMenuOpen(true);
      }
    });

    // Server-confirmed end of battle — the winner was derived from the database
    // server-side, so this is the authoritative verdict for this client.
    socket.on("battle_finished", (data: { winnerId?: string; performances?: any[] }) => {
      if (data?.performances) {
        setRoomParticipants(data.performances);
        setBattleState((prev: any) => ({ ...prev, participants: data.performances, status: "FINISHED" }));
      }
      const myPerf = data?.performances?.find(
        (p: any) => p.userId === myUserIdRef.current || p.user?.id === myUserIdRef.current,
      );
      const won = myPerf && ["PASSED", "COMPLETED", "WON"].includes(String(myPerf.status));
      setBattleResult(won ? "WON" : "LOST");
      setIsBattleMenuOpen(true);
      // A won battle wrote progress — cached problem payloads are stale now.
      invalidateProblemQueries(queryClient);
    });

    socket.on("match_completed", (data: { status?: string; reason?: string; performances?: any[] }) => {
      if (data?.performances) {
        setRoomParticipants(data.performances);
        setBattleState((prev: any) => ({ ...prev, participants: data.performances, status: "FINISHED" }));
        // Derive this client's verdict from the server's authoritative statuses.
        const myPerf = data.performances.find(
          (p: any) => p.userId === myUserIdRef.current || p.user?.id === myUserIdRef.current,
        );
        if (myPerf) {
          const won = ["PASSED", "COMPLETED", "WON"].includes(String(myPerf.status));
          setBattleResult(won ? "WON" : "LOST");
        }
      }
      setIsBattleMenuOpen(true);
      invalidateProblemQueries(queryClient);
    });

    return () => {
      joinedRoomRef.current = null;
      socket.emit("leave_room", roomId);
      socket.off("connect");
      socket.off("battle_starting");
      socket.off("battle_state");
      socket.off("receive_battle_message");
      socket.off("battle_update");
      socket.off("you_were_kicked");
      socket.off("player_kicked");
      socket.off("participants_updated");
      socket.off("group_terminated");
      socket.off("match_completed");
      socket.off("battle_finished");
    };
  }, [socket, roomId, navigate, queryClient]);

  // Handle 3-second Get Ready Countdown before event begins
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCommencing(true);
          playBattleSound("tick");
          return 0;
        }
        playBattleSound("tick");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!commencing) return;
    const timer = window.setTimeout(() => setCommencing(false), 900);
    return () => window.clearTimeout(timer);
  }, [commencing]);

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

  const handleTimerExpire = () => {
    setBattleResult("LOST");
    setIsBattleMenuOpen(true);
    playBattleSound("surrender");
    try {
      // Persist focus telemetry for anti-cheat review (ROADMAP §3)
      localStorage.setItem("brace-focus-events", JSON.stringify(focusTelemetry.snapshot()));
    } catch { /* ignore */ }
    // Custom group battles: stamp FINISHED + COMPLETED/TIMEOUT verdicts server-side.
    if (roomId && problems.length > 1) {
      // The room MUST be stamped finished server-side, otherwise the next
      // session reports active_battle_found for a dead room. Retry with
      // backoff, then surface the failure instead of silently dropping it.
      const expireAttempt = (attempt = 0): void => {
        api.post("/rooms/expire", { roomId }).catch(() => {
          if (attempt < 2) {
            setTimeout(() => expireAttempt(attempt + 1), 1000 * (attempt + 1));
          } else {
            toast.error("Could not sync the expired room — please reload this page.");
          }
        });
      };
      expireAttempt();
    }
    // Clear notes for this event when time expires
    if (room?.id) {
      clearEventNotes(room.id, problems.map((p: any) => p?.id).filter(Boolean));
    }
  };

  const handleKickUser = (targetUserId: string) => {
    if (!socket || !roomId) return;
    socket.emit("host_kick_user", { roomId, targetUserId });
  };

  const handleHostEndMatch = () => {
    if (!socket || !roomId) return;
    socket.emit("host_end_match", { roomId });
  };

  const isBattleActive =
    battleState.status === "IN_PROGRESS" &&
    battleResult === null;
  const opponentParticipant = roomParticipants.find(
    (participant: any) => (participant.user?.id || participant.userId) !== myUserId,
  );
  const opponentTelemetry = opponentParticipant
    ? playerProgress[opponentParticipant.user?.id || opponentParticipant.userId]
    : undefined;

  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);

  const handleSurrenderClick = () => {
    setIsSurrenderModalOpen(true);
  };

  const handleConfirmSurrender = () => {
    if (!socket || !roomId) return;
    // One emit only: surrender_match and surrender_battle are identical
    // handlers server-side — emitting both stamped the room FINISHED twice.
    socket.emit("surrender_battle", roomId);
    playBattleSound("surrender");
    try {
      localStorage.setItem("brace-focus-events", JSON.stringify(focusTelemetry.snapshot()));
    } catch { /* ignore */ }
    setBattleResult("LOST");
    setIsSurrenderModalOpen(false);
    setIsBattleMenuOpen(true);
    // Clear notes on surrender
    if (room?.id) {
      clearEventNotes(room.id, problems.map((p: any) => p?.id).filter(Boolean));
    }
  };

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setIsSubmitting(true);
    setIsTerminal(true);
    setIsCustomInputRun(false); // Full submit run — show pass/fail counts in panel
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
        roomId,
        performanceId:myPerformanceId || ""
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
        battleResult === null;

      if (res.status === "PASSED") {
        setTerminalOutput("SUCCESS: All test cases passed!");
        playBattleSound("submit-success");
        if (isBattleActive) {
          socket?.emit("battle_action", {
            roomId,
            status: "Passed tests!",
            progress: 100,
            // NOTE: no `result` field — the server derives the outcome from the
            // persisted submission and ignores any client-claimed result.
            linesWritten: code.split("\n").length,
          });
          // The WIN verdict arrives via the server's battle_finished broadcast
          // (performances + winnerId) — it is never set from the client's own
          // submission assumption.
          if (room?.id) {
            clearEventNotes(room.id, problems.map((p: any) => p?.id).filter(Boolean));
          }
        }
      } else {
        setTerminalOutput(
          `Execution Finished: ${res.passedCases || 0} / ${res.totalCases || 0} cases passed.`,
        );
        if (isBattleActive) {
          socket?.emit("battle_action", {
            roomId,
            status: "Failed tests...",
            progress: Math.round(((res.passedCases || 0) / (res.totalCases || 1)) * 100),
            linesWritten: code.split("\n").length,
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
      // A battle SUBMIT writes the user's problem progress, so the cached
      // problem payloads that embed it are stale now.
      invalidateProblemQueries(queryClient);
    }
  };



  if (loading || !room) {
    return <PageSkeleton />;
  }

  // ── Spectate mode: show intel board, not the editor ──
  if (isSpectateMode) {
    return (
      <SpectateView
        room={room}
        playerProgress={playerProgress}
        battleState={battleState}
        onJoin={() => navigate(`/battle/${roomId}`)}
      />
    );
  }

  return (
    <div className={`relative flex h-screen w-full overflow-hidden bg-base ${focusFlash ? "ds-focus-flash" : ""}`}>
      {(countdown > 0 || commencing) && (
        <div className="ds-overlay fixed inset-0 z-[100] flex select-none flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.3em] text-accent-warning shadow-glow-warning">
            <span className="h-2 w-2 rounded-full bg-accent-warning animate-ping" />
            OPERATIVE ALERT // BATTLE COMMENCING
          </div>
          <h2 className="mb-6 font-mono text-3xl font-black uppercase tracking-[0.4em] text-fg">
            {commencing ? "BATTLE COMMENCING" : "GET READY"}
          </h2>
          <div className="relative flex min-h-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-accent-primary/20 blur-3xl animate-pulse" />
            <div key={countdown || "commencing"} className="ds-countdown-pop relative font-mono text-7xl font-black tracking-widest text-accent-primary text-shadow-accent sm:text-9xl">
              {commencing ? "01" : countdown}
            </div>
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-label">
            {commencing ? "WORKSPACE UNLOCKING // ENTER THE ARENA" : "PREPARE YOUR EDITOR // INITIALIZING WORKSPACE"}
          </p>
        </div>
      )}

      {/* FOCUS LOSS WARNING */}
      {focusTelemetry.snapshot().filter(e => e.type === "blur" || e.type === "tab_hidden").length > 0 && (
        <div className="fixed left-1/2 top-16 z-[90] -translate-x-1/2 border border-accent-danger/40 bg-accent-danger/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent-danger ds-glitch">
          [WARNING: TELEMETRY ALERT - FOCUS LOST]
        </div>
      )}

      {/* ─── HOST COMMAND PANEL (fixed overlay, host only) ─── */}
      {isHost && battleState.status === "IN_PROGRESS" && (
        <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-2">
          {/* Toggle button */}
          <button
            onClick={() => setIsHostPanelOpen((v) => !v)}
            title="Host Command Center"
            className="flex items-center gap-2 px-3 py-2 bg-accent-warning/20 border border-accent-warning/60 text-accent-warning font-mono text-xs font-bold rounded-lg shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:bg-accent-warning/30 transition-all backdrop-blur"
          >
            <ShieldAlert className="w-4 h-4" />
            HOST CMD
          </button>

          {isHostPanelOpen && (
            <div className="bg-raised/95 border border-accent-warning/40 rounded-xl shadow-2xl backdrop-blur-md w-72 overflow-hidden animate-fade-in">
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-accent-warning/20 bg-accent-warning/10 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent-warning tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" /> HOST COMMAND CENTER
                </span>
                <button onClick={() => setIsHostPanelOpen(false)} className="text-faint hover:text-fg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Participant List */}
              <div className="p-3 flex flex-col gap-2" aria-busy={loading && roomParticipants.length === 0}>
                <p className="text-[10px] text-faint tracking-widest mb-1">OPERATIVES ({roomParticipants.length})</p>
                {loading && roomParticipants.length === 0 ? (
                  // ── Loader: operative telemetry syncing
                  <div className="flex items-center justify-center gap-2 py-6 border border-line bg-base/40 rounded-none">
                    <Loader2 className="w-3.5 h-3.5 text-accent-primary animate-spin" />
                    <span className="text-[10px] text-accent-primary font-mono font-bold tracking-[0.2em] uppercase animate-pulse">
                      SYNCING OPERATIVES…
                    </span>
                  </div>
                ) : (
                roomParticipants.map((p: any) => {
                  const participantId = p.user?.id || p.userId;
                  const uname = p.user?.username || "Unknown";
                  const intel = playerProgress[participantId];
                  const isMe = participantId === myUserId;
                  return (
                    <div key={participantId} className="bg-base/40 border border-line-low rounded-lg p-2.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[10px] font-mono font-bold text-fg">
                        {uname[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-fg truncate">{uname}{isMe ? " (you)" : ""}</span>
                          {intel && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              intel.progress >= 100 ? "bg-accent-success/20 text-accent-success" :
                              intel.progress > 0 ? "bg-accent-primary/20 text-accent-primary" :
                              "bg-surface-hover text-subtle"
                            }`}>{intel.progress}%</span>
                          )}
                        </div>
                        {intel && (
                          <div className="mt-1 w-full h-1 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                intel.progress >= 100 ? "bg-accent-success" : "bg-accent-primary"
                              }`}
                              style={{ width: `${intel.progress}%` }}
                            />
                          </div>
                        )}
                        {intel?.linesWritten !== undefined && (
                          <p className="text-[9px] text-faint mt-0.5">{intel.linesWritten} lines written</p>
                        )}
                      </div>
                      {!isMe && (
                        <button
                          onClick={() => handleKickUser(participantId)}
                          title={`Kick ${uname}`}
                          className="p-1 border border-accent-danger/30 bg-accent-danger/15 hover:bg-accent-danger/20 text-accent-danger rounded transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              </div>

              {/* Danger Zone */}
              <div className="px-3 pb-3">
                <button
                  onClick={handleHostEndMatch}
                  className="w-full py-2 border border-accent-danger/50 bg-accent-danger/15 hover:bg-accent-danger/20 text-accent-danger font-mono text-xs font-bold tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-3.5 h-3.5" /> TERMINATE MATCH
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEFT PANEL — auto-closes when dragged below ~220px */}
      <div
        style={{ width: isPanelOpen && !isSidebarCollapsed ? `${sidebarWidth}px` : "0px" }}
        className="relative z-20 h-full transition-[width] duration-300 ease-in-out shrink-0"
      >
        <div className="w-full h-full bg-raised border-r border-subtle-line shadow-2xl overflow-hidden relative">
          <div className="flex flex-col h-full" style={{ width: `${sidebarWidth}px` }}>
            {/* HOST HEADER */}
            <div className="p-4 border-b border-subtle-line bg-base/40">
              {battleState.status === "WAITING" && (
                <div className="text-center py-2">
                  <p className="text-accent-warning font-mono text-xs tracking-widest mb-3">
                    WAITING FOR OPERATIVES
                  </p>
                  {isHost ? (
                    <button
                      onClick={handleStartOperation}
                      className="w-full bg-accent-primary/20 hover:bg-accent-primary border border-accent-primary text-accent-primary hover:text-ink font-bold tracking-widest py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Play className="w-4 h-4" /> START OPERATION
                    </button>
                  ) : (
                    <p className="text-faint text-xs">
                      Waiting for host to begin...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* PROBLEM NAV GRID OR OPPONENT PROFILE */}
            {room?.type === "ONE_VS_ONE" && opponent ? (
              <div className="p-4 border-b border-accent-danger/20 bg-accent-danger/5 flex items-center gap-4">
                <img
                  src={opponent.avatarUrl}
                  alt="Opponent"
                  className="w-12 h-12 rounded-full border border-accent-danger shadow-[0_0_15px_rgba(255,59,92,0.3)]"
                />
                <div>
                  <p className="text-[10px] text-accent-danger tracking-widest font-bold">
                    VS OPPONENT
                  </p>
                  <p className="font-mono text-fg text-sm font-bold">
                    {opponent.username}
                  </p>
                  <p className="text-xs text-subtle mt-1">
                    Rating: {opponent.rating || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-subtle-line bg-accent-primary/5">
                <p className="text-xs text-faint tracking-widest mb-3">
                  MISSION PLAYLIST ({problems.length})
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {problems.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`shrink-0 w-10 h-10 rounded-lg border font-mono font-bold transition-all flex items-center justify-center
                      ${currentIndex === idx ? "bg-accent-primary border-accent-primary text-ink shadow-[0_0_10px_rgba(0,212,255,0.5)]" : "bg-base/50 border-subtle-line text-subtle hover:border-accent-primary/50"}
                    `}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB HEADERS */}
            <div className="flex border-b border-subtle-line bg-base/40">
              <button
                onClick={() => setActivePanelTab("PROBLEM")}
                className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "PROBLEM" ? "bg-accent-primary/20 border-b-2 border-accent-primary text-accent-primary" : "text-faint hover:bg-line-low"}`}
              >
                <Code className="w-4 h-4 mx-auto mb-1" /> PROBLEM
              </button>
              <button
                onClick={() => setActivePanelTab("CHAT")}
                className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "CHAT" ? "bg-accent-primary/20 border-b-2 border-accent-primary text-accent-primary" : "text-faint hover:bg-line-low"}`}
              >
                <MessageSquare className="w-4 h-4 mx-auto mb-1" /> CHAT
              </button>
              <button
                onClick={() => setActivePanelTab("OPPONENT_TELEMETRY")}
                className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "OPPONENT_TELEMETRY" ? "bg-accent-primary/20 border-b-2 border-accent-primary text-accent-primary" : "text-faint hover:bg-line-low"}`}
              >
                <Activity className="w-4 h-4 mx-auto mb-1" /> OPPONENT
              </button>
            </div>

            {/* TAB CONTENT — themed scrollbar + contained text */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 themed-scroll flex flex-col min-w-0">
              {activePanelTab === "PROBLEM" ? (
                <div className="border border-line w-full max-w-full min-w-0 rounded-lg p-5 bg-base/40 shadow-inner h-max overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-line-low pb-3 mb-4 min-w-0">
                    <h3 className="font-mono text-sm text-accent-primary flex items-center gap-2 uppercase tracking-wider min-w-0 truncate">
                      <Code className="w-4 h-4 shrink-0" />{" "}
                      <span className="truncate">{activeProblem?.name || "Select Problem"}</span>
                    </h3>
                    <span
                      className={`shrink-0 text-[10px] tracking-widest px-2 py-0.5 rounded font-bold
                    ${activeProblem?.difficulty_level === "HARD" ? "bg-accent-danger/10 text-accent-danger" : activeProblem?.difficulty_level === "MEDIUM" ? "bg-accent-warning/20 text-accent-warning" : "bg-accent-success/20 text-accent-success"}
                  `}
                    >
                      {activeProblem?.difficulty_level}
                    </span>
                  </div>
                  <div
                    className="problem-contain text-sm text-fg leading-relaxed font-sans prose prose-invert max-w-full min-w-0 break-words overflow-hidden [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto"
                    dangerouslySetInnerHTML={{
                      __html:
                        stripDuplicateExamples(activeProblem?.problem_definition) || "No definition.",
                    }}
                  />

                  {/* PROGRESSIVE HINTS & BLUEPRINT */}
                  <ProblemHintsAccordion hints={activeProblem?.problem_hints} />

                  {/* Examples already ship inside the problem statement — no separate render. */}
                  {activeProblem?.test_cases && activeProblem.test_cases.length > 0 && (
                    <div className="mt-6 p-3 bg-accent-warning/10 border border-accent-warning/20 rounded text-center min-w-0">
                      <p className="text-accent-warning/80 font-mono text-xs tracking-widest font-bold break-words">
                        TOTAL TEST CASES TO PASS:{" "}
                        {activeProblem.test_cases.length}
                      </p>
                    </div>
                  )}
                </div>
              ) : activePanelTab === "OPPONENT_TELEMETRY" ? (
                <div className="flex flex-col gap-4">
                  <div className="border border-line bg-base/40 p-4">
                    <p className="text-[10px] font-mono font-bold text-accent-primary uppercase tracking-widest mb-3">Opponent Status</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-subtle-line bg-raised/60 p-3">
                        <div className="text-[9px] text-faint uppercase tracking-widest">Tests Passed</div>
                        <div className="mt-1 text-lg font-mono font-bold text-fg">
                          {opponentTelemetry?.progress ?? 0}%
                        </div>
                      </div>
                      <div className="border border-subtle-line bg-raised/60 p-3">
                        <div className="text-[9px] text-faint uppercase tracking-widest">Focus Alerts</div>
                        <div className="mt-1 text-lg font-mono font-bold text-accent-warning">—</div>
                      </div>
                    </div>
                  </div>
                  <div className="border border-accent-warning/20 bg-accent-warning/5 p-3">
                    <p className="text-[9px] font-mono text-accent-warning uppercase tracking-widest">Telemetry Notice</p>
                    <p className="mt-1 text-[10px] text-subtle">Focus-loss details are reported after the match.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                    {battleMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`px-3 py-2 rounded-xl max-w-[85%] font-mono text-sm ${msg.socketId === socket?.id ? "bg-accent-primary/10 border border-accent-primary/30 text-fg self-end" : "bg-surface-hover/50 border border-subtle-line text-fg self-start"}`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    onSubmit={handleBattleMessage}
                    className="mt-auto flex gap-2 pt-2 border-t border-subtle-line"
                  >
                    <input
                      type="text"
                      value={newBattleMessage}
                      onChange={(e) => setNewBattleMessage(e.target.value)}
                      placeholder="TRANSMIT..."
                      className="flex-1 bg-base/50 border border-subtle-line p-3 rounded-lg text-fg font-mono text-xs focus:border-accent-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-3 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/50 text-accent-primary rounded-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* MOUSE DRAG RESIZE HANDLE (auto-close below ~220px) */}
          {isPanelOpen && !isSidebarCollapsed && (
            <div
              onPointerDown={startSidebarDragging}
              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-accent-primary/50 active:bg-accent-primary z-40 transition-colors group flex items-center justify-center touch-none"
              title="Drag to resize panel (drag below ~220px to auto-close)"
            >
              <div className="w-0.5 h-12 bg-accent-primary/40 group-hover:bg-accent-primary rounded" />
            </div>
          )}
        </div>

        <button
          onClick={() => {
            const next = !(isPanelOpen && !isSidebarCollapsed);
            setIsPanelOpen(next);
            setIsSidebarCollapsed(!next);
            if (next && sidebarWidth < 220) setSidebarWidth(360);
          }}
          title={isPanelOpen && !isSidebarCollapsed ? "Collapse panel" : "Expand panel"}
          className={`absolute top-1/2 -translate-y-1/2 z-30 bg-raised border border-accent-primary/30 text-accent-primary p-2 rounded-r-lg hover:bg-accent-primary/20 hover:text-accent-primary transition-all shadow-[4px_0_15px_rgba(0,0,0,0.5)] left-full`}
        >
          {isPanelOpen && !isSidebarCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300 min-w-0">
        {/* ── TOP HEADER BAR WITH TIMERS & WORKSPACE METRICS ── */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-subtle-line bg-raised font-mono text-xs z-30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-accent-primary font-bold uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-accent-primary" />
              {activeProblem?.name || "BATTLE ARENA"}
            </span>
            {problems.length > 1 && (
              <span className="text-[10px] text-faint border border-line bg-base/40 px-2 py-0.5">
                PROBLEM {currentIndex + 1} OF {problems.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <SoundToggle />
            <GlobalTimer 
              startedAt={battleState.startedAt || room?.startedAt} 
              totalDurationMs={battleState.totalDurationMs || room?.totalTimeLimitMs} 
              onExpire={handleTimerExpire} 
              label={problems.length > 1 ? "GLOBAL:" : "TIME LEFT:"}
              variant="pill"
            />
            {/* Host button shortcut in top bar */}
            {isHost && battleState.status === "IN_PROGRESS" && (
              <button
                onClick={() => setIsHostPanelOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1 border border-accent-warning/30 bg-accent-warning/10 text-accent-warning text-[10px] font-mono font-bold rounded hover:bg-accent-warning/20 transition-all"
              >
                <ShieldAlert className="w-3 h-3" /> HOST
              </button>
            )}
            {/* Terminate group (host/admin) — ends the event for everyone */}
            {isHost && problems.length > 1 && battleState.status === "IN_PROGRESS" && (
              <button
                onClick={() => {
                  if (window.confirm("Terminate this group battle for everyone? Pending participants will be marked TIMEOUT.")) {
                    socket?.emit("terminate_group", { roomId });
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1 border border-accent-danger/40 bg-accent-danger/10 text-accent-danger text-[10px] font-mono font-bold rounded hover:bg-accent-danger/10 transition-all"
              >
                <StopCircle className="w-3 h-3" /> END GROUP
              </button>
            )}
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
          {/* CLEAR THIS LOGIC */}
          {battleState.status === "WAITING" && (
            <div className="absolute inset-0 bg-base/60 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-raised border border-accent-primary/30 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto max-w-sm">
                <Lock className="w-12 h-12 text-accent-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-fg tracking-widest mb-2 font-mono">
                  SYSTEM LOCKED
                </h3>
                <p className="text-subtle text-sm font-sans mb-6">
                  Editor will unlock when the host initiates the operation.
                </p>
              </div>
            </div>
          )}
          {battleState.status === "FINISHED" &&
            battleResult === "LOST" &&
            !isBattleMenuOpen && (
              <div className="absolute inset-0 bg-base/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-raised border border-accent-danger/30 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto max-w-sm">
                  <StopCircle className="w-12 h-12 text-accent-danger mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-fg tracking-widest mb-2 font-mono">
                    TIME EXPIRED
                  </h3>
                  <p className="text-subtle text-sm font-sans">
                    You failed to crack this problem in time. Move to the next
                    one.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-transparent border-3 border-dashed border-accent-danger/30 mt-3 hover:bg-accent-danger border border-accent-danger/30 trasnition-color duration-300 text-fg px-2 py-1 rounded-xl font-mono font-bold"
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
          code={code}
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
        <div
          className="grid min-h-0 flex-1"
          style={{ gridTemplateRows: `minmax(0, 1fr) ${outputHeight}px` }}
        >
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
          runningTestCaseIndex={runningTestCaseIndex}
          onResizeStart={startOutputDragging}
          setOutputHeight={setOutputHeight}
          setCustomInput={setCustomInput}
          setCustomInputActive={setCustomInputActive}
          setIsOutputActive={setIsOutputActive}
          onRunSingleTestCase={handleRunSingleTestCase}
        />
      </div>

      {/* REPLAY THEATER + SPECTATOR ENTRY (ROADMAP §4) */}
      <div className="px-4 pb-4">
        <SpectatorReplayPanel
          roomId={String(roomId || "")}
          performances={roomParticipants}
          isSpectator={false}
          onWatch={(userId) => socket?.emit("request_player_code", { roomId, targetUserId: userId })}
        />
      </div>

      {/* NOTES PANEL — per-problem tabs for multi-problem events, single scratchpad for 1v1 */}
      <NotesPanel
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        problems={problems.length > 1 ? problems.map((p: any) => ({ id: p.id, name: p.name })) : undefined}
        activeProblemId={activeProblem?.id}
        eventId={room?.id}
      />

      {isBattleMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/60 backdrop-blur-[2px] pointer-events-none p-4">
          <div className="flex flex-col items-center justify-center p-8 bg-raised border border-line rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden pointer-events-auto max-h-[90vh] overflow-y-auto themed-scroll">
            <div
              className={`absolute top-0 w-full h-1 bg-gradient-to-r ${battleResult === "WON" ? "from-accent-primary to-accent-success" : "from-accent-danger to-accent-warning"}`}
            />
            <div className="relative mb-6">
              <div
                className={`absolute inset-0 blur-xl ${battleResult === "WON" ? "bg-accent-primary/30" : "bg-accent-danger/30"}`}
              />
              {battleResult === "WON" ? (
                <Trophy className="w-16 h-16 text-accent-primary relative z-10" />
              ) : (
                <Skull className="w-16 h-16 text-accent-danger relative z-10" />
              )}
            </div>
            <h2
              className={`font-mono text-3xl font-bold tracking-widest mb-3 ${battleResult === "WON" ? "text-accent-primary" : "text-accent-danger"}`}
            >
              {battleResult === "WON"
                ? "OPERATION SUCCESSFUL"
                : "SYSTEM FAILURE"}
            </h2>
            <p className="text-subtle text-sm mb-4 font-sans">
              {battleResult === "WON"
                ? "You completed the operation."
                : "Time expired or opponent optimized faster."}
            </p>
            {/* Per-participant completion verdicts + event analytics */}
            <div className="w-full flex flex-col gap-2 mb-6 text-left max-h-56 overflow-y-auto themed-scroll pr-1">
              {roomParticipants?.map((p: any) => {
                const verdict = participantVerdict(p, battleState?.status || room?.status);
                const subs = p.submissions ?? [];
                const passedCount = subs.filter((s: any) => (s.status || "").toUpperCase() === "PASSED").length;
                const bestRuntime = subs.reduce((m: number | null, s: any) => s.runtimeMs != null ? Math.min(m ?? s.runtimeMs, s.runtimeMs) : m, null as number | null);
                return (
                  <div key={p.userId || p.user?.id || p.id} className="flex items-center gap-2 p-2 border border-line bg-base/50 min-w-0">
                    <span className="text-xs font-bold text-fg truncate flex-1 min-w-0">{p.user?.username || "Player"}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${verdictStyle(verdict)}`}>
                      {verdict === "COMPLETED" ? "✓ COMPLETED" : verdict === "TIMEOUT" ? "✗ TIMEOUT" : "● IN PROGRESS"}
                    </span>
                    <span className="text-[9px] text-subtle font-mono shrink-0">
                      {passedCount}/{subs.length}{bestRuntime != null ? ` • ${bestRuntime}ms` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 flex justify-between gap-4 w-full">
              <button
                onClick={() => navigate("/")}
                className="w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all border border-accent-primary/50 bg-accent-primary/10 text-fg hover:bg-accent-primary/80"
              >
                [ RETURN TO MAINFRAME ]
              </button>
              <button
                onClick={() => setIsBattleMenuOpen(false)}
                className="w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all border border-subtle-line bg-surface-hover/60 text-fg hover:bg-surface-hover"
              >
                [ CLOSE MENU ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SURRENDER CONFIRMATION MODAL */}
      {isSurrenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center justify-center p-8 bg-raised border border-accent-danger/30 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-accent-danger to-accent-warning" />
            <Flag className="w-12 h-12 text-accent-danger mb-4" />
            <h3 className="font-mono text-xl font-bold tracking-widest text-fg mb-2 uppercase">
              CONFIRM SURRENDER
            </h3>
            <p className="text-subtle text-xs font-sans mb-6 leading-relaxed">
              Are you sure you want to forfeit this battle? Your opponent will be declared the victor.
            </p>
            <div className="flex items-center gap-3 w-full font-mono text-xs">
              <button
                onClick={handleConfirmSurrender}
                className="flex-1 py-3 bg-accent-danger/30 hover:bg-accent-danger/20 border border-accent-danger/40 text-accent-danger font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
              >
                [ SURRENDER ]
              </button>
              <button
                onClick={() => setIsSurrenderModalOpen(false)}
                className="flex-1 py-3 bg-surface-hover/80 hover:bg-surface-hover border border-subtle-line text-fg font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
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
