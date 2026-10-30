import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSocket } from "../../../context/SocketContext";
import MonacoIDE from "../../../features/terminal/components/MonacoIDE";
import EditorToolbar from "../../../features/terminal/components/EditorToolbar";
import OutputPanel from "../../../features/terminal/components/OutputPanel";
import {
  outputGridTemplateRows,
  useTerminalLayout,
} from "../../../features/terminal/hooks/useTerminalLayout";
import type { SupportedLanguage } from "../../../features/terminal/types";
import { executeCode } from "../../../features/terminal/api";
import { buildProblemTestCases } from "../../../features/terminal/executionOutput";
import { toast } from "sonner";
import {
  GlobalTimer,
  formatTime,
} from "../../../components/common/GlobalTimer";
import { api } from "../../../config/api";
import { NotesPanel, clearEventNotes } from "../../../components/ui/NotesPanel";
import {
  participantVerdict,
  verdictStyle,
} from "../../../utils/participantVerdict";
import { SoundToggle } from "../../../components/features/SoundToggle";
import { playBattleSound } from "../../../utils/battleSounds";
import {
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
   Flag,
  Code,
  Activity,
  Radio,
  Eye,
  AlignLeft,
  Home,
} from "lucide-react";
import { useFocusTelemetry } from "../../../hooks/useFocusTelemetry";
import {
  invalidateProblemQueries,
  invalidatePostBattleQueries,
} from "../../../utils/problemCache";
import DOMPurify from "dompurify";
import { useEventAnalytics } from "../../../hooks/useEventAnalytics";
import { EventAnalytics } from "../../../components/features/EventAnalytics";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Stat, MiniMetric } from "./StatTile";
import { CodePane } from "./CodePane";
import { PerformanceChart } from "./PerformanceChart";
import { ProblemHintsAccordion } from "./HintsAccordion";
import { SkeletonBox } from "../../../components/ui/Skeleton";

interface ParticipantLayoutProps {
  match: any;
  user: any;
  socket: any;
  isHost: boolean;
  roomParticipants: any[];
  problems: any[];
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  activeProblem: any;
   language: SupportedLanguage;
   setLanguage: (lang: SupportedLanguage) => void;
  code: string;
  setCode: (code: string) => void;
  isSubmitting: boolean;
  isOutputActive: boolean;
  isCustomInputRun: boolean;
  executionOutput: any;
  outputHeight: number;
  terminalOutput: string;
  customInput: string;
  customInputActive: boolean;
  runningTestCaseIndex: number;
  setCustomInput: (val: string) => void;
  setCustomInputActive: (val: boolean) => void;
  setIsOutputActive: (val: boolean) => void;
  handleRunCode: () => void;
  handleRunSingleTestCase: (tc: any) => void;
  handleResetCode: () => void;
   handleLanguageChange: (lang: SupportedLanguage) => void;
   handleCodeChange: (code: string) => void;
   handleHostEndMatch: () => void;
  setIsBattleMenuOpen: (val: boolean) => void;
  isBattleMenuOpen: boolean;
  handleSurrenderClick: () => void;
  battleState: any;
  handleTimerExpire: () => void;
  formatEditorRef: React.MutableRefObject<any>;
  handleSurrenderClickRef: React.MutableRefObject<any>;
  myUserIdRef: React.MutableRefObject<string>;
  focusLossCount: number;
  focusPenaltyPercent: number;
  penaltySeverity: any;
  handleUnblockParticipant: (id: string) => void;
  blockedParticipants: any[];
  setIsHostPanelOpen: (val: boolean) => void;
  isHostPanelOpen: boolean;
  fetchBlockedParticipants: () => void;
  eventAnalytics: any;
  joiningCode: string | null;
  setJoiningCode: (code: string | null) => void;
  navigate: (path: string) => void;
  pwModal: any;
  setPwModal: (val: any) => void;
  handlePasswordSubmit: (password: string) => void;
}

