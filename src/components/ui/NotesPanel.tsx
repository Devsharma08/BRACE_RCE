import { useState, useEffect } from "react";
import { StickyNote, X } from "lucide-react";

interface NotesPanelProps {
  storageKey?: string;
  isOpen?: boolean;
  onClose?: () => void;
  defaultOpen?: boolean;
}

export const NotesPanel = ({
  storageKey = "global",
  isOpen: externalIsOpen,
  onClose,
  defaultOpen = false,
}: NotesPanelProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const [notes, setNotes] = useState("");

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  // Load saved notes on mount - default to single global key brace-global-notes
  useEffect(() => {
    const saved = localStorage.getItem("brace-global-notes") || localStorage.getItem(`brace-notes-${storageKey}`) || "";
    setNotes(saved);
  }, [storageKey]);

  // Auto-save notes globally as you type
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem("brace-global-notes", val);
    if (storageKey) {
      localStorage.setItem(`brace-notes-${storageKey}`, val);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80 sm:w-96 h-96 transition-all duration-300 ease-in-out font-mono">
      <div className="w-full h-full flex flex-col bg-[#0b0c0e]/95 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-amber-950/30 border-b border-amber-500/20 select-none">
          <div className="flex items-center gap-2 text-amber-400">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">GLOBAL SCRATCHPAD</span>
          </div>
          <button 
            onClick={handleClose} 
            title="Close Notes"
            className="text-amber-400/60 hover:text-amber-300 transition-colors p-1 rounded hover:bg-amber-500/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Area */}
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Jot down algorithm ideas, edge cases, space/time complexity notes here... (Saved globally)"
          className="flex-1 w-full bg-transparent text-xs text-amber-100/90 p-4 resize-none focus:outline-none custom-scrollbar placeholder:text-amber-900/50 font-mono leading-relaxed"
          spellCheck={false}
          autoFocus
        />
      </div>
    </div>
  );
};
