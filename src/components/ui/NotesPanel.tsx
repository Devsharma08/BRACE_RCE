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
    <div className="fixed right-0 top-14 bottom-0 z-[100] w-80 flex flex-col font-mono border-l border-cyan-500/30 bg-[#0b0c0e]/96 backdrop-blur">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#090e1d] border-b border-cyan-500/20 select-none shrink-0">
          <div className="flex items-center gap-2 text-cyan-400">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              {hasMultipleProblems ? "BATTLE NOTES" : "SCRATCHPAD"}
            </span>
          </div>
          <button
            onClick={handleClose}
            title="Close Notes"
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {hasMultipleProblems && (
          <div className="flex border-b border-cyan-500/20 overflow-x-auto scrollbar-hide shrink-0 bg-black/30">
            <button
              onClick={() => setActiveTab("COMMON")}
              className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap flex items-center gap-1.5 transition-all border-r border-cyan-500/10 ${
                activeTab === "COMMON"
                  ? "bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400"
                  : "text-slate-500 hover:text-cyan-400/70"
              }`}
            >
              <BookOpen className="w-3 h-3" /> COMMON
            </button>
            {problems!.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-all border-r border-cyan-500/10 ${
                  activeTab === p.id
                    ? "bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400"
                    : "text-slate-500 hover:text-cyan-400/70"
                }`}
                title={p.name}
              >
                P{idx + 1}
              </button>
            ))}
          </div>
        )}

        {hasMultipleProblems && (
          <div className="px-4 py-1.5 bg-black/20 border-b border-cyan-500/10 shrink-0">
            <p className="text-[9px] text-cyan-500/60 tracking-widest uppercase truncate">
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
          className="flex-1 w-full bg-[#050811] text-cyan-200 text-xs font-mono p-4 resize-none focus:outline-none focus:border-cyan-400 border border-cyan-500/20 rounded p-3 placeholder:text-cyan-500/20 custom-scrollbar leading-relaxed"
          spellCheck={false}
          autoFocus
        />

        {/* Footer */}
        <div className="px-4 py-2 bg-black/20 border-t border-cyan-500/10 shrink-0">
          <p className="text-[9px] text-slate-600 tracking-widest">
            AUTO-SAVED · CLEARED AFTER MATCH ENDS
          </p>
        </div>
      </div>
    </div>
  );
};
