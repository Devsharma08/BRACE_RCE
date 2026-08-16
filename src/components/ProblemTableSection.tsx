import React, { useState } from "react";
import { Database, Search, ChevronLeft, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ProblemTableSectionProps {
  problems: any[];
}

const DIFF_TABS = ["ALL", "EASY", "MEDIUM", "HARD"] as const;

const diffCls = (d: string) =>
  d === "HARD"   ? "text-rose-400 border-rose-500/30 bg-rose-950/30"
  : d === "MEDIUM" ? "text-amber-400 border-amber-500/30 bg-amber-950/30"
  : "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";

export const ProblemTableSection: React.FC<ProblemTableSectionProps> = ({ problems }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDiff, setSelectedDiff] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = problems.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDiff = selectedDiff === "ALL" || p.difficulty_level === selectedDiff;
    return matchSearch && matchDiff;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="relative w-full border border-purple-500/20 bg-gradient-to-b from-purple-950/10 via-slate-950/70 to-black font-mono shadow-xl shadow-purple-950/5">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-500" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-purple-500" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-500" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-500" />

      {/* HEADER */}
      <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-wider">
          <Database className="w-4 h-4 text-purple-400" />
          Algorithm Repository
          <span className="text-[10px] text-purple-400/60 font-normal tracking-widest">// DATABANK</span>
        </h3>

        <div className="flex items-center gap-3">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="SEARCH PROBLEM..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="bg-black/60 border border-purple-500/30 hover:border-purple-400 text-slate-200 text-[11px] pl-9 pr-4 py-2 focus:border-purple-400 focus:outline-none transition-colors w-48 placeholder:text-slate-600 uppercase font-bold"
            />
          </div>

          {/* DIFFICULTY TABS */}
          <div className="flex border border-purple-500/30 bg-black/60 divide-x divide-purple-500/20">
            {DIFF_TABS.map((d) => {
              const active = selectedDiff === d;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDiff(d); setCurrentPage(1); }}
                  className={`px-3 py-2 text-[10px] font-black tracking-widest uppercase transition-all ${
                    active ? "bg-purple-950/60 text-purple-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["#", "STATUS", "PROBLEM NAME", "DIFFICULTY", "TIME LIMIT", "ACTION"].map((h, i) => (
                <th
                  key={i}
                  className={`py-3.5 px-4 text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase text-left whitespace-nowrap ${
                    i === 5 ? "text-right pr-6" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 text-xs tracking-widest uppercase font-bold">
                  No Matching Algorithm Problems Found
                </td>
              </tr>
            ) : (
              paged.map((prob, idx) => {
                const globalIdx = (currentPage - 1) * PER_PAGE + idx + 1;
                const diff = prob.difficulty_level as string;
                return (
                  <tr key={prob.id} className="group border-b border-white/5 hover:bg-purple-950/20 transition-colors">
                    <td className="py-4 px-4 text-[10px] text-slate-400 font-bold">{String(globalIdx).padStart(2, "0")}</td>
                    <td className="py-4 px-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-white tracking-wide group-hover:text-purple-300 transition-colors">
                        {prob.name}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[9px] border px-2 py-0.5 font-black uppercase ${diffCls(diff)}`}>
                        {diff}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-[11px] font-bold">
                      {prob.timeLimitMs ? `${prob.timeLimitMs / 1000}s` : "10m"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/battle/practice?oid=${prob.github_oid || prob.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-500/30 hover:border-purple-400 bg-purple-950/20 text-purple-300 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" /> SOLVE
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
      <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between font-mono">
        <span className="text-xs text-slate-300 font-bold tracking-widest uppercase">
          PAGE {currentPage} OF {totalPages} · <span className="text-purple-400">{filtered.length} PROBLEMS LOGGED</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-purple-500/40 bg-purple-950/20 hover:border-purple-400 text-purple-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 text-xs font-black transition-all border flex items-center justify-center ${
                currentPage === p
                  ? "border-purple-400 text-purple-200 bg-purple-950/80 shadow-md shadow-purple-950/50"
                  : "border-purple-500/30 text-slate-300 bg-black/40 hover:text-white hover:border-purple-400"
              }`}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && <span className="text-slate-400 text-xs px-1 font-bold">...</span>}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-purple-500/40 bg-purple-950/20 hover:border-purple-400 text-purple-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
