import { useState, useEffect, useCallback } from "react";
import { StickyNote, X, BookOpen } from "lucide-react";

interface Problem {
  id: string;
  name: string;
}

interface NotesPanelProps {
  problems?: Problem[];
  activeProblemId?: string;
  eventId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  defaultOpen?: boolean;
}

const commonKey = (eventId?: string) =>
  eventId ? `brace-notes-common-${eventId}` : "brace-global-notes";

const problemKey = (problemId: string) => `brace-notes-problem-${problemId}`;

export function clearEventNotes(eventId: string, problemIds: string[]) {
  localStorage.removeItem(commonKey(eventId));
  problemIds.forEach((id) => localStorage.removeItem(problemKey(id)));
}

export const NotesPanel = ({
  problems,
  activeProblemId,
  eventId,
  isOpen: externalIsOpen,
  onClose,
  defaultOpen = false,
}: NotesPanelProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const [activeTab, setActiveTab] = useState<string>("COMMON");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeProblemId) setActiveTab(activeProblemId);
  }, [activeProblemId]);

  useEffect(() => {
    const loaded: Record<string, string> = {};
    loaded["COMMON"] = localStorage.getItem(commonKey(eventId)) || "";
    (problems || []).forEach((p) => {
      loaded[p.id] = localStorage.getItem(problemKey(p.id)) || "";
    });
    setNotes(loaded);
  }, [eventId, problems]);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNotes((prev) => ({ ...prev, [activeTab]: val }));
      if (activeTab === "COMMON") {
        localStorage.setItem(commonKey(eventId), val);
      } else {
        localStorage.setItem(problemKey(activeTab), val);
      }
    },
    [activeTab, eventId],
  );

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  if (!isOpen) return null;

  const hasMultipleProblems = problems && problems.length > 1;
  const currentNote = notes[activeTab] || "";

  const getPlaceholder = () => {
    if (activeTab === "COMMON")
      return "Shared scratchpad — common algorithms, templates, time/space complexity notes…";
    const prob = problems?.find((p) => p.id === activeTab);
    return `Notes for: ${prob?.name || "this problem"} — edge cases, strategy, observations…`;
  };

  return (
    <div className="ds-drawer fixed right-0 top-[var(--header-height)] bottom-0 z-[100] flex w-[min(22rem,100vw)] flex-col border-l border-subtle-line bg-surface/95 font-mono shadow-card">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex shrink-0 select-none items-center justify-between border-b border-subtle-line bg-base px-4 py-3">
          <div className="flex items-center gap-2 text-label">
            <StickyNote className="h-4 w-4 text-accent-warning" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              {hasMultipleProblems ? "BATTLE NOTES" : "SCRATCHPAD"}
            </span>
          </div>
          <button
            onClick={handleClose}
            title="Close Notes"
            className="cursor-pointer rounded-btn p-1 text-subtle transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {hasMultipleProblems && (
          <div className="flex shrink-0 overflow-x-auto border-b border-subtle-line bg-base/70 scrollbar-hide">
            <button
              onClick={() => setActiveTab("COMMON")}
              className={`flex items-center gap-1.5 whitespace-nowrap border-r border-subtle-line px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === "COMMON"
                  ? "border-b-2 border-b-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "text-subtle hover:text-accent-primary"
              }`}
            >
              <BookOpen className="w-3 h-3" /> COMMON
            </button>
            {problems!.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`whitespace-nowrap border-r border-subtle-line px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === p.id
                    ? "border-b-2 border-b-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "text-subtle hover:text-accent-primary"
                }`}
                title={p.name}
              >
                P{idx + 1}
              </button>
            ))}
          </div>
        )}

        {hasMultipleProblems && (
          <div className="shrink-0 border-b border-subtle-line bg-base/50 px-4 py-1.5">
            <p className="truncate text-[9px] uppercase tracking-widest text-label">
              {activeTab === "COMMON"
                ? "Shared across all problems"
                : `→ ${problems!.find((p) => p.id === activeTab)?.name || "Problem"}`}
            </p>
          </div>
        )}

        {/* Textarea */}
        <textarea
          key={activeTab}
          value={currentNote}
          onChange={handleNotesChange}
          placeholder={getPlaceholder()}
          aria-label={hasMultipleProblems ? "Battle notes" : "Scratchpad notes"}
          className="min-h-0 w-full flex-1 resize-none rounded-none border border-subtle-line bg-void p-4 font-mono text-xs leading-relaxed text-accent-primary focus:border-accent-primary focus:outline-none placeholder:text-muted custom-scrollbar"
          spellCheck={false}
          autoFocus
        />

        {/* Footer */}
        <div className="shrink-0 border-t border-subtle-line bg-base/50 px-4 py-2">
          <p className="text-[9px] tracking-widest text-muted">
            AUTO-SAVED · CLEARED AFTER MATCH ENDS
          </p>
        </div>
      </div>
    </div>
  );
};
