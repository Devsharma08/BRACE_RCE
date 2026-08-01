/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams } from "react-router-dom";
import { FileCode, Loader2, X } from "lucide-react";
import React,{ useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ChangeEvent, useCallback } from "react";
import type { FileEntry } from "../../../context/fileNamesContext";
import type { FileContentResponse } from "../types";

type FileExplorerProps = {
  activeFile: string | null;
  activeFileName: string;
  files: FileEntry[];
  fileData: FileContentResponse | null;
  language: string;
  setDifficultyFilter: (filter: "ALL" | "EASY" | "MEDIUM" | "HARD") => void;
  difficultyFilter: "ALL" | "EASY" | "MEDIUM" | "HARD";
  testCaseCount: number;
  sidebarWidth: number;
  onFileClick: (oid: string, name: string) => void;
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
  onCreateFile?: (name: string) => void;
  onDeleteLocalFile: (oid: string) => void;
  isLoadingFiles: boolean;
  selectedMode: "files-mode" | "terminal-mode";
  setSelectedMode: (mode: "files-mode" | "terminal-mode") => void;
};

type SidebarFilesModeProps = {
  searchInput: string;
  setSearchInput: (val: string) => void;
  isSmall: boolean;
  difficultyFilter: "ALL" | "EASY" | "MEDIUM" | "HARD";
  setDifficultyFilter: (filter: "ALL" | "EASY" | "MEDIUM" | "HARD") => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  languageFilter: string;
  setLanguageFilter: (val: string) => void;
  files: FileEntry[];
  fileData: FileContentResponse | null;
  language: string;
  testCaseCount: number;
  activeFile: string | null;
  activeFileName: string;
  onFileClick: (oid: string, name: string) => void;
  isLoadingFiles: boolean;
  filteredFiles: FileEntry[];
  searchActive: boolean;
  renderLoadingState: (label: string) => React.ReactNode;
  detailsPanelClass: string;
  activeFileEntry?: FileEntry;
};

