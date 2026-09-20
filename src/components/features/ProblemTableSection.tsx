import React, { useState } from "react";
import { Database, Search, ChevronLeft, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ProblemTableSectionProps {
  problems: any[];
}

const DIFF_TABS = ["ALL", "EASY", "MEDIUM", "HARD"] as const;

const diffCls = (d: string) =>
  d === "HARD"   ? "text-accent-danger border-accent-danger/30 bg-accent-danger/10"
  : d === "MEDIUM" ? "text-accent-warning border-accent-warning/30 bg-accent-warning/10"
  : "text-accent-success border-accent-success/30 bg-accent-success/10";

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
    <div className="relative w-full border border-accent-primary/20 bg-gradient-to-b from-accent-primary/10 via-black/70 to-black font-mono shadow-xl shadow-accent-primary/5">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-primary" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent-primary" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent-primary" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-primary" />

      {/* HEADER */}
      <div className="px-6 py-4 border-b border-subtle-line bg-black/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-fg uppercase tracking-wider">
          <Database className="w-4 h-4 text-accent-primary" />
          Algorithm Repository
          <span className="text-[10px] text-accent-primary/60 font-normal tracking-widest">// DATABANK</span>
        </h3>

        <div className="flex items-center gap-3">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-accent-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="SEARCH PROBLEM..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="bg-black/60 border border-accent-primary/30 hover:border-accent-primary text-subtle text-[11px] pl-9 pr-4 py-2 focus:border-accent-primary focus:outline-none transition-colors w-48 placeholder:text-faint uppercase font-bold"
            />
          </div>

          {/* DIFFICULTY TABS */}
          <div className="flex border border-accent-primary/30 bg-black/60 divide-x divide-accent-primary/20">
            {DIFF_TABS.map((d) => {
              const active = selectedDiff === d;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDiff(d); setCurrentPage(1); }}
                  className={`px-3 py-2 text-[10px] font-black tracking-widest uppercase transition-all ${
                    active ? "bg-accent-primary/10 text-accent-primary" : "text-subtle hover:text-subtle"
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
            <tr className="border-b border-subtle-line bg-surface-hover">
              {["#", "STATUS", "PROBLEM NAME", "DIFFICULTY", "TIME LIMIT", "ACTION"].map((h, i) => (
                <th
                  key={i}
                  className={`py-3.5 px-4 text-[9px] text-subtle font-bold tracking-[0.2em] uppercase text-left whitespace-nowrap ${
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
                <td colSpan={6} className="text-center py-12 text-faint text-xs tracking-widest uppercase font-bold">
                  No Matching Algorithm Problems Found
                </td>
              </tr>
            ) : (
              paged.map((prob, idx) => {
                const globalIdx = (currentPage - 1) * PER_PAGE + idx + 1;
                const diff = prob.difficulty_level as string;
                return (
                  <tr key={prob.id} className="group border-b border-subtle-line hover:bg-accent-primary/10 transition-colors">
                    <td className="py-4 px-4 text-[10px] text-subtle font-bold">{String(globalIdx).padStart(2, "0")}</td>
                    <td className="py-4 px-4">
                      <CheckCircle2 className="w-4 h-4 text-accent-success/60 group-hover:text-accent-success transition-colors" />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-fg tracking-wide group-hover:text-accent-primary transition-colors">
                        {prob.name}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[9px] border px-2 py-0.5 font-black uppercase ${diffCls(diff)}`}>
                        {diff}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-subtle text-[11px] font-bold">
                      {prob.timeLimitMs ? `${prob.timeLimitMs / 1000}s` : "10m"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/terminal?id=${prob.id || prob.github_oid}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-accent-primary/30 hover:border-accent-primary bg-accent-primary/10 text-accent-primary hover:text-fg text-[10px] font-black tracking-widest uppercase transition-all shadow-sm"
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
      <div className="px-6 py-3.5 border-t border-subtle-line bg-base/80 flex items-center justify-between font-mono">
        <span className="text-xs text-subtle font-bold tracking-widest uppercase">
          PAGE {currentPage} OF {totalPages} · <span className="text-accent-primary">{filtered.length} PROBLEMS LOGGED</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-accent-primary/40 bg-accent-primary/10 hover:border-accent-primary text-accent-primary hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 text-xs font-black transition-all border flex items-center justify-center ${
                currentPage === p
                  ? "border-accent-primary text-ink bg-accent-primary/15 shadow-md shadow-accent-primary/30"
                  : "border-accent-primary/30 text-subtle bg-black/60 hover:text-fg hover:border-accent-primary"
              }`}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && <span className="text-subtle text-xs px-1 font-bold">...</span>}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-accent-primary/40 bg-accent-primary/10 hover:border-accent-primary text-accent-primary hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
