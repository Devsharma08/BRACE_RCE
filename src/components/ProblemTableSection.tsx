import React, { useState } from "react";
import { Database, Search, ChevronLeft, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ProblemTableSectionProps {
  problems: any[];
}

const DIFF_TABS = ["ALL", "EASY", "MEDIUM", "HARD"] as const;

const diffCls = (d: string) =>
  d === "HARD"   ? "text-rose-400 border-rose-500/25"
  : d === "MEDIUM" ? "text-amber-400 border-amber-500/25"
  : "text-emerald-400 border-emerald-500/25";

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
    <div className="relative w-full border border-white/5 bg-black/40">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500/25" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-purple-500/25" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-purple-500/25" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-500/25" />

      {/* HEADER */}
      <div className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 font-mono text-sm font-black text-white uppercase tracking-wider">
          <Database className="w-4 h-4 text-purple-400" />
          Algorithm Repository
          <span className="text-[10px] text-purple-500/50 font-normal tracking-widest">// PROBLEM DATABANK</span>
        </h3>

        <div className="flex items-center gap-3">
          {/* SEARCH */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="bg-black/50 border border-white/[0.07] hover:border-white/15 text-slate-400 text-[11px] pl-8 pr-4 py-2 font-mono focus:border-purple-500/50 focus:outline-none transition-colors w-44 placeholder:text-slate-700 uppercase"
            />
          </div>

          {/* DIFF TABS */}
          <div className="flex border border-white/[0.06] divide-x divide-white/[0.06]">
            {DIFF_TABS.map((d) => {
              const active = selectedDiff === d;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDiff(d); setCurrentPage(1); }}
                  className={`px-3 py-2 text-[10px] font-black tracking-widest uppercase transition-all ${
                    active ? "bg-white/8 text-white" : "text-slate-600 hover:text-slate-400"
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
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["#", "STATUS", "PROBLEM NAME", "DIFFICULTY", "TIME LIMIT", ""].map((h, i) => (
                <th
                  key={i}
                  className={`py-3 px-4 text-[9px] text-slate-600 font-bold tracking-[0.2em] uppercase text-left whitespace-nowrap ${i === 5 ? "text-right pr-6" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-700 text-xs tracking-widest uppercase">
                  No Matching Problems In Databank
                </td>
              </tr>
            ) : (
              paged.map((prob, idx) => {
                const globalIdx = (currentPage - 1) * PER_PAGE + idx + 1;
                const diff = prob.difficulty_level as string;
                return (
                  <tr key={prob.id} className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 text-[10px] text-slate-700">{String(globalIdx).padStart(2, "0")}</td>
                    <td className="py-4 px-4">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-white/90 tracking-wide group-hover:text-white transition-colors">
                        {prob.name}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[9px] border px-1.5 py-0.5 font-black uppercase ${diffCls(diff)}`}>
                        {diff}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-[11px]">
                      {prob.timeLimitMs ? `${prob.timeLimitMs / 1000}s` : "10m"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/battle/practice?oid=${prob.github_oid || prob.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-purple-500/40 text-slate-500 hover:text-purple-400 text-[10px] font-black tracking-widest uppercase transition-all"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" /> SOLVE
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
      <div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between font-mono">
        <span className="text-[9px] text-slate-700 tracking-widest uppercase">
          Page {currentPage} / {totalPages} · {filtered.length} problems
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 border border-white/[0.06] hover:border-white/20 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-7 h-7 text-[10px] font-black transition-all border ${
                currentPage === p
                  ? "border-purple-500/40 text-purple-400 bg-purple-950/20"
                  : "border-white/[0.05] text-slate-600 hover:text-white hover:border-white/20"
              }`}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && <span className="text-slate-700 text-xs px-1">...</span>}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-white/[0.06] hover:border-white/20 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