export function ParticipantLayout(props: ParticipantLayoutProps) {
  const {
    match,
    user,
    socket,
    isHost,
    roomParticipants,
    problems,
    currentIndex,
    setCurrentIndex,
    activeProblem,
    language,
    setLanguage,
    code,
    setCode,
    isSubmitting,
    isOutputActive,
    isCustomInputRun,
    executionOutput,
    outputHeight,
    terminalOutput,
    customInput,
    customInputActive,
    runningTestCaseIndex,
    setCustomInput,
    setCustomInputActive,
    setIsOutputActive,
    handleRunCode,
    handleRunSingleTestCase,
    handleResetCode,
    handleLanguageChange,
     handleCodeChange,
     handleHostEndMatch,
    setIsBattleMenuOpen,
    isBattleMenuOpen,
    handleSurrenderClick,
    battleState,
    handleTimerExpire,
    formatEditorRef,
    myUserIdRef,
    focusLossCount,
    focusPenaltyPercent,
    penaltySeverity,
    handleUnblockParticipant,
    blockedParticipants,
    setIsHostPanelOpen,
    isHostPanelOpen,
    fetchBlockedParticipants,
    eventAnalytics,
    joiningCode,
    setJoiningCode,
    navigate,
    pwModal,
    setPwModal,
    handlePasswordSubmit,
  } = props;

  const {
    sidebarWidth,
    setSidebarWidth,
    outputHeight: _outputHeight,
  } = useTerminalLayout();

  const navigateHome = () => navigate("/");
  const navigateProblems = () => navigate("/problems");

  // Derived state
  const me = match;
  const participants = match.event?.performances ?? [];
  const opponents = participants.filter(
    (p: any) => p.userId !== user?.id,
  );
  const mode =
    participants.length <= 1
      ? "solo"
      : participants.length === 2
        ? "1v1"
        : "multiplayer";
  const problem = match.event?.commonProblem ?? null;
  const problemName = problem?.name ?? "Practice session";
  const difficulty = problem?.difficulty_level ?? null;
  const difficultyTone =
    difficulty === "EASY"
      ? "text-accent-success bg-accent-success/[0.08]"
      : difficulty === "HARD"
        ? "text-accent-danger bg-accent-danger/[0.08]"
        : "text-accent-warning bg-accent-warning/[0.08]";

  const iWon =
    battleState.status === "FINISHED" &&
    ((match.status as string)?.toUpperCase() === "PASSED" ||
      (match?.submissions ?? []).some((s: any) => s.status === "PASSED"));

  const verdict =
    mode === "solo"
      ? {
          label: iWon ? "Solved" : "Unsolved",
          icon: iWon ? "Check" : "Gauge",
          tone: iWon ? "lime" : "rose",
        }
      : iWon
        ? { label: "Victory", icon: "Trophy", tone: "lime" }
        : { label: "Defeat", icon: "AlertTriangle", tone: "rose" };

  const modeLabel =
    mode === "solo"
      ? "solo solve"
      : mode === "1v1"
        ? "1v1 match"
        : `${participants.length}-player room`;

  const myBest =
    match.submissions?.find((s: any) => s.isBestSubmission) ?? null;
  const primaryOpponent = opponents[0] ?? null;
  const oppBest =
    primaryOpponent?.submissions?.find((s: any) => s.isBestSubmission) ?? null;

  return (
    <div className="flex w-full text-fg font-mono">
      {/* ── TOP HEADER BAR ── */}
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
            startedAt={battleState.startedAt || match?.startedAt}
            totalDurationMs={
              battleState.totalDurationMs || match?.totalTimeLimitMs
            }
            onExpire={handleTimerExpire}
            label={problems.length > 1 ? "GLOBAL:" : "TIME LEFT:"}
            variant="pill"
          />
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300 min-w-0">
        {/* editor + output split */}
        <div
          className="grid min-h-0 flex-1 overflow-hidden"
          style={{ gridTemplateRows: outputGridTemplateRows(outputHeight) }}
        >
          <div className="h-full min-h-0 overflow-hidden">
            <MonacoIDE
              code={code}
              language={language}
              oid="battle-file"
              fileKey="battle"
              onCodeChange={handleCodeChange}
              handleRunCode={handleRunCode as any}
              onFormatMount={(formatAction: any) => {
                formatEditorRef.current = formatAction;
              }}
              isDisabled={
                focusLossCount > 0 &&
                focusLossCount <= 10 &&
                battleState.status === "IN_PROGRESS"
              }
              javaClassName={undefined}
            />
          </div>
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
            onResizeStart={() => {}}
            setOutputHeight={() => {}}
            setCustomInput={setCustomInput}
            setCustomInputActive={setCustomInputActive}
            setIsOutputActive={setIsOutputActive}
            onRunSingleTestCase={handleRunSingleTestCase}
          />
        </div>

        {/* NOTES PANEL */}
        <NotesPanel
          isOpen={false}
          onClose={() => {}}
          problems={
            problems.length > 1
              ? problems.map((p: any) => ({ id: p.id, name: p.name }))
              : undefined
          }
          activeProblemId={activeProblem?.id}
          eventId={match?.id}
        />
      </div>

      {/* BATTLE RESULT OVERLAY (shown after match ends) */}
      {battleState.status === "FINISHED" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-base/60 backdrop-blur-[2px] pointer-events-none p-4">
          <div className="flex flex-col items-center justify-center p-8 bg-raised border border-line rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden pointer-events-auto max-h-[90vh] overflow-y-auto themed-scroll">
            <div
              className={`absolute top-0 w-full h-1 bg-gradient-to-r ${
                iWon
                  ? "from-accent-primary to-accent-success"
                  : "from-accent-danger to-accent-warning"
              }`}
            />
            <div className="relative mb-6">
              <div
                className={`absolute inset-0 blur-xl ${
                  iWon ? "bg-accent-primary/30" : "bg-accent-danger/30"
                }`}
              />
              {iWon ? (
                <Trophy className="w-16 h-16 text-accent-primary relative z-10" />
              ) : (
                <Skull className="w-16 h-16 text-accent-danger relative z-10" />
              )}
            </div>
            <h2
              className={`font-mono text-2xl font-bold tracking-widest mb-3 ${
                iWon ? "text-accent-primary" : "text-accent-danger"
              }`}
            >
              {iWon ? "OPERATION SUCCESSFUL" : "SYSTEM FAILURE"}
            </h2>
            <p className="text-subtle text-sm mb-4 font-sans">
              {iWon
                ? "You completed the operation."
                : "You failed to crack this problem in time."}
            </p>
            <button
              onClick={navigateProblems}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-primary px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-fg"
            >
              <Code className="w-4 h-4" /> Practice more problems
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
