import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Timer as TimerIcon, History, Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";

interface ProblemTimerProps {
  problemId?: string | null;
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
    const [submissionTimes, setSubmissionTimes] = useState<string[]>(initialSubmissionTimes);
    const [showDropdown, setShowDropdown] = useState(false);

    const secondsRef = useRef(0);
    useEffect(() => {
      secondsRef.current = seconds;
    }, [seconds]);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => formatTime(secondsRef.current),
    }));

    useEffect(() => {
      setSeconds(0);
      secondsRef.current = 0;
      setIsRunning(true);
      setSubmissionTimes(initialSubmissionTimes);
      setShowDropdown(false);
    }, [problemId]);

    useEffect(() => {
      setSubmissionTimes(initialSubmissionTimes);
    }, [JSON.stringify(initialSubmissionTimes)]);

    useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isRunning) {
        interval = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isRunning]);

    useEffect(() => {
      if (submissionTrigger > 0) {
        const captured = formatTime(secondsRef.current);
        setSubmissionTimes((prev) => [...prev, captured]);
        setShowDropdown(true);
      }
    }, [submissionTrigger]);

    if (!problemId) return null;

    const timeStr = formatTime(seconds);
    const isDanger = seconds > 0 && seconds % 60 === 0 && seconds >= 300; // Pulse every 5 minutes

    return (
      <div className="relative flex items-center gap-2 bg-base/80 border border-subtle-line/50 rounded-xl px-3 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-accent-primary">
          <TimerIcon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono tabular-nums text-fg min-w-[36px] text-center select-none">
            {timeStr}
          </span>
        </div>

        <div className="flex items-center border-l border-subtle-line/50 pl-2 ml-1 gap-1">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="rounded-lg p-1.5 text-faint hover:text-accent-primary hover:bg-accent-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            title={isRunning ? "Pause timer" : "Resume timer"}
            aria-label={isRunning ? "Pause timer" : "Resume timer"}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => { setSeconds(0); secondsRef.current = 0; }}
            className="rounded-lg p-1.5 text-faint hover:text-accent-danger hover:bg-accent-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger"
            title="Reset timer"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`rounded-lg p-1.5 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
              submissionTimes.length > 0
                ? "text-accent-primary hover:bg-accent-primary/10"
                : "text-faint cursor-not-allowed opacity-50"
            }`}
            title={submissionTimes.length > 0 ? "Submission history" : "No submissions yet"}
            disabled={submissionTimes.length === 0}
            aria-label={submissionTimes.length > 0 ? "Toggle submission history" : "No submissions recorded"}
          >
            <History className="w-3.5 h-3.5" />
            {submissionTimes.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[7px] font-bold text-black animate-bounce-in">
                {submissionTimes.length > 9 ? "9+" : submissionTimes.length}
              </span>
            )}
          </button>
        </div>

        {showDropdown && submissionTimes.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-60 bg-base border border-accent-primary/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 rounded-xl overflow-hidden animate-slide-down">
            <div className="flex items-center justify-between border-b border-subtle-line/50 px-3 py-2 bg-accent-primary/5">
              <span className="text-[9px] uppercase tracking-widest text-accent-primary font-bold">SUBMISSION HISTORY</span>
              <span className="text-[10px] text-faint">{submissionTimes.length} total</span>
            </div>
            <ul className="max-h-48 overflow-y-auto space-y-1 p-2">
              {submissionTimes.map((time, idx) => (
                <li
                  key={idx}
                  className="flex justify-between items-center text-[10px] font-mono text-subtle hover:text-fg hover:bg-surface-hover/50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <span className="text-faint">Attempt #{idx + 1}</span>
                  <span className="text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded font-bold tabular-nums">{time}</span>
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