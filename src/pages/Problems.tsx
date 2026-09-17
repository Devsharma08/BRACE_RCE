import React, { useState, useEffect, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useMyRating } from "../hooks/useLeaderboard";
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
  AlertTriangle,
} from "lucide-react";

export const Problems: React.FC = () => {
  const { user } = useAuth();
  const { data: myRating } = useMyRating(true);
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

  const { data: problems = [], isLoading: loading, isError: isProblemsError, refetch: refetchProblems } = useQuery<any[]>({
    queryKey: ["system-problems"],
    // Problem definitions never change during a session — fetch once per mount
    // window instead of on every visit. Progress changes (solved/attempts) are
    // handled by invalidateProblemQueries() at the write sites.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
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
    <div className="flex min-h-screen bg-void text-slate-100 font-mono relative select-none">
      {/* Dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />
      <div className="fixed top-1/3 left-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Desktop sidebar */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* MAIN CONTENT AREA */}
      <main
        className="
          flex-1 min-w-0 w-full
          ml-0 md:ml-[60px] lg:ml-[245px]
          pt-14 px-4 py-6 md:px-8 md:py-8
          pb-20 md:pb-8
          flex flex-col gap-6
        "
      >
        {/* HEADER BAR */}
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/15 pb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>PROBLEM REPOSITORY</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore and solve algorithmic challenges across all data structures
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 whitespace-nowrap">
              SOLVED: <strong className="text-white">{problems.filter((p: any) => p.isSolved).length}</strong> / {problems.length}
            </div>
            <div className="text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 px-3 py-1.5 whitespace-nowrap">
              TOTAL: <strong className="text-white">{problems.length}</strong>
            </div>
          </div>
        </header>

        {/* SEARCH & DIFFICULTY FILTER BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-cyan-500/20 bg-raised p-4 rounded-none">
          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-cyan-500/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search problems"
              placeholder="Search by problem title or #..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-raised border border-cyan-500/15 text-xs text-slate-200 pl-9 pr-4 py-2 rounded-none focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* DIFFICULTY FILTER TABS */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[10px] font-mono text-label uppercase tracking-[0.2em] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> DIFFICULTY:
            </span>
            {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                aria-pressed={selectedDifficulty === d}
                className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-none border transition-all ${
                  selectedDifficulty === d
                    ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-raised border-cyan-500/15 text-slate-400 hover:border-cyan-400 hover:text-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* QUERY FAILURE — themed error state with retry */}
        {isProblemsError && !loading && (
          <div className="flex flex-col items-center gap-3 border border-rose-500/30 bg-rose-950/20 p-10 text-center">
            <div className="w-12 h-12 rounded-none border border-rose-500/40 bg-rose-950/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-sm font-mono font-bold tracking-widest text-rose-300">
              FAILED TO QUERY PROBLEM REPOSITORY
            </p>
            <p className="text-xs font-mono text-slate-400 max-w-md">
              The server did not return the problem list. Check your connection and retry the query.
            </p>
            <button
              onClick={() => refetchProblems()}
              className="mt-1 px-5 py-2 text-xs font-mono font-bold tracking-widest border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-none transition-all active:scale-95"
            >
              [ RETRY QUERY ]
            </button>
          </div>
        )}

        {/* PROBLEMS TABLE — overflow-x-auto is intentional: table scrolls horizontally on
            narrow screens rather than breaking the page layout */}
        {!isProblemsError && (
        <div className="border border-cyan-500/15 bg-raised overflow-x-auto shadow-xl">
          <div className="min-w-[640px]">
          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 p-3.5 bg-void border-b border-cyan-500/20 text-[10px] font-mono text-cyan-500/40 tracking-[0.2em] uppercase">
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
                        `/terminal?id=${p.id || p.github_oid}`
                      )
                    }
                    className="grid grid-cols-12 p-3.5 text-xs items-center border-l-2 border-l-transparent hover:bg-cyan-500/5 hover:border-l-cyan-500/40 transition-all cursor-pointer group"
                  >
                    {/* PROBLEM NUMBER & SOLVED STATUS */}
                    <div className="col-span-1 flex items-center gap-1.5 font-mono text-slate-500 font-bold">
                      {p.isSolved ? (
                        <span title="Solved" className="inline-flex">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </span>
                      ) : (
                        <span className="text-slate-600">#{problemNumber}</span>
                      )}
                    </div>

                    {/* PROBLEM TITLE */}
                    <div className="col-span-5 flex items-center gap-2 pr-2">
                      <span className="font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {p.name}
                      </span>
                      {p.isSolved && (
                        <span className="text-[9px] px-1.5 py-0.5 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-none font-bold uppercase shrink-0">
                          SOLVED
                        </span>
                      )}
                    </div>

                    {/* DIFFICULTY */}
                    <div className="col-span-2">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded-sm uppercase ${diffColor}`}>
                        {diff}
                      </span>
                    </div>

                    {/* LANGUAGES */}
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-raised border border-cyan-500/15 text-slate-400">
                        JS
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-raised border border-cyan-500/15 text-slate-400">
                        PY
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-raised border border-cyan-500/15 text-slate-400">
                        JAVA
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-raised border border-cyan-500/15 text-slate-400">
                        C++
                      </span>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="col-span-2 text-right">
                      <button className="px-3 py-1 bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-black border border-cyan-500/40 font-bold rounded-none transition-all inline-flex items-center gap-1 cursor-pointer">
                        <span>[ {p.isSolved ? "PRACTICE" : "SOLVE"} ]</span>
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
            <div className="p-4 border-t border-cyan-500/20 bg-raised flex items-center justify-between text-xs">
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
                  className="px-3 py-1.5 rounded-none border border-cyan-500/20 bg-raised text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-400 font-bold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>PREV</span>
                </button>

                <span className="px-3 py-1.5 rounded-none border border-cyan-400 bg-cyan-500/10 text-cyan-400 font-bold">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-none border border-cyan-500/20 bg-raised text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-400 font-bold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>NEXT</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          </div>{/* min-w wrapper */}
        </div>
        )}
      </main>
    </div>
  );
};
