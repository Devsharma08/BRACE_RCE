import React, { useState, useEffect } from "react";
import { Activity, LayoutTemplate, Swords, Users, Shield, ArrowRight, CheckCircle2, Lock, Unlock, Globe, Trash2, Eye, EyeOff, Archive } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Room[]>([]);
  const [myEvents, setMyEvents] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const fetchLobby = async () => {
    setLoading(true);
    try {
      const [roomsRes, templatesRes, myEventsRes] = await Promise.all([
        api.get("/rooms/lobby"),
        api.get("/rooms/templates"),
        api.get("/rooms/my-events")
      ]);
      setRooms(roomsRes.data.rooms);
      setTemplates(templatesRes.data.templates);
      setMyEvents(myEventsRes.data.events);
    } catch (error) {
      console.error("Lobby error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobby();
  }, []);

  const handleJoinRoom = (roomCode: string, hasPassword: boolean) => {
    if (hasPassword) {
      const pwd = window.prompt("Enter Room Password:");
      if (!pwd) return; 
    }
    navigate(`/battle/${roomCode}`);
  };

  const handleCloneTemplate = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await api.post("/rooms/clone", { templateId });
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (error) {
      console.error(error);
      alert("Failed to clone template");
    } finally {
      setCloningId(null);
    }
  };

  // NEW: Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this operation?")) return;
    try {
      await api.delete(`/rooms/${eventId}`);
      fetchLobby(); // Refresh lists
    } catch (error) {
      console.error(error);
      alert("Failed to delete event.");
    }
  };

  // NEW: Toggle Visibility
  const handleToggleVisibility = async (eventId: string, currentVisibility: boolean) => {
    try {
      await api.put(`/rooms/visibility`, { eventId, isPublic: !currentVisibility });
      fetchLobby(); // Refresh lists
    } catch (error) {
      console.error(error);
      alert("Failed to change visibility.");
    }
  };

  const getOverallDifficulty = (problems: { difficulty_level: string }[]) => {
    if (problems.length === 0) return "UNKNOWN";
    const hasHard = problems.some(p => p.difficulty_level === "HARD");
    const hasMedium = problems.some(p => p.difficulty_level === "MEDIUM");
    return hasHard ? "HARD" : hasMedium ? "MEDIUM" : "EASY";
  };

  const renderCard = (room: Room, isArchiveView: boolean = false) => {
    const difficulty = getOverallDifficulty(room.problems);
    
    return (
      <div key={room.id} className={`bg-[#0a0b0e] border ${room.isTemplate ? 'border-amber-500/20 hover:border-amber-500/50' : 'border-slate-800 hover:border-cyan-500/50'} rounded-2xl p-6 transition-all group relative overflow-hidden`}>
        
        {/* Top Right Icons */}
        <div className="absolute top-0 right-0 p-4 flex items-center gap-3">
          {isArchiveView && (
            <>
              <button 
                onClick={() => handleToggleVisibility(room.id, room.isPublic)}
                className={`transition-colors ${room.isPublic ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                title={room.isPublic ? "Make Private" : "Make Public"}
              >
                {room.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => handleDeleteEvent(room.id)}
                className="text-rose-500/50 hover:text-rose-500 transition-colors"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-800 mx-1" />
            </>
          )}
          {room.password ? <Lock className="w-4 h-4 text-rose-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          {room.isTemplate ? (
            <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-amber-400" />
            </div>
          ) : (
            <img src={room.host.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host.username}`} alt="host" className="w-10 h-10 rounded bg-slate-900 border border-slate-700" />
          )}
          <div>
            <p className="text-white font-bold tracking-widest">{room.name || "Untitled Operation"}</p>
            <p className={`text-xs tracking-widest ${room.isTemplate ? 'text-amber-500/80' : 'text-cyan-500/80'}`}>
              {room.isTemplate ? 'ARCHITECT' : 'HOST'}: {room.host.username}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{room.description || "No briefing provided."}</p>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 tracking-widest">
            {room.isTemplate ? (
              <span>{room.problems.length} PROBLEMS</span>
            ) : (
              <><Users className="w-4 h-4" /> 1 / {room.maxUsers}</>
            )}
          </div>
          <div className={`text-xs font-bold tracking-widest px-2 py-1 rounded
            ${difficulty === "HARD" ? "bg-rose-500/10 text-rose-400" : difficulty === "MEDIUM" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}
          `}>
            {difficulty}
          </div>
        </div>

        {room.isTemplate ? (
          <button 
            onClick={() => handleCloneTemplate(room.id)} 
            disabled={cloningId === room.id}
            className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black font-bold tracking-widest py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {cloningId === room.id ? <Activity className="w-4 h-4 animate-pulse" /> : <CheckCircle2 className="w-4 h-4" />}
            CLONE & DEPLOY
          </button>
        ) : (
          <button onClick={() => handleJoinRoom(room.roomCode, !!room.password)} className="w-full bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            JOIN ROOM <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-8 pt-24 font-mono relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-widest mb-2 flex items-center gap-4">
              <Globe className="w-8 h-8 text-cyan-400" />
              GLOBAL LOBBY
            </h1>
            <p className="text-cyan-500/60 tracking-widest text-sm">
              JOIN ACTIVE OPERATIONS OR DEPLOY TEMPLATES
            </p>
          </div>
          
          <div className="flex gap-4">
            <Link to="/rooms/create" className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-lg font-bold tracking-widest text-xs transition-all flex items-center gap-2">
              <Swords className="w-4 h-4" /> HOST ROOM
            </Link>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-800 mb-8 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab("ROOMS")}
            className={`px-8 py-4 font-bold tracking-widest text-sm flex items-center gap-3 transition-all whitespace-nowrap
              ${activeTab === "ROOMS" ? "border-b-2 border-cyan-400 text-cyan-400 bg-cyan-500/10" : "text-slate-500 hover:text-slate-300"}
            `}
          >
            <Activity className="w-4 h-4" /> LIVE ROOMS
          </button>
          <button 
            onClick={() => setActiveTab("TEMPLATES")}
            className={`px-8 py-4 font-bold tracking-widest text-sm flex items-center gap-3 transition-all whitespace-nowrap
              ${activeTab === "TEMPLATES" ? "border-b-2 border-amber-400 text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300"}
            `}
          >
            <LayoutTemplate className="w-4 h-4" /> TEMPLATES
          </button>
          <button 
            onClick={() => setActiveTab("MY_ARCHIVES")}
            className={`px-8 py-4 font-bold tracking-widest text-sm flex items-center gap-3 transition-all whitespace-nowrap
              ${activeTab === "MY_ARCHIVES" ? "border-b-2 border-purple-400 text-purple-400 bg-purple-500/10" : "text-slate-500 hover:text-slate-300"}
            `}
          >
            <Archive className="w-4 h-4" /> MY ARCHIVES
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-cyan-500">
            <Activity className="w-12 h-12 animate-pulse mb-4" />
            <p className="tracking-widest animate-pulse">SCANNING NETWORK...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {activeTab === "ROOMS" && rooms.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="tracking-widest">NO ACTIVE ROOMS DETECTED</p>
              </div>
            )}
            {activeTab === "ROOMS" && rooms.map(r => renderCard(r, false))}

            {activeTab === "TEMPLATES" && templates.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="tracking-widest">NO PUBLIC TEMPLATES DETECTED</p>
              </div>
            )}
            {activeTab === "TEMPLATES" && templates.map(t => renderCard(t, false))}

            {activeTab === "MY_ARCHIVES" && myEvents.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="tracking-widest">YOUR ARCHIVES ARE EMPTY</p>
              </div>
            )}
            {activeTab === "MY_ARCHIVES" && myEvents.map(e => renderCard(e, true))}

          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
