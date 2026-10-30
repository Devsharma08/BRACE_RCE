import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dices, Swords, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { fetchAllProblems } from "../../utils/problemCache";

interface ProblemOption { id: string; name: string; difficulty_level?: string; }

export function ChallengeModal({ friend, open, onClose }: {
  friend: { id: string; username: string } | null;
  open: boolean;
  onClose: () => void;
}) {
  const { sendChallenge } = useSocket();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [search, setSearch] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const { data: systemProblems = [] } = useQuery<ProblemOption[]>({
    queryKey: ["challenge-system-problems"],
    enabled: open,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => fetchAllProblems<ProblemOption>("/problems/system"),
  });

  const filteredSystemProblems = useMemo(() => {
    if (difficulty === "ANY") return systemProblems;
    return systemProblems.filter((p) => p.difficulty_level === difficulty);
  }, [systemProblems, difficulty]);

  if (!open || !friend) return null;
  const pool = filteredSystemProblems;
  const filtered = pool.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30);

  const handleSend = async () => {
    setIsSending(true);
    try {
      sendChallenge(friend.id, {
        mode: "RANDOM",
        difficulty,
        problemId: undefined,
        problemName: undefined,
        username: user?.username,
      });
      toast.success(`Random ${difficulty} challenge sent to ${friend.username}`);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Challenge ${friend.username}`}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-accent-danger/30 bg-base shadow-[0_0_40px_rgba(255,0,0,0.15)] animate-slide-up">
<div className="flex items-center justify-between border-b border-accent-danger/20 bg-accent-danger/5 px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-accent-danger">
            <Swords className="w-5 h-5" />
            Challenge <span className="text-fg">{friend.username}</span>
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-1.5 text-subtle transition-colors hover:bg-accent-danger/10 hover:text-accent-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger"
            aria-label="Close challenge modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-faint">DIFFICULTY // SERVER PICKS A RANDOM PROBLEM</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["EASY", "MEDIUM", "HARD", "ANY"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-xl border px-3 py-2.5 text-[11px] font-bold tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
                  difficulty === d
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary shadow-[0_0_20px_rgba(0,212,255,0.1)]"
                    : "border-subtle-line text-subtle hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-primary/5"
              }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">{systemProblems.length} system problems available.</p>
        </div>
        <div className="flex gap-2 p-5 border-t border-subtle-line/50 bg-base/50">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-subtle-line py-3.5 text-xs font-bold uppercase tracking-widest text-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-subtle"
          >
            CANCEL
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="flex-1 rounded-xl bg-accent-danger py-3.5 text-xs font-bold uppercase tracking-widest text-fg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger"
          >
            {isSending ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : "SEND CHALLENGE"}
          </button>
        </div>
      </div>
    </div>
  );
}
