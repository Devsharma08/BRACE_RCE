import { useState, useEffect, useCallback } from "react";
import { StickyNote, X, BookOpen } from "lucide-react";

interface Problem {
  id: string;
  name: string;
}

interface NotesPanelProps {
  /** If undefined, behaves like single-problem global scratchpad */
  problems?: Problem[];
  /** ID of the currently active problem — determines which tab is pre-selected */
  activeProblemId?: string;
  /** Event/room ID used to scope storage keys so notes are isolated per battle */
  eventId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  defaultOpen?: boolean;
}

// ── Storage key helpers ──────────────────────────────────────────────────────
const commonKey = (eventId?: string) =>
  eventId ? `brace-notes-common-${eventId}` : "brace-global-notes";

const problemKey = (problemId: string) => `brace-notes-problem-${problemId}`;

/** Call this when battle ends to wipe all notes for the event */
export function clearEventNotes(eventId: string, problemIds: string[]) {
  localStorage.removeItem(commonKey(eventId));
  problemIds.forEach((id) => localStorage.removeItem(problemKey(id)));
}

// ── Component ────────────────────────────────────────────────────────────────
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

  // Active tab: "COMMON" or a problem id
  const [activeTab, setActiveTab] = useState<string>("COMMON");
  const [notes, setNotes] = useState<Record<string, string>>({});

  // When activeProblemId changes from outside (user navigated to next problem), switch tab
  useEffect(() => {
    if (activeProblemId) setActiveTab(activeProblemId);
  }, [activeProblemId]);

  // Load all notes from localStorage
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

  // ── Active tab label shown in textarea placeholder
  const getPlaceholder = () => {
    if (activeTab === "COMMON")
      return "Shared scratchpad — common algorithms, templates, time/space complexity notes…";
    const prob = problems?.find((p) => p.id === activeTab);
    return `Notes for: ${prob?.name || "this problem"} — edge cases, strategy, observations…`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80 sm:w-[26rem] flex flex-col font-mono" style={{ height: hasMultipleProblems ? "30rem" : "24rem" }}>
      <div className="w-full h-full flex flex-col bg-[#0b0c0e]/96 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] rounded-xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-amber-950/30 border-b border-amber-500/20 select-none shrink-0">
          <div className="flex items-center gap-2 text-amber-400">
            <StickyNote className="w-4 h-4" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              {hasMultipleProblems ? "BATTLE NOTES" : "SCRATCHPAD"}
            </span>
          </div>
          <button
            onClick={handleClose}
            title="Close Notes"
            className="text-amber-400/60 hover:text-amber-300 transition-colors p-1 rounded hover:bg-amber-500/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs (only shown for multi-problem events) ── */}
        {hasMultipleProblems && (
          <div className="flex border-b border-amber-500/20 overflow-x-auto scrollbar-hide shrink-0 bg-black/30">
            {/* Common tab */}
            <button
              onClick={() => setActiveTab("COMMON")}
              className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap flex items-center gap-1.5 transition-all border-r border-amber-500/10 ${
                activeTab === "COMMON"
                  ? "bg-amber-500/20 text-amber-300 border-b-2 border-b-amber-400"
                  : "text-slate-500 hover:text-amber-400/70"
              }`}
            >
              <BookOpen className="w-3 h-3" /> COMMON
            </button>
            {/* Per-problem tabs */}
            {problems!.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-all border-r border-amber-500/10 ${
                  activeTab === p.id
                    ? "bg-amber-500/20 text-amber-300 border-b-2 border-b-amber-400"
                    : "text-slate-500 hover:text-amber-400/70"
                }`}
                title={p.name}
              >
                P{idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab label for multi-problem ── */}
        {hasMultipleProblems && (
          <div className="px-4 py-1.5 bg-black/20 border-b border-amber-500/10 shrink-0">
            <p className="text-[9px] text-amber-500/60 tracking-widest uppercase truncate">
              {activeTab === "COMMON"
                ? "Shared across all problems"
                : `→ ${problems!.find((p) => p.id === activeTab)?.name || "Problem"}`}
            </p>
          </div>
        )}

        {/* ── Textarea ── */}
        <textarea
          key={activeTab} // remount on tab switch so autoFocus fires and scroll resets
          value={currentNote}
          onChange={handleNotesChange}
          placeholder={getPlaceholder()}
          className="flex-1 w-full bg-transparent text-xs text-amber-100/90 p-4 resize-none focus:outline-none custom-scrollbar placeholder:text-amber-400/30 font-mono leading-relaxed"
          spellCheck={false}
          autoFocus
        />

        {/* ── Footer hint ── */}
        <div className="px-4 py-2 bg-black/20 border-t border-amber-500/10 shrink-0">
          <p className="text-[9px] text-slate-600 tracking-widest">
            AUTO-SAVED · CLEARED AFTER MATCH ENDS
          </p>
        </div>
      </div>
    </div>
  );
};
