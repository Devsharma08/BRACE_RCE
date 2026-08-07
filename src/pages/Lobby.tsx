import React, { useState, useEffect } from "react";
import { Activity, LayoutTemplate, Swords, Users, Shield, ArrowRight, CheckCircle2, Lock, Unlock,Globe } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../config/api";

interface Room {
  id: string;
  name: string;
  description: string | null;
  roomCode: string;
  maxUsers: number;
  password: string | null;
  host: { username: string; avatarUrl: string | null };
  problems: { difficulty_level: string }[];
}

const Lobby = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"ROOMS" | "TEMPLATES">("ROOMS");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLobby = async () => {
      setLoading(true);
      try {
        const [roomsRes, templatesRes] = await Promise.all([
          api.get("/rooms/lobby"),
          api.get("/rooms/templates")
        ]);
        setRooms(roomsRes.data.rooms);
        setTemplates(templatesRes.data.templates);
      } catch (error) {
        console.error("Lobby error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLobby();
  }, []);

  const handleJoinRoom = (roomCode: string, hasPassword: boolean) => {
    if (hasPassword) {
      // In a real app, you might want a nice modal here!
      const pwd = window.prompt("Enter Room Password:");
      if (!pwd) return; 
      // You'd normally verify this on the backend first before navigating, 
      // but we'll let the Socket room logic handle the actual rejection!
    }
    navigate(`/battle/${roomCode}`);
  };

  const handleCloneTemplate = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await api.post("/rooms/clone", { templateId });
      // Immediately drop them into their new live room!
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (error) {
      console.error(error);
      alert("Failed to clone template");
    } finally {
      setCloningId(null);
    }
  };

  // Helper to calculate overall difficulty
  const getOverallDifficulty = (problems: { difficulty_level: string }[]) => {
    if (problems.length === 0) return "UNKNOWN";
    const hasHard = problems.some(p => p.difficulty_level === "HARD");
    const hasMedium = problems.some(p => p.difficulty_level === "MEDIUM");
    return hasHard ? "HARD" : hasMedium ? "MEDIUM" : "EASY";
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
            <Link to="/problems/create" className="bg-black/50 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 px-6 py-3 rounded-lg font-bold tracking-widest text-xs transition-all">
              + NEW PROBLEM
            </Link>
            <Link to="/rooms/create" className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-lg font-bold tracking-widest text-xs transition-all flex items-center gap-2">
              <Swords className="w-4 h-4" /> HOST ROOM
            </Link>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-cyan-500/20 mb-8">
          <button 
            onClick={() => setActiveTab("ROOMS")}
            className={`px-8 py-4 font-bold tracking-widest text-sm flex items-center gap-3 transition-all
              ${activeTab === "ROOMS" ? "border-b-2 border-cyan-400 text-cyan-400 bg-cyan-500/10" : "text-slate-500 hover:text-slate-300"}
            `}
          >
            <Activity className="w-4 h-4" /> LIVE ROOMS
          </button>
          <button 
            onClick={() => setActiveTab("TEMPLATES")}
            className={`px-8 py-4 font-bold tracking-widest text-sm flex items-center gap-3 transition-all
              ${activeTab === "TEMPLATES" ? "border-b-2 border-amber-400 text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300"}
            `}
          >
            <LayoutTemplate className="w-4 h-4" /> TEMPLATES
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

            {activeTab === "ROOMS" && rooms.map(room => {
              const difficulty = getOverallDifficulty(room.problems);
              return (
                <div key={room.id} className="bg-[#0a0b0e] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    {room.password ? <Lock className="w-4 h-4 text-rose-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <img src={room.host.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host.username}`} alt="host" className="w-10 h-10 rounded bg-slate-900 border border-slate-700" />
                    <div>
                      <p className="text-white font-bold tracking-widest">{room.name || "Untitled Operation"}</p>
                      <p className="text-xs text-cyan-500/80 tracking-widest">HOST: {room.host.username}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{room.description || "No briefing provided."}</p>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-4 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500 tracking-widest">
                      <Users className="w-4 h-4" /> 1 / {room.maxUsers}
                    </div>
                    <div className={`text-xs font-bold tracking-widest px-2 py-1 rounded
                      ${difficulty === "HARD" ? "bg-rose-500/10 text-rose-400" : difficulty === "MEDIUM" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}
                    `}>
                      {difficulty}
                    </div>
                  </div>

                  <button onClick={() => handleJoinRoom(room.roomCode, !!room.password)} className="w-full bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                    JOIN ROOM <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {activeTab === "TEMPLATES" && templates.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="tracking-widest">NO PUBLIC TEMPLATES DETECTED</p>
              </div>
            )}

            {activeTab === "TEMPLATES" && templates.map(template => {
              const difficulty = getOverallDifficulty(template.problems);
              return (
                <div key={template.id} className="bg-[#0a0b0e] border border-amber-500/20 hover:border-amber-500/50 rounded-2xl p-6 transition-all relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <LayoutTemplate className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold tracking-widest">{template.name}</p>
                      <p className="text-xs text-amber-500/80 tracking-widest">ARCHITECT: {template.host.username}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{template.description}</p>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-4 mb-6">
                    <span className="text-xs text-slate-500 tracking-widest">{template.problems.length} PROBLEMS</span>
                    <div className={`text-xs font-bold tracking-widest px-2 py-1 rounded
                      ${difficulty === "HARD" ? "bg-rose-500/10 text-rose-400" : difficulty === "MEDIUM" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}
                    `}>
                      {difficulty}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCloneTemplate(template.id)} 
                    disabled={cloningId === template.id}
                    className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black font-bold tracking-widest py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {cloningId === template.id ? <Activity className="w-4 h-4 animate-pulse" /> : <CheckCircle2 className="w-4 h-4" />}
                    CLONE & DEPLOY
                  </button>
                </div>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
