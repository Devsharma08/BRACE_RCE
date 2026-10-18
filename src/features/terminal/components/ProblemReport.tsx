'use client';

import { useState, useCallback, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCheck,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import type { PracticeProblem } from "./PracticeSidebar";
import { useIsMobile } from "../../../hooks/useMediaQuery";

export interface ProblemReportProps {
  activeProblem: PracticeProblem | null;
  socket?: any;
  eventId?: string;
}

interface ReportCategory {
  value: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const CATEGORIES: ReportCategory[] = [
  {
    value: "QUESTION",
    label: "Question not defined",
    description: "The problem statement is unclear, incomplete, or missing key information.",
    icon: Lightbulb,
    color: "text-accent-primary",
  },
  {
    value: "TESTCASE",
    label: "Wrong test case",
    description: "A test case has an incorrect expected output or invalid input.",
    icon: Bug,
    color: "text-accent-warning",
  },
  {
    value: "DOUBT",
    label: "Needs clarification",
    description: "I don't understand the problem or need hints about the approach.",
    icon: HelpCircle,
    color: "text-accent-violet",
  },
  {
    value: "OTHER",
    label: "Other issue",
    description: "Something else — describe it below.",
    icon: MessageSquare,
    color: "text-accent-success",
  },
];

const PLACEHOLDER_TEXT: Record<string, string> = {
  QUESTION: "Describe what's unclear about this problem…",
  TESTCASE: "Which test case is incorrect? What should the expected output be?…",
  DOUBT: "What part of the problem definition needs clarification?…",
  OTHER: "Describe the issue you encountered…",
};

export function ProblemReport({ activeProblem, socket, eventId }: ProblemReportProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const isMobile = useIsMobile();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const resetForm = () => {
    setCategory(CATEGORIES[0].value);
    setDetail("");
    setStatus("idle");
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [open, close]);

  const problemTitle = activeProblem?.problem_number != null
    ? `#${activeProblem.problem_number} ${activeProblem.name}`
    : activeProblem?.name ?? "Practice Workspace";

  const submit = useCallback(async () => {
    if (!activeProblem) return;
    setSubmitting(true);
    setStatus("idle");
    try {
      if (socket && eventId) {
        socket.emit("report:send", { eventId, category, content: detail || "" });
      }

      const res = await fetch("/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeProblem.id,
          reason: category,
          category: category,
          detail: detail,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
        throw new Error(body.status || body.message || "Failed to file report");
      }

      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }, [activeProblem, socket, eventId, category, detail]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/20"
        title="Report a problem to the admin"
        aria-label="Report problem"
      >
        <AlertTriangle className="h-3 w-3" />
        <span className="hidden xs:inline">Report</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-base/80 backdrop-blur-md p-4 animate-fade-in font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-surface border border-accent-primary/40 rounded-card shadow-card-hover overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-primary" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent-primary" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent-primary" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-primary" />

        <div className="p-6 pb-4 flex items-center justify-between border-b border-subtle-line bg-accent-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary shadow-[0_0_15px_rgba(0,212,255,0.2)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="report-dialog-title" className="text-sm font-bold text-fg tracking-widest uppercase">
                Report an issue
              </h3>
              <p className="text-[11px] text-accent-primary/70 tracking-wider">
                Attached to: {problemTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-faint hover:text-fg transition-colors p-1 rounded-btn hover:bg-surface-hover"
            aria-label="Close report dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {status === "success" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-accent-success/30 bg-accent-success/5 p-3 text-sm text-accent-success">
              <CheckCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Report filed. Admin notified
                {socket && eventId && <span className="block">and room moderator</span>}.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-accent-danger/30 bg-accent-danger/5 p-3 text-sm text-accent-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Failed to file report. Please try again.</p>
            </div>
          )}

          {status === "idle" && (
            <>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-label mb-2">
                  Report category
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {CATEGORIES.map((c) => {
                    const isActive = category === c.value;
                    const iconColor = c.color;
                    const Icon = c.icon;
                    const baseClasses = "flex flex-col items-start gap-1.5 rounded-[var(--radius-btn)] border px-3 py-2.5 text-xs font-mono transition-all";
                    const activeClasses = "border-accent-primary/40 bg-accent-primary/5 text-fg";
                    const inactiveClasses = "border-line bg-base/50 text-faint hover:border-line-mid hover:text-fg";
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        role="radio"
                        aria-checked={isActive}
                        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3 w-3 ${iconColor} shrink-0`} />
                          <span className="block text-xs font-bold text-fg">
                            {c.label}
                          </span>
                        </div>
                        <p className="text-[10px] truncate w-full text-left leading-snug text-faint">
                          {c.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="report-detail" className="block font-mono text-[10px] uppercase tracking-widest text-label mb-2">
                  Details
                  <span className="text-faint/50 font-normal">(optional)</span>
                </label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={isMobile ? 3 : 4}
                  maxLength={500}
                  placeholder={PLACEHOLDER_TEXT[category]}
                  className="mt-1.5 w-full resize-none rounded-[var(--radius-card)] border border-line bg-base px-3 py-2 font-mono text-xs text-fg outline-none placeholder:text-faint focus:border-accent-primary/50"
                />
                <div className="mt-1 text-right font-mono text-[10px] text-faint">
                  {detail.length}/500
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 py-3 px-4 rounded-btn border border-subtle-line bg-surface-hover text-xs font-bold tracking-widest text-subtle transition-all hover:border-accent-primary/40 hover:text-fg"
            >
              {status === "idle" ? "Cancel" : "Close"}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !activeProblem || status !== "idle"}
              className="flex-1 py-3 px-4 rounded-btn border border-accent-primary/50 bg-accent-primary/20 hover:bg-accent-primary text-accent-primary hover:text-ink text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2 shadow-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Filing…
                </>
              ) : status === "success" ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5" />
                  Filed
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  File report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProblemReport;
