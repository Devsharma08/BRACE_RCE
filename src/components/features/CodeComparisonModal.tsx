import React, { useState, useEffect } from "react";
import { Trophy, Copy, Check } from "lucide-react";

interface Submission {
  id: string;
  attemptNumber: number;
  submittedCode: string;
  language: string;
  status: string;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  passedCase: number;
  totalCases: number;
  isBestSubmission: boolean;
}

interface PerformanceData {
  userId: string;
  user: { id: string; username: string; avatarUrl: string };
  submissions: Submission[];
  score: number;
  timeTakenMs?: number | null;
}

interface CodeComparisonModalProps {
  currentUserId: string;
  performances: PerformanceData[];
  onClose: () => void;
  onReturnHome: () => void;
}

const getEffectiveSubmissions = (perf: PerformanceData | undefined): Submission[] => {
  if (!perf) return [];
  if (perf.submissions && perf.submissions.length > 0) {
    return perf.submissions;
  }
  const code = (perf as any).submittedCode || (perf as any).code || (perf as any).sourceCode;
  return [{
    id: perf.userId || "sub-1",
    attemptNumber: 1,
    submittedCode: code || "// Code submission recorded",
    language: (perf as any).language || "javascript",
    status: (perf as any).status || "COMPLETED",
    runtimeMs: perf.timeTakenMs || null,
    memoryKb: null,
    passedCase: (perf as any).status === "WON" || (perf as any).status === "PASSED" ? 1 : 0,
    totalCases: 1,
    isBestSubmission: true
  }];
};

