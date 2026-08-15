import React, { useState } from "react";
import { Database, Search, ChevronLeft, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ProblemTableSectionProps {
  problems: any[];
}

export const ProblemTableSection: React.FC<ProblemTableSectionProps> = ({ problems }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredProblems = problems.filter((prob) => {
    const matchesSearch = prob.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = selectedDifficulty === "ALL" || prob.difficulty_level === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage));
  const displayedProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const diffConfig: Record<string, { label: string; cls: string }> = {
    EASY:   { label: "EASY",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    MEDIUM: { label: "MEDIUM", cls: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
    HARD:   { label: "HARD",   cls: "text-rose-400 bg-rose-500/10 border-rose-500/25" },
  };

  return (
    <div className="relative w-full bg-[#080a0d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      {/* FILTER HEADER */}
      <div className="px-6 py-4 border-b border-white/[0.05] bg-black/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-mono text-sm font-black text-white tracking-[0.15em] flex items-center gap-2.5 uppercase">
          <Database className="w-4 h-4 text-purple-400" /> Algorithm Repository
          <span className="text-[10px] text-purple-500/60 font-normal ml-1">// PROBLEM DATABANK</span>
        </h3>

        <div className="flex items-center gap-3 flex-wrap">
          {/* SEARCH */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="SEARCH PROBLEMS..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="bg-black/60 border border-white/[0.07] hover:border-white/[0.12] text-slate-300 text-[11px] rounded-lg pl-9 pr-4 py-2 font-mono focus:border-purple-500/60 focus:outline-none transition-colors w-52 placeholder:text-slate-700"
            />
          </div>

          {/* DIFFICULTY TABS */}
          <div className="flex bg-black/60 border border-white/[0.06] rounded-lg p-0.5 gap-0.5">
            {["ALL", "EASY", "MEDIUM", "HARD"].map((diff) => {
              const active = selectedDifficulty === diff;
              const colMap: Record<string, string> = {
                ALL: active ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-400",
                EASY: active ? "bg-emerald-500/20 text-emerald-400" : "text-slate-600 hover:text-emerald-500",
                MEDIUM: active ? "bg-amber-500/20 text-amber-400" : "text-slate-600 hover:text-amber-500",
                HARD: active ? "bg-rose-500/20 text-rose-400" : "text-slate-600 hover:text-rose-500",
              };
              return (
                <button
                  key={diff}
                  onClick={() => { setSelectedDifficulty(diff); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-black tracking-wider transition-all ${colMap[diff]}`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs text-slate-300">
          <thead>
            <tr className="border-b border-white/[0.04] bg-black/20">
              {["#", "STATUS", "PROBLEM NAME", "DIFFICULTY", "TIME LIMIT", ""].map((h, i) => (
                <th
                  key={i}
                  className={`py-3 px-4 text-[9px] text-slate-600 font-bold tracking-[0.2em] uppercase whitespace-nowrap ${i === 5 ? "text-right pr-6" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedProblems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-700 font-mono text-xs tracking-widest">
                  NO MATCHING PROBLEMS IN DATABANK
                </td>
              </tr>
            ) : (
              displayedProblems.map((prob, idx) => {
                const diff = prob.difficulty_level as string;
                const dc = diffConfig[diff] || { label: diff, cls: "text-slate-400 bg-white/5 border-white/10" };
                const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;

                return (
                  <tr
                    key={prob.id}
                    className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 text-slate-700 text-[10px]">{String(globalIdx).padStart(2, "0")}</td>

                    <td className="py-4 px-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/60 group-hover:text-emerald-400 transition-colors" />
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-black text-[12px] text-white/90 tracking-wide group-hover:text-white transition-colors">
                        {prob.name}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`text-[9px] px-2.5 py-1 rounded-full border font-black ${dc.cls}`}>
                        {dc.label}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-600 text-[11px]">
                      {prob.timeLimitMs ? `${prob.timeLimitMs / 1000}s` : "10m"}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/battle/practice?oid=${prob.github_oid || prob.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/8 hover:bg-purple-500/20 border border-purple-500/25 hover:border-purple-400 text-purple-400 hover:text-purple-200 rounded-lg font-black text-[10px] transition-all tracking-widest"
                      >
                        <Play className="w-3 h-3 fill-purple-400" /> SOLVE
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="px-6 py-3 border-t border-white/[0.04] bg-black/20 flex items-center justify-between font-mono">
        <span className="text-[9px] text-slate-700 tracking-widest">
          PAGE {currentPage} / {totalPages} · {filteredProblems.length} PROBLEMS
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-black/60 border border-white/[0.06] hover:border-white/20 text-slate-500 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                  currentPage === page
                    ? "bg-purple-500/25 border border-purple-500/50 text-purple-300"
                    : "bg-black/40 border border-white/[0.05] text-slate-600 hover:text-white hover:border-white/20"
                }`}
              >
                {page}
              </button>
            );
          })}

          {totalPages > 5 && (
            <span className="text-slate-700 text-xs px-1">...</span>
          )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 bg-black/60 border border-white/[0.06] hover:border-white/20 text-slate-500 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
