import { useState, useEffect } from "react";
import { StickyNote, X, ChevronDown, ChevronUp } from "lucide-react";

interface NotesPanelProps {
  storageKey: string;
  defaultOpen?: boolean;
}

export const NotesPanel = ({ storageKey, defaultOpen = false }: NotesPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [notes, setNotes] = useState("");

  // Load saved notes on mount
  useEffect(() => {
    const saved = localStorage.getItem(`brace-notes-${storageKey}`);
    if (saved) setNotes(saved);
  }, [storageKey]);

  // Auto-save notes as you type
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(`brace-notes-${storageKey}`, val);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-40 transition-all duration-300 ease-in-out ${isOpen ? 'w-80 h-96' : 'w-auto h-auto'}`}>
      
      {/* Closed State (Floating Button) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 rounded-full shadow-lg backdrop-blur-md transition-all font-mono text-xs tracking-widest"
        >
          <StickyNote className="w-4 h-4" />
          [ NOTES ]
        </button>
      )}

      {/* Open State (Notepad Window) */}
      {isOpen && (
        <div className="w-full h-full flex flex-col bg-[#0b0c0e]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/5 cursor-move">
            <div className="flex items-center gap-2 text-indigo-400">
              <StickyNote className="w-4 h-4" />
              <span className="font-mono text-xs font-bold tracking-widest uppercase">Scratchpad</span>
            </div>
            <div className="flex gap-2 text-slate-500">
              <button onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Jot down algorithm ideas, edge cases, or time complexity thoughts here..."
            className="flex-1 w-full bg-transparent text-sm text-slate-300 p-4 resize-none focus:outline-none focus:ring-0 custom-scrollbar placeholder:text-slate-700 font-sans"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