const SidebarFilesMode = React.memo(({
  searchInput,
  setSearchInput,
  isSmall,
  difficultyFilter,
  setDifficultyFilter,
  categoryFilter,
  setCategoryFilter,
  languageFilter,
  setLanguageFilter,
  files,
  fileData,
  language,
  testCaseCount,
  activeFile,
  activeFileName,
  onFileClick,
  isLoadingFiles,
  filteredFiles,
  searchActive,
  renderLoadingState,
  detailsPanelClass,
  activeFileEntry,
}: SidebarFilesModeProps) => {
    return(
       <>
            <div className="p-3 border border-white/5 bg-black/20 relative overflow-visible search-container">
              <div className="space-y-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[10px] font-mono text-cyan-500/40 select-none">&gt;</span>
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={isSmall ? "FIND..." : "FILTER_FILES // SEARCH..."}
                    className="w-full rounded-none border border-white/10 bg-black/40 pl-7 pr-3 py-2 text-xs font-mono text-cyan-400 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 placeholder:text-slate-600"
                  />
                </div>

                {/* Dynamic difficulty level pills */}
                <div className="flex gap-1 mt-2">
                  {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((filter) => {
                    const isActive = difficultyFilter === filter;
                    const activeClasses: Record<string, string> = {
                      ALL: "border-indigo-500/30 text-indigo-400 bg-indigo-950/10",
                      EASY: "border-green-500/30 text-green-400 bg-green-950/10",
                      MEDIUM: "border-yellow-500/30 text-yellow-400 bg-yellow-950/10",
                      HARD: "border-red-500/30 text-red-400 bg-red-950/10",
                    };
                    const inactiveClasses = "text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-400 bg-transparent";

                    return (
                      <button
                        key={filter}
                        onClick={() => setDifficultyFilter(filter)}
                        type="button"
                        className={`px-2 py-1 rounded-none text-[8px] font-mono border tracking-wider transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
                          isActive ? activeClasses[filter] : inactiveClasses
                        }`}
                      >
                        <span className="badge-text-full whitespace-nowrap">[ {filter} ]</span>
                        <span className="badge-text-short whitespace-nowrap">[ {filter === "ALL" ? "ALL" : filter[0]} ]</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic category and language selector dropdowns */}
                {!isSmall && (
                  <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full rounded-none border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-mono text-cyan-400/80 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 cursor-pointer uppercase appearance-none hover:text-cyan-400 hover:border-cyan-500/30"
                      >
                        <option value="ALL">SYS // CATEGORIES</option>
                        <option value="linked list">LINKED LIST</option>
                        <option value="array">ARRAY</option>
                        <option value="string">STRING</option>
                        <option value="math">MATH</option>
                        <option value="graph">GRAPH</option>
                        <option value="queue">QUEUE</option>
                        <option value="stack">STACK</option>
                        <option value="tree">TREE</option>
                        <option value="dynamic prog">DYNAMIC PROG</option>
                        <option value="recursion">RECURSION</option>
                        <option value="backtracking">BACKTRACKING</option>
                        <option value="searching">SEARCHING</option>
                        <option value="greedy">GREEDY</option>
                        <option value="interval problems">INTERVAL PROBLEMS</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[8px] text-cyan-500/40 select-none">
                        ▼
                      </div>
                    </div>

                    <div className="relative flex-1">
                      <select
                        value={languageFilter}
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        className="w-full rounded-none border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-mono text-cyan-400/80 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 cursor-pointer uppercase appearance-none hover:text-cyan-400 hover:border-cyan-500/30"
                      >
                        <option value="ALL">SYS // LANGUAGES</option>
                        <option value="java">JAVA</option>
                        <option value="javascript">JAVASCRIPT</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[8px] text-cyan-500/40 select-none">
                        ▼
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex sidebar-details items-center justify-between gap-1 text-[9px] font-mono text-slate-500 tracking-wider">
                  <span>
                    {searchActive
                      ? `MATCH // ${filteredFiles.length} OF ${files.length}`
                      : "STATUS // LISTING_ALL"}
                  </span>
                  {searchActive && <span className="text-cyan-400">SEARCH_ACTIVE</span>}
                </div>
              </div>
            </div>

            {/* Filtered Files List */}
            <div className="p-1 sidebar-list-container text-xs text-slate-400 flex flex-col gap-1.5 mt-2">
              <div className="text-[9px] sidebar-details font-mono uppercase tracking-widest text-slate-500 mb-1 border-b border-white/5 pb-0.5">
                SYS // FILTERED_EXPLORER_FILES
              </div>
              <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-slate-950/40 [&::-webkit-scrollbar-thumb]:bg-slate-700/60">
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <button
                      key={`${file.oid}:${file.name}`}
                      type="button"
                      onClick={() => onFileClick(file.oid, file.name)}
                      className={`group file-button-compact flex w-full items-center justify-between gap-3 rounded-none border px-3 py-2 text-left text-xs font-mono transition-all border-l-2 cursor-pointer ${
                        activeFile === file.oid && activeFileName === file.name
                          ? "border-cyan-500/40 bg-cyan-950/15 text-cyan-400 border-l-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.05)]"
                          : "border-white/5 bg-black/30 text-cyan-400/80 hover:border-cyan-500/30 hover:bg-cyan-950/5 hover:text-cyan-400 border-l-cyan-500/10 hover:border-l-cyan-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode className="file-icon h-3.5 w-3.5 text-cyan-400/60 group-hover:text-cyan-400 flex-shrink-0" />
                        <span className="file-name-text font-medium truncate">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {file.data_structure && !isSmall && (
                          <span className="rounded-none border border-white/10 bg-black/60 px-1 py-0.5 text-[7px] uppercase tracking-wider text-slate-500 font-mono font-normal">
                            {file.data_structure}
                          </span>
                        )}
                        <DifficultyBadge level={file.difficulty_level || file.diffculty_level || "E"} />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-600 font-mono p-1">// NO_FILES_MATCH_FILTERS</div>
                )}
              </div>
            </div>

            {isLoadingFiles ? (
              <div className="border-b sidebar-details border-white/5 bg-black/20 p-4">
                {renderLoadingState("Syncing repository files...")}
              </div>
            ) : null}

            <div className={detailsPanelClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">// SELECTED_FILE</div>
                  <div className="text-xs font-mono font-bold text-white break-words mt-1">
                    {activeFileEntry?.name || "NO_ACTIVE_FILE"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-none border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-cyan-400/60 font-mono">
                    {language.toUpperCase() || ""}
                  </span>
                  {fileData?.data_structure && (
                    <span className="rounded-none border border-cyan-500/25 bg-cyan-950/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-cyan-400/80 font-mono select-none">
                      {fileData.data_structure}
                    </span>
                  )}
                  <DifficultyBadge level={fileData?.difficulty_level || "E"} />
                  {testCaseCount ? (
                    <span className="rounded-none border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-cyan-400/60 font-mono">
                      {testCaseCount} CASES
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-none border border-white/5 bg-black/20 p-3 text-xs text-slate-300">
                <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2 font-bold">// PROBLEM_DEFINITION</div>
                <div className="whitespace-pre-wrap leading-relaxed text-slate-400 font-mono text-[10px]">
                  {fileData?.problem_definition || "No definition constraints seeded for this solution template."}
                </div>
              </div>

              <div className="rounded-none border border-white/5 bg-black/20 p-3 text-xs text-slate-300">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-2 font-bold">// TEST_CASES</div>
                {fileData?.test_cases?.length ? (
                  <div className="space-y-3">
                    {fileData.test_cases.map((testCase, index) => (
                      <div key={`test-case-${index}`} className="rounded-none border border-white/5 bg-black/40 p-3 font-mono text-[10px]">
                        <div className="text-[9px] text-slate-500 mb-2">// CASE_{index + 1}</div>
                        <div className="mb-2">
                          <div className="text-[8px] uppercase tracking-wider text-slate-600 mb-0.5">INPUT</div>
                          <pre className="rounded-none bg-black/60 border border-white/5 p-2 text-[10px] text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">{testCase.input ?? "-"}</pre>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase tracking-wider text-slate-600 mb-0.5">EXPECTED_OUTPUT</div>
                          <pre className="rounded-none bg-black/60 border border-white/5 p-2 text-[10px] text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">{testCase.expectedOutput ?? "-"}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 font-mono">// NO_STRUCTURED_TESTS_AVAILABLE</div>
                )}
              </div>
            </div>
          </>
    )
})

type SidebarTerminalModeProps = {
  fileName: string;
  setFileName: (val: string) => void;
  createNewFile: (e?: KeyboardEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => void;
  localFiles: FileEntry[];
  repositoryFiles: FileEntry[];
  isLoadingFiles: boolean;
  onFileClick: (oid: string, name: string) => void;
  onDeleteLocalFile: (oid: string) => void;
  renderLoadingState: (label: string) => React.ReactNode;
};

const normalizeCategoryParam = (value: string | null) => {
  if (!value) return "ALL";

  let normalized = value.trim().toLowerCase();
  if (normalized === "dynamic-programming" || normalized === "dynamic-prog") normalized = "dynamic prog";
  if (normalized === "linked-list") normalized = "linked list";
  if (normalized === "interval-problems") normalized = "interval problems";
  return normalized || "ALL";
};

const normalizeLanguageParam = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "java" || normalized === "javascript" ? normalized : "ALL";
};

const normalizeDifficultyParam = (value: string | null): "ALL" | "EASY" | "MEDIUM" | "HARD" => {
  const normalized = value?.trim().toUpperCase();
  return normalized === "EASY" || normalized === "MEDIUM" || normalized === "HARD" ? normalized : "ALL";
};

const normalizeStructureValue = (value: string | null | undefined) => {
  return (value ?? "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
};

const getFileLanguage = (file: FileEntry) => {
  const explicitLanguage = file.language?.trim().toLowerCase();
  if (explicitLanguage === "java" || explicitLanguage === "javascript") {
    return explicitLanguage;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "java") return "java";
  if (extension === "js" || extension === "jsx" || extension === "ts" || extension === "tsx") return "javascript";

  const type = file.type?.toLowerCase() ?? "";
  if (type.includes("java")) return "java";
  if (type.includes("javascript") || type.includes("typescript")) return "javascript";
  return "";
};

const getFileDifficulty = (file: FileEntry) => {
  const raw = (file.difficulty_level || file.diffculty_level || "").trim().toUpperCase();
  if (raw === "E" || raw === "EASY") return "E";
  if (raw === "M" || raw === "MEDIUM") return "M";
  if (raw === "H" || raw === "HARD") return "H";

  const baseName = file.name.split(".")[0] ?? "";
  const suffix = baseName.match(/([EMH])$/i)?.[1]?.toUpperCase();
  return suffix === "M" || suffix === "H" ? suffix : "E";
};

const fileMatchesCategory = (file: FileEntry, categoryFilter: string) => {
  const fileCategory = normalizeStructureValue(file.data_structure);
  const targetCategory = normalizeStructureValue(categoryFilter);
  if (!fileCategory || !targetCategory) return false;
  return fileCategory === targetCategory || fileCategory.split(/[,|/]+/).some((part) => normalizeStructureValue(part) === targetCategory);
};

const SidebarTerminalMode = React.memo(({
  fileName,
  setFileName,
  createNewFile,
  localFiles,
  repositoryFiles,
  isLoadingFiles,
  onFileClick,
  onDeleteLocalFile,
  renderLoadingState,
}: SidebarTerminalModeProps) => {
  return (
     <>
            <div>
              <div className="flex sidebar-details items-center border-b border-white/5 bg-black/20 p-3 create-file-container relative">
                <span className="absolute left-6 text-[10px] font-mono text-cyan-500/40 select-none">&gt;</span>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createNewFile(e)}
                  title="Create File"
                  className="w-full rounded-none border border-white/10 bg-black/40 pl-7 pr-3 py-2 text-xs font-mono text-cyan-400 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 placeholder:text-slate-600"
                  placeholder="NEW_FILE.js // TYPE_&_ENTER..."
                  aria-label="Create file name"
                />
              </div>

              <div className="p-1 sidebar-list-container text-xs text-slate-400 flex flex-col gap-3 mt-2">
                <div>
                  <div className="text-[9px] sidebar-details font-mono uppercase tracking-widest text-slate-500 mb-1 border-b border-white/5 pb-0.5">SYS // SAVED_FILES</div>
                  <div className="flex flex-col gap-1">
                    {localFiles.length > 0 ? (
                      localFiles.map((file) => (
                        <div
                          key={`${file.oid}:${file.name}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onFileClick(file.oid, file.name)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onFileClick(file.oid, file.name);
                            }
                          }}
                          className="group file-button-compact flex w-full items-center justify-between gap-3 rounded-none border border-white/5 bg-black/30 px-3 py-2 text-left text-xs font-mono text-cyan-400/80 transition hover:border-cyan-500/30 hover:bg-cyan-950/5 hover:text-cyan-400 border-l-2 border-l-cyan-500/10 hover:border-l-cyan-400 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCode className="file-icon h-3.5 w-3.5 text-cyan-400/60 group-hover:text-cyan-400 flex-shrink-0" />
                            <span className="file-name-text font-medium truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (window.confirm(`Are you sure you want to delete ${file.name}? This action cannot be undone.`)) {
                                onDeleteLocalFile(file.oid);
                              }
                            }}
                            className="ml-auto sidebar-details text-rose-500 hover:text-rose-400 cursor-pointer p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-600 font-mono sidebar-details p-1">// NO_SAVED_FILES_FOUND</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] sidebar-details font-mono uppercase tracking-widest text-slate-500 mb-1 border-b border-white/5 pb-0.5">SYS // REPO_TEMPLATES</div>
                  <div className="flex flex-col gap-1">
                    {isLoadingFiles ? (
                      renderLoadingState("Syncing templates...")
                    ) : repositoryFiles.length > 0 ? (
                      repositoryFiles.map((file) => (
                        <button
                          key={`${file.oid}:${file.name}`}
                          type="button"
                          onClick={() => onFileClick(file.oid, file.name)}
                          className="group file-button-compact flex w-full items-center justify-between gap-3 rounded-none border border-white/5 bg-black/30 px-3 py-2 text-left text-xs font-mono text-cyan-400/80 transition hover:border-cyan-500/30 hover:bg-cyan-950/5 hover:text-cyan-400 border-l-2 border-l-cyan-500/10 hover:border-l-cyan-400 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCode className="file-icon h-3.5 w-3.5 text-cyan-400/60 group-hover:text-cyan-400 flex-shrink-0" />
                            <span className="file-name-text font-medium truncate">{file.name}</span>
                          </div>
                          <DifficultyBadge level={file.difficulty_level || file.diffculty_level || "E"} />
                        </button>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-600 font-mono p-1">// NO_TEMPLATES_AVAILABLE</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
  )
})
  

const DifficultyBadge = ({ level }: { level: string }) => {
  const textColors: Record<string, string> = {
    H: "text-red-400 border-red-500/20 bg-red-950/10",
    M: "text-yellow-400 border-yellow-500/20 bg-yellow-950/10",
    E: "text-green-400 border-green-500/20 bg-green-950/10",
    Hard: "text-red-400 border-red-500/20 bg-red-950/10",
    Medium: "text-yellow-400 border-yellow-500/20 bg-yellow-950/10",
    Easy: "text-green-400 border-green-500/20 bg-green-950/10",
  };

  const labelMap: Record<string, string> = {
    H: "HARD",
    M: "MED",
    E: "EASY",
    Hard: "HARD",
    Medium: "MED",
    Easy: "EASY",
  };

  const shortLabelMap: Record<string, string> = {
    H: "H",
    M: "M",
    E: "E",
    Hard: "H",
    Medium: "M",
    Easy: "E",
  };

  const miniColorMap: Record<string, string> = {
    H: "bg-red-500",
    M: "bg-yellow-500",
    E: "bg-green-500",
    Hard: "bg-red-500",
    Medium: "bg-yellow-500",
    Easy: "bg-green-500",
  };

  return (
    <>
      <span className={`large-badge font-mono text-[8px] px-1.5 py-0.5 border uppercase tracking-wider whitespace-nowrap ${textColors[level] || textColors.E}`}>
        <span className="badge-text-full whitespace-nowrap">[ {labelMap[level] || level || "EASY"} ]</span>
        <span className="badge-text-short whitespace-nowrap">[ {shortLabelMap[level] || level[0] || "E"} ]</span>
      </span>
      <span className={`mini-badge ${miniColorMap[level] || miniColorMap.E}`} />
    </>
  );
};


const FileExplorer = ({
  activeFile,
  activeFileName,
  files,
  fileData,
  language,
  testCaseCount,
  sidebarWidth,
  onFileClick,
  onResizeStart,
  onCreateFile,
  onDeleteLocalFile,
  isLoadingFiles,
  selectedMode,
  setSelectedMode,
  difficultyFilter,
  setDifficultyFilter,
}: FileExplorerProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCategory = searchParams.get("category");
  const queryDifficulty = searchParams.get("difficulty");
  const queryLang = searchParams.get("lang");
  const querySearch = searchParams.get("q");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [languageFilter, setLanguageFilter] = useState<string>("ALL");

  const updateSearchParam = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const trimmed = value.trim();

      if (!trimmed || trimmed === "ALL") {
        if (!next.has(key)) return prev;
        next.delete(key);
        return next;
      }

      if (next.get(key) === trimmed) return prev;
      next.set(key, trimmed);
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    const normalized = normalizeCategoryParam(queryCategory);
    setCategoryFilter(normalized);
    if (normalized !== "ALL") {
      setSelectedMode("files-mode");
    }
  }, [queryCategory, setSelectedMode]);

  useEffect(() => {
    const normalized = normalizeLanguageParam(queryLang);
    setLanguageFilter(normalized);
    if (normalized !== "ALL") {
      setSelectedMode("files-mode");
    }
  }, [queryLang, setSelectedMode]);

  useEffect(() => {
    const normalized = normalizeDifficultyParam(queryDifficulty);
    setDifficultyFilter(normalized);
    if (normalized !== "ALL") {
      setSelectedMode("files-mode");
    }
  }, [queryDifficulty, setDifficultyFilter, setSelectedMode]);

  useEffect(() => {
    const nextSearch = querySearch ?? "";
    setSearchInput((current) => current === nextSearch ? current : nextSearch);
    if (nextSearch.trim()) {
      setSelectedMode("files-mode");
    }
  }, [querySearch, setSelectedMode]);

  const handleDifficultyFilterChange = useCallback((filter: "ALL" | "EASY" | "MEDIUM" | "HARD") => {
    setDifficultyFilter(filter);
    updateSearchParam("difficulty", filter === "ALL" ? "" : filter.toLowerCase());
  }, [setDifficultyFilter, updateSearchParam]);

  const handleCategoryFilterChange = useCallback((filter: string) => {
    setCategoryFilter(filter);
    updateSearchParam("category", filter);
  }, [updateSearchParam]);

  const handleLanguageFilterChange = useCallback((filter: string) => {
    setLanguageFilter(filter);
    updateSearchParam("lang", filter);
  }, [updateSearchParam]);

  const activeFileEntry = useMemo(
    () => files.find((file) => file.oid === activeFile && file.name === activeFileName) ?? files.find((file) => file.oid === activeFile),
    [files, activeFile, activeFileName],
  );
  const localFiles = useMemo(() => files.filter((file) => file.isLocal), [files]);
  const repositoryFiles = useMemo(() => {
    return files.filter((file) => !file.isLocal && file.name.toLowerCase().startsWith("leetcode"));
  }, [files]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      setDebouncedSearch(trimmed.toLowerCase());
      updateSearchParam("q", trimmed);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput, updateSearchParam]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // For remote files, only render them if they are of leetcode.
      // User-created files are rendered as is (file.isLocal).
      if (!file.isLocal && !file.name.toLowerCase().startsWith("leetcode")) {
        return false;
      }

      if (difficultyFilter !== "ALL") {
        const targetDiff = difficultyFilter === "EASY" ? "E" : difficultyFilter === "MEDIUM" ? "M" : "H";
        if (getFileDifficulty(file) !== targetDiff) {
          return false;
        }
      }

      if (categoryFilter !== "ALL") {
        if (!fileMatchesCategory(file, categoryFilter)) {
          return false;
        }
      }

      if (languageFilter !== "ALL") {
        if (getFileLanguage(file) !== languageFilter.toLowerCase()) {
          return false;
        }
      }

      // 2. Search Text Filtering
      if (debouncedSearch) {
        const name = file.name.toLowerCase();
        const path = file.path?.toLowerCase() ?? "";
        const type = file.type?.toLowerCase() ?? "";
        const structure = normalizeStructureValue(file.data_structure);
        const fileLanguage = getFileLanguage(file);
        return (
          name.includes(debouncedSearch) ||
          path.includes(debouncedSearch) ||
          type.includes(debouncedSearch) ||
          structure.includes(debouncedSearch) ||
          fileLanguage.includes(debouncedSearch)
        );
      }

      return true;
    });
  }, [files, debouncedSearch, difficultyFilter, categoryFilter, languageFilter]);

  const searchActive = Boolean(searchInput.trim()) || difficultyFilter !== "ALL" || categoryFilter !== "ALL" || languageFilter !== "ALL";

  const detailsPanelClass = "p-4 sidebar-details space-y-3 border-b border-white/5 bg-[#08090a]/80 text-xs font-mono text-cyan-400/80";

  const sidebarStyle = { "--sidebar-width": `${sidebarWidth}px` } as CSSProperties;
  
  const renderLoadingState = useCallback((label: string) => (
    <div className="flex items-center gap-2 rounded-none border border-cyan-500/20 bg-cyan-950/5 px-3 py-2 text-xs text-cyan-400 font-mono">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
      <span className="uppercase tracking-wider">{label}</span>
    </div>
  ), []);

  const crossCheckFileName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Please enter a file name.");
      return false;
    }

    const parts = trimmedName.toLowerCase().split(".");
    if (parts.length > 2) {
      alert("Invalid file name. Only one dot is allowed for a file extension.");
      return false;
    }

    const baseName = parts[0];
    const extension = parts.length === 2 ? parts[1] : null;

    if (!baseName?.match(/^[a-zA-Z0-9_-]+$/)) {
      alert("Invalid file name. Only letters, numbers, underscores and hyphens are allowed.");
      return false;
    }

    if (baseName.length > 50) {
      alert("File name too long. Please keep it under 50 characters.");
      return false;
    }

    if (extension && extension !== "js" && extension !== "java") {
      alert("Invalid file extension. Only .js and .java files are allowed.");
      return false;
    }

    const normalizedName = trimmedName.toLowerCase();
    if (files.some((file) => file.name.toLowerCase() === normalizedName)) {
      alert("File name already exists. Please choose a different name.");
      return false;
    }

    return true;
  },[files]);

  const createNewFile = useCallback((e?: KeyboardEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const newFileName = fileName.trim();
    if (!crossCheckFileName(newFileName)) {
      return;
    }

    if (typeof onCreateFile === "function") {
      onCreateFile(newFileName);
    } else {
      // console.log("create new file", newFileName);
    }

    setFileName(""); // reset file name after creating file
  },[fileName, crossCheckFileName, onCreateFile, setFileName]);

  const handleTerminalModeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSelectedMode(event.target.value === "terminal" ? "terminal-mode" : "files-mode");
  },[setSelectedMode]);

  return (
    <>
      <aside
        style={sidebarStyle}
        className="sidebar flex max-h-[42dvh] min-h-[220px] w-full flex-none flex-col overflow-y-auto border-b border-white/5 bg-[#08090a] p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-slate-950/40 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 md:h-full md:max-h-none md:min-h-0 md:w-[var(--sidebar-width)] md:border-b-0 md:border-r"
      >
        <div className="hideScrollbar">
        {/* SELECTING FILE EXPLORER OR TERMINAL MODE */}
                {/* SELECTING FILE EXPLORER OR TERMINAL MODE */}
        <div className="mb-3 grid grid-cols-1 sidebar-details mode-selector gap-2 px-1 text-[9px] font-mono tracking-wider sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <label htmlFor="mode-files" className={`flex items-center justify-between gap-2 px-3 py-1.5 cursor-pointer border transition-all duration-150 ${
            selectedMode === "files-mode" 
              ? "border-cyan-500/30 bg-cyan-950/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.05)]" 
              : "border-white/5 bg-transparent text-slate-500 hover:text-slate-300 hover:border-white/10"
          }`}>
            <span className="mode-text-full">SYS // EXPLORER</span>
            <span className="mode-text-short">EXPLORER</span>
            <span className="mode-text-tiny">EXP</span>
            <input
              type="radio"
              name="mode"
              id="mode-files"
              value="files"
              checked={selectedMode === "files-mode"}
              className="sr-only"
              onChange={handleTerminalModeChange}
            />
          </label>
          <label htmlFor="mode-terminal" className={`flex items-center justify-between gap-2 px-3 py-1.5 cursor-pointer border transition-all duration-150 ${
            selectedMode === "terminal-mode" 
              ? "border-cyan-500/30 bg-cyan-950/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.05)]" 
              : "border-white/5 bg-transparent text-slate-500 hover:text-slate-300 hover:border-white/10"
          }`}>
            <span className="mode-text-full">SYS // TERMINAL</span>
            <span className="mode-text-short">TERMINAL</span>
            <span className="mode-text-tiny">TERM</span>
            <input
              type="radio"
              id="mode-terminal"
              name="mode"
              value="terminal"
              checked={selectedMode === "terminal-mode"}
              className="sr-only"
              onChange={handleTerminalModeChange}
            />
          </label>
        </div>



        {selectedMode === "files-mode" ? (
          <SidebarFilesMode 
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            isSmall={sidebarWidth < 160}
            difficultyFilter={difficultyFilter}
            setDifficultyFilter={handleDifficultyFilterChange}
            categoryFilter={categoryFilter}
            setCategoryFilter={handleCategoryFilterChange}
            languageFilter={languageFilter}
            setLanguageFilter={handleLanguageFilterChange}
            files={files}
            fileData={fileData}
            language={language}
            testCaseCount={testCaseCount}
            activeFile={activeFile}
            activeFileName={activeFileName}
            onFileClick={onFileClick}
            isLoadingFiles={isLoadingFiles}
            filteredFiles={filteredFiles}
            searchActive={searchActive}
            renderLoadingState={renderLoadingState}
            detailsPanelClass={detailsPanelClass}
            activeFileEntry={activeFileEntry}
          />
        ) : (
          <SidebarTerminalMode
            fileName={fileName}
            setFileName={setFileName}
            createNewFile={createNewFile}
            localFiles={localFiles}
            repositoryFiles={repositoryFiles}
            isLoadingFiles={isLoadingFiles}
            onFileClick={onFileClick}
            onDeleteLocalFile={onDeleteLocalFile}
            renderLoadingState={renderLoadingState}
          />
        )}
        </div>
      </aside>
      <div
        onMouseDown={onResizeStart}
        className="hidden h-full w-1 sidebar-details cursor-col-resize border-l border-cyan-500/40 bg-cyan-400/20 transition-all hover:bg-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.6)] active:bg-cyan-400 md:block"
      />
    </>
  );
};

export default FileExplorer;
