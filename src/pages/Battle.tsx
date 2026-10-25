import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "../components/ui/Skeleton";
import { getInitialsAvatar } from "../utils/avatar";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import OutputPanel from "../features/terminal/components/OutputPanel";
import {
  outputGridTemplateRows,
  useTerminalLayout,
} from "../features/terminal/hooks/useTerminalLayout";
import type {
  SupportedLanguage,
  ExecutionResult,
} from "../features/terminal/types";
import { executeCode } from "../features/terminal/api";
import { buildProblemTestCases } from "../features/terminal/executionOutput";
import { toast } from "sonner";
import {
  Bot,
  Clock,
  LayoutTemplate,
  Loader2,
  Lock,
  Minus,
  AlarmClock,
  Play,
  Send,
  ShieldAlert,
  ShieldCheck,
  Skull,
  StopCircle,
  Swords,
  Terminal as TerminalIcon,
  Trophy,
  User,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Flag,
  Code,
  Activity,
  Radio,
  Eye,
  AlignLeft,
  Home,
} from "lucide-react";
import { GlobalTimer, formatTime } from "../components/common/GlobalTimer";
import { api } from "../config/api";
import { NotesPanel, clearEventNotes } from "../components/ui/NotesPanel";
import { participantVerdict, verdictStyle } from "../utils/participantVerdict";
import { SoundToggle } from "../components/features/SoundToggle";
import { playBattleSound } from "../utils/battleSounds";
import { useFocusTelemetry } from "../hooks/useFocusTelemetry";
import {
  invalidateProblemQueries,
  invalidatePostBattleQueries,
} from "../utils/problemCache";
import DOMPurify from "dompurify";
import { useEventAnalytics } from "../hooks/useEventAnalytics";
import { EventAnalytics } from "../components/features/EventAnalytics";
import { BattleStagingRoom } from "../components/features/BattleStagingRoom";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ProblemHintsAccordion } from "../components/features/battle/HintsAccordion";

export interface BattleMessage {
  id: string;
  socketId: string;
  senderId: string;
  username: string;
  role: string;
  isHost: boolean;
  content: string;
  createdAt: string;
}

