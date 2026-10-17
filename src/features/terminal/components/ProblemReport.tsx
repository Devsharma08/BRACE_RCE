'use client';

import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCheck,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import type { PracticeProblem } from "../types";

interface ProblemReportProps {
  activeProblem: PracticeProblem | null;
  socket?: any;
  eventId?: string;
}

const CATEGORIES = [
  { value: "question", label: "Question not properly defined", icon: Lightbulb },
  { value: "testcase", label: "Wrong testcase", icon: Bug },
  { value: "system", label: "System error", icon: AlertTriangle },
  { value: "other", label: "Other", icon: MessageSquare },
] as const;

export type ReportReason = (typeof CATEGORIES)[number]["value"];

export function ProblemReport({ activeProblem, socket, eventId }: ProblemReportProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportReason>("question");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const current = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  const submit = useCallback(async () => {
    if (!activeProblem) return;
    setSubmitting(true);
    setStatus("idle");
    try {
      // (1) If inside a room/lobby, emit to the room moderator over WebSocket.
      if (socket && eventId) {
        socket.emit("report:send", { eventId, category, content: detail || "" });
      }

      // (2) Always file to admin for review.
      const res = await fetch("/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeProblem.id,
          reason: category,
          detail: detail,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
        throw new Error(body.status || body.message || "Failed to file report");
      }

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }, [activeProblem, socket, eventId, category, detail]);

  const close = () => {
    setOpen(false);
    setStatus("idle");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCategory("question");
          setDetail("");
          setStatus("idle");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-amber-600 transition hover:bg-amber-500/20"
        title="Report a problem to the admin"
        aria-label="Report problem"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Report problem
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-base p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="font-mono text-base font-bold text-fg">Report a problem</h2>
              <button
                type="button"
                onClick={close}
                className="text-faint transition hover:text-fg"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "success" ? (
              <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-accent-success/10 p-3 font-mono text-xs text-accent-success">
                <CheckCheck className="h-4 w-4 ml-0.5 shrink-0" />
                Filed. Admin notified{' '}
                {socket && eventId ? <span className="font-mono">and room moderator</span> : null}.
              </div>
            ) : status === "error" ? (
              <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-accent-danger/10 p-3 font-mono text-xs text-accent-danger">
                <AlertTriangle className="h-4 w-4 ml-0.5 shrink-0" />
                Failed to file report.
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                Attached to: <span className="text-fg">{activeProblem?.name ?? "Practice Workspace"}</span>
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-widest transition ${active
                      ? "border-accent-primary/40 bg-accent-primary/10 text-accent-primary"
                      : "border-subtle-line text-faint hover:text-fg"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {category === "other" && (
              <div className="mt-3">
                <label htmlFor="report-detail" className="sr-only">
                  Additional details
                </label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  placeholder="Describe what happened… (optional)"
                  className="w-full resize-none rounded-lg border border-subtle-line bg-base p-2 font-mono text-xs text-fg focus:border-accent-primary focus:outline-none"
                />
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded border border-subtle-line px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-faint hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !activeProblem}
                className="flex-1 rounded bg-accent-primary px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-ink transition hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {submitting ? "Filing…" : "File report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProblemReport;
