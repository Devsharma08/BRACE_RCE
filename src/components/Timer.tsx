import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isActive?: boolean;
  className?: string;
}

export const Timer: React.FC<TimeProps> = ({
  initialSeconds,
  isActive,
  className,
  onTimeUp,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isActive, timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  // pulse red when under 1 min
  const isDanger = timeLeft < 60 && timeLeft > 0;

  return (
    <div
      className={`flex items-center gap-2 font-mono font-bold tracking-widest transition-colors ${isDanger ? "text-rose-500 animate-pulse" : "text-white"} ${className}`}
    >
      <Clock className="w-4 h-4 opacity-70" />
      <span>
        {minutes}:{seconds}
      </span>
    </div>
  );
};
