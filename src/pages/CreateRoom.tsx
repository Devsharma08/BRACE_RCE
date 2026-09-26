import React, { useState, useMemo } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Gauge,
  LayoutTemplate,
  Lightbulb,
  LockKeyhole,
  Plus,
  Radio,
  Save,
  Search,
  ShieldAlert,
  Swords,
  Target,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";
import { invalidateProblemQueries } from "../utils/problemCache";
import { toast } from "sonner";
import {
  TestCaseGeneratorPanel,
  type CreatorSignature,
} from "../components/features/TestCaseGeneratorPanel";

interface Problem {
  id: string;
  name: string;
  difficulty_level: string;
  isCustom: boolean;
}

interface RoomTemplate {
  id: string;
  name: string;
  description: string | null;
  maxUsers: number;
  totalTimeLimitMs: number | null;
  problems: { id: string }[];
}

type CustomTestCase = { input: string; expectedOutput: string; is_public: boolean };
type CustomSnippet = { language: string; code: string; wrapperCode: string };

const PAGE_SIZE = 4;
const MAX_SELECTABLE_PROBLEMS = 10;
const TIME_LIMIT_OPTIONS = [20, 45, 90, 120];

const difficultyTone = (level: string) =>
  level === "HARD"
    ? "text-accent-danger"
    : level === "MEDIUM"
      ? "text-accent-warning"
      : "text-accent-success";

const templateMeta = (template: RoomTemplate) => {
  const minutes = template.totalTimeLimitMs
    ? Math.round(template.totalTimeLimitMs / 60000)
    : null;
  const parts = [
    `${template.problems.length} problem${template.problems.length === 1 ? "" : "s"}`,
    `${template.maxUsers} users`,
  ];
  if (minutes) parts.push(`${minutes} min`);
  return parts.join(" · ");
};

const Pager = ({ page, total, setPage }: { page: number; total: number; setPage: (page: number) => void }) => (
  <div className="mt-3 flex items-center justify-between border-t border-subtle-line pt-3 font-mono text-[9px] uppercase tracking-widest text-faint">
    <span>
      Page {page} / {total}
    </span>
    <span className="flex gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        aria-label="Previous page"
        className="grid h-7 w-7 place-items-center border border-subtle-line text-subtle transition hover:border-accent/40 hover:text-fg disabled:opacity-30"
      >
        <ChevronLeft size={13} aria-hidden />
      </button>
      <button
        type="button"
        disabled={page >= total}
        onClick={() => setPage(page + 1)}
        aria-label="Next page"
        className="grid h-7 w-7 place-items-center border border-subtle-line text-subtle transition hover:border-accent/40 hover:text-fg disabled:opacity-30"
      >
        <ChevronRight size={13} aria-hidden />
      </button>
    </span>
  </div>
);

const CreateRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [stagedSignature, setStagedSignature] = useState<string | null>(null);

  // --- ROOM STATE ---
  const [name, setName] = useState(() => searchParams.get("templateName") ?? "");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState<number>(2);
  const [isPublic, setIsPublic] = useState(true);
  const [timeLimitOption, setTimeLimitOption] = useState("AUTO");

  // --- QUEUE STATE ---
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);

  // --- SIGNATURE BUILDER STATE (ROADMAP §2) ---
  const [creatorSignature, setCreatorSignature] = useState<CreatorSignature>({
    funcName: "solve",
    returnType: "int",
    args: [{ name: "nums", type: "int[]" }],
  });

  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [problemPage, setProblemPage] = useState(1);
  const [customPage, setCustomPage] = useState(1);

  // --- CUSTOM PROBLEM STUDIO ---
  const [studioOpen, setStudioOpen] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState("MEDIUM");
  const [customDefinition, setCustomDefinition] = useState("");
  const [customHints, setCustomHints] = useState<string[]>([""]);
  const [customTestCases, setCustomTestCases] = useState<CustomTestCase[]>([
    { input: "", expectedOutput: "", is_public: true },
  ]);
  const [customSnippets, setCustomSnippets] = useState<CustomSnippet[]>([
    { language: "javascript", code: "// Write your code here", wrapperCode: "" },
  ]);

  const { data: availableProblems = [] } = useQuery({
    queryKey: ["all-available-problems"],
    // Static problem definitions — see invalidateProblemQueries() for the
    // progress-driven refreshes.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [sysRes, customRes] = await Promise.all([
        api.get("/problems/system"),
        api.get("/problems/custom"),
      ]);
      return [...sysRes.data.problems, ...customRes.data.problems] as Problem[];
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["room-templates"],
    queryFn: async () => (await api.get("/rooms/templates")).data.templates as RoomTemplate[],
  });

  const systemProblems = useMemo(() => availableProblems.filter((p) => !p.isCustom), [availableProblems]);
  const customProblems = useMemo(() => availableProblems.filter((p) => p.isCustom), [availableProblems]);

  const filteredProblems = useMemo(
    () =>
      systemProblems.filter((problem) => {
        const matchesSearch = !searchQuery || problem.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty = !difficultyFilter || problem.difficulty_level === difficultyFilter;
        return matchesSearch && matchesDifficulty;
      }),
    [systemProblems, searchQuery, difficultyFilter],
  );

  const filteredCustom = useMemo(
    () => customProblems.filter((problem) => problem.name.toLowerCase().includes(customQuery.toLowerCase())),
    [customProblems, customQuery],
  );

  const problemPageCount = Math.max(1, Math.ceil(filteredProblems.length / PAGE_SIZE));
  const customPageCount = Math.max(1, Math.ceil(filteredCustom.length / PAGE_SIZE));
  const safeProblemPage = Math.min(problemPage, problemPageCount);
  const safeCustomPage = Math.min(customPage, customPageCount);
  const visibleProblems = filteredProblems.slice((safeProblemPage - 1) * PAGE_SIZE, safeProblemPage * PAGE_SIZE);
  const visibleCustom = filteredCustom.slice((safeCustomPage - 1) * PAGE_SIZE, safeCustomPage * PAGE_SIZE);

  // Auto-calculate the Global Time Limit whenever problems are selected
  const autoMinutes = useMemo(() => {
    let calculatedMinutes = 0;
    selectedProblemIds.forEach((id) => {
      const p = availableProblems.find((prob) => prob.id === id);
      if (!p) return;
      if (p.difficulty_level === "HARD") calculatedMinutes += 30;
      else if (p.difficulty_level === "MEDIUM") calculatedMinutes += 20;
      else calculatedMinutes += 15;
    });
    return calculatedMinutes > 0 ? calculatedMinutes + 5 : 0;
  }, [selectedProblemIds, availableProblems]);

  const effectiveMinutes = timeLimitOption === "AUTO" ? autoMinutes : Number(timeLimitOption);
  const timeLabel = effectiveMinutes > 0 ? `${effectiveMinutes} minutes` : "Auto";
  const protectedRoom = !isPublic || password.trim().length > 0;

  // Staging is a snapshot check: editing any tracked field automatically drops
  // the page out of the staged confirmation view — no effect required.
  const configSignature = JSON.stringify([
    name,
    description,
    password,
    maxUsers,
    isPublic,
    effectiveMinutes,
    selectedProblemIds,
  ]);
  const staged = stagedSignature !== null && stagedSignature === configSignature;

  const queueProblems = selectedProblemIds
    .map((id) => availableProblems.find((prob) => prob.id === id))
    .filter((prob): prob is Problem => Boolean(prob));
  const selectedOverflowCount = Math.max(0, selectedProblemIds.length - MAX_SELECTABLE_PROBLEMS);

  const toggleProblemSelection = (id: string) => {
    setSelectedProblemIds((prev) => {
      const already = prev.includes(id);
      if (already) return prev.filter((pId) => pId !== id);
      if (prev.length >= MAX_SELECTABLE_PROBLEMS) {
        toast.error(
          `Queue is capped at ${MAX_SELECTABLE_PROBLEMS} problems. Remove one before adding another.`,
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  const chooseTemplate = (template: RoomTemplate) => {
    const ids = template.problems.map((p) => p.id);
    if (ids.length > MAX_SELECTABLE_PROBLEMS) {
      toast.info(`"${template.name}" trimmed to the ${MAX_SELECTABLE_PROBLEMS}-problem queue cap.`);
    }
    setSelectedProblemIds(ids.slice(0, MAX_SELECTABLE_PROBLEMS));
    setActiveTemplateId(template.id);
    toast.success(`Queue loaded from "${template.name}".`);
  };

  const handleSaveTemplate = async () => {
    if (selectedProblemIds.length === 0) {
      return toast.error("Select at least one problem before saving a template.");
    }
    setSaveTemplateLoading(true);
    try {
      await api.post("/rooms/create", {
        name: name.trim() ? `${name.trim()} template` : `Custom template ${templates.length + 1}`,
        description,
        password: null,
        maxUsers,
        isPublic: true,
        isTemplate: true,
        problemIds: selectedProblemIds,
        totalTimeLimitMs: effectiveMinutes * 60 * 1000,
      });
      await queryClient.invalidateQueries({ queryKey: ["room-templates"] });
      toast.success("Template saved — reuse it from Battle templates.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save template.");
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  const handleCreateRoom = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedProblemIds.length === 0) return toast.error("You must select at least one problem!");
    if (!name.trim()) return toast.error("Give your operation a title first.");

    if (!staged) {
      setStagedSignature(configSignature);
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
        totalTimeLimitMs: effectiveMinutes * 60 * 1000,
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
    if (!customName || !customDefinition) {
      return toast.error("Please fill out the problem name and definition.");
    }
    setCustomLoading(true);
    try {
      const res = await api.post("/problems/create", {
        name: customName,
        problem_definition: customDefinition,
        problem_hints: customHints.filter((h) => h.trim() !== ""),
        difficulty_level: customDifficulty,
        test_cases: customTestCases,
        code_snippets: customSnippets,
      });

      const newProb = res.data.problem as Problem;

      // Refetch available problems query
      invalidateProblemQueries(queryClient);

      // Auto-select it in the queue
      setSelectedProblemIds((prev) => [...prev, newProb.id].slice(0, MAX_SELECTABLE_PROBLEMS));

      // Reset form + close the studio
      setCustomName("");
      setCustomDefinition("");
      setCustomHints([""]);
      setCustomTestCases([{ input: "", expectedOutput: "", is_public: true }]);
      setCustomSnippets([{ language: "javascript", code: "// Write your code here", wrapperCode: "" }]);
      setCustomQuery("");
      setCustomPage(1);
      setStudioOpen(false);
      toast.success("Custom problem created and queued.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create custom problem.");
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="relative flex w-full bg-base font-mono text-fg selection:bg-accent-primary/30 selection:text-accent-primary">
      {/* Dot-grid texture */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />



      {/* MAIN CONTENT — min-h budget accounts for the sticky header that
          Layout.tsx renders in document flow. A hard `lg:h-screen` here
          overflowed past the viewport and collided with the page footer, so the
          height is expressed as a min-height and the page scrolls normally.
          pb-24 on mobile clears the fixed MobileBottomNav. */}
      <main className="relative z-10 w-full min-w-0 flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-6 md:pb-12 min-h-[calc(100vh-var(--header-height,3.5rem))]">
        <div className="mx-auto flex h-full max-w-[1400px] min-h-0 flex-col">
          <Link
            to="/lobby"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle transition hover:text-accent-primary"
          >
            <ArrowLeft size={14} aria-hidden /> Return to lobby
          </Link>

          {/* ── HEADER — draft status + live configuration readout ─────── */}
          <header className="mt-4 flex flex-col gap-4 border-y border-subtle-line py-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
                <Swords size={14} aria-hidden /> Room deployment / configuration
              </div>
              <h1 className="mt-3 font-mono text-3xl font-black tracking-[-0.04em] text-fg md:text-5xl">
                Configure the <span className="text-accent-primary">operation.</span>
              </h1>
            </div>
            <div className="flex flex-col gap-2 font-mono text-[9px] uppercase tracking-widest text-faint lg:items-end lg:text-right">
              <span>Draft / not published</span>
              <span className="flex items-center gap-2 text-accent-success">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-success shadow-glow-success" aria-hidden />
                {staged ? "configuration staged" : `${selectedProblemIds.length} selected — ${timeLabel}`}
              </span>
            </div>
          </header>

          {staged ? (
            <section
              className="mt-6 overflow-hidden rounded-[28px] border border-accent-success/25 bg-accent-success/[0.04] p-7 md:p-10"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-success">
                <Radio size={14} aria-hidden /> Deployment staged
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg md:text-4xl">
                Your operation is staged.
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-sm leading-6 text-subtle">
                {name.trim() || "Untitled operation"} · {selectedProblemIds.length} problem
                {selectedProblemIds.length === 1 ? "" : "s"} · {timeLabel} ·{" "}
                {protectedRoom ? "pass protected" : "open access"}. Deploy to publish this
                configuration and invite participants.
              </p>
              <div className="mt-7 flex flex-col gap-3 border-t border-accent-success/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-faint">
                  staged / awaiting deploy
                </span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStagedSignature(null)}
                    className="border border-subtle-line px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-subtle transition hover:text-fg"
                  >
                    Edit configuration
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateRoom()}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-accent-primary px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <Activity size={14} className="animate-pulse" aria-hidden />
                    ) : (
                      <Swords size={14} aria-hidden />
                    )}
                    Deploy operation
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleCreateRoom}
              className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden"
            >
              {/* ── LEFT: CONFIGURATION COLUMN (internally scrollable) ─── */}
              <div className="themed-scroll min-h-0 space-y-4 lg:overflow-y-auto lg:pr-2">
                {/* IDENTITY & MISSION */}
                <section className="rounded-[24px] border border-subtle-line bg-surface p-6">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                    <ShieldAlert size={14} aria-hidden /> Identity &amp; mission
                  </div>
                  <h2 className="mt-4 text-lg font-bold tracking-tight text-fg">Name the operation.</h2>

                  <label className="mt-5 block font-mono text-[9px] uppercase tracking-widest text-subtle">
                    Operation title
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Graph traversal / night shift"
                      className="mt-2 h-12 w-full border border-subtle-line bg-void px-4 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                    />
                  </label>

                  <label className="mt-4 block font-mono text-[9px] uppercase tracking-widest text-subtle">
                    Mission briefing
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the room…"
                      className="mt-2 min-h-20 w-full border border-subtle-line bg-void p-4 font-sans text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                    />
                  </label>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-subtle">
                      Max users
                      <select
                        value={maxUsers}
                        onChange={(e) => setMaxUsers(Number(e.target.value))}
                        className="mt-2 h-11 w-full border border-subtle-line bg-void px-3 text-xs text-fg outline-none focus:border-accent/50"
                      >
                        {[2, 4, 6, 8].map((count) => (
                          <option key={count} value={count}>
                            {count} operatives
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-subtle">
                      Time limit
                      <select
                        value={timeLimitOption}
                        onChange={(e) => setTimeLimitOption(e.target.value)}
                        className="mt-2 h-11 w-full border border-subtle-line bg-void px-3 text-xs text-fg outline-none focus:border-accent/50"
                      >
                        <option value="AUTO">Auto — {autoMinutes || 0} min from queue</option>
                        {TIME_LIMIT_OPTIONS.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} minutes
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (protectedRoom) {
                          setIsPublic(true);
                          setPassword("");
                        } else {
                          setIsPublic(false);
                        }
                      }}
                      aria-pressed={protectedRoom}
                      className={`mt-auto flex h-11 items-center justify-center gap-2 border px-3 font-mono text-[9px] uppercase tracking-widest transition ${
                        protectedRoom
                          ? "border-accent-warning/40 bg-accent-warning/[0.08] text-accent-warning"
                          : "border-subtle-line text-subtle hover:text-fg"
                      }`}
                    >
                      {protectedRoom ? (
                        <LockKeyhole size={14} aria-hidden />
                      ) : (
                        <Check size={14} aria-hidden />
                      )}
                      {protectedRoom ? "Pass protected" : "Open access"}
                    </button>
                  </div>

                  {protectedRoom && (
                    <label className="mt-4 block font-mono text-[9px] uppercase tracking-widest text-subtle">
                      Access password (optional)
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank for open access"
                        className="mt-2 h-11 w-full border border-subtle-line bg-void px-4 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                      />
                    </label>
                  )}

                  <div className="mt-5 border-t border-subtle-line pt-4">
                    <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-faint">
                      <span>Mission queue</span>
                      <span className="text-accent-primary">
                        {selectedProblemIds.length} / {MAX_SELECTABLE_PROBLEMS} selected
                      </span>
                    </div>
                    {queueProblems.length === 0 ? (
                      <p className="mt-3 text-xs text-faint">
                        No problems queued yet — pick them from the problem queue panel.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2" aria-label="Selected problems">
                        {queueProblems.map((prob) => (
                          <li
                            key={prob.id}
                            className="flex items-center justify-between gap-2 border border-subtle-line bg-void px-3 py-2 text-xs"
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
                    )}
                    {selectedOverflowCount > 0 && (
                      <div className="mt-3 flex items-center gap-2 border border-subtle-line bg-void px-3 py-2 text-xs">
                        <Gauge size={12} className="shrink-0 text-accent-warning" aria-hidden />
                        <span className="text-subtle">
                          <span className="font-bold text-fg">+{selectedOverflowCount}</span> more selected — remove a problem to add another
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* BATTLE TEMPLATES */}
                <section className="rounded-[24px] border border-subtle-line bg-surface p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-violet">
                      <LayoutTemplate size={14} aria-hidden /> Battle templates
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={saveTemplateLoading}
                      className="flex items-center gap-1 border border-accent-violet/30 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-accent-violet transition hover:border-accent-violet disabled:opacity-50"
                    >
                      {saveTemplateLoading ? (
                        <Activity size={13} className="animate-pulse" aria-hidden />
                      ) : (
                        <Save size={13} aria-hidden />
                      )}
                      Save current
                    </button>
                  </div>
                  {templatesLoading ? (
                    <p className="mt-5 text-xs text-faint">Loading templates…</p>
                  ) : templates.length === 0 ? (
                    <p className="mt-5 text-xs text-faint">
                      No saved templates yet — build a queue and save it for reuse.
                    </p>
                  ) : (
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {templates.map((template) => (
                        <button
                          type="button"
                          key={template.id}
                          onClick={() => chooseTemplate(template)}
                          className={`border p-4 text-left transition ${
                            activeTemplateId === template.id
                              ? "border-accent-violet/50 bg-accent-violet/[0.08]"
                              : "border-subtle-line bg-void hover:border-accent-violet/40"
                          }`}
                        >
                          <span className="block min-w-0 truncate text-xs font-bold text-fg">
                            {template.name}
                          </span>
                          <span className="mt-2 block font-mono text-[9px] uppercase tracking-widest text-faint">
                            {templateMeta(template)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-faint">
                    Selecting a template loads its problems into the mission queue.
                  </p>
                </section>

                {/* CUSTOM PROBLEM STUDIO — revealed from the queue panel */}
                {studioOpen && (
                  <section
                    className="rounded-[24px] border border-subtle-line bg-surface p-6"
                    aria-label="Custom problem studio"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                        <Code2 size={14} aria-hidden /> Custom problem studio
                      </div>
                      <button
                        type="button"
                        onClick={() => setStudioOpen(false)}
                        aria-label="Close custom problem studio"
                        className="text-faint transition hover:text-fg"
                      >
                        <X size={15} aria-hidden />
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-subtle">
                        Scenario name
                        <input
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Invert Binary Tree"
                          className="mt-2 h-11 w-full border border-subtle-line bg-void px-3 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                        />
                      </label>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-subtle">
                        Threat level
                        <select
                          value={customDifficulty}
                          onChange={(e) => setCustomDifficulty(e.target.value)}
                          className="mt-2 h-11 w-full border border-subtle-line bg-void px-3 text-xs text-fg outline-none focus:border-accent/50"
                        >
                          <option value="EASY">EASY (15 min)</option>
                          <option value="MEDIUM">MEDIUM (20 min)</option>
                          <option value="HARD">HARD (30 min)</option>
                        </select>
                      </label>
                    </div>

                    <label className="mt-4 block font-mono text-[9px] uppercase tracking-widest text-subtle">
                      Problem definition (markdown)
                      <textarea
                        rows={4}
                        value={customDefinition}
                        onChange={(e) => setCustomDefinition(e.target.value)}
                        placeholder="Write your problem description here…"
                        className="mt-2 w-full border border-subtle-line bg-void p-4 font-sans text-sm text-fg outline-none placeholder:text-faint focus:border-accent/50"
                      />
                    </label>

                    {/* HINTS */}
                    <div className="mt-4 border border-subtle-line p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-accent-warning">
                          <Lightbulb size={13} aria-hidden /> Hints
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomHints([...customHints, ""])}
                          className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-accent-warning"
                        >
                          <Plus size={12} aria-hidden /> Add
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {customHints.map((hint, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              value={hint}
                              onChange={(e) => {
                                const h = [...customHints];
                                h[i] = e.target.value;
                                setCustomHints(h);
                              }}
                              placeholder="Hint text…"
                              className="h-10 flex-1 border border-subtle-line bg-void px-3 text-xs text-fg outline-none placeholder:text-faint focus:border-accent-warning/50"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomHints(customHints.filter((_, idx) => idx !== i))}
                              aria-label={`Remove hint ${i + 1}`}
                              className="text-faint transition hover:text-accent-danger"
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <TestCaseGeneratorPanel
                        signature={creatorSignature}
                        setSignature={setCreatorSignature}
                        onGenerated={(generated) => setCustomTestCases(generated)}
                      />
                    </div>

                    {/* TEST CASES */}
                    <div className="mt-4 border border-subtle-line p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-accent-danger">
                          <Terminal size={13} aria-hidden /> Test cases
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomTestCases([...customTestCases, { input: "", expectedOutput: "", is_public: true }])}
                          className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-accent-danger"
                        >
                          <Plus size={12} aria-hidden /> Add
                        </button>
                      </div>
                      <div className="mt-3 space-y-3">
                        {customTestCases.map((tc, i) => (
                          <div key={i} className="relative border border-subtle-line bg-void p-3">
                            <button
                              type="button"
                              onClick={() => setCustomTestCases(customTestCases.filter((_, idx) => idx !== i))}
                              aria-label={`Remove test case ${i + 1}`}
                              className="absolute right-3 top-3 text-faint transition hover:text-accent-danger"
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!tc.is_public}
                                onChange={(e) => {
                                  const t = [...customTestCases];
                                  t[i].is_public = !e.target.checked;
                                  setCustomTestCases(t);
                                }}
                                className="accent-[var(--accent-danger)]"
                              />
                              <span className="font-mono text-[9px] uppercase tracking-widest text-accent-danger">
                                Hidden edge case
                              </span>
                            </label>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <input
                                value={tc.input}
                                onChange={(e) => {
                                  const t = [...customTestCases];
                                  t[i].input = e.target.value;
                                  setCustomTestCases(t);
                                }}
                                placeholder="Input"
                                className="h-10 border border-subtle-line bg-raised px-3 text-xs text-accent-primary outline-none placeholder:text-faint"
                              />
                              <input
                                value={tc.expectedOutput}
                                onChange={(e) => {
                                  const t = [...customTestCases];
                                  t[i].expectedOutput = e.target.value;
                                  setCustomTestCases(t);
                                }}
                                placeholder="Expected output"
                                className="h-10 border border-subtle-line bg-raised px-3 text-xs text-accent-success outline-none placeholder:text-faint"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SNIPPETS */}
                    <div className="mt-4 border border-subtle-line p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-accent-primary">
                          <Code2 size={13} aria-hidden /> Snippets
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomSnippets([...customSnippets, { language: "python", code: "", wrapperCode: "" }])}
                          className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-accent-primary"
                        >
                          <Plus size={12} aria-hidden /> Add
                        </button>
                      </div>
                      <div className="mt-3 space-y-3">
                        {customSnippets.map((snip, i) => (
                          <div key={i} className="relative border border-subtle-line bg-void p-3">
                            <button
                              type="button"
                              onClick={() => setCustomSnippets(customSnippets.filter((_, idx) => idx !== i))}
                              aria-label={`Remove snippet ${i + 1}`}
                              className="absolute right-3 top-3 text-faint transition hover:text-accent-danger"
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                            <select
                              value={snip.language}
                              onChange={(e) => {
                                const s = [...customSnippets];
                                s[i].language = e.target.value;
                                setCustomSnippets(s);
                              }}
                              className="h-9 border border-subtle-line bg-raised px-2 font-mono text-[10px] uppercase tracking-widest text-accent-primary outline-none"
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                            </select>
                            <textarea
                              rows={3}
                              value={snip.code}
                              onChange={(e) => {
                                const s = [...customSnippets];
                                s[i].code = e.target.value;
                                setCustomSnippets(s);
                              }}
                              placeholder="Starter code…"
                              className="mt-2 w-full border border-subtle-line bg-void p-2 font-mono text-sm text-fg outline-none placeholder:text-faint focus:border-accent-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateCustomProblem}
                      disabled={customLoading}
                      className="mt-5 flex w-full items-center justify-center gap-2 border border-accent-primary/50 bg-accent-primary/10 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary hover:text-ink disabled:opacity-50"
                    >
                      {customLoading ? (
                        <Activity size={15} className="animate-pulse" aria-hidden />
                      ) : (
                        <Target size={15} aria-hidden />
                      )}
                      Create &amp; add to queue
                    </button>
                  </section>
                )}
              </div>

              {/* ── RIGHT: PROBLEM QUEUE (search + select + deploy) ─────── */}
              <aside
                aria-label="Problem queue"
                className="themed-scroll min-h-0 rounded-[24px] border border-accent-primary/20 bg-accent-primary/[0.04] p-5 lg:overflow-y-auto"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                      <Swords size={14} aria-hidden /> Problem queue
                    </div>
                    <p className="mt-2 text-xs text-subtle">
                      Search and select the problems for this operation.
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-faint">
                    {selectedProblemIds.length} selected
                  </span>
                </div>

                {/* SYSTEM PROBLEMS */}
                <div className="mt-5 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setProblemPage(1);
                      }}
                      placeholder="Search problem or topic"
                      className="h-10 w-full border border-subtle-line bg-void pl-9 pr-3 text-xs text-fg outline-none placeholder:text-faint focus:border-accent/40"
                    />
                  </div>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => {
                      setDifficultyFilter(e.target.value);
                      setProblemPage(1);
                    }}
                    aria-label="Filter by difficulty"
                    className="h-10 w-28 shrink-0 border border-subtle-line bg-void px-2 text-xs text-fg outline-none focus:border-accent/40"
                  >
                    <option value="">All levels</option>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                  {filteredProblems.length} problem{filteredProblems.length === 1 ? "" : "s"} found
                </p>

                <div className="mt-3 space-y-2">
                  {visibleProblems.length === 0 ? (
                    <p className="border border-dashed border-subtle-line p-4 text-center text-xs text-faint">
                      No problems match this search.
                    </p>
                  ) : (
                    visibleProblems.map((problem) => {
                      const isSelected = selectedProblemIds.includes(problem.id);
                      return (
                        <button
                          type="button"
                          key={problem.id}
                          onClick={() => toggleProblemSelection(problem.id)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-center justify-between gap-3 border p-3 text-left transition ${
                            isSelected
                              ? "border-accent-primary/50 bg-accent-primary/[0.08]"
                              : "border-subtle-line bg-void hover:border-accent/40"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className={`grid h-5 w-5 shrink-0 place-items-center border ${
                                isSelected
                                  ? "border-accent-primary bg-accent-primary text-ink"
                                  : "border-line-mid text-transparent"
                              }`}
                            >
                              <Check size={12} aria-hidden />
                            </span>
                            <span className="min-w-0 truncate text-xs text-fg">{problem.name}</span>
                          </span>
                          <span className={`shrink-0 font-mono text-[9px] font-bold tracking-widest ${difficultyTone(problem.difficulty_level)}`}>
                            {problem.difficulty_level}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <Pager page={safeProblemPage} total={problemPageCount} setPage={setProblemPage} />

                {/* CUSTOM PROBLEMS */}
                <div className="mt-5 border-t border-accent-primary/15 pt-5">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-faint">
                    <span>Custom problems</span>
                    <span>{customProblems.length} available</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={customQuery}
                      onChange={(e) => {
                        setCustomQuery(e.target.value);
                        setCustomPage(1);
                      }}
                      placeholder="Search or create custom problem"
                      className="h-10 min-w-0 flex-1 border border-subtle-line bg-void px-3 text-xs text-fg outline-none placeholder:text-faint focus:border-accent/40"
                    />
                    <button
                      type="button"
                      onClick={() => setStudioOpen(true)}
                      aria-label="Open custom problem studio"
                      title="Create a custom problem"
                      className="grid h-10 w-10 shrink-0 place-items-center border border-accent-primary/30 text-accent-primary transition hover:bg-accent-primary/10"
                    >
                      <Plus size={14} aria-hidden />
                    </button>
                  </div>

                  {visibleCustom.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {visibleCustom.map((problem) => {
                        const isSelected = selectedProblemIds.includes(problem.id);
                        return (
                          <div
                            key={problem.id}
                            className={`flex items-center justify-between gap-3 border border-dashed p-3 ${
                              isSelected
                                ? "border-accent-primary/50 bg-accent-primary/[0.06]"
                                : "border-accent-primary/25"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleProblemSelection(problem.id)}
                              aria-pressed={isSelected}
                              className="min-w-0 flex-1 truncate text-left text-xs text-subtle"
                            >
                              {problem.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) toggleProblemSelection(problem.id);
                              }}
                              aria-label={`Remove ${problem.name} from queue`}
                              className={`shrink-0 transition ${
                                isSelected ? "text-accent-danger" : "text-faint"
                              }`}
                            >
                              <Trash2 size={13} aria-hidden />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 border border-dashed border-subtle-line p-4 text-center text-xs text-faint">
                      {customProblems.length === 0
                        ? "No custom problems yet — create one with the + button."
                        : "No custom problems match this search."}
                    </p>
                  )}
                  <Pager page={safeCustomPage} total={customPageCount} setPage={setCustomPage} />
                </div>

                <button
                  type="submit"
                  disabled={selectedProblemIds.length === 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-accent-primary py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Deploy operation <ChevronRight size={15} aria-hidden />
                </button>
                <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-widest text-faint">
                  Nothing is published until you deploy
                </p>
              </aside>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateRoom;
