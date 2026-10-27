import React, { useState, useMemo } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Gauge,
  LayoutTemplate,
  Lightbulb,
  LockKeyhole,
  Loader2,
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
import {
  invalidateProblemQueries,
  fetchAllProblems,
} from "../utils/problemCache";
import { toast } from "sonner";
import { api, fetchCsrfToken } from "../config/api";

/**
 * Extract user-friendly error message from API error response
 */
const getErrorMessage = (err: unknown): string => {
  const data = (err as any)?.response?.data;
  if (!data) return (err as Error)?.message || "Unknown error";

  // Handle validation errors with field details
  if (data.errors && Array.isArray(data.errors)) {
    return data.errors.map((e: any) => `${e.field}: ${e.message}`).join("; ");
  }

  return data.message || data.error || "Request failed";
};

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

type CustomTestCase = {
  input: string;
  expectedOutput: string;
  is_public: boolean;
};
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

const Pager = ({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (page: number) => void;
}) => (
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

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG CARD SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

type IdentityMissionCardProps = {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
};

const IdentityMissionCard = ({
  name,
  setName,
  description,
  setDescription,
}: IdentityMissionCardProps) => (
  <section className="rounded-card border border-subtle-line bg-surface p-4 sm:p-6">
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary mb-4">
      <ShieldAlert size={14} aria-hidden /> Identity &amp; mission
    </div>
    <h2 className="mt-0 mb-4 text-lg font-bold tracking-tight text-fg sm:text-xl">
      Name the operation.
    </h2>

    <label className="block font-mono text-[9px] uppercase tracking-widest text-subtle mb-1">
      Operation title
    </label>
    <input
      required
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="e.g. Graph traversal / night shift"
      className="w-full h-10 rounded-btn border border-subtle-line/50 bg-raised/30 px-3 text-fg outline-none placeholder:text-muted focus:border-accent/50 focus:bg-raised/50 transition-all sm:h-12 sm:px-4 text:sm"
    />

    <label className="mt-5 block font-mono text-[9px] uppercase tracking-widest text-subtle mb-1">
      Mission briefing
    </label>
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      rows={3}
      placeholder="Describe the room…"
      className="w-full min-h-[100px] rounded-btn border border-subtle-line/50 bg-raised/30 p-3 font-sans text-sm text-fg outline-none placeholder:text-muted focus:border-accent/50 focus:bg-raised/50 transition-all sm:p-4"
    />
  </section>
);

type AccessCapacityCardProps = {
  maxUsers: number;
  setMaxUsers: (v: number) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  timeLimitOption: string;
  setTimeLimitOption: (v: string) => void;
  effectiveMinutes: number;
  timeLabel: string;
  protectedRoom: boolean;
};

const AccessCapacityCard = ({
  maxUsers,
  setMaxUsers,
  isPublic,
  setIsPublic,
  password,
  setPassword,
  timeLimitOption,
  setTimeLimitOption,
  effectiveMinutes,
  timeLabel,
  protectedRoom,
}: AccessCapacityCardProps) => (
  <section className="rounded-card border border-subtle-line bg-surface p-4 sm:p-6">
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary mb-4">
      <LockKeyhole size={14} aria-hidden /> Access &amp; capacity
    </div>

    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* Max Users — Stepper */}
      <div className="space-y-2">
        <label className="font-mono text-[9px] uppercase tracking-widest text-subtle">
          Maximum users
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMaxUsers(Math.max(2, maxUsers - 2))}
            disabled={maxUsers <= 2}
            className="shrink-0 h-9 w-9 rounded-btn border border-subtle-line bg-raised/30 flex items-center justify-center text-[9px] font-bold text-fg transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="flex-1 text-center font-mono text-sm font-bold text-fg ">
            {maxUsers}
          </span>
          <button
            type="button"
            onClick={() => setMaxUsers(Math.min(8, maxUsers + 2))}
            disabled={maxUsers >= 8}
            className="shrink-0 h-9 w-9 rounded-btn border border-subtle-line bg-raised/30 flex items-center justify-center text-[9px] font-bold text-fg transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
        <p className="text-[8px] uppercase tracking-widest text-faint">
          {maxUsers} operative{maxUsers !== 1 ? "s" : ""} max
        </p>
      </div>

      {/* Time Limit — Slider */}
      <div className="space-y-2">
        <label className="font-mono text-[9px] uppercase tracking-widest text-subtle">
          Time limit
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={effectiveMinutes > 0 ? effectiveMinutes : 20}
            onChange={(e) => {
              const val = Number(e.target.value);
              setTimeLimitOption(val > 0 ? String(val) : "AUTO");
            }}
            className="w-full h-1 bg-accent/20 rounded-full appearance-none cursor-pointer"
          />
          <span className="shrink-0 font-mono text-xs font-bold text-accent-primary sm:text-sm">
            {timeLabel}
          </span>
        </div>
        <p className="text-[8px] uppercase tracking-widest text-faint">
          {effectiveMinutes > 0
            ? `${effectiveMinutes} minutes`
            : "Auto from queue"}
        </p>
      </div>
    </div>

    <div className="mt-5 flex items-center gap-3 rounded-btn border border-subtle-line bg-raised/30 p-2 sm:p-3">
      <span className="flex items-center gap-1">
        <LockKeyhole
          size={13}
          aria-hidden
          className={protectedRoom ? "text-accent-warning" : "text-subtle"}
        />
        <span
          className={`font-mono text-[9px] uppercase tracking-widest ${protectedRoom ? "text-accent-warning" : "text-subtle"} sm:text-xs`}
        >
          Pass protected
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          if (protectedRoom) {
            setIsPublic(true);
            setPassword("");
          } else {
            setIsPublic(false);
            setPassword("");
          }
        }}
        aria-pressed={protectedRoom}
        className={`ml-auto shrink-0 h-8 w-20 rounded-btn border px-2 py-1.5 font-mono text-[8px] uppercase tracking-widest transition sm:text-xs sm:px-3 sm:py-2 ${
          protectedRoom
            ? "border-accent-warning/40 bg-accent-warning/[0.08] text-accent-warning"
            : "border-subtle-line text-subtle hover:text-fg"
        }`}
      >
        {protectedRoom ? "ON" : "OFF"}
      </button>
    </div>

    {protectedRoom && (
      <div className="mt-4">
        <label className="block font-mono text-[9px] uppercase tracking-widest text-subtle mb-1">
          Access password (optional)
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank for open access"
          className="w-full h-10 rounded-btn border border-subtle-line/50 bg-raised/30 px-3 text-sm text-fg outline-none placeholder:text-muted focus:border-accent/50 focus:bg-raised/50 transition-all sm:h-12 sm:px-4 sm:text-base"
        />
      </div>
    )}
  </section>
);

