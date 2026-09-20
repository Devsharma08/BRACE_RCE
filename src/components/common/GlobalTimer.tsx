import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

export const formatTime = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export function useGlobalTimer(startedAt: string | Date | null, totalDurationMs: number | null, onExpire?: () => void) {
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
  }, [startedAt, totalDurationMs, onExpire]);

  return { remainingSeconds, isExpired };
}

interface GlobalTimerProps {
  startedAt: string | Date | null;
  totalDurationMs: number | null;
  onExpire?: () => void;
  label?: string;
  variant?: 'compact' | 'pill' | 'banner';
}

export const GlobalTimer: React.FC<GlobalTimerProps> = ({ 
  startedAt, 
  totalDurationMs, 
  onExpire, 
  label = "TIME LEFT:", 
  variant = "pill" 
}) => {
  const { remainingSeconds, isExpired } = useGlobalTimer(startedAt, totalDurationMs, onExpire);

  if (remainingSeconds === null) {
     return null;
  }

  const isWarning = remainingSeconds > 0 && remainingSeconds <= 60; // Less than 1 minute

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 font-bold ${isExpired ? 'text-accent-danger' : isWarning ? 'text-accent-danger animate-pulse' : 'text-accent-success'}`}>
        <Clock className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-widest">{formatTime(remainingSeconds)}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`w-full py-2 flex items-center justify-center gap-3 border-y ${isExpired ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger' : isWarning ? 'bg-accent-danger/10 border-accent-danger/50 text-accent-danger animate-pulse' : 'bg-accent-success/10 border-accent-success/30 text-accent-success'}`}>
         <Clock className="w-5 h-5" />
         <span className="text-sm font-bold tracking-[0.2em]">{label} {formatTime(remainingSeconds)}</span>
      </div>
    );
  }

  // Default pill variant
  return (
    <div className={`flex items-center gap-1.5 border px-3 py-1 text-[11px] font-bold ${isExpired ? 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger' : isWarning ? 'border-accent-danger/50 bg-accent-danger/15 text-accent-danger animate-pulse' : 'border-accent-success/30 bg-accent-success/10 text-accent-success'}`}>
      <Clock className={`w-3.5 h-3.5 ${isExpired || isWarning ? 'text-accent-danger' : 'text-accent-success'}`} />
      <span className="text-[9px] text-subtle uppercase tracking-widest">{label}</span>
      <span>{formatTime(remainingSeconds)}</span>
    </div>
  );
};
