import React, { useEffect } from "react";
import { Trophy, X, Home } from "lucide-react";
import {
  CodeComparisonContent,
  type PerformanceData,
  type Submission,
} from "./CodeComparisonContent";

export type { PerformanceData, Submission };

interface CodeComparisonModalProps {
  currentUserId: string;
  performances: PerformanceData[];
  onClose: () => void;
  onReturnHome: () => void;
}

/**
 * Full-screen dialog wrapper around CodeComparisonContent — the review body
 * itself lives in CodeComparisonContent so /analysis/:matchId can reuse it
 * inline. This component owns only the chrome: dialog semantics, header,
 * Escape-to-close, and the Mainframe/close actions.
 */
export const CodeComparisonModal: React.FC<CodeComparisonModalProps> = ({
  currentUserId,
  performances = [],
  onClose,
  onReturnHome
}) => {
  // Escape closes the review dialog, matching the rest of the app's modals.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
  role="dialog"
  aria-modal="true"
  aria-label="Code comparison review"
  className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-base/80 p-4 backdrop-blur-md sm:p-6"
>
  <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-card border border-subtle-line bg-surface shadow-panel">
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-subtle-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-fg">
          <Trophy className="h-4 w-4 text-accent-warning" />
          Battle analysis &amp; code review
        </h2>
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-subtle">
          Compare approaches, runtimes and test-case coverage from your previous battle.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onReturnHome}
          className="flex items-center gap-1.5 rounded-btn border border-subtle-line bg-base px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-subtle transition-colors hover:border-accent-primary/40 hover:text-accent-primary"
        >
          <Home className="h-3.5 w-3.5" />
          Mainframe
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close review"
          className="rounded-btn border border-subtle-line bg-base p-2 text-subtle transition-colors hover:border-accent-danger/40 hover:text-accent-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>

    <CodeComparisonContent
      currentUserId={currentUserId}
      performances={performances}
    />

      </div>
    </div>
  );
};
