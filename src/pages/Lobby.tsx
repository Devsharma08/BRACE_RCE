import React, { useState, useEffect } from "react";
import {
  LayoutTemplate,
  Swords,
  Shield,
  ArrowRight,
  Lock,
  Archive,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardSkeletonGrid } from "../components/ui/Skeleton";
import { PasswordModal } from "../components/ui/PasswordModal";
import { api } from "../config/api";
import { toast } from "sonner";
import { useSocket } from "../context/SocketContext";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useMyRating } from "../hooks/useLeaderboard";

interface Room {
  id: string;
  name: string;
  description: string | null;
  roomCode: string;
  maxUsers: number;
  password: string | null;
  isPublic: boolean;
  isTemplate: boolean;
  host: { username: string; avatarUrl: string | null };
  problems: { difficulty_level: string }[];
}

const Lobby = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: myRating } = useMyRating(true);
  const [activeTab, setActiveTab] = useState<"ROOMS" | "TEMPLATES" | "MY_ARCHIVES">("ROOMS");
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [pwModal, setPwModal] = useState<{
    isOpen: boolean;
    roomCode: string;
    roomName: string;
  }>({ isOpen: false, roomCode: "", roomName: "" });

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

  const handleJoinRoom = (room: Room) => {
    if (room.password) {
      setPwModal({
        isOpen: true,
        roomCode: room.roomCode,
        roomName: room.name || "Untitled Operation",
      });
    } else {
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
    const diffColor =
      diff === "EASY"
        ? "text-[#00FF87]"
        : diff === "HARD"
        ? "text-[#FF3B5C]"
        : "text-[#FFB800]";
    const isTemplate = room.isTemplate;
    const accentBorder = isTemplate
      ? "border-t-[#FFB800]/60"
      : "border-t-accent/60";

    return (
      <article
        key={room.id}
        className={`border border-cyan-500/15 ${accentBorder} border-t-2 bg-raised p-5 flex flex-col gap-3`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold text-white line-clamp-2 min-w-0 flex-1">
            {room.name}
          </span>
          {!room.isPublic && (
            <Lock
              className="w-3.5 h-3.5 text-subtle shrink-0 mt-0.5"
              aria-label="Private room"
            />
          )}
        </div>

        {room.description && (
          <p className="text-xs text-subtle line-clamp-2">{room.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
          <span className={`font-bold ${diffColor}`}>{diff}</span>
          <span aria-hidden>•</span>
          <span>{room.maxUsers} max</span>
          <span aria-hidden>•</span>
          <span className="font-mono">{room.roomCode}</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-cyan-500/15">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 shrink-0 bg-elevated border border-cyan-500/15 flex items-center justify-center"
              aria-hidden
            >
              <span className="text-[8px] font-mono font-bold text-cyan-400">
                {room.host.username.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span
              className="text-[10px] text-subtle truncate"
              title={room.host.username}
            >
              {room.host.username}
            </span>
          </div>

          {isArchive ? (
            <button
              onClick={() => handleDeleteEvent(room.id)}
              className="shrink-0 text-[10px] text-subtle hover:text-[#FF3B5C] transition-colors flex items-center gap-1 px-2 py-1"
              aria-label={`Delete operation: ${room.name}`}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          ) : isTemplate ? (
            <button
              onClick={() => handleCloneTemplate(room.id)}
              disabled={cloningId === room.id}
              className="shrink-0 text-[10px] text-[#FFB800] border border-[#FFB800]/25 hover:border-[#FFB800] hover:bg-[#FFB800]/8 px-3 py-1.5 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Clone template: ${room.name}`}
            >
              <RefreshCw
                className={`w-3 h-3 ${cloningId === room.id ? "animate-spin" : ""}`}
              />
              Clone
            </button>
          ) : (
            <button
              onClick={() => handleJoinRoom(room)}
              className="shrink-0 text-[10px] text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 font-mono uppercase tracking-wider px-3 py-1.5 transition-all flex items-center gap-1.5"
              aria-label={`Join room: ${room.name}`}
            >
              <ArrowRight className="w-3 h-3" />
              Join
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="flex min-h-screen bg-void text-slate-100 font-mono">
      <DashboardSidebar rating={myRating?.rating} />
      <MobileBottomNav />

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main
        className="
          flex-1 min-w-0 w-full
          ml-0 md:ml-[60px] lg:ml-[245px]
          pt-14 px-4 py-6 md:px-8 md:py-8
          pb-20 md:pb-8
        "
      >
        {/* Dot-grid texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

        {/* PAGE HEADER */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-[#00FF87] rounded-full" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00FF87]">
              Live Operations
            </span>
          </div>
          <h1
            className="text-xl font-mono font-black text-white tracking-widest uppercase"
          >
            Operations Lobby
          </h1>
          <p className="text-xs text-subtle mt-1">
            Join active battles or deploy your own
          </p>
        </header>

        {/* RADAR VISUAL
            overflow-hidden is intentional here — the concentric circles extend
            beyond the container height and should be clipped for the visual effect */}
        <div
          className="mb-8 relative flex items-center justify-center h-48 border border-cyan-500/15 bg-raised overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(rgba(0,212,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex items-center justify-center">
            {[64, 128, 192, 256].map(size => (
              <div
                key={size}
                className="absolute border border-cyan-500/20"
                style={{ width: size, height: size }}
              />
            ))}
            <div className="w-3 h-3 bg-cyan-400 animate-ping" />
            <div className="absolute w-3 h-3 bg-cyan-400" />
          </div>
          <div className="absolute bottom-4 left-4 text-[10px] text-subtle font-mono">
            SCANNING...
          </div>
          <div className="absolute top-4 right-4 text-[10px] text-cyan-400/60 font-mono">
            {rooms.length} ACTIVE
          </div>
        </div>

        {/* CREATE ROOM CTA */}
        <div className="mb-6">
          <Link
            to="/rooms/create"
            className="inline-flex items-center gap-2 bg-accent text-ink font-bold text-xs px-5 py-2.5 hover:bg-cyan-400 transition-all tracking-wider uppercase"
          >
            <Swords className="w-4 h-4" />
            Create Room
          </Link>
        </div>

        {/* TABS */}
        <div
          role="tablist"
          aria-label="Lobby sections"
          className="flex items-center border-b border-cyan-500/15 mb-6 overflow-x-auto"
        >
          {(["ROOMS", "TEMPLATES", "MY_ARCHIVES"] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-5 py-3 text-xs font-medium uppercase tracking-wide transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "border-b-2 border-accent text-accent bg-cyan-500/5"
                  : "text-subtle hover:text-white border-b-2 border-transparent"
              }`}
            >
              {tab === "ROOMS"
                ? "Rooms"
                : tab === "TEMPLATES"
                ? "Templates"
                : "My Archives"}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <CardSkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {activeTab === "ROOMS" && rooms.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-cyan-500/15 bg-raised flex flex-col items-center gap-4">
                <Shield className="w-12 h-12 text-slate-600" />
                <div>
                  <p className="text-subtle text-sm">No active rooms</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Host a room to start an operation
                  </p>
                </div>
                <Link
                  to="/rooms/create"
                  className="mt-2 text-xs font-medium text-accent border border-cyan-500/15 px-4 py-2 hover:bg-accent/8 transition-all"
                >
                  Host a room
                </Link>
              </div>
            )}
            {activeTab === "ROOMS" && rooms.map(r => renderCard(r, false))}

            {activeTab === "TEMPLATES" && templates.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-cyan-500/15 bg-raised flex flex-col items-center gap-4">
                <LayoutTemplate className="w-12 h-12 text-slate-600" />
                <p className="text-subtle text-sm">No public templates</p>
              </div>
            )}
            {activeTab === "TEMPLATES" && templates.map(t => renderCard(t, false))}

            {activeTab === "MY_ARCHIVES" && myEvents.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-cyan-500/15 bg-raised flex flex-col items-center gap-4">
                <Archive className="w-12 h-12 text-slate-600" />
                <div>
                  <p className="text-subtle text-sm">Your archives are empty</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Rooms you host or create will appear here
                  </p>
                </div>
              </div>
            )}
            {activeTab === "MY_ARCHIVES" && myEvents.map(e => renderCard(e, true))}
          </div>
        )}

        {/* PASSWORD MODAL */}
        <PasswordModal
          isOpen={pwModal.isOpen}
          roomCode={pwModal.roomCode}
          roomName={pwModal.roomName}
          onClose={() => setPwModal({ isOpen: false, roomCode: "", roomName: "" })}
          onSubmit={handlePasswordSubmit}
        />
      </main>
    </div>
  );
};

export default Lobby;
