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
  Radar,
  Wifi,
  Clock3,
  Users,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardSkeletonGrid } from "../components/ui/Skeleton";
import { PasswordModal } from "../components/ui/PasswordModal";
import { api } from "../config/api";
import { toast } from "sonner";
import { useSocket } from "../context/SocketContext";

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
  const [query, setQuery] = useState("");
  const [maxUsers, setMaxUsers] = useState("any");
  const [maxTime, setMaxTime] = useState("any");
  const [access, setAccess] = useState("any");

  const { data, isLoading: loading } = useQuery({
    queryKey: ["lobby-data"],
    queryFn: async () => {
      const [roomsRes, templatesRes, myEventsRes] = await Promise.all([
        api.get("/rooms/lobby"),
        api.get("/rooms/templates"),
        api.get("/rooms/my-events"),
      ]);
      return {
        rooms: roomsRes.data.rooms,
        templates: templatesRes.data.templates,
        myEvents: myEventsRes.data.events,
      };
    },
  });

  // Custom DB-backed rooms bypass the in-memory lobby Map, so the server has
  // no emit hook for their changes — poll lightly until a realtime source
  // exists. invalidateQueries is correct here (not setQueryData): the list is
  // a multi-row server aggregation the client cannot derive.
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["lobby-data"] });
    }, 15000);
    return () => clearInterval(id);
  }, [socket, queryClient]);

  const rooms: Room[] = data?.rooms || [];
  const templates: Room[] = data?.templates || [];
  const myEvents: Room[] = data?.myEvents || [];

  const roomTimeMinutes = (room: Room) =>
    room.totalTimeLimitMs ? Math.round(room.totalTimeLimitMs / 60000) : null;
  const isProtected = (room: Room) => Boolean(room.password) || room.isPublic === false;

  const activeItems: Room[] = activeTab === "ROOMS" ? rooms : activeTab === "TEMPLATES" ? templates : myEvents;

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeItems.filter((room) => {
      const searchable = `${room.name ?? ""} ${room.description ?? ""} ${room.host?.username ?? ""} ${room.roomCode ?? ""}`.toLowerCase();
      if (needle && !searchable.includes(needle)) return false;
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
  }, [access, activeItems, maxTime, maxUsers, query]);

  const hasFilters = Boolean(query.trim() || maxUsers !== "any" || maxTime !== "any" || access !== "any");

  const resetFilters = () => {
    setQuery("");
    setMaxUsers("any");
    setMaxTime("any");
    setAccess("any");
  };

  const handleTabChange = (tab: LobbyTab) => {
    setActiveTab(tab);
    resetFilters();
  };

  const tabDefs = [
    { key: "ROOMS", label: "Active rooms", Icon: Shield },
    { key: "TEMPLATES", label: "Battle templates", Icon: LayoutTemplate },
    { key: "MY_ARCHIVES", label: "My archives", Icon: Archive },
  ] as const;

  const tabLabel =
    activeTab === "ROOMS" ? "rooms" : activeTab === "TEMPLATES" ? "templates" : "archives";

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
    navigate(`/battle/${pwModal.roomCode}`, { state: { password } });
    setPwModal({ isOpen: false, roomCode: "", roomName: "" });
  };

  const handleCloneTemplate = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await api.post("/rooms/clone", { templateId });
      queryClient.invalidateQueries({ queryKey: ["lobby-data"] });
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to clone template");
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this operation?")) return;
    try {
      await api.delete(`/rooms/${encodeURIComponent(eventId)}`);
      queryClient.invalidateQueries({ queryKey: ["lobby-data"] });
      toast.success("Operation deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete operation");
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
        className={`group flex min-h-[220px] flex-col rounded-[22px] border p-5 transition hover:-translate-y-0.5 ${
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

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-subtle-line pt-4 text-[9px] uppercase tracking-widest text-subtle">
          <span className="flex min-w-0 items-center gap-2">
            <Users size={13} className="shrink-0" aria-hidden />
            <span className="whitespace-nowrap">
              {isTemplate ? `${room.problems?.length ?? 0} problems` : `${room.maxUsers} max`}
            </span>
            <Clock3 size={13} className="ml-2 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{minutes !== null ? `${minutes}m` : "—"}</span>
            <span className="ml-2 truncate font-mono normal-case tracking-normal text-faint">
              {room.roomCode}
            </span>
          </span>
          <span className="shrink-0 truncate" title={room.host?.username}>
            {room.host?.username}
          </span>
        </div>

          {isArchive ? (
            <button
              onClick={() => handleDeleteEvent(room.id)}
              className="mt-4 flex items-center justify-between border border-accent-danger/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-danger transition hover:bg-accent-danger/[0.08]"
              aria-label={`Delete operation: ${room.name}`}
            >
              Delete operation
              <Trash2 size={14} aria-hidden />
            </button>
          ) : isTemplate ? (
            <button
              onClick={() => handleCloneTemplate(room.id)}
              disabled={cloningId === room.id}
              className="mt-4 flex items-center justify-between border border-accent-warning/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-warning transition hover:bg-accent-warning/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Deploy template: ${room.name}`}
            >
              {cloningId === room.id ? "Deploying template" : "Deploy template"}
              <RefreshCw
                size={14}
                aria-hidden
                className={cloningId === room.id ? "animate-spin" : ""}
              />
            </button>
          ) : (
            <button
              onClick={() => handleJoinRoom(room)}
              className="mt-4 flex items-center justify-between border border-accent/25 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent/[0.08]"
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
      <main className="relative z-10 flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-8 py-5 pb-24 md:pb-10">
        {/* Dot-grid texture. Paired with `relative z-10` on this <main>:
            the grid is position:fixed inset-0, so at z-0 it would paint over
            the heading, and at -z-10 it falls behind the shell's own
            background and disappears. Content above, grid just behind it. */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] z-0" />
        <div className="mx-auto max-w-[1500px]">

        {/* PAGE HEADER */}
        <header className="relative overflow-hidden border-b border-subtle-line pb-6">
          <div aria-hidden className="absolute -right-10 -top-20 h-56 w-56 rounded-full border border-accent/10" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent-success">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-success shadow-glow-success" />
                Live operations / lobby
              </div>
              <h1 className="mt-3 max-w-xl text-2xl font-bold tracking-tight sm:text-4xl">
                Find your next
                <br />
                <span className="text-accent-primary">opponent.</span>
              </h1>
              <p className="mt-4 max-w-xl text-xs leading-5 text-subtle">
                Scan open rooms, configure a battle template, or review your own operation history.
              </p>
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
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="min-w-0">
            <nav
              aria-label="Lobby sections"
              role="tablist"
              className="grid grid-cols-3 gap-3 border-b border-subtle-line pb-3"
            >
              {tabDefs.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => handleTabChange(key)}
                  className={`group flex min-h-[76px] flex-col items-start justify-between rounded-2xl border p-3 text-left transition ${
                    activeTab === key
                      ? "border-accent/40 bg-accent/[0.08] text-accent-primary"
                      : "border-subtle-line bg-raised text-subtle hover:border-line-mid hover:bg-surface-hover"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  <span className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                    {label}
                    <ArrowUpRight size={12} aria-hidden className="opacity-50" />
                  </span>
                </button>
              ))}
            </nav>

            <section
              aria-label="Lobby filters"
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-subtle-line bg-raised p-3 shadow-[0_18px_50px_rgba(0,0,0,.16)] lg:flex-row lg:items-center"
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
                  className="h-10 w-full border border-subtle-line bg-void pl-9 pr-9 text-xs text-fg outline-none placeholder:text-faint focus:border-accent/40"
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 px-1 text-[9px] uppercase tracking-widest text-faint">
                  <SlidersHorizontal size={13} aria-hidden /> Filters
                </span>
                <select
                  aria-label="Maximum users"
                  value={maxUsers}
                  onChange={(event) => setMaxUsers(event.target.value)}
                  className="border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
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
                  className="border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
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
                  className="border border-subtle-line bg-raised px-3 py-2 text-[9px] uppercase tracking-widest text-accent-primary outline-none"
                >
                  <option value="any">Access: any</option>
                  <option value="open">Open only</option>
                  <option value="protected">Pass protected</option>
                </select>
                {hasFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-2 text-[9px] uppercase tracking-widest text-faint hover:text-fg"
                  >
                    Reset
                  </button>
                )}
              </div>
            </section>

            <div className="mt-4 flex items-center justify-between text-[9px] uppercase tracking-widest text-faint">
              <span>
                {filteredItems.length} {tabLabel} visible
              </span>
              {hasFilters && <span className="text-accent-primary">Filtered view</span>}
            </div>

        {loading ? (
          <div className="mt-3">
            <CardSkeletonGrid count={6} />
          </div>
        ) : (
          <section className="mt-3 grid gap-3 md:grid-cols-2">
            {filteredItems.length ? (
              filteredItems.map((room) =>
                renderCard(room, activeTab === "MY_ARCHIVES"),
              )
            ) : (
              <div className="col-span-full border border-dashed border-subtle-line py-16 text-center">
                <Archive size={30} aria-hidden className="mx-auto text-faint" />
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
        )}

            <PasswordModal
              isOpen={pwModal.isOpen}
              roomCode={pwModal.roomCode}
              roomName={pwModal.roomName}
              onClose={() => setPwModal({ isOpen: false, roomCode: "", roomName: "" })}
              onSubmit={handlePasswordSubmit}
            />
          </section>

          <aside className="rounded-[26px] border border-subtle-line bg-raised p-5 lg:sticky lg:top-5 lg:self-start">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-success">
              <Radar size={14} aria-hidden /> Live radar
            </div>
            <div className="mt-8 grid aspect-square place-items-center rounded-full border border-accent/20 bg-accent/[0.03]">
              <div className="grid h-2/3 w-2/3 place-items-center rounded-full border border-accent/20">
                <Wifi size={22} aria-hidden className="text-accent-primary" />
              </div>
            </div>
            <div className="mt-6 space-y-3 border-t border-subtle-line pt-5 text-[9px] uppercase tracking-widest text-subtle">
              <p className="flex justify-between">
                rooms online <span className="text-accent-success">{rooms.length}</span>
              </p>
              <p className="flex justify-between">
                templates <span className="text-accent-primary">{templates.length}</span>
              </p>
              <p className="flex justify-between">
                my archives <span className="text-accent-primary">{myEvents.length}</span>
              </p>
              <p className="flex justify-between">
                system state <span className="text-accent-success">ready</span>
              </p>
            </div>
          </aside>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Lobby;
