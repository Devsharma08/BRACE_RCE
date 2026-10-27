import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface TimeProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isActive?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showIcon?: boolean;
}

export const Timer: React.FC<TimeProps> = ({
  initialSeconds,
  isActive,
  className,
  onTimeUp,
  variant = 'default',
  showIcon = true,
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

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  const isExpired = timeLeft <= 0;
  const isCritical = timeLeft > 0 && timeLeft <= 10;
  const isWarning = timeLeft > 10 && timeLeft <= 60;

  const getStyles = () => {
    if (isExpired) {
      return { color: "text-accent-danger", iconColor: "text-accent-danger", pulse: false };
    }
    if (isCritical) {
      return { color: "text-accent-danger", iconColor: "text-accent-danger animate-pulse", pulse: true };
    }
    if (isWarning) {
      return { color: "text-accent-warning", iconColor: "text-accent-warning animate-pulse", pulse: true };
    }
    return { color: "text-accent-success", iconColor: "text-accent-success", pulse: false };
  };

  const styles = getStyles();

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 font-mono font-bold tracking-widest transition-colors ${styles.color} ${className}`}>
        {showIcon && <Clock className={`w-3.5 h-3.5 ${styles.iconColor} ${styles.pulse ? 'animate-pulse' : ''}`} />}
        <span className="text-[11px] uppercase tracking-widest">{minutes}:{seconds}</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <span className={`font-mono font-bold tracking-widest transition-colors ${styles.color} ${className}`}>
        {minutes}:{seconds}
      </span>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center gap-2 font-mono font-bold tracking-widest transition-colors ${styles.color} ${styles.pulse ? 'animate-pulse' : ''} ${className}`}>
      {showIcon && <Clock className={`w-4 h-4 ${styles.iconColor}`} />}
      <span>{minutes}:{seconds}</span>
    </div>
  );
};