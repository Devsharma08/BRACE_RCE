/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams } from "react-router-dom";
import { FileCode, Loader2, X } from "lucide-react";
import React,{ useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ChangeEvent, useCallback } from "react";
import type { FileEntry } from "../../../context/FileNamesContext";
import type { FileContentResponse } from "../types";
import { toast } from "sonner";

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

// ─── HINTS ACCORDION ───────────────────────────────────────────────────────
const ProblemHintsAccordion = ({ hints }: { hints?: any }) => {
  const [unlockedCount, setUnlockedCount] = useState<number>(0);

  const parsedHints = useMemo(() => {
    if (Array.isArray(hints) && hints.length > 0) return hints;
    if (typeof hints === "string" && hints.trim().length > 0) return [hints];
    return [
      "Analyze input constraints — check edge cases (empty, zero, single element).",
      "Consider a Hash Map, Two-Pointers, or Sliding Window to reduce time complexity.",
      "Aim for O(N) time and O(1) space where feasible.",
    ];
  }, [hints]);

  return (
    <div className="border-t-2 border-accent-warning/30 bg-accent-warning/5">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-accent-warning/20">
        <span className="text-[9px] font-bold uppercase tracking-widest text-accent-warning flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-warning inline-block" />
          HINTS ({unlockedCount}/{parsedHints.length})
        </span>
        {unlockedCount < parsedHints.length && (
          <button
            type="button"
            onClick={() => setUnlockedCount((p) => Math.min(parsedHints.length, p + 1))}
            className="text-[8px] font-bold text-accent-warning border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 uppercase tracking-wider hover:bg-accent-warning/10 transition-all cursor-pointer"
          >
            UNLOCK #{unlockedCount + 1}
          </button>
        )}
      </div>

      <div className="px-3 py-2">
        {unlockedCount === 0 ? (
          <p className="text-[10px] text-faint font-sans leading-relaxed">
            Hints locked — click to reveal one at a time.
          </p>
        ) : (
          <div className="space-y-2">
            {parsedHints.slice(0, unlockedCount).map((hintText: string, idx: number) => (
              <div key={idx} className="border-l-2 border-accent-warning/60 pl-2.5 py-1 text-[10px] text-accent-warning/80 font-sans leading-relaxed">
                <span className="text-[8px] font-bold text-accent-warning/70 block mb-0.5 uppercase tracking-widest">
                  Hint {idx + 1}
                </span>
                {hintText}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── FILES EXPLORER MODE ────────────────────────────────────────────────────
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
  return (
    <>
      {/* ── ZONE 1: FILTERS ──────────────────────────────────────── */}
      <div className="search-container border-b-2 border-accent-primary/20 bg-raised">
        {/* Search input */}
        <div className="px-3 pt-3 pb-2 relative flex items-center">
          <span className="absolute left-6 text-[10px] font-mono text-accent-primary/40 select-none">›</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={isSmall ? "FIND..." : "SEARCH PROBLEMS..."}
            className="w-full border border-subtle-line bg-black/60 pl-6 pr-3 py-1.5 text-[10px] font-mono text-accent-primary outline-none focus:border-accent-primary/50 placeholder:text-faint transition"
          />
        </div>

        {/* Difficulty pills */}
        <div className="flex gap-1 px-3 pb-2">
          {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((f) => {
            const isActive = difficultyFilter === f;
            const style: Record<string, string> = {
              ALL:    "border-subtle-line text-subtle bg-base",
              EASY:   "border-accent-success/50 text-accent-success bg-accent-success/10",
              MEDIUM: "border-accent-warning/40 text-accent-warning bg-accent-warning/10",
              HARD:   "border-accent-danger/50 text-accent-danger bg-accent-danger/10",
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => setDifficultyFilter(f)}
                className={`flex-1 py-1 text-[8px] font-bold font-mono tracking-wider border transition-all cursor-pointer ${
                  isActive ? style[f] : "border-subtle-line text-faint hover:text-subtle hover:border-subtle-line"
                }`}
              >
                <span className="badge-text-full">{f === "ALL" ? "ALL" : f.slice(0, 3)}</span>
                <span className="badge-text-short">{f[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Category + Language dropdowns */}
        {!isSmall && (
          <div className="flex gap-2 px-3 pb-3">
            <div className="relative flex-1">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-subtle-line bg-black/60 px-2 py-1.5 text-[9px] font-mono text-accent-primary/80 outline-none cursor-pointer uppercase appearance-none hover:border-accent-primary/30"
              >
                <option value="ALL">CATEGORY</option>
                <option value="linked list">LINKED LIST</option>
                <option value="array">ARRAY</option>
                <option value="string">STRING</option>
                <option value="math">MATH</option>
                <option value="graph">GRAPH</option>
                <option value="queue">QUEUE</option>
                <option value="stack">STACK</option>
                <option value="tree">TREE</option>
                <option value="dynamic prog">DYN PROG</option>
                <option value="recursion">RECURSION</option>
                <option value="backtracking">BACKTRACK</option>
                <option value="searching">SEARCHING</option>
                <option value="greedy">GREEDY</option>
                <option value="interval problems">INTERVALS</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[8px] text-accent-primary/40">▼</div>
            </div>
            <div className="relative flex-1">
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full border border-subtle-line bg-black/60 px-2 py-1.5 text-[9px] font-mono text-accent-primary/80 outline-none cursor-pointer uppercase appearance-none hover:border-accent-primary/30"
              >
                <option value="ALL">LANGUAGE</option>
                <option value="java">JAVA</option>
                <option value="javascript">JS</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[8px] text-accent-primary/40">▼</div>
            </div>
          </div>
        )}

        {/* Status line */}
        <div className="sidebar-details px-3 pb-2 flex items-center justify-between">
          <span className="text-[8px] font-mono text-faint uppercase tracking-wider">
            {searchActive ? `${filteredFiles.length}/${files.length} matches` : `${files.length} files`}
          </span>
          {searchActive && <span className="text-[8px] text-accent-primary font-bold">FILTERED</span>}
        </div>
      </div>

      {/* ── ZONE 2: FILE LIST ─────────────────────────────────────── */}
      <div className="sidebar-list-container border-b-2 border-subtle-line">
        {/* Zone label */}
        <div className="sidebar-details px-3 py-1.5 flex items-center justify-between bg-base">
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-faint">PROBLEMS</span>
          <span className="text-[8px] font-mono text-accent-primary/60">{filteredFiles.length}</span>
        </div>

        {isLoadingFiles ? (
          <div className="px-3 py-2">{renderLoadingState("Loading files...")}</div>
        ) : (
          <div className="flex flex-col gap-px max-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-elevated">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <button
                  key={`${file.oid}:${file.name}`}
                  type="button"
                  onClick={() => onFileClick(file.oid, file.name)}
                  className={`group file-button-compact flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] transition-all cursor-pointer border-l-2 ${
                    activeFile === file.oid && activeFileName === file.name
                      ? "border-l-accent-primary bg-accent-primary/5 text-accent-primary"
                      : "border-l-transparent bg-transparent text-subtle hover:bg-surface-hover hover:text-fg hover:border-l-white/20"
                  }`}
                >
                  <FileCode className="file-icon h-3 w-3 shrink-0 text-faint group-hover:text-accent-primary" />
                  <span className="file-name-text flex-1 truncate">{file.name}</span>
                  <DifficultyBadge level={file.difficulty_level || file.diffculty_level || "E"} />
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-[10px] text-faint font-mono">No files match filters</div>
            )}
          </div>
        )}
      </div>

      {/* ── ZONE 3: ACTIVE FILE DETAILS ──────────────────────────── */}
      {activeFile && (
        <div className={detailsPanelClass}>

          {/* File identity row */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-raised border-b border-subtle-line">
            <span className="text-[10px] font-bold text-fg truncate font-mono">
              {activeFileEntry?.name || "—"}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {language && (
                <span className="text-[8px] px-1.5 py-0.5 border border-accent-primary/30 bg-accent-primary/10 text-accent-primary font-mono uppercase">
                  {language.toUpperCase()}
                </span>
              )}
              {fileData?.data_structure && (
                <span className="text-[8px] px-1.5 py-0.5 border border-subtle-line bg-black/60 text-subtle font-mono uppercase">
                  {fileData.data_structure}
                </span>
              )}
              <DifficultyBadge level={fileData?.difficulty_level || "E"} />
              {testCaseCount > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 border border-accent-primary/30 bg-accent-primary/10 text-accent-primary font-mono">
                  {testCaseCount}T
                </span>
              )}
            </div>
          </div>

          {/* Problem Statement */}
          <div className="border-t-2 border-accent-primary/25 bg-base">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-accent-primary/15">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-accent-primary">PROBLEM STATEMENT</span>
            </div>
            <div className="px-3 py-2.5 text-[10px] text-subtle font-sans leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-elevated">
              {fileData?.problem_definition || "No problem statement available for this file."}
            </div>
          </div>

          {/* Hints */}
          <ProblemHintsAccordion hints={fileData?.problem_hints} />

          {/* Test Cases */}
          {fileData?.test_cases?.length ? (
            <div className="border-t-2 border-accent-primary/25 bg-base">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-accent-primary/15">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-accent-primary">TEST CASES</span>
                <span className="ml-auto text-[8px] text-faint">{fileData.test_cases.length} cases</span>
              </div>
              <div className="px-3 py-2.5 space-y-3">
                {fileData.test_cases.map((tc, i) => (
                  <div key={i} className="border border-subtle-line bg-black/60">
                    <div className="px-2 py-1 border-b border-subtle-line text-[8px] font-bold text-faint uppercase tracking-widest">
                      Case {i + 1}
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-subtle-line">
                      <div className="px-2 py-1.5">
                        <div className="text-[8px] text-accent-success/70 font-bold uppercase mb-1">IN</div>
                        <pre className="text-[10px] text-subtle font-mono whitespace-pre-wrap leading-relaxed">{tc.input ?? "—"}</pre>
                      </div>
                      <div className="px-2 py-1.5">
                        <div className="text-[8px] text-accent-danger/70 font-bold uppercase mb-1">OUT</div>
                        <pre className="text-[10px] text-subtle font-mono whitespace-pre-wrap leading-relaxed">{tc.expectedOutput ?? "—"}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
});

// ─── TERMINAL / SCRATCHPAD MODE ─────────────────────────────────────────────

type SidebarTerminalModeProps = {
  fileName: string;
  setFileName: (val: string) => void;
  createNewFile: (e?: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => void;
  localFiles: FileEntry[];
  repositoryFiles: FileEntry[];
  isLoadingFiles: boolean;
  onFileClick: (oid: string, name: string) => void;
  onDeleteLocalFile: (oid: string) => void;
  renderLoadingState: (label: string) => React.ReactNode;
};

// ─── URL PARAM NORMALIZERS ──────────────────────────────────────────────────

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

const normalizeStructureValue = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");

const getFileLanguage = (file: FileEntry) => {
  const explicitLanguage = file.language?.trim().toLowerCase();
  if (explicitLanguage === "java" || explicitLanguage === "javascript") return explicitLanguage;
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
      {/* ── ZONE 1: CREATE FILE ───────────────────────────────── */}
      <div className="create-file-container border-b-2 border-accent-warning/20 bg-raised">
        <div className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-accent-warning/70 border-b border-accent-warning/10">
          NEW SCRATCHPAD FILE
        </div>
        <div className="px-3 py-2.5 relative flex items-center">
          <span className="absolute left-6 text-[10px] font-mono text-accent-warning/40 select-none">›</span>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createNewFile(e)}
            className="w-full border border-subtle-line bg-black/60 pl-6 pr-3 py-1.5 text-[10px] font-mono text-accent-warning outline-none focus:border-accent-warning/40 placeholder:text-faint transition"
            placeholder="filename.js · ENTER to create"
          />
        </div>
      </div>

      {/* ── ZONE 2: SAVED LOCAL FILES ─────────────────────────── */}
      <div className="border-b-2 border-subtle-line">
        <div className="sidebar-details px-3 py-1.5 flex items-center justify-between bg-base border-b border-subtle-line">
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-faint">MY FILES</span>
          <span className="text-[8px] font-mono text-accent-warning/60">{localFiles.length}</span>
        </div>
        <div className="flex flex-col gap-px">
          {localFiles.length > 0 ? (
            localFiles.map((file) => (
              <div
                key={`${file.oid}:${file.name}`}
                className="group flex items-center gap-2 px-3 py-2 text-[10px] font-mono text-subtle hover:bg-surface-hover hover:text-fg transition cursor-pointer border-l-2 border-l-transparent hover:border-l-accent-warning/50"
                role="button"
                tabIndex={0}
                onClick={() => onFileClick(file.oid, file.name)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onFileClick(file.oid, file.name)}
              >
                <FileCode className="file-icon h-3 w-3 shrink-0 text-faint group-hover:text-accent-warning" />
                <span className="file-name-text flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete ${file.name}?`)) onDeleteLocalFile(file.oid);
                  }}
                  className="sidebar-details text-accent-danger hover:text-accent-danger cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-[10px] text-faint font-mono">No saved files yet</div>
          )}
        </div>
      </div>

      {/* ── ZONE 3: REPO TEMPLATES ────────────────────────────── */}
      <div>
        <div className="sidebar-details px-3 py-1.5 flex items-center justify-between bg-base border-b border-subtle-line">
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-faint">TEMPLATES</span>
          <span className="text-[8px] font-mono text-faint">{repositoryFiles.length}</span>
        </div>
        {isLoadingFiles ? (
          <div className="px-3 py-2">{renderLoadingState("Loading templates...")}</div>
        ) : (
          <div className="flex flex-col gap-px">
            {repositoryFiles.length > 0 ? (
              repositoryFiles.map((file) => (
                <button
                  key={`${file.oid}:${file.name}`}
                  type="button"
                  onClick={() => onFileClick(file.oid, file.name)}
                  className="group file-button-compact flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] text-subtle hover:bg-surface-hover hover:text-fg transition cursor-pointer border-l-2 border-l-transparent hover:border-l-faint/50"
                >
                  <FileCode className="file-icon h-3 w-3 shrink-0 text-faint group-hover:text-subtle" />
                  <span className="file-name-text flex-1 truncate">{file.name}</span>
                  <DifficultyBadge level={file.difficulty_level || file.diffculty_level || "E"} />
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-[10px] text-faint font-mono">No templates available</div>
            )}
          </div>
        )}
      </div>
    </>
  );
});

const DifficultyBadge = ({ level }: { level: string }) => {
  const textColors: Record<string, string> = {
    H: "text-accent-danger border-accent-danger/20 bg-accent-danger/10",
    M: "text-accent-warning border-accent-warning/20 bg-accent-warning/10",
    E: "text-accent-success border-accent-success/20 bg-accent-success/10",
    Hard: "text-accent-danger border-accent-danger/20 bg-accent-danger/10",
    Medium: "text-accent-warning border-accent-warning/20 bg-accent-warning/10",
    Easy: "text-accent-success border-accent-success/20 bg-accent-success/10",
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
    H: "bg-accent-danger",
    M: "bg-accent-warning",
    E: "bg-accent-success",
    Hard: "bg-accent-danger",
    Medium: "bg-accent-warning",
    Easy: "bg-accent-success",
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

  const detailsPanelClass = "p-4 space-y-3 border-t-2 border-accent-primary/20 bg-base text-xs font-mono text-accent-primary/80";

  const sidebarStyle = { "--sidebar-width": `${sidebarWidth}px` } as CSSProperties;
  
  const renderLoadingState = useCallback((label: string) => (
    <div className="flex items-center gap-2 rounded-none border border-accent-primary/20 bg-accent-primary/5 px-3 py-2 text-xs text-accent-primary font-mono">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />
      <span className="uppercase tracking-wider">{label}</span>
    </div>
  ), []);

  const crossCheckFileName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a file name.");
      return false;
    }

    const parts = trimmedName.toLowerCase().split(".");
    if (parts.length > 2) {
      toast.error("Invalid file name. Only one dot is allowed for a file extension.");
      return false;
    }

    const baseName = parts[0];
    const extension = parts.length === 2 ? parts[1] : null;

    if (!baseName?.match(/^[a-zA-Z0-9_-]+$/)) {
      toast.error("Invalid file name. Only letters, numbers, underscores and hyphens are allowed.");
      return false;
    }

    if (baseName.length > 50) {
      toast.error("File name too long. Please keep it under 50 characters.");
      return false;
    }

    if (extension && extension !== "js" && extension !== "java") {
      toast.error("Invalid file extension. Only .js and .java files are allowed.");
      return false;
    }

    const normalizedName = trimmedName.toLowerCase();
    if (files.some((file) => file.name.toLowerCase() === normalizedName)) {
      toast.error("File name already exists. Please choose a different name.");
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
        className="sidebar flex max-h-[42dvh] min-h-[220px] w-full flex-none flex-col overflow-y-auto border-b border-subtle-line bg-base p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-black/40 [&::-webkit-scrollbar-thumb]:bg-elevated/60 md:h-full md:max-h-none md:min-h-0 md:w-[var(--sidebar-width)] md:border-b-0 md:border-r-2 md:border-r-white/10"
      >
        <div className="hideScrollbar">
        {/* MODE SELECTOR: EXPLORER / TERMINAL */}
        <div className="mb-2 grid grid-cols-1 sidebar-details mode-selector gap-1.5 px-1 text-[9px] font-mono tracking-wider sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <label htmlFor="mode-files" className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer border transition-all duration-150 ${
            selectedMode === "files-mode" 
              ? "border-l-2 border-l-accent-primary border-accent-primary/30 bg-accent-primary/5 text-accent-primary"
              : "border border-subtle-line bg-raised text-faint hover:text-subtle hover:border-subtle-line"
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
          <label htmlFor="mode-terminal" className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer border transition-all duration-150 ${
            selectedMode === "terminal-mode" 
              ? "border-l-2 border-l-accent-warning border-accent-warning/30 bg-accent-warning/5 text-accent-warning"
              : "border border-subtle-line bg-raised text-faint hover:text-subtle hover:border-subtle-line"
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
        className="hidden h-full w-1 sidebar-details cursor-col-resize border-l border-accent-primary/40 bg-accent-primary/20 transition-all hover:bg-accent-primary hover:shadow-[0_0_10px_rgba(6,182,212,0.6)] active:bg-accent-primary md:block"
      />
    </>
  );
};

export default FileExplorer;
