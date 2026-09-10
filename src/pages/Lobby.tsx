import React, { useState } from "react";
import {
  Activity,
  LayoutTemplate,
  Swords,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Lock,
  Unlock,
  Globe,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  RefreshCw,
  Radio,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardSkeletonGrid } from "../components/ui/Skeleton";
import { PasswordModal } from "../components/ui/PasswordModal";
import { api } from "../config/api";

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
  const [activeTab, setActiveTab] = useState<"ROOMS" | "TEMPLATES" | "MY_ARCHIVES">("ROOMS");
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Password modal state
  const [pwModal, setPwModal] = useState<{
    isOpen: boolean;
    roomCode: string;
    roomName: string;
  }>({ isOpen: false, roomCode: "", roomName: "" });

  const { data, isLoading: loading, refetch: fetchLobby } = useQuery({
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

  const rooms: Room[] = data?.rooms || [];
  const templates: Room[] = data?.templates || [];
  const myEvents: Room[] = data?.myEvents || [];

  const queryClient = useQueryClient();

  // Open password modal or navigate directly
  const handleJoinRoom = (room: Room) => {
    if (room.password) {
      setPwModal({ isOpen: true, roomCode: room.roomCode, roomName: room.name || "Untitled Operation" });
    } else {
      navigate(`/battle/${room.roomCode}`);
    }
  };

  // Called when user confirms password in modal
  const handlePasswordSubmit = (password: string) => {
    // Password is validated server-side when joining the battle route
    // We just navigate; the join_battle socket event passes the password
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
      alert("Failed to clone template");
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this operation?")) return;
    try {
      await api.delete(`/rooms/${encodeURIComponent(eventId)}`);
      queryClient.invalidateQueries({ queryKey: ["lobby-data"] });
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to delete operation.");
    }
  };

  const handleToggleVisibility = async (eventId: string, currentVisibility: boolean) => {
    try {
      await api.put(`/rooms/visibility`, { eventId, isPublic: !currentVisibility });
      queryClient.invalidateQueries({ queryKey: ["lobby-data"] });
    } catch (error) {
      console.error(error);
      alert("Failed to change visibility.");
    }
  };

  const getOverallDifficulty = (problems: { difficulty_level: string }[]) => {
    if (problems.length === 0) return "UNKNOWN";
    const hasHard = problems.some((p) => p.difficulty_level === "HARD");
    const hasMedium = problems.some((p) => p.difficulty_level === "MEDIUM");
    return hasHard ? "HARD" : hasMedium ? "MEDIUM" : "EASY";
  };

  const difficultyStyle = (d: string) => {
    if (d === "HARD") return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    if (d === "MEDIUM") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  };

  const renderCard = (room: Room, isArchiveView: boolean = false) => {
    const difficulty = getOverallDifficulty(room.problems);
    const isLocked = !!room.password;

    return (
      <div
        key={room.id}
        className={`group relative bg-[#06080e] border border-white/10 rounded-none p-5 transition-all duration-300 overflow-hidden
          ${room.isTemplate
            ? "border-r-4 border-b-4 border-r-amber-500/60 border-b-amber-500/60 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.10)]"
            : "border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.10)]"
          }`}
      >
        {/* Dot-grid overlay (Dashboard-style) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />

        {/* Top accent stripe */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] ${room.isTemplate
            ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
            : "bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
            }`}
        />

        {/* Corner bracket decorations */}
        <div className={`absolute top-0 left-0 w-3 h-3 border-t border-l opacity-40 group-hover:opacity-100 transition-opacity ${room.isTemplate ? "border-amber-400" : "border-cyan-400"}`} />
        <div className={`absolute top-0 right-0 w-3 h-3 border-t border-r opacity-40 group-hover:opacity-100 transition-opacity ${room.isTemplate ? "border-amber-400" : "border-cyan-400"}`} />

        {/* Archive controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isArchiveView && (
            <>
              <button
                onClick={() => handleToggleVisibility(room.id, room.isPublic)}
                className={`p-1.5 rounded-md transition-all ${room.isPublic ? "text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                title={room.isPublic ? "Make Private" : "Make Public"}
              >
                {room.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleDeleteEvent(room.id)}
                className="p-1.5 rounded-md text-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Delete Event"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="h-3 w-px bg-slate-800 mx-0.5" />
            </>
          )}
          {isLocked ? (
            <span title="Password Protected"><Lock className="w-3.5 h-3.5 text-rose-400" /></span>
          ) : (
            <span title="Open Room"><Unlock className="w-3.5 h-3.5 text-emerald-500/60" /></span>
          )}
        </div>

        {/* Host / Template icon + name */}
        <div className="flex items-center gap-3 mb-3 pr-16">
          {room.isTemplate ? (
            <div className="w-10 h-10 rounded-none bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-5 h-5 text-amber-400" />
            </div>
          ) : (
            <img
              src={room.host.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host.username}`}
              alt="host"
              className="w-10 h-10 rounded-none bg-slate-900 border border-slate-700 shrink-0 object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="text-white font-bold tracking-wider text-sm truncate">
              {room.name || "Untitled Operation"}
            </p>
            <p className={`text-[10px] tracking-widest uppercase ${room.isTemplate ? "text-amber-500/70" : "text-cyan-500/70"}`}>
              {room.isTemplate ? "Architect" : "Host"}: {room.host.username}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
          {room.description || "No mission briefing provided."}
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 mb-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 tracking-widest">
            {room.isTemplate ? (
              <span>{room.problems.length} PROBLEMS</span>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>1 / {room.maxUsers} OPERATIVES</span>
              </>
            )}
          </div>
          <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-none ${difficultyStyle(difficulty)}`}>
            {difficulty}
          </span>
        </div>

        {/* Actions */}
        {room.isTemplate ? (
          <button
            onClick={() => handleCloneTemplate(room.id)}
            disabled={cloningId === room.id}
            className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black font-bold tracking-widest py-2 rounded-none transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/20 hover:border-amber-400"
          >
            {cloningId === room.id ? (
              <Activity className="w-4 h-4 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            CLONE & DEPLOY
          </button>
        ) : (
          <div className="flex gap-2">
            {/* Join */}
            <button
              onClick={() => handleJoinRoom(room)}
              className="flex-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest py-2 rounded-none transition-all flex items-center justify-center gap-2 text-xs border border-cyan-500/20 hover:border-cyan-400"
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              JOIN
            </button>
            {/* Spectate */}
            <button
              onClick={() => navigate(`/battle/${room.roomCode}?spectate=true`)}
              title="Watch Live"
              className="px-3 py-2 bg-[#0b0e15] hover:bg-slate-700 text-slate-400 hover:text-white rounded-none border border-white/10 hover:border-slate-500 transition-all"
            >
              <Radio className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-300 font-mono relative overflow-hidden">
      {/* ── Dot-grid overlay (app-standard) ── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(rgba(6,182,212,0.9) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* ── Ambient top glow ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/5 blur-[80px] pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-500/70 tracking-[0.3em] uppercase">SYS // GLOBAL MATCHMAKING</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-widest flex items-center gap-4">
              <Globe className="w-7 h-7 text-cyan-400" />
              GLOBAL LOBBY
            </h1>
            <p className="text-slate-500 tracking-widest text-xs mt-2">
              JOIN ACTIVE OPERATIONS · DEPLOY TEMPLATES · SPECTATE LIVE MATCHES
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => fetchLobby()}
              className="p-2.5 rounded-none border border-white/10 bg-[#06080e] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              to="/rooms/create"
              className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-none font-bold tracking-widest text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              <Swords className="w-4 h-4" /> HOST ROOM
            </Link>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-white/10 mb-8 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: "ROOMS", label: "LIVE ROOMS", icon: Activity, activeColor: "cyan" },
              { id: "TEMPLATES", label: "TEMPLATES", icon: LayoutTemplate, activeColor: "amber" },
              { id: "MY_ARCHIVES", label: "MY ARCHIVES", icon: Archive, activeColor: "purple" },
            ] as const
          ).map(({ id, label, icon: Icon, activeColor }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-3 font-bold tracking-widest text-[10px] flex items-center gap-2 transition-all whitespace-nowrap relative
                ${
                  activeTab === id
                    ? activeColor === "cyan"
                      ? "text-cyan-400"
                      : activeColor === "amber"
                        ? "text-amber-400"
                        : "text-purple-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {/* Active underline */}
              {activeTab === id && (
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    activeColor === "cyan"
                      ? "bg-cyan-400"
                      : activeColor === "amber"
                        ? "bg-amber-400"
                        : "bg-purple-400"
                  }`}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <CardSkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {activeTab === "ROOMS" && rooms.length === 0 && (
              <div
                className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#06080e] rounded-none flex flex-col items-center gap-4 relative overflow-hidden"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <Shield className="w-12 h-12 text-slate-700" />
                <div>
                  <p className="text-slate-500 tracking-widest text-sm">NO ACTIVE ROOMS DETECTED</p>
                  <p className="text-slate-700 text-xs mt-1 tracking-wider">Host a room to start an operation</p>
                </div>
                <Link
                  to="/rooms/create"
                  className="mt-2 text-xs font-bold tracking-widest text-cyan-400 border border-cyan-500/30 px-4 py-2 rounded-none hover:bg-cyan-500/10 transition-all"
                >
                  + HOST ROOM
                </Link>
              </div>
            )}
            {activeTab === "ROOMS" && rooms.map((r) => renderCard(r, false))}

            {activeTab === "TEMPLATES" && templates.length === 0 && (
              <div
                className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#06080e] rounded-none flex flex-col items-center gap-4"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <LayoutTemplate className="w-12 h-12 text-slate-700" />
                <p className="text-slate-500 tracking-widest text-sm">NO PUBLIC TEMPLATES DETECTED</p>
              </div>
            )}
            {activeTab === "TEMPLATES" && templates.map((t) => renderCard(t, false))}

            {activeTab === "MY_ARCHIVES" && myEvents.length === 0 && (
              <div
                className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#06080e] rounded-none flex flex-col items-center gap-4"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <Archive className="w-12 h-12 text-slate-700" />
                <p className="text-slate-500 tracking-widest text-sm">YOUR ARCHIVES ARE EMPTY</p>
                <p className="text-slate-700 text-xs tracking-wider">Rooms you host or create will appear here</p>
              </div>
            )}
            {activeTab === "MY_ARCHIVES" && myEvents.map((e) => renderCard(e, true))}

          </div>
        )}
      </div>

      {/* ── PASSWORD MODAL ── */}
      <PasswordModal
        isOpen={pwModal.isOpen}
        roomCode={pwModal.roomCode}
        roomName={pwModal.roomName}
        onClose={() => setPwModal({ isOpen: false, roomCode: "", roomName: "" })}
        onSubmit={handlePasswordSubmit}
      />
    </div>
  );
};

export default Lobby;
