import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert, CheckCircle2, LockKeyhole, Swords, Activity, Plus,
  Terminal, Code2, Lightbulb, Trash2, Target, ArrowLeft, ArrowUpRight,
  ChevronDown, Users, Radio, Gauge, LayoutDashboard, Search, Clock
} from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";
import { invalidateProblemQueries } from "../utils/problemCache";
import { toast } from "sonner";
import { TestCaseGeneratorPanel, type CreatorSignature } from "../components/features/TestCaseGeneratorPanel";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useMyRating } from "../hooks/useLeaderboard";

interface Problem {
  id: string;
  name: string;
  difficulty_level: string;
  isCustom: boolean;
}

const CreateRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [staged, setStaged] = useState(false);
  const { data: myRating } = useMyRating(true);
  
  // --- ROOM STATE ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState<number>(2);
  const [isPublic, setIsPublic] = useState(true);
  const [totalTimeLimitMinutes, setTotalTimeLimitMinutes] = useState<number>(45);
  

  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);
  const MAX_SELECTABLE_PROBLEMS = 10;
  const selectedOverflowCount = Math.max(0, selectedProblemIds.length - MAX_SELECTABLE_PROBLEMS);

  // --- SIGNATURE BUILDER STATE (ROADMAP §2) ---
  const [creatorSignature, setCreatorSignature] = useState<CreatorSignature>({
    funcName: "solve",
    returnType: "int",
    args: [{ name: "nums", type: "int[]" }],
  });

  // --- PROBLEM TAB STATE ---
  const [activeProblemTab, setActiveProblemTab] = useState<"EXISTING" | "CUSTOM">("EXISTING");

  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [customFilter, setCustomFilter] = useState("");

  // --- CUSTOM PROBLEM STATE ---
  const [customLoading, setCustomLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState("MEDIUM");
  const [customDefinition, setCustomDefinition] = useState("");
  const [customHints, setCustomHints] = useState<string[]>([""]);
  const [customTestCases, setCustomTestCases] = useState([{ input: "", expectedOutput: "", is_public: true }]);
  const [customSnippets, setCustomSnippets] = useState([{ language: "javascript", code: "// Write your code here", wrapperCode: "" }]);

  const queryClient = useQueryClient();

  const { data: availableProblems = [] } = useQuery({
    queryKey: ["all-available-problems"],
    // Static problem definitions — see invalidateProblemQueries() for the
    // progress-driven refreshes.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [sysRes, customRes] = await Promise.all([
        api.get("/problems/system"),
        api.get("/problems/custom")
      ]);
      return [...sysRes.data.problems, ...customRes.data.problems];
    },
  });

  // Auto-calculate the Global Time Limit whenever problems are selected
  useEffect(() => {
    let calculatedMinutes = 0;
    
    selectedProblemIds.forEach(id => {
      const p = availableProblems.find(prob => prob.id === id);
      if (p) {
        if (p.difficulty_level === "HARD") calculatedMinutes += 30;
        else if (p.difficulty_level === "MEDIUM") calculatedMinutes += 20;
        else calculatedMinutes += 15;
      }
    });
    
    if (calculatedMinutes > 0) {
      calculatedMinutes += 5;
    } else {
      calculatedMinutes = 0;
    }

    setTotalTimeLimitMinutes(calculatedMinutes);
  }, [selectedProblemIds, availableProblems]);

  const toggleProblemSelection = (id: string) => {
    setSelectedProblemIds((prev) => {
      const already = prev.includes(id);
      if (already) return prev.filter((pId) => pId !== id);
      if (prev.length >= MAX_SELECTABLE_PROBLEMS) {
        toast.error(
          `Queue is capped at ${MAX_SELECTABLE_PROBLEMS} problems. Remove one before adding another.`
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  // Filter problems based on search query and filters
  const filteredProblems = useMemo(() => {
    return availableProblems.filter(problem => {
      const matchesSearch = !searchQuery || 
        problem.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = !difficultyFilter || 
        problem.difficulty_level === difficultyFilter;
      const matchesCustom = !customFilter || 
        (customFilter === 'system' ? !problem.isCustom : problem.isCustom);
      return matchesSearch && matchesDifficulty && matchesCustom;
    });
  }, [availableProblems, searchQuery, difficultyFilter, customFilter]);

  const handleCreateRoom = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedProblemIds.length === 0) return toast.error("You must select at least one problem!");
    if (!name.trim()) return toast.error("Give your operation a title first.");

    if (!staged) {
      setStaged(true);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/rooms/create", {
        name,
        description,
        password: password || null,
        maxUsers,
        isPublic,
        isTemplate: false,
        problemIds: selectedProblemIds,
        totalTimeLimitMs: totalTimeLimitMinutes * 60 * 1000
      });
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to initialize room.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomProblem = async () => {
    if (!customName || !customDefinition) return toast.error("Please fill out the problem name and definition.");
    setCustomLoading(true);
    try {
      const res = await api.post("/problems/create", {
        name: customName,
        problem_definition: customDefinition,
        problem_hints: customHints.filter(h => h.trim() !== ""),
        difficulty_level: customDifficulty,
        test_cases: customTestCases,
        code_snippets: customSnippets
      });
      
      const newProb = res.data.problem;
      
      // Refetch available problems query
      invalidateProblemQueries(queryClient);
      
      // Auto-select it in the queue
      setSelectedProblemIds(prev => [...prev, newProb.id]);
      
      // Reset form
      setCustomName("");
      setCustomDefinition("");
      setCustomHints([""]);
      setCustomTestCases([{ input: "", expectedOutput: "", is_public: true }]);
      setCustomSnippets([{ language: "javascript", code: "// Write your code here", wrapperCode: "" }]);
      
      // Switch back to EXISTING tab
      setActiveProblemTab("EXISTING");
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to create custom problem.");
    } finally {
      setCustomLoading(false);
    }
  };

  const queueProblems = selectedProblemIds
    .map((id) => availableProblems.find((prob) => prob.id === id))
    .filter((prob): prob is Problem => Boolean(prob));

  const protectedRoom = !isPublic || password.trim().length > 0;
  const timeLabel = totalTimeLimitMinutes > 0 ? `${totalTimeLimitMinutes} minutes` : "Auto";

  useEffect(() => {
    setStaged(false);
  }, [name, description, password, maxUsers, isPublic, totalTimeLimitMinutes, selectedProblemIds]);

  useEffect(() => {
    const templateName = searchParams.get("templateName");
    if (templateName && !name) setName(templateName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen w-full bg-base text-fg font-mono selection:bg-accent-primary/30 selection:text-accent-primary">
      {/* Dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />

      {/* DESKTOP SIDEBAR — shared shell with /dashboard, /lobby, /problems, /profile */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* MOBILE BOTTOM NAV */}
      <MobileBottomNav />

      {/* MAIN CONTENT AREA — left offset shifts with the fixed sidebar widths */}
      <main className="relative z-10 w-full min-w-0 flex-1 ml-0 md:ml-[var(--sidebar-width)] px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/lobby"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle transition hover:text-accent-primary"
          >
            <ArrowLeft size={14} aria-hidden /> Return to lobby
          </Link>

          {/* ── HEADER — matches /dashboard operative banner ───────────── */}
          <section className="relative isolate overflow-hidden border-y border-subtle-line py-5 md:py-5 mt-6">
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
                  <Swords size={14} aria-hidden /> Room deployment
                </div>
                <h1 className="mt-3 font-mono text-4xl font-black tracking-[-0.05em] text-fg md:text-6xl">
                  Create an<br />
                  <span className="text-accent">operation.</span>
                </h1>
                <p className="mt-4 max-w-xl font-sans text-sm leading-6 text-subtle">
                  Configure a room for your training circle. Nothing is published until you deploy it.
                </p>
              </div>
              {/* Deploy status block — stats stack above the state readout so the
                  meta leads on desktop, reflows under copy on mobile */}
              <div className="flex flex-col items-start gap-3 border-l border-subtle-line pl-5 lg:items-end lg:text-right">
                <div>
                  <div className="text-xs font-bold tracking-widest text-fg">
                    QUEUE /{" "}
                    <span className="text-accent-primary">
                      {selectedProblemIds.length} SELECTED
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-widest text-subtle">
                    {timeLabel} — {protectedRoom ? "pass protected" : "open access"}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-accent-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-success shadow-glow-success" aria-hidden />
                  {staged ? "configuration staged" : "drafting configuration"}
                </div>
              </div>
            </div>
          </section>
        {staged ? (
          <section className="relative mt-8 overflow-hidden rounded-card border border-accent-success/30 bg-surface p-6 md:p-8" aria-live="polite">
            <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-accent-success/20" aria-hidden />
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-success">
              <Radio size={14} aria-hidden /> Room configuration ready
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg">
              Your operation is staged.
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-subtle">
              {name.trim() || "Untitled operation"} · {selectedProblemIds.length} problem
              {selectedProblemIds.length === 1 ? "" : "s"} · {timeLabel} ·{" "}
              {protectedRoom ? "pass protected" : "open access"}. Deploy to publish this
              configuration and invite participants.
            </p>
            <div className="mt-6 flex flex-col gap-3 border-t border-subtle-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-subtle">
                {staged ? "staged / awaiting deploy" : "drafting configuration"}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStaged(false)}
                  className="rounded-lg border border-subtle-line px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-subtle transition hover:text-fg"
                >
                  Edit configuration
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateRoom()}
                  disabled={loading || selectedProblemIds.length === 0}
                  className="rounded-lg bg-accent-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "Deploying…" : "Deploy operation"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateRoom();
            }}
            className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
          >
            {/* ── LEFT: IDENTITY + ACCESS ────────────────────────────── */}
            <section className="relative overflow-hidden rounded-card border border-subtle-line bg-surface p-6 md:p-8" aria-label="Operation identity and access">
              <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-accent-primary/15" aria-hidden />
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                <ShieldAlert size={14} aria-hidden /> Identity & security
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-fg">
                Name the operation.
              </h2>
              <p className="mt-2 font-sans text-sm leading-6 text-subtle">
                Set the designation, briefing, roster size, and who can enter the room.
              </p>

              <label className="mt-6 block text-[9px] uppercase tracking-widest text-subtle">
                Operation title
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Graph traversal / night shift"
                  className="mt-3 h-12 w-full border border-subtle-line bg-void px-4 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                />
              </label>
              <label className="mt-6 block text-[9px] uppercase tracking-widest text-subtle">
                Mission briefing
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the room…"
                  className="mt-3 min-h-24 w-full border border-subtle-line bg-void p-4 font-sans text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                />
              </label>

              <label className="mt-6 block text-[9px] uppercase tracking-widest text-subtle">
                Battle template
                <div className="relative mt-3">
                  <select
                    value={activeProblemTab === "CUSTOM" ? "custom" : "queue"}
                    onChange={(event) =>
                      setActiveProblemTab(event.target.value === "custom" ? "CUSTOM" : "EXISTING")
                    }
                    className="h-12 w-full appearance-none border border-subtle-line bg-void px-4 text-sm text-fg outline-none focus:border-accent/50"
                    aria-label="Battle template"
                  >
                    <option value="queue">Mission queue ({selectedProblemIds.length} selected)</option>
                    <option value="custom">Create a custom problem</option>
                  </select>
                  <ChevronDown
                    size={15}
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-faint"
                  />
                </div>
              </label>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-[9px] uppercase tracking-widest text-subtle">
                  Maximum users
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                    className="mt-3 h-12 w-full border border-subtle-line bg-void px-4 text-sm text-fg outline-none focus:border-accent/50"
                  />
                </label>
                <div className="block text-[9px] uppercase tracking-widest text-subtle">
                  Time limit
                  <p className="mt-3 flex h-12 w-full items-center border border-subtle-line bg-void px-4 text-sm text-fg">
                    {timeLabel} (auto from queue)
                  </p>
                </div>
              </div>
              {queueProblems.length > 0 && (
                <div className="mt-6 space-y-2" aria-label="Selected problems">
                  <ul className="space-y-2">
                    {queueProblems.slice(0, MAX_SELECTABLE_PROBLEMS).map((prob) => (
                      <li
                        key={prob.id}
                        className="flex items-center justify-between gap-2 border border-subtle-line bg-void px-3 py-2 text-xs text-subtle"
                      >
                        <span className="min-w-0 truncate text-fg">{prob.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleProblemSelection(prob.id)}
                          className="shrink-0 text-faint transition hover:text-accent-danger"
                          aria-label={`Remove ${prob.name} from queue`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {selectedOverflowCount > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-subtle-line bg-void px-3 py-2 text-xs">
                      <Gauge size={12} className="shrink-0 text-accent-warning" aria-hidden />
                      <span className="text-subtle">
                        <span className="font-bold text-fg">+{selectedOverflowCount}</span> more selected — remove a problem to add another
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACCESS CONTROL ─────────────────────────────────────── */}
              <div className="mt-6 border-t border-subtle-line pt-6">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent-primary">
                  <LockKeyhole size={14} aria-hidden /> Access control
                </div>
                <p className="mt-2 text-xs leading-6 text-subtle">
                  Choose whether anyone can discover this room or participants need a pass.
                </p>

                <label className="mt-4 block text-[9px] uppercase tracking-widest text-subtle">
                  Access password (optional)
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for open access"
                    className="mt-3 h-12 w-full border border-subtle-line bg-void px-4 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsPublic((prev) => !prev)}
                  aria-pressed={!isPublic}
                  className={`mt-4 flex w-full items-center justify-between border p-4 text-left transition ${
                    protectedRoom
                      ? "border-accent-warning/40 bg-accent-warning/[0.08]"
                      : "border-subtle-line bg-void"
                  }`}
                >
                  <span className="flex items-center gap-3 text-xs text-fg">
                    <LockKeyhole
                      size={15}
                      aria-hidden
                      className={protectedRoom ? "text-accent-warning" : "text-faint"}
                    />
                    Pass protected
                  </span>
                  <span
                    aria-hidden
                    className={`h-4 w-7 rounded-full p-0.5 ${protectedRoom ? "bg-accent-warning" : "bg-line-mid"}`}
                  >
                    <span
                      className={`block h-3 w-3 rounded-full bg-white transition ${protectedRoom ? "translate-x-3" : ""}`}
                    />
                  </span>
                </button>
              </div>
            </section>

          {/* ── RIGHT: MISSION QUEUE (review + deploy) ─────────────────── */}
          <section className="relative mt-8 overflow-hidden rounded-card border border-subtle-line bg-surface" aria-label="Mission queue">
            <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-accent-success/15" aria-hidden />
            <div className="flex items-center justify-between border-b border-subtle-line bg-accent-primary/10 p-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveProblemTab("EXISTING")}
                  className={`text-sm font-bold tracking-widest transition-colors ${activeProblemTab === "EXISTING" ? "text-accent-primary border-b-2 border-accent-primary pb-1" : "text-faint hover:text-fg pb-1"}`}
                >
                  MISSION QUEUE
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProblemTab("CUSTOM")}
                  className={`text-sm font-bold tracking-widest transition-colors ${activeProblemTab === "CUSTOM" ? "text-accent-primary border-b-2 border-accent-primary pb-1" : "text-faint hover:text-fg pb-1"}`}
                >
                  + NEW CUSTOM PROBLEM
                </button>
              </div>
              {activeProblemTab === "EXISTING" && (
                <span className="text-xs text-accent-primary font-bold tracking-widest bg-accent-primary/10 px-3 py-1 rounded-full border border-subtle-line">
                  {selectedProblemIds.length} SELECTED
                </span>
              )}
            </div>
              
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-3" style={{"maxHeight": "calc(100vh - 380px)"}}>
                
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
                  <input
                    type="text"
                    placeholder="Search problems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-raised border border-subtle-line rounded-lg text-sm text-fg placeholder:text-faint focus:border-accent-primary outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="h-10 px-4 bg-raised border border-subtle-line rounded-lg text-sm text-fg outline-none focus:border-accent-primary transition-colors"
                  >
                    <option value="">All Difficulties</option>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                  <select
                    value={customFilter}
                    onChange={(e) => setCustomFilter(e.target.value)}
                    className="h-10 px-4 bg-raised border border-subtle-line rounded-lg text-sm text-fg outline-none focus:border-accent-primary transition-colors"
                  >
                    <option value="">All Problems</option>
                    <option value="system">System</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Results count */}
              <div className="text-xs text-faint font-mono mb-2">
                {filteredProblems.length} problem{filteredProblems.length !== 1 ? 's' : ''} found
              </div>
              {/* TAB: EXISTING PROBLEMS */}
              {activeProblemTab === "EXISTING" && (
                filteredProblems.map((prob) => {
                    const isSelected = selectedProblemIds.includes(prob.id);
                    const isHard = prob.difficulty_level === "HARD";
                    const isMed = prob.difficulty_level === "MEDIUM";
                    
                    return (
                      <div
                        key={prob.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`${prob.name} (${prob.difficulty_level})`}
                        tabIndex={0}
                        onClick={() => toggleProblemSelection(prob.id)}
                        onKeyDown={(event) => {
                          if (event.key === " " || event.key === "Enter") {
                            event.preventDefault();
                            toggleProblemSelection(prob.id);
                          }
                        }}
                        className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all
                          ${isSelected ? "bg-accent-primary/10 border-accent-primary" : "bg-raised border-subtle-line hover:border-accent-primary/50"}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center
                            ${isSelected ? "bg-accent-primary border-accent-primary text-ink" : "border-subtle-line"}
                          `}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`font-bold tracking-wider text-sm ${isSelected ? "text-accent-primary" : "text-fg"}`}>
                              {prob.name}
                            </p>
                            {prob.isCustom && (
                              <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block">
                                Custom Problem
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold tracking-widest
                          ${isHard ? "text-accent-danger" : isMed ? "text-accent-warning" : "text-accent-success"}
                        `}>
                          {prob.difficulty_level}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* TAB: CREATE CUSTOM PROBLEM */}
                {activeProblemTab === "CUSTOM" && (
                  <div className="space-y-8 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs tracking-widest text-faint mb-2">SCENARIO NAME</label>
                        <input value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none" placeholder="e.g. Invert Binary Tree" />
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest text-faint mb-2">THREAT LEVEL</label>
                        <select value={customDifficulty} onChange={e => setCustomDifficulty(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none">
                          <option value="EASY">EASY (15 min)</option>
                          <option value="MEDIUM">MEDIUM (20 min)</option>
                          <option value="HARD">HARD (30 min)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest text-faint mb-2">PROBLEM DEFINITION (MARKDOWN)</label>
                      <textarea rows={4} value={customDefinition} onChange={e => setCustomDefinition(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-4 text-fg focus:border-accent-primary outline-none font-sans" placeholder="Write your problem description here..." />
                    </div>

                    {/* HINTS */}
                    <div className="border border-subtle-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold tracking-widest text-faint flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent-warning" /> HINTS</label>
                        <button type="button" onClick={() => setCustomHints([...customHints, ""])} className="text-xs text-accent-warning hover:text-accent-warning flex items-center gap-1"><Plus className="w-3 h-3" /> ADD</button>
                      </div>
                      <div className="space-y-3">
                        {customHints.map((hint, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input value={hint} onChange={e => { const h = [...customHints]; h[i] = e.target.value; setCustomHints(h); }} className="flex-1 bg-raised border border-subtle-line rounded-lg p-2 text-sm text-fg focus:border-accent-warning outline-none" placeholder="Hint text..." />
                            <button onClick={() => setCustomHints(customHints.filter((_, idx) => idx !== i))} className="text-faint hover:text-accent-danger"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TEST CASES */}
                    <TestCaseGeneratorPanel
                      signature={creatorSignature}
                      setSignature={setCreatorSignature}
                      onGenerated={(generated) => setCustomTestCases(generated)}
                    />
                    <div className="border border-subtle-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold tracking-widest text-faint flex items-center gap-2"><Terminal className="w-4 h-4 text-accent-danger" /> TEST CASES</label>
                        <button type="button" onClick={() => setCustomTestCases([...customTestCases, { input: "", expectedOutput: "", is_public: true }])} className="text-xs text-accent-danger hover:text-accent-danger flex items-center gap-1"><Plus className="w-3 h-3" /> ADD</button>
                      </div>
                      <div className="space-y-4">
                        {customTestCases.map((tc, i) => (
                          <div key={i} className="bg-raised p-3 rounded-lg border border-subtle-line relative group">
                            <button onClick={() => setCustomTestCases(customTestCases.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-faint hover:text-accent-danger"><Trash2 className="w-4 h-4" /></button>
                            <label className="flex items-center gap-2 mb-3">
                              <input type="checkbox" checked={!tc.is_public} onChange={e => { const t = [...customTestCases]; t[i].is_public = !e.target.checked; setCustomTestCases(t); }} className="accent-[var(--accent-danger)]" />
                              <span className="text-xs text-accent-danger">HIDDEN EDGE CASE</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <input value={tc.input} onChange={e => { const t = [...customTestCases]; t[i].input = e.target.value; setCustomTestCases(t); }} className="bg-raised border border-subtle-line rounded p-2 text-accent-primary outline-none text-sm" placeholder="Input" />
                              <input value={tc.expectedOutput} onChange={e => { const t = [...customTestCases]; t[i].expectedOutput = e.target.value; setCustomTestCases(t); }} className="bg-raised border border-subtle-line rounded p-2 text-accent-success outline-none text-sm" placeholder="Expected Output" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SNIPPETS */}
                    <div className="border border-subtle-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold tracking-widest text-faint flex items-center gap-2"><Code2 className="w-4 h-4 text-accent-primary" /> SNIPPETS</label>
                        <button type="button" onClick={() => setCustomSnippets([...customSnippets, { language: "python", code: "", wrapperCode: "" }])} className="text-xs text-accent-primary hover:text-accent-primary flex items-center gap-1"><Plus className="w-3 h-3" /> ADD</button>
                      </div>
                      <div className="space-y-4">
                        {customSnippets.map((snip, i) => (
                          <div key={i} className="bg-raised p-3 rounded-lg border border-subtle-line relative">
                            <button onClick={() => setCustomSnippets(customSnippets.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-faint hover:text-accent-danger"><Trash2 className="w-4 h-4" /></button>
                            <select value={snip.language} onChange={e => { const s = [...customSnippets]; s[i].language = e.target.value; setCustomSnippets(s); }} className="bg-raised border border-subtle-line rounded text-xs text-accent-primary p-1 mb-2 outline-none">
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                            </select>
                            <textarea rows={3} value={snip.code} onChange={e => { const s = [...customSnippets]; s[i].code = e.target.value; setCustomSnippets(s); }} className="w-full bg-void border border-subtle-line rounded p-2 text-fg font-mono text-sm outline-none focus:border-accent-primary" placeholder="Starter code..." />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleCreateCustomProblem}
                      disabled={customLoading}
                      className="w-full bg-accent-primary/10 hover:bg-accent-primary border border-accent-primary/50 text-accent-primary hover:text-ink font-bold tracking-widest py-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-8"
                    >
                      {customLoading ? <Activity className="w-5 h-5 animate-pulse" /> : <Target className="w-5 h-5" />}
                      CREATE & ADD TO QUEUE
                    </button>
                  </div>
                )}
              </div>
            </section>
          </form>
        )}
      
      </div>
      </main>
    </div>
  );
};

export default CreateRoom;
