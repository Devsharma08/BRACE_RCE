import React, { useState } from "react";
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

export const CodeComparisonModal: React.FC<CodeComparisonModalProps> = ({
  currentUserId,
  performances,
  onClose,
  onReturnHome
}) => {
  const myPerf = performances.find(p => p.userId === currentUserId) || performances[0];
  const oppPerf = performances.find(p => p.userId !== currentUserId) || performances[1];

  // Selected submission states (defaults to best submission)
  const myBestSub = myPerf?.submissions.find(s => s.isBestSubmission) || myPerf?.submissions[0];
  const oppBestSub = oppPerf?.submissions.find(s => s.isBestSubmission) || oppPerf?.submissions[0];

  const [selectedMySub, setSelectedMySub] = useState<Submission | undefined>(myBestSub);
  const [selectedOppSub, setSelectedOppSub] = useState<Submission | undefined>(oppBestSub);
  const [copied, setCopied] = useState(false);

  const handleCopyOpponentCode = () => {
    if (!selectedOppSub?.submittedCode) return;
    navigator.clipboard.writeText(selectedOppSub.submittedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 overflow-y-auto">
      <div className="bg-[#0a0b0e] border border-cyan-500/30 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* TOP METRICS HEADER */}
        <div className="p-6 border-b border-cyan-500/20 bg-black/60 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-mono font-bold text-cyan-400 tracking-widest flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> BATTLE ANALYSIS & CODE REVIEW
            </h2>
            <p className="text-slate-400 text-xs font-sans mt-1">
              Compare approaches, execution runtimes, and learn from opponent's optimal code.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-lg transition-all"
            >
              [ CLOSE REVIEW ]
            </button>
            <button
              onClick={onReturnHome}
              className="px-4 py-2 border border-cyan-500/50 bg-cyan-900/40 hover:bg-cyan-600 text-cyan-100 font-mono text-xs font-bold rounded-lg transition-all"
            >
              [ MAINFRAME ]
            </button>
          </div>
        </div>

        {/* COMPARATIVE CARDS */}
        <div className="grid grid-cols-2 gap-6 p-6 border-b border-white/5 bg-black/30">
          {/* MY METRICS */}
          <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-cyan-400 flex items-center gap-2">
                YOUR SUBMISSION {selectedMySub?.isBestSubmission && <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">BEST</span>}
              </span>
              {/* Attempt Selector */}
              <select
                value={selectedMySub?.id}
                onChange={(e) => setSelectedMySub(myPerf.submissions.find(s => s.id === e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 font-mono"
              >
                {myPerf?.submissions.map(s => (
                  <option key={s.id} value={s.id}>
                    Attempt #{s.attemptNumber} {s.isBestSubmission ? "(Best)" : ""} - {s.passedCase}/{s.totalCases}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-white/5 p-2 rounded">
                <span className="text-slate-500 block text-[10px]">RUNTIME</span>
                <span className="text-cyan-300 font-bold">{selectedMySub?.runtimeMs ? `${selectedMySub.runtimeMs} ms` : "N/A"}</span>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <span className="text-slate-500 block text-[10px]">MEMORY</span>
                <span className="text-cyan-300 font-bold">{selectedMySub?.memoryKb ? `${(selectedMySub.memoryKb / 1024).toFixed(1)} MB` : "N/A"}</span>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <span className="text-slate-500 block text-[10px]">TEST CASES</span>
                <span className="text-emerald-400 font-bold">{selectedMySub?.passedCase}/{selectedMySub?.totalCases}</span>
              </div>
            </div>
          </div>

          {/* OPPONENT METRICS */}
          <div className="bg-black/50 border border-rose-500/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-rose-400 flex items-center gap-2">
                OPPONENT ({oppPerf?.user.username || "OPPONENT"}) {selectedOppSub?.isBestSubmission && <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">BEST</span>}
              </span>
              {/* Attempt Selector */}
              <select
                value={selectedOppSub?.id}
                onChange={(e) => setSelectedOppSub(oppPerf.submissions.find(s => s.id === e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 font-mono"
              >
                {oppPerf?.submissions.map(s => (
                  <option key={s.id} value={s.id}>
                    Attempt #{s.attemptNumber} {s.isBestSubmission ? "(Best)" : ""} - {s.passedCase}/{s.totalCases}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-white/5 p-2 rounded">
                <span className="text-slate-500 block text-[10px]">RUNTIME</span>
                <span className="text-rose-300 font-bold">{selectedOppSub?.runtimeMs ? `${selectedOppSub.runtimeMs} ms` : "N/A"}</span>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <span className="text-slate-500 block text-[10px]">MEMORY</span>
                <span className="text-rose-300 font-bold">{selectedOppSub?.memoryKb ? `${(selectedOppSub.memoryKb / 1024).toFixed(1)} MB` : "N/A"}</span>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <span className="text-slate-500 block text-[10px]">TEST CASES</span>
                <span className="text-emerald-400 font-bold">{selectedOppSub?.passedCase}/{selectedOppSub?.totalCases}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE BY SIDE CODE VIEW */}
        <div className="grid grid-cols-2 gap-4 p-6 flex-1 min-h-0 overflow-hidden">
          {/* MY CODE */}
          <div className="flex flex-col border border-cyan-500/20 rounded-xl bg-black/60 overflow-hidden">
            <div className="px-4 py-2 bg-cyan-950/30 border-b border-cyan-500/20 font-mono text-xs text-cyan-400 font-bold">
              YOUR CODE ({selectedMySub?.language || "javascript"})
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-slate-200 leading-relaxed scrollbar-hide">
              {selectedMySub?.submittedCode || "// No submission recorded"}
            </pre>
          </div>

          {/* OPPONENT CODE */}
          <div className="flex flex-col border border-rose-500/20 rounded-xl bg-black/60 overflow-hidden relative">
            <div className="px-4 py-2 bg-rose-950/30 border-b border-rose-500/20 font-mono text-xs text-rose-400 font-bold flex justify-between items-center">
              <span>OPPONENT CODE ({selectedOppSub?.language || "javascript"})</span>
              <button
                onClick={handleCopyOpponentCode}
                className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded flex items-center gap-1 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "COPIED" : "COPY CODE"}
              </button>
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-slate-200 leading-relaxed scrollbar-hide">
              {selectedOppSub?.submittedCode || "// No submission recorded"}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};
