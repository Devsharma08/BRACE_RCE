import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/DashboardSidebar";
import { api } from "../config/api";
import { useAuth } from "../context/authContext";
import {
  Code2,
  Search,
  CheckCircle2,
  ChevronRight,
  Zap,
} from "lucide-react";

export const Problems: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await api.get("/problem/all");
        if (res.data?.problems) {
          setProblems(res.data.problems);
        }
      } catch (err) {
        console.error("Failed to load problems:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.problem_number && String(p.problem_number).includes(searchTerm));
    const matchesDiff =
      selectedDifficulty === "ALL" ||
      (p.difficulty_level || "MEDIUM").toUpperCase() === selectedDifficulty.toUpperCase();
    return matchesSearch && matchesDiff;
  });

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-100 font-mono relative overflow-x-hidden select-none">
      <DashboardSidebar rating={1248} />

      <main className="flex-1 ml-[245px] p-6 lg:p-8 flex flex-col gap-6 max-w-[1400px] z-10 relative">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              <span>PROBLEM REPOSITORY</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore and solve algorithmic challenges across all data structures
            </p>
          </div>
          <div className="text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 px-3 py-1.5 rounded">
            TOTAL PROBLEMS: <strong className="text-white">{problems.length}</strong>
          </div>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-cyan-500/20 bg-slate-950/60 p-4 rounded">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-xs text-slate-200 pl-9 pr-4 py-2 rounded focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "EASY", "MEDIUM", "HARD"].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-black/40 text-slate-400 border border-white/5 hover:text-slate-200"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* PROBLEM LIST */}
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="p-8 text-center text-cyan-500 font-mono animate-pulse">
              SYNCING REPOSITORY DATA...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono">
              NO PROBLEMS MATCH YOUR FILTER CRITERIA.
            </div>
          ) : (
            filteredProblems.map((p) => {
              const diff = (p.difficulty_level || "MEDIUM").toUpperCase();
              const diffColor =
                diff === "EASY"
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                  : diff === "HARD"
                  ? "text-rose-400 border-rose-500/30 bg-rose-950/30"
                  : "text-amber-400 border-amber-500/30 bg-amber-950/30";

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/terminal?oid=${p.github_oid || p.id}`)}
                  className="flex items-center justify-between p-4 rounded border border-white/5 bg-slate-950/60 hover:border-cyan-500/40 hover:bg-cyan-950/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-500 w-8">
                      #{p.problem_number || p.id.slice(0, 4)}
                    </span>
                    <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {p.name}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded border font-bold uppercase ${diffColor}`}
                    >
                      {diff}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <button className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/40 font-bold rounded transition-all flex items-center gap-1">
                      <span>[ CODE ]</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
