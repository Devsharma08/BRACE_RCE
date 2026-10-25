import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { GlobalTimer } from "../../../components/common/GlobalTimer";
import { api } from "../../../config/api";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Stat } from "./StatTile";
import { CodePane } from "./CodePane";
import { PerformanceChart } from "./PerformanceChart";
import { ProblemHintsAccordion } from "./HintsAccordion";
import { Trophy, Skull, StopCircle, Clock, Code,X } from "lucide-react";



interface ModeratorLayoutProps {
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
  setLanguage: (lang: string) => void;
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
  handleLanguageChange: (lang: string) => void;
  handleCodeChange: (code: string) => void;
  handleHostEndMatch: () => void;
  setIsBattleMenuOpen: (val: boolean) => void;
  isBattleMenuOpen: boolean;
  handleSurrenderClick: () => void;
  battleState: any;
  handleTimerExpire: () => void;
  formatEditorRef: React.MutableRefObject<any>;
  myUserIdRef: React.MutableRefObject<string>;
  eventAnalytics: any;
  navigate: (path: string) => void;
  pwModal: any;
  setPwModal: (val: any) => void;
  handlePasswordSubmit: (password: string) => void;
  confirmDialog: any;
  setConfirmDialog: (val: any) => void;
  handleKickUser: (id: string) => void;
  playerProgress: Record<string, { status: string; progress: number }>;
}

export function ModeratorLayout(props: ModeratorLayoutProps) {
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
    eventAnalytics,
    navigate,
    pwModal,
    setPwModal,
    handlePasswordSubmit,
    confirmDialog,
    setConfirmDialog,
    handleKickUser,
    playerProgress,
  } = props;

  const navigateHome = () => navigate("/");

  const me = match;
  const opponents = (match.event?.performances ?? []).filter(
    (p: any) => p.userId !== user?.id,
  );

  const iWon =
    battleState.status === "FINISHED" &&
    ((match.status as string)?.toUpperCase() === "PASSED" ||
      (match?.submissions ?? []).some((s: any) => s.status === "PASSED"));

  const primaryOpponent = opponents[0] ?? null;
  const oppBest =
    primaryOpponent?.submissions?.find((s: any) => s.isBestSubmission) ?? null;

  return (
    <div className="flex w-full text-fg font-mono">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-subtle-line bg-raised px-2 py-1.5 font-mono text-[9px] z-30 shrink-0 sm:px-4 sm:text-xs sm:py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-accent-primary font-bold uppercase tracking-wider flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-accent-warning animate-pulse" />
            HOST
          </span>
          <span className="text-[10px] text-faint border border-line bg-base/40 px-2 py-0.5 shrink-0">
            MODERATOR PANEL
          </span>
        </div>

        <div className="flex items-center gap-3">
          <GlobalTimer
            startedAt={battleState.startedAt || match?.startedAt}
            totalDurationMs={
              battleState.totalDurationMs || match?.totalTimeLimitMs
            }
            onExpire={handleTimerExpire}
            label="GLOBAL:"
            variant="pill"
          />
          <button
            onClick={() => {
              setConfirmDialog({
                isOpen: true,
                title: "Terminate match?",
                message:
                  "Terminate this match for everyone? Pending participants will be marked TIMEOUT.",
                confirmLabel: "Terminate",
                danger: true,
                onConfirm: () =>
                  socket?.emit("terminate_group", { roomId: match?.id }),
              });
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 border border-accent-danger/40 bg-accent-danger/10 text-accent-danger text-[8px] font-mono font-bold rounded hover:bg-accent-danger/10 transition-all sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[10px]"
          >
            <StopCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> END GROUP
          </button>
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
              onFormatMount={() => {}}
              isDisabled={false}
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
            onRunSingleTestCase={() => {}}
          />
        </div>
      </div>

      {/* MODERATOR PARTICIPANT PANEL */}
      <div className="border-l border-subtle-line bg-raised/80 w-full max-w-[320px] h-full">
        <div className="px-4 py-4 border-b border-subtle-line">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent-warning mb-4">
            OPERATIVES ({roomParticipants.length})
          </h3>
          <div className="flex flex-col gap-2">
            {roomParticipants.length === 0 ? (
              <p className="text-xs text-faint">Waiting for operatives…</p>
            ) : (
              roomParticipants.map((p: any) => {
                const participantId = p.user?.id || p.userId;
                const uname = p.user?.username || "Operative";
                const intel = playerProgress[participantId];
                const isMe = participantId === user?.id;
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

        <div className="px-4 py-4">
          {match?.closesAt && (
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-faint mb-4">
              <Clock className="h-3.5 w-3.5" />
              Scheduled close: {new Date(match.closesAt).toLocaleString()}
            </p>
          )}
          <button
            onClick={handleHostEndMatch}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-danger/50 bg-accent-danger/15 py-2 font-mono text-xs font-bold uppercase tracking-widest text-accent-danger transition-all hover:bg-accent-danger/20"
          >
            <StopCircle className="w-3.5 h-3.5" /> TERMINATE MATCH
          </button>
        </div>
      </div>

      {/* BATTLE RESULT OVERLAY */}
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
              {iWon ? "You completed the operation." : "Match terminated."}
            </p>
            <button
              onClick={() => navigate("/problems")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-primary px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-fg"
            >
              <Code className="w-4 h-4" /> Practice more problems
            </button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          danger={confirmDialog.confirmLabel === "Terminate"}
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
      )}
    </div>
  );
}
