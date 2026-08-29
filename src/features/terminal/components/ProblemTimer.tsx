import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Timer, History, Play, Pause, RotateCcw } from "lucide-react";

interface ProblemTimerProps {
  problemId: string | null;
  submissionTrigger: number;
  initialSubmissionTimes?: string[];
}

export interface ProblemTimerRef {
  getCurrentTime: () => string;
}

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const ProblemTimer = forwardRef<ProblemTimerRef, ProblemTimerProps>(
  ({ problemId, submissionTrigger, initialSubmissionTimes = [] }, ref) => {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(true);
    // Pre-populate from DB on mount / problem change
    const [submissionTimes, setSubmissionTimes] = useState<string[]>(initialSubmissionTimes);
    const [showDropdown, setShowDropdown] = useState(false);

    // Keep a ref to seconds so the submission-capture effect always reads fresh value
    const secondsRef = useRef(0);
    useEffect(() => {
      secondsRef.current = seconds;
    }, [seconds]);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => formatTime(secondsRef.current),
    }));

    // Reset timer when problem changes and load persisted history from DB
    useEffect(() => {
      setSeconds(0);
      secondsRef.current = 0;
      setIsRunning(true);
      setSubmissionTimes(initialSubmissionTimes);
      setShowDropdown(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problemId]);

    // Sync initialSubmissionTimes when a problem's history changes (e.g. after first load)
    useEffect(() => {
      setSubmissionTimes(initialSubmissionTimes);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initialSubmissionTimes)]);

    // Tick
    useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isRunning) {
        interval = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isRunning]);

    // Capture submission time using the ref (no stale closure issue)
    useEffect(() => {
      if (submissionTrigger > 0) {
        const captured = formatTime(secondsRef.current);
        setSubmissionTimes((prev) => [...prev, captured]);
        setShowDropdown(true);
      }
    }, [submissionTrigger]);

    if (!problemId) return null;

    return (
      <div className="relative flex items-center bg-black/40 border border-white/10 px-2 py-1 gap-2 ml-2">
        <Timer className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-mono text-slate-300 min-w-[36px] text-center select-none">
          {formatTime(seconds)}
        </span>

        <div className="flex items-center border-l border-white/10 pl-1 ml-1 gap-1">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="text-slate-500 hover:text-cyan-400 p-0.5 transition-colors"
            title={isRunning ? "Pause" : "Resume"}
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => { setSeconds(0); secondsRef.current = 0; }}
            className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`p-0.5 transition-colors relative ${
              submissionTimes.length > 0
                ? "text-cyan-400 hover:text-cyan-300"
                : "text-slate-600 cursor-not-allowed"
            }`}
            title="Submission Queue Analysis"
            disabled={submissionTimes.length === 0}
          >
            <History className="w-3 h-3" />
            {submissionTimes.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-cyan-500 text-[7px] font-bold text-black">
                {submissionTimes.length}
              </span>
            )}
          </button>
        </div>

        {showDropdown && submissionTimes.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-slate-950 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,0,0,0.8)] z-50 p-2">
            <div className="text-[9px] uppercase tracking-widest text-cyan-500 mb-2 border-b border-white/10 pb-1 flex justify-between items-center">
              <span>SUBMISSION QUEUE ANALYSIS</span>
              <span className="text-slate-600">{submissionTimes.length} total</span>
            </div>
            <ul className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 pr-1">
              {submissionTimes.map((time, idx) => (
                <li
                  key={idx}
                  className="flex justify-between items-center text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/5 px-1 py-1 transition-colors"
                >
                  <span className="text-slate-500">Attempt #{idx + 1}</span>
                  <span className="text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded">{time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

export default ProblemTimer;
