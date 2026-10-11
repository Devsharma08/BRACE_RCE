import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Flag, Send, X, CheckCheck, MessageSquare } from "lucide-react";
import type { Socket } from "socket.io-client";

export type ReportCategory = "QUESTION" | "DOUBT" | "TESTCASE" | "OTHER";

export interface ReportMsg {
  id: string;
  eventId: string;
  category: ReportCategory | string;
  content: string;
  status: string;
  senderId: string;
  recipientId: string;
  sender?: { id: string; username: string; avatarUrl?: string | null } | null;
  recipient?: { id: string; username: string; avatarUrl?: string | null } | null;
  createdAt: string;
}

const CATEGORIES: ReportCategory[] = ["QUESTION", "DOUBT", "TESTCASE", "OTHER"];

const CATEGORY_TONE: Record<string, string> = {
  QUESTION: "border-accent-primary/40 bg-accent-primary/10 text-accent-primary",
  DOUBT: "border-accent-violet/40 bg-accent-violet/10 text-accent-violet",
  TESTCASE: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  OTHER: "border-subtle-line bg-surface-hover text-subtle",
};

/**
 * Report thread — room-scoped 1:1 line between ONE participant and the room's
 * moderator (host). Two modes:
 *  - participant: files into their own thread with the host (floating button).
 *  - moderator:  picks a participant (inbox) and answers, can mark RESOLVED.
 */
interface ReportThreadProps {
  socket: any;
  eventId: string;
  myUserId: string;
  isModerator: boolean;
  // for moderator: which participant thread is open; for participant: ignored
  participantId?: string;
  onClose: () => void;
  onUnread?: (n: number) => void;
}

export const ReportThread = memo(function ReportThread({
  socket,
  eventId,
  myUserId,
  isModerator,
  participantId,
  onClose,
  onUnread,
}: ReportThreadProps) {
  const [messages, setMessages] = useState<ReportMsg[]>([]);
  const [category, setCategory] = useState<ReportCategory>("QUESTION");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // The counterparty of this thread: participants always talk to the host;
  // moderators talk to the selected participant.
  const peerId = isModerator ? participantId : undefined;

  useEffect(() => {
    if (!socket || !eventId) return;
    const payload = isModerator ? { eventId, participantId } : { eventId };
    socket.emit("report:list", payload);

    const onThread = (data: { eventId: string; participantId: string; messages: ReportMsg[] }) => {
      if (String(data.eventId) !== String(eventId)) return;
      setMessages(data.messages || []);
      onUnread?.(0);
    };
    const onNew = (msg: ReportMsg) => {
      if (String((msg as any).eventId ?? eventId) !== String(eventId)) return;
      // Only merge messages of THIS 1:1 thread.
      const involves = (id?: string) => id === myUserId || id === peerId;
      if (!involves(msg.senderId) && !involves(msg.recipientId)) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onStatus = () => socket.emit("report:list", payload);

    socket.on("report:thread", onThread);
    socket.on("report:new", onNew);
    socket.on("report:status", onStatus);
    return () => {
      socket.off("report:thread", onThread);
      socket.off("report:new", onNew);
      socket.off("report:status", onStatus);
    };
  }, [socket, eventId, isModerator, participantId, peerId, onUnread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !socket) return;
    socket.emit("report:send", {
      eventId,
      recipientId: isModerator ? peerId : undefined,
      category,
      content: text.slice(0, 2000),
    });
    setDraft("");
  }, [draft, socket, eventId, isModerator, peerId, category]);

  const resolve = useCallback(() => {
    if (!isModerator || !peerId || !socket) return;
    socket.emit("report:resolve", { eventId, participantId: peerId });
  }, [isModerator, peerId, socket, eventId]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-line bg-base/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-subtle-line bg-raised px-3 py-2.5">
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary">
          <Flag className="h-3.5 w-3.5" /> Report thread
        </p>
        <div className="flex items-center gap-2">
          {isModerator && (
            <button
              onClick={resolve}
              title="Mark thread resolved"
              className="flex items-center gap-1 rounded border border-accent-success/40 bg-accent-success/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-success transition hover:bg-accent-success/20"
            >
              <CheckCheck className="h-3 w-3" /> Resolve
            </button>
          )}
          <button onClick={onClose} className="text-faint transition hover:text-fg" title="Close thread">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto themed-scroll p-3 flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="h-6 w-6 text-faint" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">No reports yet</p>
            <p className="text-[10px] text-subtle">Report a bad question, a doubt, or a broken test case.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myUserId;
            return (
              <div key={m.id} className={`flex max-w-[90%] flex-col gap-0.5 ${mine ? "self-end items-end" : "self-start items-start"}`}>
                <div className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-widest text-faint">
                  <span>{mine ? "YOU" : m.sender?.username || "Operative"}</span>
                  <span className={`rounded border px-1 py-[1px] font-bold ${CATEGORY_TONE[m.category] || CATEGORY_TONE.OTHER}`}>
                    {m.category}
                  </span>
                </div>
                <div className={`rounded-xl px-3 py-2 font-mono text-xs ${mine ? "border border-accent-primary/30 bg-accent-primary/10 text-fg" : "border border-subtle-line bg-surface-hover/50 text-fg"}`}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-subtle-line p-2.5">
        <div className="mb-2 flex gap-1.5 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-widest transition ${
                category === c
                  ? CATEGORY_TONE[c]
                  : "border-subtle-line text-faint hover:text-fg"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Describe the issue..."
            className="min-w-0 flex-1 rounded-lg border border-subtle-line bg-base/50 p-2 font-mono text-xs text-fg focus:border-accent-primary focus:outline-none"
          />
          <button onClick={send} className="rounded-lg border border-accent-primary/50 bg-accent-primary/10 p-2 text-accent-primary transition hover:bg-accent-primary/20">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ReportThread;
