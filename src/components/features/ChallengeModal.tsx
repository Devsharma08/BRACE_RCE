import { useState,useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dices, FileCode2, Swords, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../config/api";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

export type ChallengeMode = "RANDOM" | "CUSTOM";

interface ProblemOption { id: string; name: string; difficulty_level?: string; }

export function ChallengeModal({ friend, open, onClose }: {
  friend: { id: string; username: string } | null;
  open: boolean;
  onClose: () => void;
}) {
  const { sendChallenge } = useSocket();
  const { user } = useAuth();
  const [mode, setMode] = useState<ChallengeMode>("RANDOM");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [problemId, setProblemId] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
  if (!open) return;
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [open, onClose]);


  const { data: systemProblems = [] } = useQuery<ProblemOption[]>({
    queryKey: ["challenge-system-problems", difficulty],
    enabled: open && mode === "RANDOM",
    // Static problem definitions — refreshed only when progress changes.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => (await api.get("/problems/system")).data?.problems ?? [],
  });
  const { data: customProblems = [] } = useQuery<ProblemOption[]>({
    queryKey: ["challenge-custom-problems"],
    enabled: open && mode === "CUSTOM",
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => (await api.get("/problems/custom")).data?.problems ?? [],
  });

  if (!open || !friend) return null;
  const pool = mode === "RANDOM" ? systemProblems : [...systemProblems, ...customProblems];
  const filtered = pool.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30);

  const handleSend = () => {
    if (mode === "CUSTOM" && !problemId) { toast.error("Pick a custom problem first"); return; }
    const picked = mode === "CUSTOM" ? pool.find((p) => p.id === problemId) : undefined;
    sendChallenge(friend.id, {
      mode,
      difficulty,
      problemId: picked?.id,
      problemName: picked?.name,
      username: user?.username,
    });
    toast.success(mode === "RANDOM" ? `Random ${difficulty} challenge sent to ${friend.username}` : `Custom challenge "${picked?.name}" sent to ${friend.username}`);
    onClose();
  };

  return (
    <div
    role="dialog"
    aria-modal="true"
    aria-label={`Challenge ${friend.username}`} className="ds-overlay fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-card border border-accent-danger/40 bg-surface shadow-glow-danger">
        <div className="flex items-center justify-between border-b border-accent-danger/20 bg-accent-danger/10 px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-accent-danger">
            <Swords className="w-4 h-4" /> Challenge // {friend.username}
          </span>
          <button onClick={onClose} className="cursor-pointer rounded-btn p-1.5 text-subtle transition-colors hover:bg-accent-danger/10 hover:text-accent-danger"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {(["RANDOM", "CUSTOM"] as ChallengeMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 rounded-btn border px-4 py-3 text-xs font-bold tracking-widest transition-all ${mode === m ? "border-accent-danger bg-accent-danger/10 text-accent-danger" : "border-subtle-line text-subtle hover:border-accent-danger/40 hover:text-accent-danger"}`}>
              {m === "RANDOM" ? <Dices className="w-4 h-4" /> : <FileCode2 className="w-4 h-4" />} {m === "RANDOM" ? "RANDOM BY DIFFICULTY" : "CUSTOM PROBLEM"}
            </button>
          ))}
        </div>
        {mode === "RANDOM" ? (
          <div className="px-5 pb-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">DIFFICULTY // SERVER PICKS A RANDOM PROBLEM</p>
            <div className="grid grid-cols-4 gap-2">
              {["EASY", "MEDIUM", "HARD", "ANY"].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`rounded-btn border px-2 py-2.5 text-[11px] font-bold tracking-widest transition-all ${difficulty === d ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-subtle-line text-subtle hover:border-accent-primary/40 hover:text-accent-primary"}`}>{d}</button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">{systemProblems.length} system problems available.</p>
          </div>
        ) : (
          <div className="px-5 pb-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">CUSTOM PROBLEM // YOU PICK THE ARENA</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search problems..."
              className="mb-2 w-full rounded-btn border border-subtle-line bg-base p-2.5 text-xs text-fg font-mono outline-none focus:border-accent-danger/60" />
            <div className="max-h-56 overflow-y-auto rounded-btn border border-subtle-line themed-scroll">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => setProblemId(p.id)}
                  className={`w-full cursor-pointer border-b border-subtle-line px-3 py-2.5 text-left text-xs transition-colors ${problemId === p.id ? "bg-accent-danger/10 text-accent-danger" : "text-subtle hover:bg-surface-hover"}`}>
                  <span className="font-bold">{p.name}</span>
                  {p.difficulty_level && <span className="ml-2 text-[10px] text-muted">[{p.difficulty_level}]</span>}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-6 text-center text-[11px] text-muted">NO PROBLEMS MATCH — TRY ANOTHER SEARCH</p>}
            </div>
          </div>
        )}
        <div className="flex gap-2 p-4">
          <button onClick={onClose} className="flex-1 rounded-btn border border-subtle-line py-3 text-xs font-bold tracking-widest text-subtle transition-colors hover:bg-surface-hover hover:text-fg">CANCEL</button>
          <button onClick={handleSend} className="flex-1 rounded-btn bg-accent-danger py-3 text-xs font-bold tracking-widest text-fg transition-opacity hover:opacity-90">[ SEND CHALLENGE ]</button>
        </div>
      </div>
    </div>
  );
}
