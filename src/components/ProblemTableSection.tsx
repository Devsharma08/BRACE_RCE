import React, { useState } from "react";
import { Code2, Search, CheckCircle2, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

interface ProblemTableSectionProps {
  problems: any[];
}

export const ProblemTableSection: React.FC<ProblemTableSectionProps> = ({ problems }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter problems
  const filteredProblems = problems.filter((prob) => {
    const matchesSearch = prob.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = selectedDifficulty === "ALL" || prob.difficulty_level === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage));
  const displayedProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
      {/* FILTER & SEARCH HEADER */}
      <div className="p-5 border-b border-cyan-500/20 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-mono text-base text-cyan-400 font-bold tracking-widest flex items-center gap-2">
          <Code2 className="w-5 h-5" /> ALGORITHM REPOSITORY
        </h3>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* SEARCH BAR */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="SEARCH PROBLEMS..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* DIFFICULTY TABS */}
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            {["ALL", "EASY", "MEDIUM", "HARD"].map((diff) => (
              <button
                key={diff}
                onClick={() => { setSelectedDifficulty(diff); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider transition-all ${
                  selectedDifficulty === diff ? "bg-cyan-500 text-black shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE LIST */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs text-slate-300">
          <thead className="bg-black/60 text-slate-500 text-[10px] uppercase tracking-widest border-b border-white/5">
            <tr>
              <th className="py-3 px-6">STATUS</th>
              <th className="py-3 px-6">PROBLEM NAME</th>
              <th className="py-3 px-6">DIFFICULTY</th>
              <th className="py-3 px-6 text-center">TIME LIMIT</th>
              <th className="py-3 px-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayedProblems.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  NO MATCHING PROBLEMS FOUND
                </td>
              </tr>
            ) : (
              displayedProblems.map((prob) => (
                <tr key={prob.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-80" />
                  </td>
                  <td className="py-4 px-6 font-bold text-white tracking-wider">
                    {prob.name}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-[10px] px-2.5 py-1 rounded font-bold ${
                      prob.difficulty_level === 'HARD' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      prob.difficulty_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {prob.difficulty_level}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-slate-400">
                    {prob.timeLimitMs ? `${prob.timeLimitMs / 1000}s` : "10m"}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      to={`/battle/practice?oid=${prob.github_oid || prob.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white rounded-lg font-bold transition-all text-xs"
                    >
                      <Play className="w-3 h-3" /> [ SOLVE ]
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION MENU */}
      <div className="p-4 border-t border-cyan-500/20 bg-black/40 flex items-center justify-between font-mono text-xs">
        <span className="text-slate-500 text-[10px]">
          SHOWING PAGE {currentPage} OF {totalPages} ({filteredProblems.length} TOTAL)
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 font-bold rounded">
            {currentPage}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