type SchedulingCardProps = {
  opensAt: string;
  setOpensAt: (v: string) => void;
  closesAt: string;
  setClosesAt: (v: string) => void;
};

const SchedulingCard = ({
  opensAt,
  setOpensAt,
  closesAt,
  setClosesAt,
}: SchedulingCardProps) => (
  <section className="rounded-card border border-subtle-line bg-surface p-4 sm:p-6">
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary mb-4">
      <Clock size={14} aria-hidden /> Scheduling
    </div>

    <div className="grid gap-4 grid-cols-1 ">
      <div className="space-y-2">
        <label className="font-mono text-[9px] uppercase tracking-widest text-subtle">
          Opens at (optional)
        </label>
        <input
          type="datetime-local"
          value={opensAt}
          onChange={(e) => setOpensAt(e.target.value)}
          className="w-full h-10 rounded-btn border border-subtle-line/50 bg-raised/30 px-3 text-sm text-fg outline-none focus:border-accent/50 focus:bg-raised/50 transition-all [color-scheme:dark] sm:h-12 sm:px-4 "
        />
       
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[9px] uppercase tracking-widest text-subtle">
          Closes at (optional)
        </label>
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="w-full h-10 rounded-btn border border-subtle-line/50 bg-raised/30 px-3 text-sm text-fg outline-none focus:border-accent/50 focus:bg-raised/50 transition-all [color-scheme:dark] sm:h-12 sm:px-4 "
        />
        
      </div>
    </div>

    {(opensAt || closesAt) && (
      <div className="mt-4 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-accent-primary">
        <Clock size={11} aria-hidden />
        {opensAt
          ? `opens ${new Date(opensAt).toLocaleString()}`
          : "opens on deploy"}
        {closesAt ? ` · closes ${new Date(closesAt).toLocaleString()}` : ""}
      </div>
    )}
  </section>
);

