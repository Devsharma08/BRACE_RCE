import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export const formatTime = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export function useGlobalTimer(startedAt: string | Date | null, totalDurationMs: number | null, onExpire?: () => void, resetKey?: string | number) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!startedAt || !totalDurationMs) {
      setRemainingSeconds(null);
      setIsExpired(false);
      hasExpiredRef.current = false;
      return;
    }

    const startTimestamp = new Date(startedAt).getTime();
    const endTimestamp = startTimestamp + totalDurationMs;

    const calculateRemaining = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, endTimestamp - now);
      return Math.floor(remainingMs / 1000);
    };

    // Initialize immediately
    const initialRemaining = calculateRemaining();
    setRemainingSeconds(initialRemaining);
    if (initialRemaining <= 0) {
       setIsExpired(true);
       hasExpiredRef.current = true;
       if (onExpire) onExpire();
       return;
    }

    const timer = setInterval(() => {
      const currentRemaining = calculateRemaining();
      setRemainingSeconds(currentRemaining);
      
      if (currentRemaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        setIsExpired(true);
        if (onExpire) onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, totalDurationMs, onExpire, resetKey]);

  return { remainingSeconds, isExpired };
}

interface GlobalTimerProps {
  startedAt: string | Date | null;
  totalDurationMs: number | null;
  onExpire?: () => void;
  label?: string;
  variant?: 'compact' | 'pill' | 'banner';
  showIcon?: boolean;
  /** When provided, changing this value forces the timer to re-initialize,
   *  clearing stale state from a previous battle. */
  resetKey?: string | number;
}

export const GlobalTimer: React.FC<GlobalTimerProps> = ({ 
  startedAt, 
  totalDurationMs, 
  onExpire, 
  label = "TIME LEFT:", 
  variant = "pill",
  showIcon = true,
  resetKey
}) => {
  const { remainingSeconds, isExpired } = useGlobalTimer(startedAt, totalDurationMs, onExpire, resetKey);

  if (remainingSeconds === null) {
     return null;
  }

  const isWarning = remainingSeconds > 0 && remainingSeconds <= 60;
  const isCritical = remainingSeconds > 0 && remainingSeconds <= 10;

  const getVariantStyles = () => {
    if (isExpired) {
      return {
        base: "border-accent-danger/30 bg-accent-danger/10 text-accent-danger",
        icon: "text-accent-danger",
        bg: "bg-accent-danger/10 border-accent-danger/30",
        pulse: true,
      };
    }
    if (isCritical) {
      return {
        base: "border-accent-danger/50 bg-accent-danger/15 text-accent-danger",
        icon: "text-accent-danger animate-pulse",
        bg: "bg-accent-danger/10 border-accent-danger/50",
        pulse: true,
      };
    }
    if (isWarning) {
      return {
        base: "border-accent-warning/30 bg-accent-warning/10 text-accent-warning",
        icon: "text-accent-warning animate-pulse",
        bg: "bg-accent-warning/10 border-accent-warning/30",
        pulse: true,
      };
    }
    return {
      base: "border-accent-success/30 bg-accent-success/10 text-accent-success",
      icon: "text-accent-success",
      bg: "bg-accent-success/10 border-accent-success/30",
      pulse: false,
    };
  };

  const styles = getVariantStyles();
  const timeStr = formatTime(remainingSeconds);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 font-bold ${styles.base} transition-colors`}>
        {showIcon && <Clock className={`w-3.5 h-3.5 ${styles.icon} ${styles.pulse ? 'animate-pulse' : ''}`} />}
        <span className="text-[11px] uppercase tracking-widest">{formatTime(remainingSeconds)}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`w-full py-3 flex items-center justify-center gap-3 border-y ${styles.bg} text-accent-success transition-colors`}>
        {showIcon && <Clock className={`w-5 h-5 ${styles.icon} ${styles.pulse ? 'animate-pulse' : ''}`} />}
        <span className="text-sm font-bold tracking-[0.2em]">{label} {formatTime(remainingSeconds)}</span>
      </div>
    );
  }

  // Default pill variant
  return (
    <div className={`flex items-center gap-1.5 border px-4 py-2 rounded-xl text-[11px] font-bold ${styles.base} transition-colors ${styles.pulse ? 'animate-pulse' : ''}`}>
      {showIcon && <Clock className={`w-3.5 h-3.5 ${styles.icon}`} />}
      <span className="text-[9px] text-subtle uppercase tracking-widest">{label}</span>
      <span>{formatTime(remainingSeconds)}</span>
    </div>
  );
};