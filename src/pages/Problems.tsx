import React, { useState, useEffect, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import { TableSkeleton } from "../components/ui/Skeleton";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import {
  Code2,
  Search,
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckCircle2,
  ListFilter,
  Sparkles,
} from "lucide-react";

export const Problems: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const handleSearchChange = (val: string) => {
    startTransition(() => {
      setSearchTerm(val);
      setCurrentPage(1);
    });
  };

  const handleDifficultyChange = (diff: string) => {
    startTransition(() => {
      setSelectedDifficulty(diff);
      setCurrentPage(1);
    });
  };

  const { data: problems = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["system-problems"],
    queryFn: async () => {
      const res = await api.get("/problems/system");
      return res.data?.problems || [];
    },
  });

  // Filter problems by search, difficulty, and category
  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.problem_number && String(p.problem_number).includes(searchTerm));

    const matchesDiff =
      selectedDifficulty === "ALL" ||
      (p.difficulty_level || "MEDIUM").toUpperCase() === selectedDifficulty.toUpperCase();

    const matchesCategory =
      selectedCategory === "ALL" ||
      (p.category && p.category.toUpperCase() === selectedCategory.toUpperCase());

    return matchesSearch && matchesDiff && matchesCategory;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDifficulty, selectedCategory]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage));
  const currentProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-100 font-mono relative overflow-x-hidden select-none">
      {/* BACKGROUND GRID */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] z-0" />
      <div className="fixed top-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* DESKTOP SIDEBAR */}
      <DashboardSidebar rating={1248} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-[245px] p-6 lg:p-8 flex flex-col gap-6 max-w-[1400px] z-10 relative">
        {/* HEADER BAR */}
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
          <div className="text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 px-3.5 py-1.5 rounded shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            TOTAL PROBLEMS: <strong className="text-white">{problems.length}</strong>
          </div>
        </header>

        {/* SEARCH & DIFFICULTY FILTER BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-cyan-500/20 bg-slate-950/60 p-4 rounded">
          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by problem title or #..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-xs text-slate-200 pl-9 pr-4 py-2 rounded focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* DIFFICULTY FILTER TABS */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-500 font-bold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> DIFFICULTY:
            </span>
            {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`px-3 py-1 text-xs font-bold tracking-wider rounded border transition-all ${
                  selectedDifficulty === d
                    ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* PROBLEMS TABLE */}
        <div className="border border-cyan-500/20 bg-slate-950/40 rounded overflow-hidden shadow-xl">
          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 p-3.5 bg-black/80 border-b border-cyan-500/20 text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase">
            <span className="col-span-1">#</span>
            <span className="col-span-5">PROBLEM TITLE</span>
            <span className="col-span-2">DIFFICULTY</span>
            <span className="col-span-2">LANGUAGES</span>
            <span className="col-span-2 text-right">ACTION</span>
          </div>

          {/* TABLE BODY */}
          <div className={`flex flex-col divide-y divide-white/5 ${isPending ? "opacity-60 transition-opacity" : ""}`}>
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={8} />
              </div>
            ) : currentProblems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono">
                NO PROBLEMS FOUND MATCHING YOUR CRITERIA.
              </div>
            ) : (
              currentProblems.map((p, idx) => {
                const diff = (p.difficulty_level || "MEDIUM").toUpperCase();
                const diffColor =
                  diff === "EASY"
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                    : diff === "HARD"
                    ? "text-rose-400 border-rose-500/30 bg-rose-950/30"
                    : "text-amber-400 border-amber-500/30 bg-amber-950/30";

                const problemNumber = p.problem_number || (currentPage - 1) * itemsPerPage + idx + 1;

                return (
                  <div
                    key={p.id || idx}
                    onClick={() =>
                      navigate(
                        `/terminal?oid=${p.github_oid || p.id}${p.name ? `&file=${encodeURIComponent(p.name)}` : ""}`
                      )
                    }
                    className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-cyan-950/20 hover:border-l-2 hover:border-l-cyan-400 transition-all cursor-pointer group"
                  >
                    {/* PROBLEM NUMBER */}
                    <span className="col-span-1 font-mono text-slate-500 font-bold">
                      #{problemNumber}
                    </span>

                    {/* PROBLEM TITLE */}
                    <div className="col-span-5 flex items-center gap-2 pr-2">
                      <span className="font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {p.name}
                      </span>
                    </div>

                    {/* DIFFICULTY */}
                    <div className="col-span-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold uppercase ${diffColor}`}>
                        {diff}
                      </span>
                    </div>

                    {/* LANGUAGES */}
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400">
                        JS
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400">
                        PY
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400">
                        JAVA
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400">
                        C++
                      </span>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="col-span-2 text-right">
                      <button className="px-3 py-1 bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-black border border-cyan-500/40 font-bold rounded transition-all inline-flex items-center gap-1 cursor-pointer">
                        <span>[ SOLVE ]</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION FOOTER */}
          {!loading && filteredProblems.length > 0 && (
            <div className="p-4 border-t border-cyan-500/20 bg-black/40 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong className="text-white">
                  {Math.min(currentPage * itemsPerPage, filteredProblems.length)}
                </strong>{" "}
                of <strong className="text-white">{filteredProblems.length}</strong> problems
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>PREV</span>
                </button>

                <span className="px-3 py-1.5 rounded border border-white/10 bg-black/40 text-slate-300 font-bold">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>NEXT</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