type MissionQueueCardProps = {
  selectedProblemIds: string[];
  MAX_SELECTABLE_PROBLEMS: number;
  queueProblems: { id: string; name: string }[];
  toggleProblemSelection: (id: string) => void;
  selectedOverflowCount: number;
};

const MissionQueueCard = ({
  selectedProblemIds,
  MAX_SELECTABLE_PROBLEMS,
  queueProblems,
  toggleProblemSelection,
  selectedOverflowCount,
}: MissionQueueCardProps) => {
  return (
    <section className="rounded-card border border-subtle-line bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-faint mb-3">
        <span>Queued problems</span>
        <span className="text-accent-primary">
          {selectedProblemIds.length} / {MAX_SELECTABLE_PROBLEMS}
        </span>
      </div>
      {queueProblems.length === 0 ? (
        <p className="text-xs text-faint text-center py-4">
          No problems queued yet — pick them from the problem queue panel.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Selected problems">
          {queueProblems.map((prob) => (
            <li
              key={prob.id}
              className="flex items-center justify-between gap-2 border border-subtle-line bg-void px-3 py-2 text-xs sm:text-sm"
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
          {selectedOverflowCount > 0 && (
            <div className="mt-3 flex items-center gap-2 border border-subtle-line bg-void px-3 py-2 text-xs">
              <Gauge
                size={12}
                className="shrink-0 text-accent-warning"
                aria-hidden
              />
              <span className="text-subtle">
                <span className="font-bold text-fg">
                  +{selectedOverflowCount}
                </span>{" "}
                more selected — remove a problem to add another
              </span>
            </div>
          )}
        </ul>
      )}
    </section>
  );
};

const CreateRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [stagedSignature, setStagedSignature] = useState<string | null>(null);

  // --- ROOM STATE ---
  const [name, setName] = useState(
    () => searchParams.get("templateName") ?? "",
  );
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState<number>(2);
  const [isPublic, setIsPublic] = useState(true);
  const [timeLimitOption, setTimeLimitOption] = useState("AUTO");
  // Scheduled opening / auto-close (datetime-local values, browser-local)
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

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
    {
      language: "javascript",
      code: "// Write your code here",
      wrapperCode: "",
    },
  ]);

  const { data: availableProblems = [] } = useQuery({
    queryKey: ["all-available-problems"],
    // Static problem definitions — see invalidateProblemQueries() for the
    // progress-driven refreshes.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      // Paginated endpoints — fetch every page so room creation sees the same
      // full catalog as the Terminal sidebar.
      const [sysProblems, customProblems] = await Promise.all([
        fetchAllProblems("/problems/system"),
        fetchAllProblems("/problems/custom"),
      ]);
      return [...sysProblems, ...customProblems] as Problem[];
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["room-templates"],
    queryFn: async () =>
      (await api.get("/rooms/templates")).data.templates as RoomTemplate[],
  });

  const systemProblems = useMemo(
    () => availableProblems.filter((p) => !p.isCustom),
    [availableProblems],
  );
  const customProblems = useMemo(
    () => availableProblems.filter((p) => p.isCustom),
    [availableProblems],
  );

  const filteredProblems = useMemo(
    () =>
      systemProblems.filter((problem) => {
        const matchesSearch =
          !searchQuery ||
          problem.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty =
          !difficultyFilter || problem.difficulty_level === difficultyFilter;
        return matchesSearch && matchesDifficulty;
      }),
    [systemProblems, searchQuery, difficultyFilter],
  );

  const filteredCustom = useMemo(
    () =>
      customProblems.filter((problem) =>
        problem.name.toLowerCase().includes(customQuery.toLowerCase()),
      ),
    [customProblems, customQuery],
  );

  const problemPageCount = Math.max(
    1,
    Math.ceil(filteredProblems.length / PAGE_SIZE),
  );
  const customPageCount = Math.max(
    1,
    Math.ceil(filteredCustom.length / PAGE_SIZE),
  );
  const safeProblemPage = Math.min(problemPage, problemPageCount);
  const safeCustomPage = Math.min(customPage, customPageCount);
  const visibleProblems = filteredProblems.slice(
    (safeProblemPage - 1) * PAGE_SIZE,
    safeProblemPage * PAGE_SIZE,
  );
  const visibleCustom = filteredCustom.slice(
    (safeCustomPage - 1) * PAGE_SIZE,
    safeCustomPage * PAGE_SIZE,
  );

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

  const effectiveMinutes =
    timeLimitOption === "AUTO" ? autoMinutes : Number(timeLimitOption);
  const timeLabel =
    effectiveMinutes > 0 ? `${effectiveMinutes} minutes` : "Auto";
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
    opensAt,
    closesAt,
  ]);
  const staged =
    stagedSignature !== null && stagedSignature === configSignature;

  const queueProblems = selectedProblemIds
    .map((id) => availableProblems.find((prob) => prob.id === id))
    .filter((prob): prob is Problem => Boolean(prob));
  const selectedOverflowCount = Math.max(
    0,
    selectedProblemIds.length - MAX_SELECTABLE_PROBLEMS,
  );

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
      toast.info(
        `"${template.name}" trimmed to the ${MAX_SELECTABLE_PROBLEMS}-problem queue cap.`,
      );
    }
    setSelectedProblemIds(ids.slice(0, MAX_SELECTABLE_PROBLEMS));
    setActiveTemplateId(template.id);
    toast.success(`Queue loaded from "${template.name}".`);
  };

  const handleSaveTemplate = async () => {
    if (selectedProblemIds.length === 0) {
      return toast.error(
        "Select at least one problem before saving a template.",
      );
    }
    setSaveTemplateLoading(true);
    try {
      await fetchCsrfToken();
      await api.post("/rooms/create", {
        name: name.trim()
          ? `${name.trim()} template`
          : `Custom template ${templates.length + 1}`,
        description,
        password: protectedRoom && password.trim() ? password.trim() : null,
        maxUsers,
        isPublic: true,
        isTemplate: true,
        problemIds: selectedProblemIds,
        totalTimeLimitMs: effectiveMinutes * 60 * 1000,
      });
      await queryClient.invalidateQueries({ queryKey: ["room-templates"] });
      toast.success("Template saved — reuse it from Battle templates.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  const handleCreateRoom = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedProblemIds.length === 0)
      return toast.error("You must select at least one problem!");
    if (!name.trim()) return toast.error("Give your operation a title first.");

    // Client-side password validation
    if (
      protectedRoom &&
      password &&
      password.trim().length > 0 &&
      password.trim().length < 4
    ) {
      return toast.error("Password must be at least 4 characters");
    }

    // Schedule validation: the room must open before it closes
    if (
      opensAt &&
      closesAt &&
      new Date(opensAt).getTime() >= new Date(closesAt).getTime()
    ) {
      return toast.error("Scheduled open time must be before the close time.");
    }

    if (!staged) {
      setStagedSignature(configSignature);
      return;
    }

    // Ensure CSRF token is available before mutating request
    await fetchCsrfToken();

    setLoading(true);
    try {
      const res = await api.post("/rooms/create", {
        name,
        description,
        password:
          protectedRoom && password.trim() ? password.trim() : undefined,
        maxUsers,
        isPublic,
        isTemplate: false,
        problemIds: selectedProblemIds,
        totalTimeLimitMs: effectiveMinutes * 60 * 1000,
        ...(opensAt ? { opensAt: new Date(opensAt).toISOString() } : {}),
        ...(closesAt ? { closesAt: new Date(closesAt).toISOString() } : {}),
      });
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
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
      await fetchCsrfToken();
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
      setSelectedProblemIds((prev) =>
        [...prev, newProb.id].slice(0, MAX_SELECTABLE_PROBLEMS),
      );

      // Reset form + close the studio
      setCustomName("");
      setCustomDefinition("");
      setCustomHints([""]);
      setCustomTestCases([{ input: "", expectedOutput: "", is_public: true }]);
      setCustomSnippets([
        {
          language: "javascript",
          code: "// Write your code here",
          wrapperCode: "",
        },
      ]);
      setCustomQuery("");
      setCustomPage(1);
      setStudioOpen(false);
      toast.success("Custom problem created and queued.");
    } catch (err) {
      toast.error(getErrorMessage(err));
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
              <h1 className="mt-3 font-mono text-3xl font-black tracking-[-0.04em] text-fg md:text-4xl">
                Configure the{" "}
                <span className="text-accent-primary">operation.</span>
              </h1>
            </div>
            <div className="flex flex-col gap-2 font-mono text-[9px] uppercase tracking-widest text-faint lg:items-end lg:text-right">
              <span>Draft / not published</span>
              <span className="flex items-center gap-2 text-accent-success">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent-success shadow-glow-success"
                  aria-hidden
                />
                {staged
                  ? "configuration staged"
                  : `${selectedProblemIds.length} selected — ${timeLabel}`}
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
                {name.trim() || "Untitled operation"} ·{" "}
                {selectedProblemIds.length} problem
                {selectedProblemIds.length === 1 ? "" : "s"} · {timeLabel} ·{" "}
                {protectedRoom ? "pass protected" : "open access"}. Deploy to
                publish this configuration and invite participants.
              </p>
              {(opensAt || closesAt) && (
                <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent-primary">
                  <Clock size={12} aria-hidden />
                  {opensAt
                    ? `opens ${new Date(opensAt).toLocaleString()}`
                    : "opens on deploy"}
                  {closesAt
                    ? ` · closes ${new Date(closesAt).toLocaleString()}`
                    : ""}
                </p>
              )}
              <div className="mt-7 flex flex-col gap-3 border-t border-accent-success/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-faint">
                  staged / awaiting deploy
                </span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStagedSignature(null)}
                    className="border border-subtle-line px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-widest text-subtle transition hover:text-fg sm:px-5 sm:py-3 sm:text-[10px]"
                  >
                    Edit configuration
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={saveTemplateLoading || selectedProblemIds.length === 0 || !name.trim()}
                    className="flex items-center justify-center gap-1.5 border border-accent-primary/30 bg-accent-primary/[0.06] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-5 sm:py-3 sm:text-[10px]"
                  >
                    {saveTemplateLoading ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                    ) : (
                      <Save size={14} aria-hidden />
                    )}
                    Save to Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateRoom()}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 bg-accent-primary px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-5 sm:py-3 sm:text-[10px]"
                  >
                    {loading ? (
                      <Activity
                        size={14}
                        className="animate-pulse"
                        aria-hidden
                      />
                    ) : (
                      <Swords size={14} aria-hidden />
                    )}
                    Deploy operation
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-x-hidden grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px]">
              {/* ── LEFT: CONFIGURATION COLUMN ── */}
              <div className="themed-scroll min-w-0 min-h-0 space-y-4 lg:overflow-y-auto lg:pr-2">
                {/* CONFIG GRID — card-based, responsive */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                  <IdentityMissionCard
                    name={name}
                    setName={setName}
                    description={description}
                    setDescription={setDescription}
                  />
                  <AccessCapacityCard
                    maxUsers={maxUsers}
                    setMaxUsers={setMaxUsers}
                    isPublic={isPublic}
                    setIsPublic={setIsPublic}
                    password={password}
                    setPassword={setPassword}
                    timeLimitOption={timeLimitOption}
                    setTimeLimitOption={setTimeLimitOption}
                    effectiveMinutes={effectiveMinutes}
                    timeLabel={timeLabel}
                    protectedRoom={protectedRoom}
                  />
                  <SchedulingCard
                    opensAt={opensAt}
                    setOpensAt={setOpensAt}
                    closesAt={closesAt}
                    setClosesAt={setClosesAt}
                  />
                  <MissionQueueCard
                    selectedProblemIds={selectedProblemIds}
                    MAX_SELECTABLE_PROBLEMS={MAX_SELECTABLE_PROBLEMS}
                    queueProblems={queueProblems}
                    toggleProblemSelection={toggleProblemSelection}
                    selectedOverflowCount={selectedOverflowCount}
                  />
                </div>
              </div>

              {/* ── RIGHT: PROBLEM QUEUE (search + select + deploy) ─────── */}
              <aside
                aria-label="Problem queue"
                className="themed-scroll min-w-0 min-h-0 rounded-card border border-accent-primary/20 bg-accent-primary/[0.04] p-5 lg:overflow-y-auto"
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
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                      aria-hidden
                    />
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setProblemPage(1);
                      }}
                      placeholder="Search problem or topic"
                      className="h-10 w-full rounded-btn border border-subtle-line bg-void pl-9 pr-3 text-xs text-fg outline-none placeholder:text-faint focus:border-accent/40"
                    />
                  </div>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => {
                      setDifficultyFilter(e.target.value);
                      setProblemPage(1);
                    }}
                    aria-label="Filter by difficulty"
                    className="h-10 w-28 shrink-0 rounded-btn border-2 border-subtle-line/50 bg-raised/30 px-2 text-xs text-fg outline-none focus:border-accent/40 focus:bg-raised/50 transition-all"
                  >
                    <option value="">All levels</option>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                  {filteredProblems.length} problem
                  {filteredProblems.length === 1 ? "" : "s"} found
                </p>

                <div className="mt-3 space-y-2">
                  {visibleProblems.length === 0 ? (
                    <p className="border border-dashed border-subtle-line p-4 text-center text-xs text-faint">
                      No problems match this search.
                    </p>
                  ) : (
                    visibleProblems.map((problem) => {
                      const isSelected = selectedProblemIds.includes(
                        problem.id,
                      );
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
                            <span className="min-w-0 truncate text-xs text-fg">
                              {problem.name}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 font-mono text-[9px] font-bold tracking-widest ${difficultyTone(problem.difficulty_level)}`}
                          >
                            {problem.difficulty_level}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <Pager
                  page={safeProblemPage}
                  total={problemPageCount}
                  setPage={setProblemPage}
                />

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
                      className="h-10 min-w-0 flex-1 rounded-btn border-2 border-subtle-line/50 bg-raised/30 px-3 text-xs text-fg outline-none placeholder:text-muted focus:border-accent/40 focus:bg-raised/50 transition-all"
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
                        const isSelected = selectedProblemIds.includes(
                          problem.id,
                        );
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
                                if (isSelected)
                                  toggleProblemSelection(problem.id);
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
                  <Pager
                    page={safeCustomPage}
                    total={customPageCount}
                    setPage={setCustomPage}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={selectedProblemIds.length === 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-accent-primary py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Deploy operation <ChevronRight size={15} aria-hidden />
                </button>
                <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-widest text-faint">
                  Nothing is published until you deploy
                </p>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateRoom;
