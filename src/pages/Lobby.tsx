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
import { toast } from "sonner";
import DashboardSidebar from "../components/layout/DashboardSidebar";
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
  const { data: myRating } = useMyRating(true);
  const [activeTab, setActiveTab] = useState<"ROOMS" | "TEMPLATES" | "MY_ARCHIVES">("ROOMS");
  const [cloningId, setCloningId] = useState<string | null>(null);

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

  const handleJoinRoom = (room: Room) => {
    if (room.password) {
      setPwModal({ isOpen: true, roomCode: room.roomCode, roomName: room.name || "Untitled Operation" });
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
      fetchLobby();
      toast.success("Operation deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete operation");
    }
  };

  const renderCard = (room: Room, isArchive: boolean) => {
    const diff = room.problems?.[0]?.difficulty_level || "MEDIUM";
    const diffColor = diff === "EASY" ? "text-[#00FF87]" : diff === "HARD" ? "text-[#ff0055]" : "text-[#FFB800]";
    const isTemplate = room.isTemplate;
    const accentColor = isTemplate ? "border-t-[#FFB800]/60" : "border-t-[#00D4FF]/60";

    return (
      <div key={room.id} className={`border border-white/6 ${accentColor} border-t-2 bg-[#0c0f18] p-5 flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white truncate">{room.name}</span>
          {!room.isPublic && <Lock className="w-3 h-3 text-[#8892A4]" />}
        </div>
        {room.description && (
          <p className="text-xs text-[#8892A4] line-clamp-2">{room.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-[#8892A4]">
          <span className={`font-bold ${diffColor}`}>{diff}</span>
          <span>•</span>
          <span>{room.maxUsers} max</span>
          <span>•</span>
          <span className="font-mono">{room.roomCode}</span>
        </div>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#111520] border border-cyan-500/20 flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold text-cyan-400">{room.host.username.slice(0, 2).toUpperCase()}</span>
            </div>
            <span className="text-[10px] text-[#8892A4]">{room.host.username}</span>
          </div>
          {isArchive ? (
            <button
              onClick={() => handleDeleteEvent(room.id)}
              className="text-[10px] text-[#8892A4] hover:text-[#FF3B5C] transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          ) : isTemplate ? (
            <button
              onClick={() => handleCloneTemplate(room.id)}
              disabled={cloningId === room.id}
              className="text-[10px] text-[#FFB800] border border-[#FFB800]/25 hover:border-[#FFB800] hover:bg-[#FFB800]/8 px-2 py-1 transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${cloningId === room.id ? "animate-spin" : ""}`} />
              Clone
            </button>
          ) : (
            <button
              onClick={() => handleJoinRoom(room)}
              className="text-[10px] text-cyan-400 border border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 px-3 py-1 transition-all flex items-center gap-1"
            >
              <ArrowRight className="w-3 h-3" />
              Join
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#050811] text-slate-100 font-mono">
      <DashboardSidebar rating={myRating?.rating} />

      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full relative pt-16 p-4 md:p-8 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(rgba(0,243,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

      {/* PAGE HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 bg-[#00FF87] rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00FF87]">Live Operations</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-widest uppercase" style={{ fontFamily: "'Orbitron', sans-serif" }}>Operations Lobby</h1>
        <p className="text-xs text-[#8892A4] mt-1">Join active battles or deploy your own</p>
      </div>

      {/* RADAR VISUAL */}
      <div className="mb-8 relative flex items-center justify-center h-48 border border-white/6 bg-[#0c0f18]">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(rgba(0,243,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex items-center justify-center">
          <div className="absolute w-64 h-64 border border-cyan-500/20" />
          <div className="absolute w-48 h-48 border border-cyan-500/25" />
          <div className="absolute w-32 h-32 border border-cyan-500/30" />
          <div className="absolute w-16 h-16 border border-cyan-500/35" />
          <div className="w-3 h-3 bg-cyan-400 animate-ping" />
          <div className="absolute w-3 h-3 bg-cyan-400" />
        </div>
        <div className="absolute bottom-4 left-4 text-[10px] text-[#8892A4] font-mono">SCANNING...</div>
        <div className="absolute top-4 right-4 text-[10px] text-cyan-400/60 font-mono">{rooms.length} ACTIVE</div>
      </div>

      {/* CREATE ROOM BUTTON */}
      <div className="mb-6">
        <Link
          to="/rooms/create"
          className="inline-flex items-center gap-2 bg-[#00D4FF] text-[#050608] font-bold text-xs px-5 py-2.5 hover:bg-cyan-400 transition-all tracking-wider uppercase"
        >
          <Swords className="w-4 h-4" />
          Create Room
        </Link>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-0 border-b border-white/6 mb-6">
        {(["ROOMS", "TEMPLATES", "MY_ARCHIVES"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-medium uppercase tracking-wide transition-all ${
              activeTab === tab
                ? "border-b-2 border-[#00D4FF] text-[#00D4FF] bg-cyan-500/8"
                : "text-[#8892A4] hover:text-white border-b-2 border-transparent"
            }`}
          >
            {tab === "ROOMS" ? "Rooms" : tab === "TEMPLATES" ? "Templates" : "My Archives"}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {activeTab === "ROOMS" && rooms.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#0c0f18] flex flex-col items-center gap-4">
              <Shield className="w-12 h-12 text-slate-600" />
              <div>
                <p className="text-[#8892A4] text-sm">No active rooms</p>
                <p className="text-slate-600 text-xs mt-1">Host a room to start an operation</p>
              </div>
              <Link
                to="/rooms/create"
                className="mt-2 text-xs font-medium text-[#00D4FF] border border-white/10 px-4 py-2 hover:bg-[#00D4FF]/8 transition-all"
              >
                Host a room
              </Link>
            </div>
          )}
          {activeTab === "ROOMS" && rooms.map((r) => renderCard(r, false))}

          {activeTab === "TEMPLATES" && templates.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#0c0f18] flex flex-col items-center gap-4">
              <LayoutTemplate className="w-12 h-12 text-slate-600" />
              <p className="text-[#8892A4] text-sm">No public templates</p>
            </div>
          )}
          {activeTab === "TEMPLATES" && templates.map((t) => renderCard(t, false))}

          {activeTab === "MY_ARCHIVES" && myEvents.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#0c0f18] flex flex-col items-center gap-4">
              <Archive className="w-12 h-12 text-slate-600" />
              <p className="text-[#8892A4] text-sm">Your archives are empty</p>
              <p className="text-slate-600 text-xs">Rooms you host or create will appear here</p>
            </div>
          )}
          {activeTab === "MY_ARCHIVES" && myEvents.map((e) => renderCard(e, true))}

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
