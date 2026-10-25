import React, { useMemo, useState, useEffect } from "react";
import {
  LayoutTemplate,
  Swords,
  Shield,
  ArrowUpRight,
  LockKeyhole,
  Archive,
  RefreshCw,
  Trash2,
  Search,
  X,
  SlidersHorizontal,
  Clock3,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardSkeletonGrid } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PasswordModal } from "../components/ui/PasswordModal";
import { api } from "../config/api";
import { toast } from "sonner";
import { useSocket } from "../context/SocketContext";
import { useDebounce } from "../hooks/useDebounce";
import { isFeatureEnabled } from "../config/features";

interface Room {
  id: string;
  name: string;
  description: string | null;
  roomCode: string;
  maxUsers: number;
  password: string | null;
  isPublic: boolean;
  isTemplate: boolean;
  status?: string;
  totalTimeLimitMs?: number | null;
  host: { username: string; avatarUrl: string | null };
  problems: { difficulty_level: string }[];
}

type LobbyTab = "ROOMS" | "TEMPLATES" | "MY_ARCHIVES";

/** Safety cap on rendered room/template/archive cards in the lobby grid. */
const MAX_ROOMS = 100;
const PAGE_SIZE = 10;

const roomTimeMinutes = (room: Room) =>
  room.totalTimeLimitMs ? Math.round(room.totalTimeLimitMs / 60000) : null;
const isProtected = (room: Room) =>
  Boolean(room.password) || room.isPublic === false;

