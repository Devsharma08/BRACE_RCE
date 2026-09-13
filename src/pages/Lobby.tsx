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
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete operation");
    }
  };

  const renderCard = (room: Room, isArchive: boolean) => {
    const isTemplate = room.isTemplate;
    return (
      <div
        key={room.id}
        className={`border border-white/6 bg-[#0c0f18] p-5 flex flex-col gap-4 hover:bg-[#111520] transition-colors ${
          isTemplate ? "border-t-2 border-t-[#FFB800]/35" : "border-t-2 border-t-[#00D4FF]/35"
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111520] border border-white/8 flex items-center justify-center">
              <span className="text-[11px] font-mono text-[#00D4FF]">{room.host.username.slice(0,2).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{room.name}</h3>
              <p className="text-[10px] text-[#8892A4] font-mono">{room.host.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {room.isPublic ? (
              <Globe className="w-3.5 h-3.5 text-[#8892A4]" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-[#8892A4]" />
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="flex items-center gap-2 text-[10px] text-[#8892A4]">
          <Users className="w-3 h-3" />
          <span>Max {room.maxUsers} users</span>
          {room.problems?.length > 0 && (
            <>
              <span className="text-[#3D4657]">|</span>
              <span>{room.problems.length} problems</span>
            </>
          )}
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-2 mt-auto">
          {isArchive ? (
            <>
              <button
                onClick={() => handleJoinRoom(room)}
                className="flex-1 py-2 border border-white/10 text-[#8892A4] hover:border-[#00D4FF] hover:text-[#00D4FF] text-xs font-medium transition-all"
              >
                View
              </button>
              <button
                onClick={() => handleDeleteEvent(room.id)}
                className="py-2 px-3 border border-[#FF3B5C]/25 text-[#FF3B5C] hover:bg-[#FF3B5C]/10 text-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : isTemplate ? (
            <button
              onClick={() => handleCloneTemplate(room.id)}
              disabled={cloningId === room.id}
              className="flex-1 py-2 border border-[#FFB800]/25 text-[#FFB800] hover:border-[#FFB800] hover:bg-[#FFB800]/8 text-xs font-medium transition-all disabled:opacity-50"
            >
              {cloningId === room.id ? "Deploying..." : "Clone & Deploy"}
            </button>
          ) : (
            <button
              onClick={() => handleJoinRoom(room)}
              className="flex-1 py-2 border border-white/10 text-[#8892A4] hover:border-[#00D4FF] hover:text-[#00D4FF] text-xs font-medium transition-all flex items-center justify-center gap-2"
            >
              Join Room
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#050608] text-slate-100 font-mono">
      {/* DESKTOP SIDEBAR */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full relative pt-16 p-4 md:p-8 overflow-x-hidden">
      {/* Global dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] -z-10" />

      <div className="max-w-6xl mx-auto flex flex-col gap-6 relative z-10">

        {/* ── PAGE HEADER ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#00FF87]" />
              <span className="text-[10px] text-[#8892A4] font-medium uppercase tracking-wider">Lobby</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-normal">Game Rooms</h1>
          </div>
          <Link
            to="/rooms/create"
            className="flex items-center gap-2 px-4 py-2 bg-[#00D4FF] text-[#050608] font-bold text-xs hover:opacity-85 transition-all"
          >
            + Create Room
          </Link>
        </div>

        {/* ── TABS ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 border-b border-white/6">
          {(["ROOMS", "TEMPLATES", "MY_ARCHIVES"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-medium uppercase tracking-wide transition-all ${
                activeTab === tab
                  ? "border-b-2 border-[#00D4FF] text-[#00D4FF]"
                  : "text-[#8892A4] hover:text-white border-b-2 border-transparent"
              }`}
            >
              {tab === "ROOMS" ? "Rooms" : tab === "TEMPLATES" ? "Templates" : "My Archives"}
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
                className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#0c0f18] flex flex-col items-center gap-4"
              >
                <Shield className="w-12 h-12 text-[#3D4657]" />
                <div>
                  <p className="text-[#8892A4] text-sm">No active rooms</p>
                  <p className="text-[#3D4657] text-xs mt-1">Host a room to start an operation</p>
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
              <div
                className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#0c0f18] flex flex-col items-center gap-4"
              >
                <LayoutTemplate className="w-12 h-12 text-[#3D4657]" />
                <p className="text-[#8892A4] text-sm">No public templates</p>
              </div>
            )}
            {activeTab === "TEMPLATES" && templates.map((t) => renderCard(t, false))}

            {activeTab === "MY_ARCHIVES" && myEvents.length === 0 && (
              <div
                className="col-span-full py-16 text-center border border-dashed border-white/10 bg-[#0c0f18] flex flex-col items-center gap-4"
              >
                <Archive className="w-12 h-12 text-[#3D4657]" />
                <p className="text-[#8892A4] text-sm">Your archives are empty</p>
                <p className="text-[#3D4657] text-xs">Rooms you host or create will appear here</p>
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
      </main>
    </div>
  );
};

export default Lobby;