const getLanguageStarterCode = (
  lang: SupportedLanguage,
  problemName?: string,
) => {
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
  const normalizedLang = lang === "c++" ? "cpp" : lang.toLowerCase();
  const snippet = problem.code_snippets?.find(
    (s: any) => s.language?.toLowerCase() === normalizedLang,
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
  playerProgress: Record<
    string,
    { status: string; progress: number; linesWritten?: number }
  >;
  battleState: any;
  onJoin: () => void;
}) => {
  const navigate = useNavigate();
  const participants = room?.performances || [];
  return (
    <div className="min-h-screen bg-void text-fg font-mono flex flex-col items-center justify-center p-8 relative">
      {/* bg grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent-danger animate-pulse" />
              <span className="text-[10px] text-accent-danger/70 tracking-[0.3em] uppercase">
                LIVE SPECTATE MODE
              </span>
            </div>
            <h1 className="text-2xl font-black text-fg tracking-widest flex items-center gap-3">
              <Eye className="w-6 h-6 text-accent-danger" />
              {room?.name || "LIVE MATCH"}
            </h1>
            <p className="text-xs text-faint mt-1 tracking-wider">
              CODE: {room?.roomCode}
            </p>
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
        <div
          className={`w-full py-2.5 px-4 rounded-lg mb-6 flex items-center justify-between text-xs font-bold tracking-widest ${
            battleState?.status === "IN_PROGRESS"
              ? "bg-accent-success/15 border border-accent-success/30 text-accent-success"
              : battleState?.status === "WAITING"
                ? "bg-accent-warning/15 border border-accent-warning/30 text-accent-warning"
                : "bg-surface-hover/60 border border-subtle-line text-subtle"
          }`}
        >
          <span>STATUS: {battleState?.status || "LOADING"}</span>
          {battleState?.startedAt && battleState?.totalDurationMs && (
            <GlobalTimer
              startedAt={battleState.startedAt}
              totalDurationMs={battleState.totalDurationMs}
              variant="compact"
            />
          )}
        </div>

        {/* Participants intel */}
        <div className="bg-void border border-subtle-line rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-subtle-line bg-base/40">
            <p className="text-[10px] text-faint tracking-widest">
              LIVE OPERATIVES ({participants.length})
            </p>
          </div>
          <div className="divide-y divide-subtle-line">
            {participants.length === 0 && (
              <div className="py-12 text-center text-faint text-xs tracking-widest">
                NO OPERATIVES REGISTERED
              </div>
            )}
            {participants.map((p: any) => {
              const uid = p.user?.id || p.userId;
              const intel = playerProgress[uid];
              const prog = intel?.progress ?? 0;
              return (
                <div key={uid} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={
                        p.user?.avatarUrl || getInitialsAvatar(p.user?.username)
                      }
                      alt=""
                      className="w-9 h-9 rounded-full border border-subtle-line"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-fg">
                        {p.user?.username || "Operative"}
                      </p>
                      <p className="text-[10px] text-faint tracking-widest">
                        {intel?.status || "STANDBY"}
                        {intel?.linesWritten !== undefined
                          ? ` · ${intel.linesWritten} LINES`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        prog >= 100
                          ? "bg-accent-success/20 text-accent-success"
                          : prog > 0
                            ? "bg-accent-primary/20 text-accent-primary"
                            : "bg-surface-hover/60 text-faint"
                      }`}
                    >
                      {prog}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        prog >= 100
                          ? "bg-gradient-to-r from-accent-success to-accent-success"
                          : "bg-gradient-to-r from-accent-primary to-accent-primary"
                      }`}
                      style={{ width: `${prog}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[10px] text-faint tracking-widest mt-6">
          SPECTATE MODE · READ-ONLY · UPDATES IN REAL-TIME
        </p>
      </div>
    </div>
  );
};

// ── Main Battle Component ────────────────────────────────────────────────────
export const Battle = () => {
  const { roomId } = useParams<{ roomId: string }>(); // roomId is actually roomCode for custom rooms
  const navigate = useNavigate();
  const location = useLocation();
  const isSpectateMode =
    new URLSearchParams(location.search).get("spectate") === "true";
  // Password for protected rooms — comes from router state (PasswordModal) or sessionStorage (page reload)
  const routerState = location.state as { password?: string } | null;
  const sessionPassword = roomId
    ? sessionStorage.getItem(`room_password_${roomId}`)
    : null;
  const roomPassword = routerState?.password || sessionPassword || undefined;
  // SocketContext now manages room joining/leaving centrally.
  // We only need to bind event handlers here.
  const { socket, sendBattleMessage, joinBattleRoom, leaveBattleRoom } =
    useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // --- ROOM / EVENT STATE ---
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [battleState, setBattleState] = useState<any>({ status: "WAITING" });
  const [isHost, setIsHost] = useState(false);
  const [battleResult, setBattleResult] = useState<
    "WON" | "LOST" | "CHEATER" | null
  >(null);
  const [defeatReason, setDefeatReason] = useState<
    "opponent" | "timeout" | "surrender"
  >("opponent");
  const [isBattleMenuOpen, setIsBattleMenuOpen] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<any>(null);
  const [myUserId, setMyUserId] = useState<string>("");
  const [blockedParticipants, setBlockedParticipants] = useState<any[]>([]);

  // Use a ref so this function is never a socket-effect dep (prevents spurious
  // effect teardowns that drop socket room membership).
  const fetchBlockedParticipantsRef = useRef<() => Promise<void>>(
    async () => {},
  );
  const fetchBlockedParticipants = useCallback(async () => {
    if (!roomId) return;
    try {
      const eventId = roomId.replace("room-", "");
      const res = await api.get(`/rooms/${eventId}/blocks`);
      setBlockedParticipants(res.data.blocks || []);
    } catch (e) {
      console.error("Failed to fetch blocked participants:", e);
    }
  }, [roomId]);
  fetchBlockedParticipantsRef.current = fetchBlockedParticipants;

  const [playerProgress, setPlayerProgress] = useState<
    Record<string, { status: string; progress: number; linesWritten?: number }>
  >({});
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState<any[]>([]);
  const [isStartingOperation, setIsStartingOperation] =
    useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: null,
  });

  // --- PROBLEM STATE ---
  const [problems, setProblems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Clear execution output and reset test case statuses when the problem changes
  // so stale results from a previous problem don't bleed into the new one.
  useEffect(() => {
    setExecutionOutput(null);
    setTerminalOutput("");
    setProblems((prev) => {
      const newProblems = [...prev];
      const currentProb = newProblems[currentIndex];
      if (currentProb) {
        const updated = { ...currentProb };
        updated.test_cases = (updated.test_cases || []).map((tc: any) => ({
          ...tc,
          status: undefined,
          output: undefined,
          runtimeError: undefined,
        }));
        newProblems[currentIndex] = updated;
      }
      return newProblems;
    });
  }, [currentIndex]);
  const activeProblem = problems[currentIndex];

  const [code, setCode] = useState<string>("// Initialization...");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [javaClassName, setJavaClassName] = useState<string>("Solution");

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
  const [focusPenaltyPercent, setFocusPenaltyPercent] = useState(0);

  // --- SCHEDULED CLOSE WARNING (minimizable banner) ---
  const [closingWarning, setClosingWarning] = useState<{
    closesAt: string;
  } | null>(null);
  const [closingWarningDismissed, setClosingWarningDismissed] = useState(false);
  const [closingSeconds, setClosingSeconds] = useState<number | null>(null);

  // --- CHAT STATE ---
  const [battleMessages, setBattleMessages] = useState<BattleMessage[]>([]);
  const [newBattleMessage, setNewBattleMessage] = useState("");
  const [activePanelTab, setActivePanelTab] = useState<
    "PROBLEM" | "CHAT" | "OPPONENT_TELEMETRY" | "MODERATOR"
  >("PROBLEM");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const battleActiveRef = useRef(false);
  battleActiveRef.current =
    battleState.status === "IN_PROGRESS" && !isSpectateMode && !isHost;

  const handleFocusLoss = useCallback(() => {
    if (!battleActiveRef.current) return;
    setFocusLossCount((count) => {
      const newCount = count + 1;
      // Exponential penalty: 5%, 10%, 20%, 40%, 80%, then 100% (capped)
      const rawPenalty = Math.round(5 * Math.pow(2, newCount - 1));
      const penalty = Math.min(100, rawPenalty);
      setFocusPenaltyPercent(penalty);
      return newCount;
    });
    setFocusFlash(true);
    window.setTimeout(() => setFocusFlash(false), 650);
    const displayPenalty = Math.min(
      100,
      Math.round(5 * Math.pow(2, focusLossCount)),
    );
    toast.warning(
      `⚠ FOCUS LOST (${focusLossCount + 1}) — Penalty: ${displayPenalty}%`,
      { id: "focus-loss" },
    );
  }, [focusLossCount]);

  const handleFocusRestore = useCallback(() => {
    if (!battleActiveRef.current) return;
    toast.success("✓ FOCUS RESTORED", { id: "focus-restore" });
  }, []);

  // Escalating focus-penalty severity badge for the result modal.
  // 100% is a hard CHEATER flag; any penalty above 0 is SUSPICIOUS, and the
  // label/colour climbs with the penalty so repeat offenders read as worse.
  const penaltySeverity = (() => {
    if (focusPenaltyPercent >= 100) {
      return {
        label: "CHEATER",
        tone: "border-accent-danger/50 bg-accent-danger/15 text-accent-danger",
      };
    }
    if (focusPenaltyPercent >= 80) {
      return {
        label: "SEVERE",
        tone: "border-accent-danger/40 bg-accent-danger/10 text-accent-danger",
      };
    }
    if (focusPenaltyPercent >= 40) {
      return {
        label: "HIGH RISK",
        tone: "border-accent-warning/50 bg-accent-warning/15 text-accent-warning",
      };
    }
    if (focusPenaltyPercent >= 20) {
      return {
        label: "MODERATE",
        tone: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
      };
    }
    return {
      label: "SUSPICIOUS",
      tone: "border-accent-warning/30 bg-accent-warning/5 text-accent-warning",
    };
  })();

  // Focus-loss telemetry (ROADMAP §3) + battle sounds (ROADMAP §6)
  const focusTelemetry = useFocusTelemetry(
    !isSpectateMode && !loading,
    handleFocusLoss,
    handleFocusRestore,
  );

  // Used to invalidate the cached problem payloads after a SUBMIT writes progress.
  const queryClient = useQueryClient();

  // terminal
  const [isTerminal, setIsTerminal] = useState<boolean>(true);
  const [terminalOutput, setTerminalOutput] = useState(
    "// COMPILATION LOGS WILL BE DISPLAYED HERE",
  );
  const [executionOutput, setExecutionOutput] =
    useState<ExecutionResult | null>(null);
  const [isOutputActive, setIsOutputActive] = useState<boolean>(true);
  const [customInput, setCustomInput] = useState<string>("");
  const [customInputActive, setCustomInputActive] = useState<boolean>(false);
  const [isCustomInputRun, setIsCustomInputRun] = useState<boolean>(false);
  const [runningTestCaseIndex, setRunningTestCaseIndex] = useState<
    number | null
  >(null);

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

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setIsSubmitting(true);
    setIsTerminal(true);
    setIsCustomInputRun(false);
    setTerminalOutput("Executing code and running first test case...");

    try {
      const res = await executeCode({
        code,
        language,
        oid: activeProblem.github_oid || activeProblem.id,
        mode: "RUN",
        roomId,
        testCaseIndex: 0,
      });

      setExecutionOutput(res);

      if (res.details) {
        setProblems((prev) => {
          const newProblems = [...prev];
          const currentProb = { ...newProblems[currentIndex] };
          const newTestCases = [...(currentProb.test_cases || [])];

          res.details?.forEach((detail) => {
            const tcIndex = detail.testCaseIndex ?? 0;
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

      if (res.status === "PASSED") {
        setTerminalOutput("SUCCESS: First test case passed!");
      } else {
        setTerminalOutput(
          `Execution Finished: ${res.passedCases || 0} / ${res.totalCases || 1} cases passed.`,
        );
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

  const handleRunSingleTestCase = useCallback(
    async (index: number) => {
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
        const normalizedDetail = singleDetail
          ? { ...singleDetail, testCaseIndex: index }
          : null;

        setExecutionOutput((prev) => {
          const existingDetails = (prev?.details || []).filter(
            (d) => d.testCaseIndex !== index,
          );
          return {
            ...prev,
            ...res,
            details: normalizedDetail
              ? [...existingDetails, normalizedDetail]
              : existingDetails,
          };
        });

        // Set terminal output: show error OR output — never both
        if (singleDetail?.runtimeError) {
          setTerminalOutput(singleDetail.runtimeError);
        } else {
          setTerminalOutput(
            singleDetail?.output?.trim() || "// No output produced.",
          );
        }
      } catch (err: any) {
        setTerminalOutput(`ERROR: ${err.message || String(err)}`);
      } finally {
        setIsSubmitting(false);
        setRunningTestCaseIndex(null);
        // Keep isCustomInputRun=true so the panel knows it's a single-test run
      }
    },
    [activeProblem, code, language],
  );

  // Centralized room state comes from SocketContext — no need for local refs.
  // joinBattleRoom/leaveBattleRoom are stable (useCallback in SocketProvider).
  // battleRoomStatus/currentBattleRoomId are tracked centrally.
  const myUserIdRef = useRef("");

  // Point 35: the room fetch goes through the query cache so navigating away
  // and back within gcTime re-seeds instantly instead of refetching.
  const { data: fetchedRoom, error: roomError } = useQuery({
    queryKey: ["battle-room", roomId, isSpectateMode],
    enabled: Boolean(roomId),
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
    queryFn: async () => {
      // Pass spectate flag so server won't auto-create a performance for spectators
      const spectateParam = isSpectateMode ? "?spectate=true" : "";
      const passwordParam = roomPassword
        ? `&password=${encodeURIComponent(roomPassword)}`
        : "";
      const [roomRes, profileRes] = await Promise.all([
        api.get(`/rooms/live/${roomId}${spectateParam}${passwordParam}`),
        api.get("/profile"),
      ]);
      return {
        room: roomRes.data.room,
        myId: profileRes.data.data.id as string,
      };
    },
  });

  // Event analytics — loaded when event is FINISHED or when host opens the analytics view
  const eventId = roomId ? roomId.replace("room-", "") : undefined;
  const { data: eventAnalytics } = useEventAnalytics(
    eventId,
    battleState.status === "FINISHED" || isHost,
  );

  const [showAnalyticsView, setShowAnalyticsView] = useState(false);

  // A failed room load navigates back to the lobby (query-level error handling).
  useEffect(() => {
    if (!roomError) return;
    const err: any = roomError;
    console.error("Failed to load room", err);
    const blockReason = err.response?.data?.blockReason;
    const msg = blockReason
      ? `You are blocked from this event: ${blockReason}`
      : `Could not join room: ${err.response?.data?.message || err.message}`;
    toast.error(msg, { id: "join-error" });
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
    const isUserHost = myId === roomData.hostId;
    setIsHost(isUserHost);

    // Sync battleState status with database status.
    // Only adopt the DB status if the socket hasn't already advanced the
    // battle to IN_PROGRESS/FINISHED (otherwise a stale fetchedRoom snapshot
    // would overwrite real-time socket updates and revert the UI to WAITING).
    if (roomData.status) {
      const currentStatus = battleState.status;
      const isSocketAdvanced =
        currentStatus === "IN_PROGRESS" ||
        currentStatus === "FINISHED" ||
        currentStatus === "COUNTDOWN";
      if (!isSocketAdvanced) {
        setBattleState((prev: any) => ({
          ...prev,
          status: roomData.status,
          startedAt: roomData.startedAt,
          finishedAt: roomData.finishedAt,
          totalDurationMs: roomData.totalTimeLimitMs,
        }));
      }
    }

    if (isUserHost) {
      void fetchBlockedParticipantsRef.current();
    }

    // Store all participants for host panel
    setRoomParticipants(roomData.performances || []);

    // Seed live telemetry so a mid-battle joiner/reconnector sees the last
    // known status instead of blank bars until the next battle_update.
    const initialProgress: Record<
      string,
      { status: any; progress: number; linesWritten: number }
    > = {};
    (roomData.performances || []).forEach((p: any) => {
      initialProgress[p.userId] = {
        status: p.status,
        progress: 0,
        linesWritten: 0,
      };
    });
    setPlayerProgress(initialProgress);

    let targetProblems = [];
    if (roomData.type === "ONE_VS_ONE" || roomData.type === "FRIENDS") {
      targetProblems = roomData.commonProblem ? [roomData.commonProblem] : [];
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

    // Centralized room joining — SocketContext handles join_battle with
    // deduplication and auto-rejoin on reconnect. No need for local refs.
    if (socket && roomId) {
      joinBattleRoom(roomId, (ack: { success: boolean; error?: string }) => {
        if (!ack?.success) {
          console.error("Failed to join battle:", ack?.error);
          toast.error("Failed to join battle room");
          navigate("/lobby");
        }
      });
    }
  }, [fetchedRoom]);

  // ─────────────────────────────────────────────────────────────────────
  // Socket Event Handlers (Centralized Room Management)
  // ─────────────────────────────────────────────────────────────────────
  // Per the realtime audit, room joining/leaving is now managed centrally
  // in SocketContext to prevent double join_battle emissions and ensure
  // consistent room membership state. This effect only binds/unbinds event
  // handlers — no direct socket.emit("join_battle") or "leave_room" calls.
  //
  // Dependencies: [socket, roomId, navigate, queryClient, isSpectateMode]
  // socketTick is NOT a dependency — SocketProvider handles socket
  // recreation internally, so the socket reference remains stable.

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  useEffect(() => {
    if (!socket || !roomId) return;

    let mounted = true;

    const onBattleStarting = (data: { countdownSeconds?: number }) => {
      setCountDown(data?.countdownSeconds || 3);
      if (data?.countdownSeconds === 1) {
        setCommencing(true);
      }
      playBattleSound("tick");
    };

    const onBattleStarted = (data?: {
      startedAt?: any;
      problems?: any[];
      commonProblem?: any;
      totalDurationMs?: number;
    }) => {
      if (!mounted) return;
      setBattleState((prev: any) => ({
        ...prev,
        status: "IN_PROGRESS",
        editorLocked: false,
        startedAt: data?.startedAt || prev.startedAt,
        totalDurationMs: data?.totalDurationMs || prev.totalDurationMs,
      }));
      setIsStartingOperation(false);
      setCountDown(0);
      setCommencing(false);
      playBattleSound("match-start");
      if (data?.problems && data.problems.length > 0) {
        setProblems(data.problems);
        setCurrentIndex(0);
        const initialCodes: Record<string, string> = {};
        data.problems.forEach((p: any) => {
          if (!p) return;
          const snippet = getProblemSnippet(p, language);
          initialCodes[p.id] = snippet;
        });
        setCodes(initialCodes);
        if (data.problems[0]) {
          setCode(initialCodes[data.problems[0].id] || "");
        }
      } else if (data?.commonProblem) {
        setProblems([data.commonProblem]);
        setCurrentIndex(0);
        const snippet = getProblemSnippet(data.commonProblem, language);
        setCode(snippet);
        setCodes({ [data.commonProblem.id]: snippet });
      }
      toast.success("Operation initiated! Workspaces unlocked.", {
        id: "battle-starting",
      });
    };

    const onStartFailed = (data: { error?: string }) => {
      if (!mounted) return;
      setIsStartingOperation(false);
      setCountDown(0);
      setCommencing(false);
      toast.error(
        data?.error || "Failed to start the operation. Please try again.",
        { id: "start-failed" },
      );
    };

    const onParticipantRejected = (data: { reason?: string }) => {
      if (!mounted) return;
      toast.error(
        data?.reason || "Your entry request was declined by the host.",
        { id: "participant-rejected" },
      );
      navigate("/lobby");
    };

    const onBattleState = (data: any) => {
      if (!mounted) return;
      setBattleState((prev: any) => ({ ...prev, ...data }));
    };

    const onReceiveBattleMessage = (msg: any) => {
      if (!mounted) return;
      setBattleMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onBattleMessageError = (errMsg: string) => {
      if (!mounted) return;
      toast.error(errMsg || "Failed to send battle message.", {
        id: "battle-msg-error",
      });
    };

    const onBattleUpdate = (data: any) => {
      if (!mounted) return;
      setPlayerProgress((prev) => ({
        ...prev,
        [data.userId]: {
          status: data.status,
          progress: data.progress,
          linesWritten: data.linesWritten,
        },
      }));
      if (data.result === "OPPONENT_WON") {
        setBattleResult("LOST");
        setDefeatReason("opponent");
        setIsBattleMenuOpen(true);
      }
      if (data.result === "OPPONENT_SURRENDERED") {
        toast.info(
          "Opponent surrendered — solve the problem to claim victory.",
          { id: "opponent-surrender" },
        );
      }
    };

    const onYouWereKicked = () => {
      if (!mounted) return;
      toast.error("You have been removed from this match by the host.", {
        id: "participant-removed",
      });
      navigate("/lobby");
    };

    const onPlayerKicked = (data: { userId: string; blocked?: boolean }) => {
      if (!mounted) return;
      setRoomParticipants((prev) =>
        prev.filter(
          (p) => p.userId !== data.userId && p.user?.id !== data.userId,
        ),
      );
      if (data.blocked) {
        void fetchBlockedParticipantsRef.current();
      }
    };

    const onYouAreBlocked = (data: { roomId?: string; reason?: string }) => {
      if (!mounted) return;
      toast.error(data?.reason || "You have been blocked from this event.", {
        id: "you-are-blocked",
      });
      navigate("/lobby");
    };

    const onPlayerBlocked = (data: { userId: string; blocked: boolean }) => {
      if (!mounted) return;
      setRoomParticipants((prev) =>
        prev.filter(
          (p) => p.userId !== data.userId && p.user?.id !== data.userId,
        ),
      );
      void fetchBlockedParticipantsRef.current();
    };

    const onPlayerUnblocked = () => {
      if (!mounted) return;
      void queryClient.invalidateQueries({
        queryKey: ["battle-room", roomId, isSpectateMode],
      });
    };

    const onParticipantsUpdated = (data: { performances: any[] }) => {
      if (!mounted || !data?.performances) return;
      // Update participant roster and merge performance data.
      // We always accept the payload from the server — the previous dedup
      // logic based on ID fingerprints could drop legitimate status updates
      // (e.g., progress changes for existing participants).
      setRoomParticipants((prev) => {
        const prevIds = new Set(prev.map((p: any) => p.userId || p.user?.id));
        const nextPerformances = data.performances;
        if (
          prev.length === nextPerformances.length &&
          nextPerformances.every((p: any) =>
            prevIds.has(p.userId || p.user?.id),
          )
        ) {
          return nextPerformances;
        }
        return nextPerformances;
      });
      setBattleState((prev: any) => ({
        ...prev,
        participants: data.performances,
      }));
    };

    // Toast even if data.performance is null — the user info may come
    // from data.user when the socket join raced the HTTP enroll.
    const onParticipantJoined = (data: {
      userId: string;
      performance: any;
      user?: any;
      roomId?: string;
      roomCode?: string;
    }) => {
      if (!mounted) return;
      const newParticipant = data.performance;
      const joiningUser = data.user ?? newParticipant?.user;
      const username = joiningUser?.username || "A new operative";
      const joiningUserId =
        data.userId || newParticipant?.userId || joiningUser?.id;

      if (newParticipant) {
        setRoomParticipants((prev) => {
          const exists = prev.some(
            (p: any) =>
              p.userId === newParticipant.userId ||
              p.user?.id === newParticipant.user?.id,
          );
          if (exists) return prev;
          toast.info(`${username} has joined the operation.`, {
            id: `participant-joined-${joiningUserId}`,
          });
          return [...prev, newParticipant];
        });
      } else {
        // No performance row yet (race condition), still show the toast.
        toast.info(`${username} has joined the operation.`, {
          id: `participant-joined-${joiningUserId}`,
        });
      }
    };

    // ─────────────────────────────────────────────────────────────────────
    // PARTICIPANT_LEFT EVENT HANDLER (Pre-start leave notification)
    // ─────────────────────────────────────────────────────────────────────
    // When a participant leaves a room that hasn't started yet (or during
    // waiting phase), the server emits participant_left to ALL remaining
    // participants including the moderator. This provides real-time
    // visibility into roster changes before the battle begins.
    const onParticipantLeft = (data: {
      userId: string;
      username?: string;
      reason?: string;
    }) => {
      if (!mounted) return;
      const username = data.username || "A fellow operative";

      // Remove from local roster
      setRoomParticipants((prev) =>
        prev.filter((p: any) => (p.userId || p.user?.id) !== data.userId),
      );

      // Notify the moderator and other participants
      toast.info(`${username} left the operation.`, {
        id: `participant-left-${data.userId}`,
        duration: 5000,
      });

      // Update battle state participants list
      setBattleState((prev: any) => {
        if (!prev.participants) return prev;
        return {
          ...prev,
          participants: prev.participants.filter(
            (p: any) => (p.userId || p.user?.id) !== data.userId,
          ),
        };
      });
    };

    // ─────────────────────────────────────────────────────────────────────
    const onGroupTerminated = (data: {
      roomId?: string;
      roomCode?: string;
      reason?: string;
    }) => {
      if (!mounted) return;
      const serverRoomId = String(data?.roomId ?? "").replace("room-", "");
      const serverRoomCode = data?.roomCode;
      const clientRoomId = String(roomId).replace("room-", "");
      const isSameRoom =
        serverRoomId === clientRoomId ||
        (serverRoomCode && serverRoomCode === clientRoomId);
      if (!isSameRoom) return;
      setBattleResult("LOST");
      setBattleState((prev: any) => ({
        ...prev,
        status: "FINISHED",
        finishedAt: new Date(),
      }));
      setIsBattleMenuOpen(true);
      invalidatePostBattleQueries(queryClient);
      toast.error("The host terminated this battle.", {
        id: "group-terminated",
      });
      setTimeout(() => navigate("/lobby"), 1500);
    };

    const onBattleFinished = (data: {
      winnerId?: string;
      performances?: any[];
      roomId?: string;
      roomCode?: string;
    }) => {
      if (!mounted) return;
      const serverRoomId = String(data?.roomId ?? "").replace("room-", "");
      const serverRoomCode = data?.roomCode;
      const clientRoomId = String(roomId).replace("room-", "");
      const isSameRoom =
        serverRoomId === clientRoomId ||
        (serverRoomCode && serverRoomCode === clientRoomId);
      if (!isSameRoom) return;
      if (data?.performances) {
        setRoomParticipants(data.performances);
        setBattleState((prev: any) => ({
          ...prev,
          participants: data.performances,
          status: "FINISHED",
        }));
      }
      if (focusPenaltyPercent >= 100 && !isHostRef.current) {
        setBattleResult("CHEATER");
        socket.emit("surrender_battle", { roomId, reason: "cheater" });
      } else {
        const myPerf = data?.performances?.find(
          (p: any) =>
            p.userId === myUserIdRef.current ||
            p.user?.id === myUserIdRef.current,
        );
        const won =
          myPerf &&
          ["PASSED", "COMPLETED", "WON"].includes(String(myPerf.status));
        if (won) {
          setBattleResult("WON");
        } else {
          setBattleResult("LOST");
          setDefeatReason(
            data?.winnerId && data?.winnerId !== myUserIdRef.current
              ? "opponent"
              : "timeout",
          );
        }
      }
      setIsBattleMenuOpen(true);
      invalidatePostBattleQueries(queryClient);
    };

    const onMatchCompleted = (data: {
      status?: string;
      reason?: string;
      performances?: any[];
      roomId?: string;
      roomCode?: string;
    }) => {
      if (!mounted) return;
      const serverRoomId = String(data?.roomId ?? "").replace("room-", "");
      const serverRoomCode = data?.roomCode;
      const clientRoomId = String(roomId).replace("room-", "");
      const isSameRoom =
        serverRoomId === clientRoomId ||
        (serverRoomCode && serverRoomCode === clientRoomId);
      if (!isSameRoom) return;
      if (data?.performances) {
        setRoomParticipants(data.performances);
        setBattleState((prev: any) => ({
          ...prev,
          participants: data.performances,
          status: "FINISHED",
        }));
        if (focusPenaltyPercent >= 100 && !isHostRef.current) {
          setBattleResult("CHEATER");
        } else {
          const myPerf = data.performances.find(
            (p: any) =>
              p.userId === myUserIdRef.current ||
              p.user?.id === myUserIdRef.current,
          );
          if (myPerf) {
            const won = ["PASSED", "COMPLETED", "WON"].includes(
              String(myPerf.status),
            );
            setBattleResult(won ? "WON" : "LOST");
          }
        }
      }
      void fetchBlockedParticipantsRef.current();
      setIsBattleMenuOpen(true);
      invalidatePostBattleQueries(queryClient);
    };

    const onRoomReady = () => {
      if (!mounted) return;
      if (isHostRef.current) {
        setBattleState((prev: any) => ({ ...prev, status: "WAITING" }));
        toast.success("Operation is ready — click START OPERATION to begin.", {
          id: "room-ready",
        });
      }
    };

    const onRoomOpening = () => {
      if (!mounted) return;
      setBattleState((prev: any) => ({ ...prev, status: "IN_PROGRESS" }));
      toast.info("Room opened — the operation is live.", {
        id: "room-opening",
      });
    };

    const onRoomClosing = (data: { closesAt?: string }) => {
      if (!mounted) return;
      if (data?.closesAt) {
        setClosingWarning({ closesAt: data.closesAt });
        setClosingWarningDismissed(false);
      }
    };

    const onRoomClosed = () => {
      if (!mounted) return;
      setClosingWarning(null);
      setBattleState((prev: any) => ({ ...prev, status: "FINISHED" }));
      setIsBattleMenuOpen(true);
      invalidatePostBattleQueries(queryClient);
      toast.info("Room closed by schedule.", { id: "room-closed" });
    };

    const onRoomForceClosed = (data: {
      roomId?: string;
      roomCode?: string;
      reason?: string;
    }) => {
      if (!mounted) return;
      const serverRoomId = String(data?.roomId ?? "").replace("room-", "");
      const serverRoomCode = data?.roomCode;
      const clientRoomId = String(roomId).replace("room-", "");
      const isSameRoom =
        serverRoomId === clientRoomId ||
        (serverRoomCode && serverRoomCode === clientRoomId);
      if (!isSameRoom) return;
      setClosingWarning(null);
      setBattleState((prev: any) => ({ ...prev, status: "FINISHED" }));
      setIsBattleMenuOpen(true);
      invalidatePostBattleQueries(queryClient);
      toast.error(data?.reason || "This room has been closed.", {
        id: "room-force-closed",
      });
      setTimeout(() => navigate("/lobby"), 500);
    };

    // ─────────────────────────────────────────────────────────────────────
    // Bind all listeners — no "connect" handler here; SocketContext
    // handles reconnection and auto-rejoin centrally.
    // ─────────────────────────────────────────────────────────────────────
    socket.on("battle_starting", onBattleStarting);
    socket.on("battle_started", onBattleStarted);
    socket.on("start_failed", onStartFailed);
    socket.on("participant_rejected", onParticipantRejected);
    socket.on("battle_state", onBattleState);
    socket.on("receive_battle_message", onReceiveBattleMessage);
    socket.on("battle_message_error", onBattleMessageError);
    socket.on("battle_update", onBattleUpdate);
    socket.on("you_were_kicked", onYouWereKicked);
    socket.on("player_kicked", onPlayerKicked);
    socket.on("you_are_blocked", onYouAreBlocked);
    socket.on("player_blocked", onPlayerBlocked);
    socket.on("player_unblocked", onPlayerUnblocked);
    socket.on("participants_updated", onParticipantsUpdated);
    socket.on("participant_joined", onParticipantJoined);
    socket.on("participant_left", onParticipantLeft);
    socket.on("group_terminated", onGroupTerminated);
    socket.on("battle_finished", onBattleFinished);
    socket.on("match_completed", onMatchCompleted);
    socket.on("room_ready", onRoomReady);
    socket.on("room_opening", onRoomOpening);
    socket.on("room_closing", onRoomClosing);
    socket.on("room_closed", onRoomClosed);
    socket.on("room_force_closed", onRoomForceClosed);

    return () => {
      mounted = false;
      socket.off("battle_starting", onBattleStarting);
      socket.off("battle_started", onBattleStarted);
      socket.off("start_failed", onStartFailed);
      socket.off("participant_rejected", onParticipantRejected);
      socket.off("battle_state", onBattleState);
      socket.off("receive_battle_message", onReceiveBattleMessage);
      socket.off("battle_message_error", onBattleMessageError);
      socket.off("battle_update", onBattleUpdate);
      socket.off("you_were_kicked", onYouWereKicked);
      socket.off("player_kicked", onPlayerKicked);
      socket.off("you_are_blocked", onYouAreBlocked);
      socket.off("player_blocked", onPlayerBlocked);
      socket.off("player_unblocked", onPlayerUnblocked);
      socket.off("participants_updated", onParticipantsUpdated);
      socket.off("participant_joined", onParticipantJoined);
      socket.off("participant_left", onParticipantLeft);
      socket.off("group_terminated", onGroupTerminated);
      socket.off("battle_finished", onBattleFinished);
      socket.off("match_completed", onMatchCompleted);
      socket.off("room_ready", onRoomReady);
      socket.off("room_opening", onRoomOpening);
      socket.off("room_closing", onRoomClosing);
      socket.off("room_closed", onRoomClosed);
      socket.off("room_force_closed", onRoomForceClosed);
      // Note: leaveBattleRoom is NOT called here. SocketContext manages
      // room membership centrally via joinBattleRoom/leaveBattleRoom.
      // Component unmount does not require leaving the socket room —
      // the room is tracked centrally and auto-rejoined on reconnect.
      // Calling leave here would race with StrictMode remount and could
      // remove the socket from a room it just rejoined.
    };
    // Minimal stable deps — socket is stable singleton, roomId changes on navigation.
    // joinBattleRoom/leaveBattleRoom are now stable useCallback from SocketProvider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, navigate, queryClient, isSpectateMode]);

  // ─────────────────────────────────────────────────────────────────────
  // Centralized Leave Handler (Pre-Start Leave Notification)
  // ─────────────────────────────────────────────────────────────────────
  // When a participant navigates away from the battle page BEFORE the battle
  // has started (status is "WAITING" or not yet IN_PROGRESS), we emit
  // leave_room with notifyParticipants: true so the server broadcasts a
  // participant_left event to the moderator and remaining participants.
  //
  // For Active battles (IN_PROGRESS/FINISHED), we skip the notification
  // since leaving mid-battle is handled by surrender/timeout mechanics.
  //
  // We use a ref to track the battle status to avoid stale closures.
  // The unmount detection uses a deferred cleanup pattern to distinguish
  // real unmounts from StrictMode remounts.
  const battleStartedRef = useRef(false);
  const pendingLeaveTimerRef = useRef<number | null>(null);
  battleStartedRef.current =
    battleState.status === "IN_PROGRESS" || battleState.status === "FINISHED";

  useEffect(() => {
    // Only set up the leave handler if we have a socket and room
    if (!socket || !roomId) return;

    // Cancel any pending leave from a previous StrictMode unmount cycle
    if (pendingLeaveTimerRef.current) {
      window.clearTimeout(pendingLeaveTimerRef.current);
      pendingLeaveTimerRef.current = null;
    }

    return () => {
      // Only notify participants if the battle hasn't started yet
      if (!battleStartedRef.current) {
        // Use setTimeout to allow for StrictMode remount cancellation.
        // The timer is stored in a ref so the re-mount cleanup can cancel it.
        pendingLeaveTimerRef.current = window.setTimeout(() => {
          if (!battleStartedRef.current) {
            leaveBattleRoom(roomId, { notifyParticipants: true });
          }
          pendingLeaveTimerRef.current = null;
        }, 500);
      }
    };
  }, [socket, roomId, leaveBattleRoom]);

  // ── Countdown is driven entirely by server `battle_starting` events.
  // No client-side decrement loop: the server sends 3→2→1 at 1s intervals,
  // then `battle_started`. This prevents the client interval from racing
  // with server values and resetting `commencing` after battle_started.

  useEffect(() => {
    if (!commencing) return;
    const timer = window.setTimeout(() => setCommencing(false), 900);
    return () => window.clearTimeout(timer);
  }, [commencing]);

  // Live countdown for the scheduled-close warning banner
  useEffect(() => {
    if (!closingWarning) {
      setClosingSeconds(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(closingWarning.closesAt).getTime() - Date.now()) / 1000,
        ),
      );
      setClosingSeconds(remaining);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [closingWarning]);

  // Update editor when active problem changes
  useEffect(() => {
    if (activeProblem && codes[activeProblem.id]) {
      setCode(codes[activeProblem.id]);
      console.log("active problem:", activeProblem.test_cases);
    }
    // Extract Java class name from code_snippets
    if (activeProblem) {
      const javaSnippet = activeProblem.code_snippets?.find(
        (s: any) => s.language?.toLowerCase() === "java",
      );
      if (javaSnippet?.code) {
        const classMatch = javaSnippet.code.match(/class\s+(\w+)/);
        if (classMatch?.[1]) {
          setJavaClassName(classMatch[1]);
        } else {
          setJavaClassName("Solution");
        }
      } else {
        setJavaClassName("Solution");
      }
    }
  }, [activeProblem, codes]);

  // Handlers
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStartOperation = () => {
    if (!socket || isStartingOperation) return;
    setIsStartingOperation(true);
    setCountDown(3);
    socket.emit(
      "start_event",
      roomId,
      (ack: { success: boolean; error?: string }) => {
        // Cancel the fallback timeout — the server responded.
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = null;
        }
        if (!ack?.success) {
          setIsStartingOperation(false);
          setCountDown(0);
          toast.error(ack?.error || "Failed to start the operation", {
            id: "start-failed",
          });
        } else {
          // Don't reset isStartingOperation here — the countdown overlay
          // will be dismissed by the battle_started event.
          toast.success("Operation initiated! Workspaces unlocking...", {
            id: "battle-starting",
          });
        }
      },
    );
    // Fallback: if the server doesn't respond within 8s, clear the loading state.
    // Guarded by a ref so a successful ack can cancel it.
    startTimeoutRef.current = setTimeout(() => {
      setIsStartingOperation(false);
      setCountDown(0);
      startTimeoutRef.current = null;
    }, 8000);
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
    if (!newBattleMessage.trim() || !roomId) return;
    sendBattleMessage(roomId, newBattleMessage);
    setNewBattleMessage("");
  };

  const handleTimerExpire = () => {
    if (focusPenaltyPercent >= 100 && !isHost) {
      setBattleResult("CHEATER");
    } else {
      setBattleResult("LOST");
      setDefeatReason("timeout");
    }
    setIsBattleMenuOpen(true);
    playBattleSound("surrender");
    try {
      // Persist focus telemetry for anti-cheat review (ROADMAP §3)
      localStorage.setItem(
        "brace-focus-events",
        JSON.stringify(focusTelemetry.snapshot()),
      );
    } catch {
      /* ignore */
    }
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
            toast.error(
              "Could not sync the expired room — please reload this page.",
              { id: "sync-expired-room" },
            );
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

  const handleRejectParticipant = (targetUserId: string) => {
    if (!socket || !roomId) return;
    socket.emit("host_reject_participant", { roomId, targetUserId });
  };

  const handleBlockParticipant = (targetUserId: string, reason?: string) => {
    if (!socket || !roomId) return;
    socket.emit("host_block_user", { roomId, targetUserId, reason });
  };

  const handleUnblockParticipant = (targetUserId: string) => {
    if (!socket || !roomId) return;
    socket.emit("host_unblock_user", { roomId, targetUserId });
  };

  const isBattleActive =
    battleState.status === "IN_PROGRESS" && battleResult === null;
  const opponentParticipant = roomParticipants.find(
    (participant: any) =>
      (participant.user?.id || participant.userId) !== myUserId,
  );
  const opponentTelemetry = opponentParticipant
    ? playerProgress[opponentParticipant.user?.id || opponentParticipant.userId]
    : undefined;

  const [isSurrenderModalOpen, setIsSurrenderModalOpen] =
    useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  // Focus trap refs for modals
  const battleMenuRef = useRef<HTMLDivElement>(null);
  const surrenderModalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus trap for battle menu
  useEffect(() => {
    if (!isBattleMenuOpen) return;
    const modal = battleMenuRef.current;
    if (!modal) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBattleMenuOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      const firstFocusable = modal.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isBattleMenuOpen]);

  // Focus trap for surrender modal
  useEffect(() => {
    if (!isSurrenderModalOpen) return;
    const modal = surrenderModalRef.current;
    if (!modal) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSurrenderModalOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      const firstFocusable = modal.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isSurrenderModalOpen]);

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
      localStorage.setItem(
        "brace-focus-events",
        JSON.stringify(focusTelemetry.snapshot()),
      );
    } catch {
      /* ignore */
    }
    setBattleResult("LOST");
    setDefeatReason("surrender");
    setIsSurrenderModalOpen(false);
    setIsBattleMenuOpen(true);
    // Clear notes on surrender
    if (room?.id) {
      clearEventNotes(room.id, problems.map((p: any) => p?.id).filter(Boolean));
    }
  };

  const handleSubmitCode = async () => {
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
        battleState.status === "IN_PROGRESS" && battleResult === null;

      if (res.status === "PASSED") {
        setTerminalOutput("SUCCESS: All test cases passed!");
        playBattleSound("submit-success");
        if (isBattleActive) {
          // Calculate progress based on solved problems vs total problems
          // to avoid marking the entire event as 100% after solving one problem.
          const solvedCount = problems.filter((p: any) =>
            (p.test_cases || []).some((tc: any) => tc.status === "PASSED"),
          ).length + 1; // +1 for the current problem just solved
          const totalCount = problems.length || 1;
          const progress = Math.round((solvedCount / totalCount) * 100);
          socket?.emit("battle_action", {
            roomId,
            status: "Passed tests!",
            progress: Math.min(progress, 100),
            // NOTE: no `result` field — the server derives the outcome from the
            // persisted submission and ignores any client-claimed result.
            linesWritten: code.split("\n").length,
          });
          // The WIN verdict arrives via the server's battle_finished broadcast
          // (performances + winnerId) — it is never set from the client's own
          // submission assumption.
          if (room?.id) {
            clearEventNotes(
              room.id,
              problems.map((p: any) => p?.id).filter(Boolean),
            );
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
            progress: Math.round(
              ((res.passedCases || 0) / (res.totalCases || 1)) * 100,
            ),
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

  // Countdown overlay must render even during initial loading — the server
  // may send battle_starting events before the HTTP room fetch has resolved.
  // Without this, the "GET READY" overlay (and tick audio) would fire but
  // stay hidden behind <PageSkeleton /> until the API data arrives.
  if (countdown > 0 || commencing) {
    return (
      <div className="fixed inset-0 z-[100] flex select-none flex-col items-center justify-center bg-base">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.3em] text-accent-warning shadow-glow-warning">
          <span className="h-2 w-2 rounded-full bg-accent-warning animate-ping" />
          OPERATIVE ALERT // BATTLE COMMENCING
        </div>
        <h2 className="mb-6 font-mono text-2xl font-black uppercase tracking-[0.4em] text-fg">
          {commencing ? "BATTLE COMMENCING" : "GET READY"}
        </h2>
        <div className="relative flex min-h-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-accent-primary/20 blur-3xl animate-pulse" />
          <div
            key={countdown || "commencing"}
            className="ds-countdown-pop relative font-mono text-7xl font-black tracking-widest text-accent-primary text-shadow-accent sm:text-9xl"
          >
            {commencing ? "01" : countdown}
          </div>
        </div>
        <p className="mt-8 font-mono text-xs uppercase tracking-widest text-label">
          {commencing
            ? "WORKSPACE UNLOCKING // ENTER THE ARENA"
            : "PREPARE YOUR EDITOR // INITIALIZING WORKSPACE"}
        </p>
      </div>
    );
  }

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

  // ── HOST = MODERATOR (control deck, no editor) ─────────────────────
  // The creator never receives a performance record server-side (see getLiveRoom:
  // the host is skipped so they don't compete or count toward maxUsers). Surface
  // a dedicated control deck instead of the code editor: live telemetry, total
  // stats, the member roster, host controls (kick / start / end) and chat.
  if (isHost) {
    return (
      <div className="viewport-shell relative flex h-full w-full flex-col overflow-hidden bg-base">
        {/* ── TOP HEADER ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle-line bg-raised px-2 py-1.5 font-mono text-[9px] z-30 shrink-0 w-full sm:px-6 sm:py-2.5 sm:text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-accent-warning font-bold uppercase tracking-wider flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-accent-warning shrink-0" />
              <span className="truncate">
                MODERATOR // {room?.name || "OPERATION"}
              </span>
            </span>
            <span className="text-[10px] text-faint border border-line bg-base/40 px-2 py-0.5 shrink-0">
              CODE {room?.roomCode}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 border font-bold uppercase tracking-widest shrink-0 ${
                battleState.status === "IN_PROGRESS"
                  ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
                  : battleState.status === "WAITING"
                    ? "border-accent-warning/40 bg-accent-warning/10 text-accent-warning"
                    : "border-subtle-line bg-surface-hover text-subtle"
              }`}
            >
              {battleState.status || "WAITING"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SoundToggle />
            <GlobalTimer
              startedAt={battleState.startedAt || room?.startedAt}
              totalDurationMs={
                battleState.totalDurationMs || room?.totalTimeLimitMs
              }
              onExpire={() => {
                /* host does not compete; timer is informational */
              }}
              label={room?.closesAt ? "CLOSES IN:" : "TIME LEFT:"}
              variant="pill"
            />
            {battleState.status === "WAITING" && (
              <button
                onClick={handleStartOperation}
                disabled={isStartingOperation}
                className="flex items-center gap-1 px-2 py-1 border border-accent-primary/40 bg-accent-primary/10 text-accent-primary text-[9px] font-mono font-bold rounded hover:bg-accent-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
              >
                {isStartingOperation ? (
                  <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                ) : (
                  <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                )}
                {isStartingOperation ? "STARTING..." : "START"}
              </button>
            )}
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: "End this battle?",
                  message:
                    "End this battle for everyone? Pending participants will be marked TIMEOUT.",
                  confirmLabel: "End battle",
                  onConfirm: handleHostEndMatch,
                });
              }}
              disabled={battleState.status !== "IN_PROGRESS"}
              className={`flex items-center gap-1 px-2 py-1 border border-accent-danger/40 bg-accent-danger/10 text-accent-danger text-[9px] font-mono font-bold rounded hover:bg-accent-danger/20 transition-all sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px] ${
                battleState.status !== "IN_PROGRESS" ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <StopCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> END
            </button>
            <button
              onClick={() => navigate("/lobby")}
              className="flex items-center gap-1 px-2 py-1 border border-subtle-line bg-surface-hover/60 text-subtle text-[9px] font-mono font-bold rounded hover:bg-surface-hover transition-all sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
            >
              LOBBY
            </button>
          </div>
        </div>

        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto themed-scroll">
          <div className="mx-auto max-w-5xl grid gap-6 p-6 lg:grid-cols-3">
            {/* ── LEFT: TOTAL STATS + ROSTER (span 2) ── */}
            <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
              {/* TOTAL STATS */}
              <div className="border border-line rounded-xl bg-base/40 p-5">
                <p className="text-[10px] font-mono font-bold text-accent-primary uppercase tracking-widest mb-4">
                  <Activity className="w-4 h-4 inline mr-1" /> TOTAL STATS
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border border-subtle-line bg-raised/60 p-3">
                    <div className="text-[9px] text-faint uppercase tracking-widest">
                      Operatives
                    </div>
                    <div className="mt-1 text-2xl font-mono font-bold text-fg">
                      {roomParticipants.length}
                    </div>
                  </div>
                  <div className="border border-subtle-line bg-raised/60 p-3">
                    <div className="text-[9px] text-faint uppercase tracking-widest">
                      Max slots
                    </div>
                    <div className="mt-1 text-2xl font-mono font-bold text-fg">
                      {room?.maxUsers ?? "—"}
                    </div>
                  </div>
                  <div className="border border-subtle-line bg-raised/60 p-3">
                    <div className="text-[9px] text-faint uppercase tracking-widest">
                      Problems
                    </div>
                    <div className="mt-1 text-2xl font-mono font-bold text-fg">
                      {problems.length}
                    </div>
                  </div>
                  <div className="border border-subtle-line bg-raised/60 p-3">
                    <div className="text-[9px] text-faint uppercase tracking-widest">
                      Focus alerts
                    </div>
                    <div className="mt-1 text-2xl font-mono font-bold text-accent-warning">
                      {focusLossCount}
                    </div>
                  </div>
                </div>
                {room?.closesAt && (
                  <p className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-accent-warning">
                    <Clock className="w-3.5 h-3.5" /> Scheduled close:{" "}
                    {new Date(room.closesAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* MEMBER ROSTER + LIVE TELEMETRY */}
              <div className="border border-line rounded-xl bg-base/40 p-5">
                <p className="text-[10px] font-mono font-bold text-accent-primary uppercase tracking-widest mb-4">
                  <Users className="w-4 h-4 inline mr-1" /> OPERATIVES (
                  {roomParticipants.length})
                </p>
                {roomParticipants.length === 0 ? (
                  <p className="text-faint text-xs font-mono py-8 text-center">
                    No operatives have joined yet. Waiting for participants...
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {roomParticipants.map((p: any) => {
                      const participantId = p.user?.id || p.userId;
                      const uname = p.user?.username || "Operative";
                      const intel = playerProgress[participantId];
                      const isMe = participantId === myUserId;
                      const verdict = participantVerdict(p, battleState.status);
                      const passed = (p.submissions ?? []).filter(
                        (s: any) => (s.status || "").toUpperCase() === "PASSED",
                      ).length;
                      return (
                        <div
                          key={participantId}
                          className="bg-raised border border-subtle-line rounded-xl p-4"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={
                                p.user?.avatarUrl || getInitialsAvatar(uname)
                              }
                              alt=""
                              className="w-10 h-10 rounded-full border border-subtle-line"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm font-bold text-fg truncate">
                                {uname}
                                {isMe ? " (you)" : ""}
                              </p>
                              <p
                                className={`text-[9px] px-1.5 py-0.5 rounded border font-bold w-fit ${verdictStyle(verdict)}`}
                              >
                                {verdict === "COMPLETED"
                                  ? "✓ COMPLETED"
                                  : verdict === "TIMEOUT"
                                    ? "✗ TIMEOUT"
                                    : "● IN PROGRESS"}
                              </p>
                            </div>
                            {!isMe && (
                              <div className="flex items-center gap-1">
                                {battleState.status === "WAITING" && (
                                  <button
                                    onClick={() =>
                                      handleRejectParticipant(participantId)
                                    }
                                    title={`Reject ${uname} (returns to lobby)`}
                                    className="px-2 py-1 border border-subtle-line bg-surface-hover/40 text-subtle hover:text-accent-danger hover:border-accent-danger/40 text-[9px] font-mono rounded transition-colors"
                                  >
                                    Reject
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: "Kick & block?",
                                      message: `Kick & block ${uname} from this event?`,
                                      confirmLabel: "Kick & block",
                                      onConfirm: () =>
                                        handleBlockParticipant(
                                          participantId,
                                          "Moderator kick & block",
                                        ),
                                    });
                                  }}
                                  title={`Kick & block ${uname}`}
                                  className="p-1.5 border border-accent-danger/40 bg-accent-danger/15 hover:bg-accent-danger/25 text-accent-danger rounded transition-all"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {/* live telemetry bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-faint">
                              <span>
                                {intel?.status || p.status || "STANDBY"}
                              </span>
                              <span className="font-mono font-bold text-accent-primary">
                                {intel?.progress ?? 0}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${intel?.progress >= 100 ? "bg-accent-success" : "bg-accent-primary"}`}
                                style={{ width: `${intel?.progress ?? 0}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-faint">
                              <span>
                                {intel?.linesWritten ?? 0} lines written
                              </span>
                              <span>{passed} passed</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BLOCKED OPERATIVES LIST */}
              {blockedParticipants.length > 0 && (
                <div className="border border-accent-danger/40 rounded-xl bg-accent-danger/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-mono font-bold text-accent-danger uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-accent-danger" />{" "}
                      BLOCKED OPERATIVES ({blockedParticipants.length})
                    </p>
                    <button
                      onClick={async () => {
                        for (const b of blockedParticipants) {
                          await handleUnblockParticipant(b.blockedUserId);
                        }
                        setBlockedParticipants([]);
                      }}
                      className="text-[9px] font-mono text-accent-primary hover:underline uppercase font-bold"
                    >
                      UNBLOCK ALL
                    </button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {blockedParticipants.map((b: any) => {
                      const pid = b.blockedUserId;
                      const uname =
                        b.blockedUser?.username || "Blocked Operative";
                      return (
                        <div
                          key={pid}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-accent-danger/30 bg-base/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-accent-danger/20 border border-accent-danger/40 flex items-center justify-center text-xs font-mono font-bold text-accent-danger">
                              {uname[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-bold text-fg truncate">
                                {uname}
                              </p>
                              <p className="text-[9px] font-mono text-accent-danger truncate">
                                {b.reason || "Blocked by moderator"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblockParticipant(pid)}
                            title="Unblock operative"
                            className="p-1 px-2 border border-accent-success/40 bg-accent-success/15 hover:bg-accent-success/25 text-accent-success text-[10px] font-mono font-bold rounded transition-all"
                          >
                            Unblock
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: CHAT ── */}
            <div className="border border-line rounded-xl bg-base/40 flex flex-col min-h-[320px] max-h-[60vh] lg:max-h-none">
              <p className="text-[10px] font-mono font-bold text-accent-primary uppercase tracking-widest p-4 border-b border-subtle-line">
                <MessageSquare className="w-4 h-4 inline mr-1" /> COMMS
              </p>
              <div className="flex-1 overflow-y-auto themed-scroll p-4 flex flex-col gap-2 min-h-0">
                {battleMessages.length === 0 ? (
                  <p className="text-faint text-[10px] font-mono">
                    No transmissions yet.
                  </p>
                ) : (
                  battleMessages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`px-3 py-2 rounded-xl max-w-[90%] font-mono text-xs ${
                        msg.senderId === myUserIdRef.current
                          ? "border-2 border-accent-primary/50 bg-raised/40 text-fg self-end"
                          : "border-2 border-subtle-line/50 bg-raised/20 text-fg self-start"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form
                onSubmit={handleBattleMessage}
                className="flex gap-2 p-3 border-t border-subtle-line"
              >
                <input
                  type="text"
                  value={newBattleMessage}
                  onChange={(e) => setNewBattleMessage(e.target.value)}
                  placeholder="TRANSMIT..."
                  className="flex-1 border-2 border-subtle-line/50 bg-raised/30 p-2 rounded-lg text-fg font-mono text-xs placeholder:text-muted focus:border-accent focus:bg-raised focus:shadow-[0_0_0_2px_rgba(0,212,255,0.2)] outline-none transition-all min-w-0"
                />
                <button
                  type="submit"
                  className="px-3 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/50 text-accent-primary rounded-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── SCHEDULED-CLOSE BANNER (minimizable) ── */}
        {closingWarning && !closingWarningDismissed && (
          <div className="fixed left-1/2 top-4 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-accent-warning/50 bg-accent-warning/10 px-4 py-2.5 shadow-[0_0_20px_rgba(255,184,0,0.25)] backdrop-blur">
            <span
              className="h-2 w-2 rounded-full bg-accent-warning animate-ping"
              aria-hidden
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-warning">
              Room closing
              {closingSeconds !== null &&
                ` in ${Math.floor(closingSeconds / 60)}:${String(closingSeconds % 60).padStart(2, "0")}`}
            </span>
            <button
              onClick={() => setClosingWarningDismissed(true)}
              title="Minimize closing warning"
              className="text-faint transition hover:text-fg"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {closingWarning && closingWarningDismissed && (
          <button
            onClick={() => setClosingWarningDismissed(false)}
            title="Show closing warning"
            className="fixed left-1/2 top-4 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-warning backdrop-blur transition hover:bg-accent-warning/20"
          >
            <AlarmClock className="h-3 w-3" />
            closing soon
          </button>
        )}
      </div>
    );
  }

  // ── STAGING ROOM (WAITING STATE) ─────────────────────────────────
  // While the room is in WAITING state, participants are kept in the staging
  // area without access to the Monaco editor or problem specifications.
  // The host sees a START OPERATION button; participants see a waiting message.
  if (battleState.status === "WAITING" && countdown <= 0 && !commencing) {
    return (
      <BattleStagingRoom
        roomName={room.name || "Untitled Operation"}
        roomCode={room.roomCode || ""}
        hostName={room.host?.username || "Commander"}
        isHost={isHost}
        maxUsers={room.maxUsers || 2}
        participants={roomParticipants}
        myUserId={myUserId}
        totalTimeLimitMs={room.totalTimeLimitMs}
        closesAt={room.closesAt}
        onStart={isHost ? handleStartOperation : undefined}
        isStartingOperation={isStartingOperation}
        onLeave={() => navigate("/lobby")}
        onSendMessage={(content: string) =>
          socket?.emit("send_battle_message", { roomId, content })
        }
        messages={battleMessages}
        socketId={myUserId}
        onRejectParticipant={
          isHost
            ? (targetUserId: string) => {
                socket?.emit("host_reject_participant", {
                  roomId,
                  targetUserId,
                });
              }
            : undefined
        }
        onKickParticipant={
          isHost
            ? (targetUserId: string) => {
                socket?.emit("host_kick_user", { roomId, targetUserId });
              }
            : undefined
        }
      />
    );
  }

  return (
    <div
      className={`viewport-shell relative flex w-full overflow-hidden bg-base ${focusFlash ? "ds-focus-flash" : ""}`}
    >
      {(countdown > 0 || commencing) && (
        <div className="ds-overlay fixed inset-0 z-[100] flex select-none flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.3em] text-accent-warning shadow-glow-warning">
            <span className="h-2 w-2 rounded-full bg-accent-warning animate-ping" />
            OPERATIVE ALERT // BATTLE COMMENCING
          </div>
          <h2 className="mb-6 font-mono text-2xl font-black uppercase tracking-[0.4em] text-fg">
            {commencing ? "BATTLE COMMENCING" : "GET READY"}
          </h2>
          <div className="relative flex min-h-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-accent-primary/20 blur-3xl animate-pulse" />
            <div
              key={countdown || "commencing"}
              className="ds-countdown-pop relative font-mono text-7xl font-black tracking-widest text-accent-primary text-shadow-accent sm:text-9xl"
            >
              {commencing ? "01" : countdown}
            </div>
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-label">
            {commencing
              ? "WORKSPACE UNLOCKING // ENTER THE ARENA"
              : "PREPARE YOUR EDITOR // INITIALIZING WORKSPACE"}
          </p>
        </div>
      )}
      {/* SCHEDULED CLOSE WARNING — minimizable banner */}
      {closingWarning && !closingWarningDismissed && (
        <div className="fixed left-1/2 top-4 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-accent-warning/50 bg-accent-warning/10 px-4 py-2.5 shadow-[0_0_20px_rgba(255,184,0,0.25)] backdrop-blur">
          <span
            className="h-2 w-2 rounded-full bg-accent-warning animate-ping"
            aria-hidden
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-warning">
            Room closing
            {closingSeconds !== null &&
              ` in ${Math.floor(closingSeconds / 60)}:${String(closingSeconds % 60).padStart(2, "0")}`}
          </span>
          <button
            onClick={() => setClosingWarningDismissed(true)}
            title="Minimize closing warning"
            className="text-faint transition hover:text-fg"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* Minimized pill — click to restore the warning */}
      {closingWarning && closingWarningDismissed && (
        <button
          onClick={() => setClosingWarningDismissed(false)}
          title="Show closing warning"
          className="fixed left-1/2 top-4 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-warning backdrop-blur transition hover:bg-accent-warning/20"
        >
          <AlarmClock className="h-3 w-3" />
          closing soon
        </button>
      )}
      {/* ─── HOST COMMAND PANEL (fixed overlay, host only) ─── */}
      {isHost &&
        (battleState.status === "IN_PROGRESS" ||
          battleState.status === "WAITING") && (
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
              <div className="bg-raised/95 border border-accent-warning/40 rounded-xl shadow-2xl backdrop-blur-md w-72 sm:w-80 overflow-hidden animate-fade-in max-w-[90vw]">
                {/* Panel Header */}
                <div className="px-3 py-2 border-b border-accent-warning/20 bg-accent-warning/10 flex items-center justify-between sm:px-4 sm:py-3">
                  <span className="font-mono text-[9px] font-bold text-accent-warning tracking-widest flex items-center gap-1 sm:gap-2 sm:text-xs">
                    <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> HOST
                    COMMAND CENTER
                  </span>
                  <div className="flex items-center gap-1">
                    {battleState.status === "FINISHED" && (
                      <button
                        onClick={() => setShowAnalyticsView(!showAnalyticsView)}
                        title="View event analytics"
                        className={`p-1 rounded transition-all ${showAnalyticsView ? "bg-accent-primary/20 text-accent-primary" : "text-faint hover:text-fg"}`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsHostPanelOpen(false)}
                      className="text-faint hover:text-fg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Participant List */}
                <div
                  className="p-2 sm:p-3 flex flex-col gap-2"
                  aria-busy={loading && roomParticipants.length === 0}
                >
                  <p className="text-[8px] sm:text-[10px] text-faint font-mono tracking-widest mb-1">
                    OPERATIVES ({roomParticipants.length})
                  </p>
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
                      const uname = p.user?.username || "Operative";
                      const intel = playerProgress[participantId];
                      const isMe = participantId === myUserId;
                      return (
                        <div
                          key={participantId}
                          className="bg-base/40 border border-line-low rounded-lg p-1.5 sm:p-2.5 flex items-center gap-2 sm:gap-3"
                        >
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-bold text-fg">
                            {uname[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-fg truncate">
                                {uname}
                                {isMe ? " (you)" : ""}
                              </span>
                              {intel && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    intel.progress >= 100
                                      ? "bg-accent-success/20 text-accent-success"
                                      : intel.progress > 0
                                        ? "bg-accent-primary/20 text-accent-primary"
                                        : "bg-surface-hover text-subtle"
                                  }`}
                                >
                                  {intel.progress}%
                                </span>
                              )}
                            </div>
                            {intel && (
                              <div className="mt-1 w-full h-1 bg-surface-hover rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    intel.progress >= 100
                                      ? "bg-accent-success"
                                      : "bg-accent-primary"
                                  }`}
                                  style={{ width: `${intel.progress}%` }}
                                />
                              </div>
                            )}
                            {intel?.linesWritten !== undefined && (
                              <p className="text-[9px] text-faint mt-0.5">
                                {intel.linesWritten} lines written
                              </p>
                            )}
                          </div>
                          {!isMe && (
                            <>
                              <button
                                onClick={() => handleKickUser(participantId)}
                                title={`Kick ${uname}`}
                                className="p-1 border border-accent-danger/30 bg-accent-danger/15 hover:bg-accent-danger/20 text-accent-danger rounded transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(`Block ${uname} from this event?`)
                                  )
                                    handleBlockParticipant(participantId);
                                }}
                                title={`Block ${uname}`}
                                className="p-1 border border-accent-danger/50 bg-accent-danger/15 hover:bg-accent-danger/25 text-accent-danger rounded transition-all"
                              >
                                <ShieldAlert className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Blocked Users Section */}
                {blockedParticipants.length > 0 && (
                  <div className="px-3 pb-2 border-t border-subtle-line">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] text-faint font-mono tracking-widest">
                        BLOCKED ({blockedParticipants.length})
                      </p>
                      <button
                        onClick={async () => {
                          for (const b of blockedParticipants) {
                            await handleUnblockParticipant(b.blockedUserId);
                          }
                          setBlockedParticipants([]);
                        }}
                        title="Unblock all"
                        className="text-[9px] text-accent-primary hover:underline font-mono"
                      >
                        UNBLOCK ALL
                      </button>
                    </div>
                    {blockedParticipants.map((b: any) => {
                      const pid = b.blockedUserId;
                      const uname = b.blockedUser?.username || "Operative";
                      return (
                        <div
                          key={pid}
                          className="bg-accent-danger/10 border border-accent-danger/30 rounded-lg p-2 mb-1 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[9px] font-mono font-bold text-fg">
                            {uname[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs font-mono text-fg flex-1 truncate">
                            {uname}
                          </span>
                          {b.reason && (
                            <span
                              className="text-[8px] font-mono text-accent-danger truncate max-w-[120px]"
                              title={b.reason}
                            >
                              {b.reason}
                            </span>
                          )}
                          <button
                            onClick={() => handleUnblockParticipant(pid)}
                            title="Unblock"
                            className="p-1 border border-accent-success/30 bg-accent-success/15 hover:bg-accent-success/20 text-accent-success rounded transition-all"
                          >
                            <ShieldCheck className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Analytics view (when event is FINISHED) */}
                {battleState.status === "FINISHED" && eventAnalytics && (
                  <div className="px-3 pb-2 border-t border-subtle-line">
                    <EventAnalytics analytics={eventAnalytics} />
                  </div>
                )}

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
        style={{
          width:
            isPanelOpen && !isSidebarCollapsed ? `${sidebarWidth}px` : "0px",
        }}
        className="relative z-20 h-full transition-[width] duration-300 ease-in-out shrink-0"
      >
        <div className="w-full h-full bg-raised border-r border-subtle-line shadow-2xl overflow-hidden relative">
          <div
            className="flex flex-col h-full"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* HOST HEADER */}
            <div className="px-3 py-3 border-b border-subtle-line bg-base/40">
              {battleState.status === "WAITING" && (
                <div className="text-center py-1">
                  <p className="text-accent-warning font-mono text-[10px] tracking-widest mb-2.5">
                    WAITING FOR OPERATIVES
                  </p>
                  {isHost ? (
                    <button
                      onClick={handleStartOperation}
                      disabled={isStartingOperation}
                      className="w-full bg-accent-primary/20 hover:bg-accent-primary border border-accent-primary text-accent-primary hover:text-ink font-bold tracking-widest py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                    >
                      {isStartingOperation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {isStartingOperation
                        ? "STARTING OPERATION..."
                        : "START OPERATION"}
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
              <div className="px-3 py-3 border-b border-accent-danger/20 bg-accent-danger/5 flex items-center gap-3">
                {opponent.avatarUrl ? (
                  <img
                    src={opponent.avatarUrl}
                    alt="Opponent"
                    className="w-10 h-10 rounded-full border border-accent-danger shadow-[0_0_15px_rgba(255,59,92,0.3)]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-accent-danger bg-surface-hover flex items-center justify-center text-accent-danger font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(255,59,92,0.3)]">
                    {opponent.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-accent-danger tracking-widest font-bold">
                    VS OPPONENT
                  </p>
                  <p className="font-mono text-fg text-sm font-bold truncate">
                    {opponent.username}
                  </p>
                  <p className="text-xs text-subtle mt-1">
                    Rating: {opponent.rating || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-3 py-3 border-b border-subtle-line bg-accent-primary/5">
                <p className="text-[10px] text-faint tracking-widest mb-2">
                  MISSION PLAYLIST ({problems.length})
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {problems.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`shrink-0 w-9 h-9 rounded-lg border font-mono font-bold transition-all flex items-center justify-center
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
            <div className="flex border-b border-subtle-line bg-surface-hover shrink-0">
              <button
                onClick={() => setActivePanelTab("PROBLEM")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activePanelTab === "PROBLEM" ? "border-b-accent-primary text-accent-primary bg-accent-primary/5" : "border-b-transparent text-faint hover:text-subtle hover:bg-surface-hover"}`}
              >
                <Code className="w-3 h-3" /> PROBLEM
              </button>
              <button
                onClick={() => setActivePanelTab("CHAT")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activePanelTab === "CHAT" ? "border-b-accent-primary text-accent-primary bg-accent-primary/5" : "border-b-transparent text-faint hover:text-subtle hover:bg-surface-hover"}`}
              >
                <MessageSquare className="w-3 h-3" /> CHAT
              </button>
              <button
                onClick={() => setActivePanelTab("OPPONENT_TELEMETRY")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activePanelTab === "OPPONENT_TELEMETRY" ? "border-b-accent-primary text-accent-primary bg-accent-primary/5" : "border-b-transparent text-faint hover:text-subtle hover:bg-surface-hover"}`}
              >
                <Activity className="w-3 h-3" /> OPPONENT
              </button>
              {isHost && battleState.status === "IN_PROGRESS" && (
                <button
                  onClick={() => setActivePanelTab("MODERATOR")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activePanelTab === "MODERATOR" ? "border-b-accent-warning text-accent-warning bg-accent-warning/5" : "border-b-transparent text-faint hover:text-subtle hover:bg-surface-hover"}`}
                >
                  <ShieldAlert className="w-3 h-3" /> MOD
                </button>
              )}
            </div>

            {/* TAB CONTENT — themed scrollbar + contained text */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 themed-scroll flex flex-col min-w-0">
              {activePanelTab === "PROBLEM" ? (
                <div className="flex flex-col w-full max-w-full min-w-0 gap-4 h-max">
                  {/* Title & metadata */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 max-w-full break-words text-sm font-bold leading-tight text-fg [overflow-wrap:anywhere]">
                        {activeProblem?.name || "Select Problem"}
                      </h2>
                      {activeProblem?.difficulty_level && (
                        <span
                          className={`shrink-0 text-[10px] tracking-widest px-2 py-0.5 rounded border font-bold uppercase
                        ${activeProblem?.difficulty_level === "HARD" ? "border-accent-danger/30 bg-accent-danger/10 text-accent-danger" : activeProblem?.difficulty_level === "MEDIUM" ? "border-accent-warning/30 bg-accent-warning/10 text-accent-warning" : "border-accent-success/30 bg-accent-success/10 text-accent-success"}
                      `}
                        >
                          {activeProblem?.difficulty_level}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-subtle-line" />

                  {/* Problem Definition */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent-primary font-bold mb-2">
                      <AlignLeft className="w-3 h-3" /> PROBLEM DESCRIPTION
                    </div>
                    <div
                      className="problem-contain min-w-0 max-w-full break-words overflow-hidden text-sm leading-relaxed text-subtle font-sans [overflow-wrap:anywhere] [&>p]:mb-3 [&>ul]:ml-4 [&>ul]:list-disc [&>pre]:max-w-full [&>pre]:overflow-x-auto [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:rounded [&>pre]:bg-surface-hover [&>pre]:p-2 [&>code]:text-accent-primary [&>code]:break-words [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          activeProblem?.problem_definition || "No definition.",
                        ),
                      }}
                    />
                  </div>

                  {/* PROGRESSIVE HINTS & BLUEPRINT */}
                  <ProblemHintsAccordion hints={activeProblem?.problem_hints} />

                  {/* Examples already ship inside the problem statement — no separate render. */}
                  {activeProblem?.test_cases &&
                    activeProblem.test_cases.length > 0 && (
                      <div className="p-3 bg-accent-warning/10 border border-accent-warning/20 rounded text-center min-w-0">
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
                    <p className="text-[10px] font-mono font-bold text-accent-primary uppercase tracking-widest mb-3">
                      Opponent Status
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-subtle-line bg-raised/60 p-3">
                        <div className="text-[9px] text-faint uppercase tracking-widest">
                          Tests Passed
                        </div>
                        <div className="mt-1 text-lg font-mono font-bold text-fg">
                          {opponentTelemetry?.progress ?? 0}%
                        </div>
                      </div>
                      <div className="border border-subtle-line bg-raised/60 p-3">
                        <div className="text-[9px] text-faint uppercase tracking-widest">
                          Focus Alerts
                        </div>
                        <div className="mt-1 text-lg font-mono font-bold text-accent-warning">
                          —
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border border-accent-warning/20 bg-accent-warning/5 p-3">
                    <p className="text-[9px] font-mono text-accent-warning uppercase tracking-widest">
                      Telemetry Notice
                    </p>
                    <p className="mt-1 text-[10px] text-subtle">
                      Focus-loss details are reported after the match.
                    </p>
                  </div>
                </div>
              ) : activePanelTab === "MODERATOR" ? (
                <div className="flex flex-col gap-4">
                  <div className="border border-line bg-base/40 p-4">
                    <p className="mb-3 text-[10px] font-mono font-bold text-accent-warning uppercase tracking-widest">
                      Operatives ({roomParticipants.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {roomParticipants.length === 0 ? (
                        <p className="text-xs text-faint">
                          Waiting for operatives…
                        </p>
                      ) : (
                        roomParticipants.map((p: any) => {
                          const participantId = p.user?.id || p.userId;
                          const uname = p.user?.username || "Operative";
                          const intel = playerProgress[participantId];
                          const isMe = participantId === myUserId;
                          return (
                            <div
                              key={participantId}
                              className="flex items-center gap-3 rounded-lg border border-line-low bg-base/40 p-2.5"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-subtle-line bg-surface-hover font-mono text-[10px] font-bold text-fg">
                                {uname[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="truncate font-mono text-xs text-fg">
                                    {uname}
                                    {isMe ? " (you)" : ""}
                                  </span>
                                  {intel && (
                                    <span className="shrink-0 font-mono text-[9px] font-bold text-accent-primary">
                                      {intel.progress}%
                                    </span>
                                  )}
                                </div>
                                {intel && (
                                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-hover">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        intel.progress >= 100
                                          ? "bg-accent-success"
                                          : "bg-accent-primary"
                                      }`}
                                      style={{ width: `${intel.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              {!isMe && (
                                <button
                                  onClick={() => handleKickUser(participantId)}
                                  title={`Kick ${uname}`}
                                  className="shrink-0 border border-accent-danger/30 bg-accent-danger/15 p-1 text-accent-danger rounded transition-all hover:bg-accent-danger/20"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  {room?.closesAt && (
                    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-faint">
                      <Clock className="h-3.5 w-3.5" />
                      Scheduled close:{" "}
                      {new Date(room.closesAt).toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={handleHostEndMatch}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-danger/50 bg-accent-danger/15 py-2 font-mono text-xs font-bold uppercase tracking-widest text-accent-danger transition-all hover:bg-accent-danger/20"
                  >
                    <StopCircle className="h-3.5 w-3.5" /> TERMINATE MATCH
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                    {battleMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`px-3 py-2 rounded-xl max-w-[85%] font-mono text-sm ${msg.senderId === myUserIdRef.current ? "border-2 border-accent-primary/50 bg-raised/40 text-fg self-end" : "border-2 border-subtle-line/50 bg-raised/20 text-fg self-start"}`}
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
                      className="flex-1 border-2 border-subtle-line/50 bg-raised/30 p-3 rounded-lg text-fg font-mono text-xs placeholder:text-muted focus:border-accent focus:bg-raised focus:shadow-[0_0_0_2px_rgba(0,212,255,0.2)] outline-none transition-all"
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

        {/* `max-w-none` on this tab is load-bearing: it lives inside the
            width-controlled panel wrapper (0px when hidden), so the global
            `button { max-width: 100%; overflow: hidden }` would clamp it
            to 0px and crop the chevron. */}
        <button
          onClick={() => {
            const next = !(isPanelOpen && !isSidebarCollapsed);
            setIsPanelOpen(next);
            setIsSidebarCollapsed(!next);
            if (next && sidebarWidth < 220) setSidebarWidth(360);
          }}
          title={
            isPanelOpen && !isSidebarCollapsed
              ? "Collapse panel"
              : "Expand panel"
          }
          className={`absolute top-1/2 -translate-y-1/2 z-30 bg-raised border border-accent-primary/30 text-accent-primary p-2 rounded-r-lg hover:bg-accent-primary/20 hover:text-accent-primary transition-all shadow-[4px_0_15px_rgba(0,0,0,0.5)] left-full max-w-none`}
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
        <div className="flex items-center justify-between gap-3 border-b-2 border-subtle-line bg-raised px-2 py-1.5 font-mono text-[9px] z-30 shrink-0 sm:px-4 sm:text-xs sm:py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-accent-primary font-bold uppercase tracking-wider flex items-center gap-2 min-w-0">
              <Code className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="truncate">
                {activeProblem?.name || "BATTLE ARENA"}
              </span>
            </span>
            {problems.length > 1 && (
              <span className="text-[10px] text-faint border border-line bg-base/40 px-2 py-0.5 shrink-0">
                PROBLEM {currentIndex + 1} OF {problems.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <SoundToggle />
            <GlobalTimer
              startedAt={battleState.startedAt || room?.startedAt}
              totalDurationMs={
                battleState.totalDurationMs || room?.totalTimeLimitMs
              }
              onExpire={handleTimerExpire}
              label={problems.length > 1 ? "GLOBAL:" : "TIME LEFT:"}
              variant="pill"
            />
            {/* Host button shortcut in top bar */}
            {isHost && battleState.status === "IN_PROGRESS" && (
              <button
                onClick={() => {
                  setIsHostPanelOpen((v) => !v);
                  if (!isHostPanelOpen) {
                    void fetchBlockedParticipants();
                  }
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 border border-accent-warning/30 bg-accent-warning/10 text-accent-warning text-[8px] font-mono font-bold rounded hover:bg-accent-warning/20 transition-all sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[10px]"
              >
                <ShieldAlert className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> HOST
              </button>
            )}
            {/* Terminate group (host/admin) — ends the event for everyone */}
            {isHost &&
              problems.length > 1 &&
              battleState.status === "IN_PROGRESS" && (
                <button
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: "Terminate group battle?",
                      message:
                        "Terminate this group battle for everyone? Pending participants will be marked TIMEOUT.",
                      confirmLabel: "Terminate",
                      danger: true,
                      onConfirm: () =>
                        socket?.emit("terminate_group", { roomId }),
                    });
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 border border-accent-danger/40 bg-accent-danger/10 text-accent-danger text-[8px] font-mono font-bold rounded hover:bg-accent-danger/10 transition-all sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[10px]"
                >
                  <StopCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> END GROUP
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
          onSubmit={handleSubmitCode}
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

        {/* monaco editor — the grid clips and the output track is capped in CSS
            (see outputGridTemplateRows) so the split can never outgrow it */}
        <div
          className="grid min-h-0 flex-1 overflow-hidden"
          style={{ gridTemplateRows: outputGridTemplateRows(outputHeight) }}
        >
          {/* Cell 1 — editor track. No inline min-height: it sits in the
              minmax(200px,1fr) grid row and clips to the track instead of
              overflowing onto the output panel. */}
          <div className="h-full min-h-0 overflow-hidden">
            <MonacoIDE
              code={code}
              language={language}
              oid="battle-file"
              fileKey="battle"
              onCodeChange={handleCodeChange}
              handleRunCode={handleSubmitCode as any}
              onFormatMount={(formatAction) => {
                formatEditorRef.current = formatAction;
              }}
              isDisabled={
                countdown > 0 &&
                countdown <= 10 &&
                battleState.status === "IN_PROGRESS"
              }
              javaClassName={javaClassName}
            />
          </div>
          {/* Cell 2 — output track. Being the 2nd grid child bounds it by
              outputHeight, so the panel can never claim the editor's space. */}
          <OutputPanel
            isExecuting={isSubmitting}
            isOutputActive={isOutputActive}
            isCustomInputRun={isCustomInputRun}
            output={executionOutput}
            outputHeight={outputHeight}
            outputText={terminalOutput}
            testCases={buildProblemTestCases(activeProblem as any)}
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
      </div>
      {/* NOTES PANEL — per-problem tabs for multi-problem events, single scratchpad for 1v1 */}
      <NotesPanel
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        problems={
          problems.length > 1
            ? problems.map((p: any) => ({ id: p.id, name: p.name }))
            : undefined
        }
        activeProblemId={activeProblem?.id}
        eventId={room?.id}
      />
      {isBattleMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 backdrop-blur-sm p-4">
          <div
            ref={battleMenuRef}
            className="flex flex-col w-full max-w-lg max-h-[90vh] overflow-y-auto themed-scroll bg-raised border border-line rounded-2xl shadow-2xl relative"
          >
            {/* Accent bar */}
            <div
              className={`h-1.5 w-full bg-gradient-to-r ${
                battleResult === "WON"
                  ? "from-accent-primary to-accent-success"
                  : battleResult === "CHEATER"
                    ? "from-accent-pink to-accent-danger"
                    : "from-accent-danger to-accent-warning"
              }`}
            />

            <div className="p-6 sm:p-8">
              {/* Icon + Title */}
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className={`relative mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                    battleResult === "WON"
                      ? "bg-accent-primary/10 border-2 border-accent-primary/30"
                      : battleResult === "CHEATER"
                        ? "bg-accent-pink/10 border-2 border-accent-pink/30 animate-pulse"
                        : "bg-accent-danger/10 border-2 border-accent-danger/30"
                  }`}
                >
                  <div
                    className={`absolute inset-0 rounded-full blur-xl ${
                      battleResult === "WON"
                        ? "bg-accent-primary/20"
                        : battleResult === "CHEATER"
                          ? "bg-accent-pink/20"
                          : "bg-accent-danger/20"
                    }`}
                  />
                  {battleResult === "WON" ? (
                    <Trophy className="w-10 h-10 text-accent-primary relative z-10" />
                  ) : battleResult === "CHEATER" ? (
                    <ShieldAlert className="w-10 h-10 text-accent-pink relative z-10" />
                  ) : (
                    <Skull className="w-10 h-10 text-accent-danger relative z-10" />
                  )}
                </div>

                <h2
                  className={`font-mono text-xl sm:text-2xl font-bold tracking-widest mb-2 ${
                    battleResult === "WON"
                      ? "text-accent-primary"
                      : battleResult === "CHEATER"
                        ? "text-accent-pink"
                        : "text-accent-danger"
                  }`}
                >
                  {battleResult === "WON"
                    ? "OPERATION SUCCESSFUL"
                    : battleResult === "CHEATER"
                      ? "FLAGGED AS CHEATER"
                      : "SYSTEM FAILURE"}
                </h2>

                <p className="text-subtle text-sm font-sans max-w-sm">
                  {battleResult === "WON"
                    ? "You completed the operation."
                    : battleResult === "CHEATER"
                      ? "Excessive focus loss detected. Your opponent has been declared the winner."
                      : defeatReason === "opponent"
                        ? "Your opponent completed the problem first."
                        : defeatReason === "surrender"
                          ? "You surrendered the match."
                          : "Your time has run out."}
                </p>
              </div>

              {/* Per-participant verdicts */}
              <div className="w-full flex flex-col gap-2 mb-6">
                {roomParticipants?.map((p: any) => {
                  const verdict = participantVerdict(
                    p,
                    battleState?.status || room?.status,
                  );
                  const subs = p.submissions ?? [];
                  const passedCount = subs.filter(
                    (s: any) => (s.status || "").toUpperCase() === "PASSED",
                  ).length;
                  const bestRuntime = subs.reduce(
                    (m: number | null, s: any) =>
                      s.runtimeMs != null
                        ? Math.min(m ?? s.runtimeMs, s.runtimeMs)
                        : m,
                    null as number | null,
                  );
                  const isMe =
                    p.userId === myUserIdRef.current ||
                    p.user?.id === myUserIdRef.current;
                  const originalScore = p.score ?? 0;
                  const adjustedScore =
                    isMe && focusLossCount > 0
                      ? Math.floor(
                          originalScore * (1 - focusPenaltyPercent / 100),
                        )
                      : originalScore;
                  return (
                    <div
                      key={p.userId || p.user?.id || p.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border min-w-0 ${
                        isMe
                          ? "border-accent-primary/30 bg-accent-primary/5"
                          : "border-line bg-base/50"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-subtle-line bg-surface-hover font-mono text-xs font-bold text-fg">
                        {p.user?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold truncate ${isMe ? "text-accent-primary" : "text-fg"}`}
                          >
                            {p.user?.username || "Player"}
                            {isMe && (
                              <span className="ml-1 text-[8px] text-faint">
                                (you)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${verdictStyle(verdict)}`}
                          >
                            {verdict === "COMPLETED"
                              ? "✓ COMPLETED"
                              : verdict === "TIMEOUT"
                                ? "✗ TIMEOUT"
                                : "● IN PROGRESS"}
                          </span>
                          <span className="text-[9px] text-subtle font-mono">
                            {passedCount > 0 ? `${passedCount}/${subs.length}` : "0"} passed
                            {bestRuntime != null ? ` • ${bestRuntime}ms` : ""}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`text-[9px] font-mono shrink-0 ${isMe ? "text-accent-primary" : "text-subtle"}`}
                      >
                        {isMe && focusLossCount > 0
                          ? `${originalScore} → ${adjustedScore} (-${focusPenaltyPercent}%)`
                          : originalScore}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Focus Penalty Display */}
              {focusLossCount > 0 && (
                <div className="mb-4 p-4 rounded-lg border border-accent-warning/30 bg-accent-warning/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-accent-warning">
                      FOCUS PENALTY APPLIED
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border rounded ${penaltySeverity.tone}`}
                      >
                        {penaltySeverity.label}
                      </span>
                      <span className="font-mono text-lg font-bold text-accent-danger">
                        -{focusPenaltyPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="text-[9px] text-subtle font-mono">
                    {focusLossCount} focus loss{focusLossCount > 1 ? "es" : ""}{" "}
                    × {focusPenaltyPercent}% penalty on final score
                  </div>
                </div>
              )}

              {/* Event Analytics (compact view for participants) */}
              {eventAnalytics && (
                <div className="w-full mb-4 p-3 border border-line bg-base/40 rounded-lg">
                  <EventAnalytics analytics={eventAnalytics} compact />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  onClick={() => navigate("/")}
                  className="group w-full py-3 px-4 font-mono text-[10px] font-bold tracking-widest rounded-xl transition-all duration-200 sm:text-xs sm:py-3.5 bg-slate-900/80 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 shadow-sm flex items-center justify-center gap-2 sm:gap-2.5 active:scale-[0.98]"
                >
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  <span>RETURN TO MAINFRAME</span>
                </button>

                <button
                  onClick={() => setIsBattleMenuOpen(false)}
                  className="w-full py-2.5 px-4 font-mono text-[10px] font-semibold tracking-widest rounded-xl transition-all duration-200 sm:text-xs sm:py-3 bg-slate-900/40 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 flex items-center justify-center active:scale-[0.98]"
                >
                  CLOSE MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SURRENDER CONFIRMATION MODAL */} {/* SURRENDER CONFIRMATION MODAL */}
      {isSurrenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-3 sm:p-4">
          <div
            ref={surrenderModalRef}
            className="flex flex-col items-center justify-center p-5 sm:p-8 bg-raised border-2 border-accent-danger/50 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-200 ease-out"
          >
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-accent-danger via-accent-warning to-accent-danger animate-pulse" />
            <div className="absolute inset-0 bg-gradient-radial from-accent-danger/5 to-transparent rounded-2xl" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full bg-accent-danger/10 border-2 border-accent-danger/30 flex items-center justify-center mb-4 mx-auto">
                <Flag className="w-8 h-8 text-accent-danger" />
              </div>

              <h3 className="font-mono text-lg sm:text-xl font-black tracking-widest text-accent-danger mb-2 uppercase">
                MISSION ABORT CONFIRMATION
              </h3>
              <p className="text-subtle text-xs font-sans mb-6 leading-relaxed max-w-sm mx-auto">
                Forfeiting this operation will mark you as SURRENDERED. Your
                opponent will be declared the winner. This action cannot be
                undone.
              </p>

              <div className="flex items-center gap-2 sm:gap-3 w-full font-mono text-xs">
                <button
                  onClick={() => setIsSurrenderModalOpen(false)}
                  className="flex-1 py-2.5 sm:py-3 bg-surface-hover/80 hover:bg-surface-hover border border-subtle-line text-fg font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmSurrender}
                  className="flex-1 py-2.5 sm:py-3 bg-accent-danger/30 hover:bg-accent-danger/20 border-2 border-accent-danger/50 text-accent-danger font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(255,59,92,0.4)]"
                >
                  <span className="flex items-center justify-center gap-1">
                    <Flag className="w-3 h-3 fill-current" /> FORFEIT
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={
          confirmDialog.confirmLabel === "Kick & block" ||
          confirmDialog.confirmLabel === "Terminate" ||
          confirmDialog.confirmLabel === "End battle"
        }
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({
            ...confirmDialog,
            isOpen: false,
            onConfirm: null,
          });
        }}
      />
    </div>
  );
};

export default Battle;