const Lobby = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LobbyTab>("ROOMS");
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [pwModal, setPwModal] = useState<{
    isOpen: boolean;
    roomCode: string;
    roomName: string;
  }>({ isOpen: false, roomCode: "", roomName: "" });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: null,
  });
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [maxUsers, setMaxUsers] = useState("any");
  const [maxTime, setMaxTime] = useState("any");
  const [access, setAccess] = useState("any");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Lazy-loaded data queries (one per tab) ──
  // Each query passes page/limit and filter params to the server for
  // server-side pagination. The enabled flag ensures data is only fetched
  // when that tab is active.
  const roomsQuery = useQuery({
    queryKey: ["lobby-rooms", currentPage, debouncedQuery, maxUsers, maxTime],
    queryFn: async () => {
      const res = await api.get("/rooms/lobby", {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          search: debouncedQuery,
          maxUsers,
          maxTime,
        },
      });
      return res.data;
    },
    enabled: activeTab === "ROOMS",
    refetchOnWindowFocus: true,
    staleTime: 30000,
    refetchInterval: 15000,
  });

  const templatesQuery = useQuery({
    queryKey: ["lobby-templates", currentPage, debouncedQuery, maxTime, access],
    queryFn: async () => {
      const res = await api.get("/rooms/templates", {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          search: debouncedQuery,
          maxTime,
          access,
        },
      });
      return res.data;
    },
    enabled: activeTab === "TEMPLATES",
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const archivesQuery = useQuery({
    queryKey: ["lobby-archives", currentPage, debouncedQuery, maxTime, access],
    queryFn: async () => {
      const res = await api.get("/rooms/my-events", {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          search: debouncedQuery,
          maxTime,
          access,
        },
      });
      return res.data;
    },
    enabled: activeTab === "MY_ARCHIVES",
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const rooms: Room[] = roomsQuery.data?.rooms || [];
  const templates: Room[] = templatesQuery.data?.templates || [];
  const myEvents: Room[] = archivesQuery.data?.events || [];

  // Server-provided pagination metadata
  const serverMeta =
    roomsQuery.data?.totalPages ??
    templatesQuery.data?.totalPages ??
    archivesQuery.data?.totalPages ??
    1;
  const serverTotal =
    roomsQuery.data?.total ??
    templatesQuery.data?.total ??
    archivesQuery.data?.total ??
    0;

  const loading =
    roomsQuery.isLoading || templatesQuery.isLoading || archivesQuery.isLoading;

  const activeItems: Room[] =
    activeTab === "ROOMS"
      ? rooms
      : activeTab === "TEMPLATES"
        ? templates
        : myEvents;

  // Client-side post-filter for maxUsers on rooms (server already filters
  // but maxUsers needs a count-based check that's simpler client-side for now)
  const filteredItems = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return activeItems.filter((room) => {
      if (needle && !room.name?.toLowerCase().includes(needle)) return false;
      if (maxUsers !== "any" && room.maxUsers > Number(maxUsers)) return false;
      if (maxTime !== "any") {
        const minutes = roomTimeMinutes(room);
        if (minutes === null || minutes > Number(maxTime)) return false;
      }
      if (access !== "any") {
        const locked = isProtected(room);
        if (access === "protected" && !locked) return false;
        if (access === "open" && locked) return false;
      }
      return true;
    });
  }, [access, activeItems, maxTime, maxUsers, debouncedQuery]);

  const totalPages = serverMeta;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = activeItems;

  const hasFilters = Boolean(
    query.trim() || maxUsers !== "any" || maxTime !== "any" || access !== "any",
  );

  const resetFilters = () => {
    setQuery("");
    setMaxUsers("any");
    setMaxTime("any");
    setAccess("any");
    setCurrentPage(1);
  };

  const handleTabChange = (tab: LobbyTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === "ROOMS") {
      setMaxUsers("any");
      setMaxTime("any");
    } else {
      setMaxTime("any");
      setAccess("any");
    }
  };

  const tabDefs = [
    { key: "ROOMS", label: "Active rooms", Icon: Shield },
    { key: "TEMPLATES", label: "Battle templates", Icon: LayoutTemplate },
    { key: "MY_ARCHIVES", label: "My archives", Icon: Archive },
  ] as const;

  const tabLabel =
    activeTab === "ROOMS"
      ? "rooms"
      : activeTab === "TEMPLATES"
        ? "templates"
        : "archives";

  const handleJoinRoom = (room: Room) => {
    if (room.password) {
      setPwModal({
        isOpen: true,
        roomCode: room.roomCode,
        roomName: room.name || "Untitled Operation",
      });
    } else {
      setJoiningCode(room.roomCode);
      navigate(`/battle/${room.roomCode}`);
    }
  };

  const handlePasswordSubmit = (password: string) => {
    const roomCode = pwModal.roomCode;
    sessionStorage.setItem(`room_password_${roomCode}`, password);
    navigate(`/battle/${roomCode}`, { state: { password } });
    setPwModal({ isOpen: false, roomCode: "", roomName: "" });
  };

  const handleCloneTemplate = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await api.post("/rooms/clone", { templateId });
      queryClient.invalidateQueries({ queryKey: ["lobby-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["lobby-templates"] });
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to clone template");
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteEvent = async (
    eventId: string,
    noun: "operation" | "template" = "operation",
  ) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${noun}?`,
      message: `Are you sure you want to permanently delete this ${noun}? This action cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: () => deleteConfirmed(eventId, noun),
    });
  };

  const deleteConfirmed = async (
    eventId: string,
    noun: "operation" | "template",
  ) => {
    try {
      await api.delete(`/rooms/${encodeURIComponent(eventId)}`);
      queryClient.invalidateQueries({ queryKey: ["lobby-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["lobby-templates"] });
      queryClient.invalidateQueries({ queryKey: ["lobby-archives"] });
      toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to delete ${noun}`);
    }
  };

  const renderCard = (room: Room, isArchive: boolean) => {
    const diff = room.problems?.[0]?.difficulty_level || "MEDIUM";
    const isTemplate = room.isTemplate;
    const locked = isProtected(room);
    const minutes = roomTimeMinutes(room);
    const queued = joiningCode === room.roomCode;

    return (
      <article
        key={room.id}
        className={`group flex min-h-[180px] sm:min-h-[220px] flex-col rounded-[22px] border p-4 sm:p-5 transition hover:-translate-y-0.5 ${
          locked
            ? "border-accent-warning/25 bg-accent-warning/[0.035] hover:border-accent-warning/40"
            : "border-subtle-line bg-raised hover:border-accent/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">
              {diff} / operation
            </span>
            <h2 className="mt-3 text-lg font-bold text-fg line-clamp-2">
              {room.name}
            </h2>
          </div>
          {locked ? (
            <span className="flex shrink-0 items-center gap-1 border border-accent-warning/25 bg-accent-warning/[0.08] px-2 py-1 text-[8px] uppercase tracking-widest text-accent-warning">
              <LockKeyhole size={12} aria-hidden /> Protected
            </span>
          ) : (
            <span className="shrink-0 border border-accent-success/20 px-2 py-1 text-[8px] uppercase tracking-widest text-accent-success">
              Open
            </span>
          )}
        </div>

        {room.description ? (
          <p className="mt-3 text-xs leading-5 text-subtle line-clamp-2">
            {room.description}
          </p>
        ) : (
          <p className="mt-3 text-xs leading-5 text-faint">
            No briefing provided for this operation.
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-subtle-line pt-3 text-[8px] uppercase tracking-widest text-subtle sm:pt-4 sm:text-[9px]">
          <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Users size={13} className="shrink-0" aria-hidden />
            <span className="whitespace-nowrap">
              {isTemplate
                ? `${room.problems?.length ?? 0} problems`
                : `${room.maxUsers} max`}
            </span>
            <Clock3 size={13} className="ml-2 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">
              {minutes !== null ? `${minutes}m` : "—"}
            </span>
            <span className="ml-1 truncate font-mono normal-case tracking-normal text-faint sm:ml-2">
              {room.roomCode}
            </span>
          </span>
          <span
            className="shrink-0 truncate max-w-[80px] text-right"
            title={room.host?.username}
          >
            {room.host?.username}
          </span>
        </div>

        {isArchive ? (
          <button
            onClick={() => handleDeleteEvent(room.id)}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-accent-danger/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-danger transition hover:bg-accent-danger/[0.08] sm:mt-4 sm:w-auto sm:flex-1"
            aria-label={`Delete operation: ${room.name}`}
          >
            Delete operation
            <Trash2 size={14} aria-hidden />
          </button>
        ) : isTemplate ? (
          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:gap-3">
            <button
              onClick={() => handleCloneTemplate(room.id)}
              disabled={cloningId === room.id}
              className="flex flex-1 items-center justify-center gap-2 border border-accent-warning/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-warning transition hover:bg-accent-warning/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Deploy template: ${room.name}`}
            >
              {cloningId === room.id ? "Deploying template" : "Deploy template"}
              <RefreshCw
                size={14}
                aria-hidden
                className={cloningId === room.id ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={() => handleDeleteEvent(room.id, "template")}
              className="flex flex-1 items-center justify-center gap-2 border border-accent-danger/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-danger transition hover:bg-accent-danger/[0.08]"
              aria-label={`Delete template: ${room.name}`}
            >
              Delete
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleJoinRoom(room)}
            className="mt-3 w-full flex items-center justify-center gap-2 border border-accent/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent/[0.08] sm:mt-4 sm:w-auto"
            aria-label={`Join operation: ${room.name}`}
          >
            {queued ? "Queued for entry" : "Join operation"}
            <ArrowUpRight size={14} aria-hidden />
          </button>
        )}
      </article>
    );
  };

  return (
    <div className="flex w-full text-fg font-mono">
      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8">
        {/* Dot-grid texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] z-0" />
        <div className="mx-auto max-w-[1500px]">
          {/* PAGE HEADER */}
          <header className="relative overflow-hidden border-b border-subtle-line pb-6">
            <div
              aria-hidden
              className="absolute -right-10 -top-20 hidden h-56 w-56 rounded-full border border-accent/10 lg:block"
            />
            <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-glow-primary" />
                  Live operations / lobby
                </div>
                <h1 className="mt-3 max-w-xl text-2xl font-bold tracking-tight sm:text-4xl">
                  Find your next
                  <br />
                  <span className="text-accent-primary">opponent.</span>
                </h1>
                <p className="mt-4 max-w-xl text-xs leading-5 text-subtle">
                  Scan open rooms, configure a battle template, or review your
                  own operation history.
                </p>
              </div>

              {/* Live Stats — directly to the right of the heading */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-success">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-success shadow-glow-success" />
                  Live stats
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 font-mono text-[9px] uppercase tracking-widest">
                  <span className="flex items-center gap-1">
                    <span className="text-accent-success">{rooms.length}</span>
                    <span className="text-subtle">rooms</span>
                  </span>
                  <span className="h-3 w-px bg-subtle-line" />
                  <span className="flex items-center gap-1">
                    <span className="text-accent-primary">
                      {templates.length}
                    </span>
                    <span className="text-subtle">templates</span>
                  </span>
                  <span className="h-3 w-px bg-subtle-line" />
                  <span className="flex items-center gap-1">
                    <span className="text-accent-primary">
                      {myEvents.length}
                    </span>
                    <span className="text-subtle">archives</span>
                  </span>
                </div>
              </div>

              <Link
                to="/rooms/create"
                className="relative inline-flex items-center justify-center gap-2 rounded-full bg-accent-primary px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ink transition hover:opacity-90"
              >
                <Swords size={14} aria-hidden /> Create room
              </Link>
            </div>
          </header>

          {/* TABS + FILTERS + CONTENT */}
          <div className="mt-6 grid gap-6 lg:gap-8">
            <section className="min-w-0">
              <nav
                aria-label="Lobby sections"
                role="tablist"
                className="grid grid-cols-3 gap-1.5 border-b border-subtle-line pb-3 sm:gap-2"
              >
                {tabDefs.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => handleTabChange(key)}
                    className={`flex min-h-0 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition ${
                      activeTab === key
                        ? "border-accent/40 bg-accent/[0.08] text-accent-primary"
                        : "border-subtle-line bg-raised text-subtle hover:border-line-mid hover:bg-surface-hover"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                    <span className="mt-1 text-[8px] font-bold uppercase tracking-widest sm:text-[9px]">
                      {label}
                    </span>
                  </button>
                ))}
              </nav>

              <section
                aria-label="Lobby filters"
                className="mt-4 flex flex-col gap-3 rounded-2xl border border-subtle-line bg-raised p-3 shadow-[0_18px_50px_rgba(0,0,0,.16)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={14}
                    aria-hidden
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title, host, or room code"
                    aria-label="Search by title, host, or room code"
                    className="h-10 w-full rounded-btn border border-subtle-line bg-void pl-9 pr-9 text-xs text-fg outline-none placeholder:text-faint focus:border-accent/40"
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-fg"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="flex items-center gap-2 px-1 text-[9px] uppercase tracking-widest text-faint">
                    <SlidersHorizontal size={13} aria-hidden /> Filters
                  </span>
                  {activeTab === "ROOMS" && (
                    <>
                      <select
                        aria-label="Maximum users"
                        value={maxUsers}
                        onChange={(event) => setMaxUsers(event.target.value)}
                        className="min-w-[110px] rounded-btn border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
                      >
                        <option value="any">Users: any</option>
                        <option value="2">Users: ≤ 2</option>
                        <option value="4">Users: ≤ 4</option>
                        <option value="6">Users: ≤ 6</option>
                      </select>
                      <select
                        aria-label="Maximum time"
                        value={maxTime}
                        onChange={(event) => setMaxTime(event.target.value)}
                        className="min-w-[110px] rounded-btn border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
                      >
                        <option value="any">Time: any</option>
                        <option value="20">Time: ≤ 20m</option>
                        <option value="30">Time: ≤ 30m</option>
                        <option value="45">Time: ≤ 45m</option>
                      </select>
                    </>
                  )}

                  {(activeTab === "TEMPLATES" ||
                    activeTab === "MY_ARCHIVES") && (
                    <>
                      <select
                        aria-label="Maximum time"
                        value={maxTime}
                        onChange={(event) => setMaxTime(event.target.value)}
                        className="min-w-[110px] rounded-btn border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
                      >
                        <option value="any">Time: any</option>
                        <option value="20">Time: ≤ 20m</option>
                        <option value="30">Time: ≤ 30m</option>
                        <option value="45">Time: ≤ 45m</option>
                      </select>
                      <select
                        aria-label="Room access"
                        value={access}
                        onChange={(event) => setAccess(event.target.value)}
                        className="min-w-[110px] rounded-btn border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
                      >
                        <option value="any">Access: any</option>
                        <option value="open">Open only</option>
                        <option value="protected">Pass protected</option>
                      </select>
                    </>
                  )}
                  {hasFilters && (
                    <button
                      onClick={resetFilters}
                      className="rounded-btn px-2 text-[9px] uppercase tracking-widest text-faint hover:text-fg"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </section>

              {/* Unified skeleton loading state — triggers consistently
                  across all tabs when any query is fetching. */}
              {loading ? (
                <div className="mt-3">
                  <CardSkeletonGrid count={6} />
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-between text-[9px] uppercase tracking-widest text-faint">
                    <span>
                      {paginatedItems.length} of {serverTotal} {tabLabel}{" "}
                      visible
                    </span>
                    {hasFilters && (
                      <span className="text-accent-primary">Filtered view</span>
                    )}
                  </div>

                  <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedItems.length ? (
                      <>
                        {paginatedItems.map((room) =>
                          renderCard(room, activeTab === "MY_ARCHIVES"),
                        )}
                        {serverTotal > MAX_ROOMS && (
                          <div className="col-span-full border border-dashed border-subtle-line py-4 text-center text-[10px] uppercase tracking-widest text-faint">
                            Showing {MAX_ROOMS} of {serverTotal} — refine
                            filters to narrow the list
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-span-full border border-dashed border-subtle-line py-12 text-center sm:py-16">
                        <Archive
                          size={30}
                          aria-hidden
                          className="mx-auto text-faint"
                        />
                        <p className="mt-4 text-sm text-subtle">
                          {activeTab === "MY_ARCHIVES"
                            ? hasFilters
                              ? "No archived operations match these filters."
                              : "No archived operations in this preview."
                            : hasFilters
                              ? "No matching operations found."
                              : activeTab === "TEMPLATES"
                                ? "No public templates"
                                : "No active rooms"}
                        </p>
                        {!hasFilters && activeTab === "ROOMS" && (
                          <Link
                            to="/rooms/create"
                            className="mt-4 inline-block text-xs font-medium text-accent-primary border border-subtle-line px-4 py-2 hover:bg-accent/[0.08] transition-all"
                          >
                            Host a room
                          </Link>
                        )}
                      </div>
                    )}
                  </section>

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-subtle-line pt-3 font-mono text-[9px] uppercase tracking-widest text-faint">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage(safePage - 1)}
                          aria-label="Previous page"
                          className="grid h-7 w-7 place-items-center border border-subtle-line text-subtle transition hover:border-accent/40 hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={13} aria-hidden />
                        </button>
                        <span>
                          Page {safePage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setCurrentPage(safePage + 1)}
                          aria-label="Next page"
                          className="grid h-7 w-7 place-items-center border border-subtle-line text-subtle transition hover:border-accent/40 hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={13} aria-hidden />
                        </button>
                      </div>
                      {hasFilters && (
                        <span className="text-accent-primary">
                          Filtered view
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            <PasswordModal
              isOpen={pwModal.isOpen}
              roomCode={pwModal.roomCode}
              roomName={pwModal.roomName}
              onClose={() =>
                setPwModal({ isOpen: false, roomCode: "", roomName: "" })
              }
              onSubmit={handlePasswordSubmit}
            />

            <ConfirmDialog
              isOpen={confirmDialog.isOpen}
              title={confirmDialog.title}
              message={confirmDialog.message}
              confirmLabel={confirmDialog.confirmLabel}
              danger={confirmDialog.confirmLabel === "Delete"}
              onClose={() =>
                setConfirmDialog({ ...confirmDialog, isOpen: false })
              }
              onConfirm={() => {
                confirmDialog.onConfirm?.();
                setConfirmDialog({
                  ...confirmDialog,
                  isOpen: false,
                  onConfirm: null,
                });
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Lobby;
