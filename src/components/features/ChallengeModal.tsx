import { useState } from "react";
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

  const { data: systemProblems = [] } = useQuery<ProblemOption[]>({
    queryKey: ["challenge-system-problems", difficulty],
    enabled: open && mode === "RANDOM",
    queryFn: async () => (await api.get("/problems/system")).data?.problems ?? [],
  });
  const { data: customProblems = [] } = useQuery<ProblemOption[]>({
    queryKey: ["challenge-custom-problems"],
    enabled: open && mode === "CUSTOM",
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-rose-500/40 bg-[#0b0c0e] shadow-[0_0_50px_rgba(225,29,72,0.25)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-500/20 bg-rose-950/20">
          <span className="flex items-center gap-2 text-sm font-bold tracking-[0.2em] text-rose-300 uppercase">
            <Swords className="w-4 h-4" /> Challenge // {friend.username}
          </span>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {(["RANDOM", "CUSTOM"] as ChallengeMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 px-4 py-3 border text-xs font-bold tracking-widest cursor-pointer transition-all ${mode === m ? "border-rose-400 bg-rose-950/40 text-rose-200" : "border-white/10 text-slate-500 hover:border-rose-500/40 hover:text-rose-300"}`}>
              {m === "RANDOM" ? <Dices className="w-4 h-4" /> : <FileCode2 className="w-4 h-4" />} {m === "RANDOM" ? "RANDOM BY DIFFICULTY" : "CUSTOM PROBLEM"}
            </button>
          ))}
        </div>
        {mode === "RANDOM" ? (
          <div className="px-5 pb-2">
            <p className="text-[10px] tracking-[0.2em] text-slate-500 mb-2">DIFFICULTY // SERVER PICKS A RANDOM PROBLEM</p>
            <div className="grid grid-cols-4 gap-2">
              {["EASY", "MEDIUM", "HARD", "ANY"].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`px-2 py-2.5 border text-[11px] font-bold tracking-widest cursor-pointer ${difficulty === d ? "border-cyan-400 bg-cyan-950/40 text-cyan-200" : "border-white/10 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-300"}`}>{d}</button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">{systemProblems.length} system problems available.</p>
          </div>
        ) : (
          <div className="px-5 pb-2">
            <p className="text-[10px] tracking-[0.2em] text-slate-500 mb-2">CUSTOM PROBLEM // YOU PICK THE ARENA</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search problems..."
              className="w-full bg-black/50 border border-white/10 p-2.5 text-xs text-white font-mono focus:border-rose-500/60 outline-none mb-2" />
            <div className="max-h-56 overflow-y-auto themed-scroll border border-white/10">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => setProblemId(p.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/5 text-xs cursor-pointer ${problemId === p.id ? "bg-rose-950/40 text-rose-200" : "text-slate-300 hover:bg-white/5"}`}>
                  <span className="font-bold">{p.name}</span>
                  {p.difficulty_level && <span className="ml-2 text-[10px] text-slate-500">[{p.difficulty_level}]</span>}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-6 text-center text-[11px] text-slate-600">NO PROBLEMS MATCH — TRY ANOTHER SEARCH</p>}
            </div>
          </div>
        )}
        <div className="flex gap-2 p-4">
          <button onClick={onClose} className="flex-1 py-3 border border-white/10 text-slate-400 text-xs font-bold tracking-widest hover:bg-white/5 cursor-pointer">CANCEL</button>
          <button onClick={handleSend} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold tracking-widest shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer">[ SEND CHALLENGE ]</button>
        </div>
      </div>
    </div>
  );
}