export const CodeComparisonModal: React.FC<CodeComparisonModalProps> = ({
  currentUserId,
  performances = [],
  onClose,
  onReturnHome
}) => {
  const myPerf = performances.find(p => p.userId === currentUserId) || performances[0];
  const oppPerf = performances.find(p => p.userId !== currentUserId) || (performances.length > 1 ? performances[1] : undefined);

  const mySubmissions = getEffectiveSubmissions(myPerf);
  const oppSubmissions = getEffectiveSubmissions(oppPerf);

  const myBestSub = mySubmissions.find(s => s.isBestSubmission) || mySubmissions[0];
  const oppBestSub = oppSubmissions.find(s => s.isBestSubmission) || oppSubmissions[0];

  const [selectedMySub, setSelectedMySub] = useState<Submission | undefined>(myBestSub);
  const [selectedOppSub, setSelectedOppSub] = useState<Submission | undefined>(oppBestSub);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedMySub(myBestSub);
    setSelectedOppSub(oppBestSub);
  }, [performances, currentUserId]);

  // Escape closes the review dialog, matching the rest of the app's modals.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleCopyOpponentCode = () => {
    if (!selectedOppSub?.submittedCode) return;
    navigator.clipboard.writeText(selectedOppSub.submittedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
  role="dialog"
  aria-modal="true"
  aria-label="Code comparison review"
  className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
>
  <div className="bg-surface border border-accent-primary/30 rounded-card w-full max-w-6xl shadow-panel overflow-hidden flex flex-col max-h-[90vh]">
    <div className="p-6 border-b border-subtle-line bg-surface-hover flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-mono font-bold text-accent-primary tracking-widest flex items-center gap-2">
              <Trophy className="w-6 h-6 text-accent-warning" /> BATTLE ANALYSIS & CODE REVIEW
            </h2>
            <p className="text-subtle text-xs font-sans mt-1">
              Compare approaches, execution runtimes, and learn from opponent's optimal code.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-subtle-line bg-surface hover:bg-elevated text-subtle font-mono text-xs font-bold rounded-lg transition-all"
            >
              [ CLOSE REVIEW ]
            </button>
            <button
              onClick={onReturnHome}
              className="px-4 py-2 border border-accent-primary/50 bg-accent-primary/10 hover:bg-accent-primary text-accent-primary font-mono text-xs font-bold rounded-lg transition-all"
            >
              [ MAINFRAME ]
            </button>
          </div>
        </div>

        {/* COMPARATIVE CARDS */}
        <div className="grid grid-cols-2 gap-6 p-6 border-b border-subtle-line bg-surface-hover">
          {/* MY METRICS */}
          <div className="bg-surface-hover border border-accent-primary/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-accent-primary flex items-center gap-2">
                YOUR SUBMISSION {selectedMySub?.isBestSubmission && <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded">BEST</span>}
              </span>
              {/* Attempt Selector */}
              <select
                value={selectedMySub?.id}
                onChange={(e) => setSelectedMySub(mySubmissions.find(s => s.id === e.target.value))}
                className="bg-base border border-subtle-line text-subtle text-xs rounded px-2 py-1 font-mono"
              >
                {mySubmissions.map(s => (
                  <option key={s.id} value={s.id}>
                    Attempt #{s.attemptNumber} {s.isBestSubmission ? "(Best)" : ""} - {s.passedCase}/{s.totalCases}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-surface-hover p-2 rounded">
                <span className="text-faint block text-[10px]">AVG RUNTIME</span>
                <span className="text-accent-primary font-bold">{selectedMySub?.runtimeMs !== undefined && selectedMySub?.runtimeMs !== null ? `${selectedMySub.runtimeMs} ms` : "N/A"}</span>
              </div>
              <div className="bg-surface-hover p-2 rounded">
                <span className="text-faint block text-[10px]">AVG MEMORY</span>
                <span className="text-accent-primary font-bold">{selectedMySub?.memoryKb ? (selectedMySub.memoryKb >= 1024 ? `${(selectedMySub.memoryKb / 1024).toFixed(1)} MB` : `${selectedMySub.memoryKb} KB`) : "N/A"}</span>
              </div>
              <div className="bg-surface-hover p-2 rounded">
                <span className="text-faint block text-[10px]">TEST CASES</span>
                <span className="text-accent-success font-bold">{selectedMySub?.passedCase}/{selectedMySub?.totalCases}</span>
              </div>
            </div>
          </div>

          {/* OPPONENT METRICS */}
          <div className="bg-surface-hover border border-accent-danger/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-accent-danger flex items-center gap-2">
                OPPONENT ({oppPerf?.user?.username || "OPPONENT"}) {selectedOppSub?.isBestSubmission && <span className="text-[10px] bg-accent-danger/20 text-accent-danger px-2 py-0.5 rounded">BEST</span>}
              </span>
              {/* Attempt Selector */}
              <select
                value={selectedOppSub?.id}
                onChange={(e) => setSelectedOppSub(oppSubmissions.find(s => s.id === e.target.value))}
                className="bg-base border border-subtle-line text-subtle text-xs rounded px-2 py-1 font-mono"
              >
                {oppSubmissions.map(s => (
                  <option key={s.id} value={s.id}>
                    Attempt #{s.attemptNumber} {s.isBestSubmission ? "(Best)" : ""} - {s.passedCase}/{s.totalCases}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-surface-hover p-2 rounded">
                <span className="text-faint block text-[10px]">AVG RUNTIME</span>
                <span className="text-accent-danger font-bold">{selectedOppSub?.runtimeMs !== undefined && selectedOppSub?.runtimeMs !== null ? `${selectedOppSub.runtimeMs} ms` : "N/A"}</span>
              </div>
              <div className="bg-surface-hover p-2 rounded">
                <span className="text-faint block text-[10px]">AVG MEMORY</span>
                <span className="text-accent-danger font-bold">{selectedOppSub?.memoryKb ? (selectedOppSub.memoryKb >= 1024 ? `${(selectedOppSub.memoryKb / 1024).toFixed(1)} MB` : `${selectedOppSub.memoryKb} KB`) : "N/A"}</span>
              </div>
              <div className="bg-surface-hover p-2 rounded">
                <span className="text-faint block text-[10px]">TEST CASES</span>
                <span className="text-accent-success font-bold">{selectedOppSub?.passedCase}/{selectedOppSub?.totalCases}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE BY SIDE CODE VIEW */}
        <div className="grid grid-cols-2 gap-4 p-6 flex-1 min-h-0 overflow-hidden">
          {/* MY CODE */}
          <div className="flex flex-col border border-accent-primary/20 rounded-xl bg-surface-hover overflow-hidden">
            <div className="px-4 py-2 bg-accent-primary/10 border-b border-accent-primary/20 font-mono text-xs text-accent-primary font-bold">
              YOUR CODE ({selectedMySub?.language || "javascript"})
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-fg leading-relaxed scrollbar-hide">
              {selectedMySub?.submittedCode || "// No submission recorded"}
            </pre>
          </div>

          {/* OPPONENT CODE */}
          <div className="flex flex-col border border-accent-danger/20 rounded-xl bg-surface-hover overflow-hidden relative">
            <div className="px-4 py-2 bg-accent-danger/10 border-b border-accent-danger/20 font-mono text-xs text-accent-danger font-bold flex justify-between items-center">
              <span>OPPONENT CODE ({selectedOppSub?.language || "javascript"})</span>
              <button
                onClick={handleCopyOpponentCode}
                className="text-[10px] bg-surface-hover hover:bg-surface-hover text-fg px-2 py-1 rounded flex items-center gap-1 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-accent-success" /> : <Copy className="w-3 h-3" />}
                {copied ? "COPIED" : "COPY CODE"}
              </button>
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-fg leading-relaxed scrollbar-hide">
              {selectedOppSub?.submittedCode || "// No submission recorded"}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};
