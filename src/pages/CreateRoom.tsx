import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2, Lock, Unlock, Globe, EyeOff, LayoutTemplate, Swords, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../config/api";

interface Problem {
  id: string;
  name: string;
  difficulty_level: string;
  isCustom: boolean;
}

const CreateRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState<number>(2);
  const [isPublic, setIsPublic] = useState(true);
  const [isTemplate, setIsTemplate] = useState(false);
  
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);

  useEffect(() => {
    // Fetch both system and custom problems to let the host pick
    const fetchProblems = async () => {
      try {
        const [sysRes, customRes] = await Promise.all([
          api.get("/problems/system"),
          api.get("/problems/custom")
        ]);
        setAvailableProblems([...sysRes.data.problems, ...customRes.data.problems]);
      } catch (err) {
        console.error("Failed to fetch problems", err);
      }
    };
    fetchProblems();
  }, []);

  const toggleProblemSelection = (id: string) => {
    setSelectedProblemIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProblemIds.length === 0) return alert("You must select at least one problem!");

    setLoading(true);
    try {
      const res = await api.post("/rooms/create", {
        name,
        description,
        password: password || null,
        maxUsers,
        isPublic,
        isTemplate,
        problemIds: selectedProblemIds
      });
      
      if (isTemplate) {
        navigate("/lobby"); // Go to lobby if they just saved a template
      } else {
        // If it's a live room, jump straight into the battle!
        navigate(`/battle/${res.data.room.roomCode}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initialize room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-8 pt-24 font-mono relative">
      <div className="max-w-5xl mx-auto relative z-10">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white tracking-widest mb-2 flex items-center justify-center gap-4">
            <LayoutTemplate className="w-8 h-8 text-cyan-400" />
            ROOM INITIALIZATION
          </h1>
          <p className="text-cyan-500/60 tracking-widest text-sm">
            CONFIGURE BATTLE PARAMETERS AND DEPLOY
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: SETTINGS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                SECURITY & COMMS
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs tracking-widest text-slate-500 mb-2">ROOM DESIGNATION</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="e.g. Weekly Code Clash" />
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-slate-500 mb-2">MISSION BRIEFING (OPTIONAL)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-black/50 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none font-sans" placeholder="Describe the room..." />
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-slate-500 mb-2">ACCESS PASSWORD (OPTIONAL)</label>
                  <div className="relative">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:border-cyan-500 outline-none" placeholder="Leave blank for open access" />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-slate-500 mb-2">MAX OPERATIVES</label>
                  <input type="number" min={2} max={10} value={maxUsers} onChange={e => setMaxUsers(Number(e.target.value))} className="w-full bg-black/50 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-colors bg-black/30">
                <div className="flex items-center gap-3">
                  {isPublic ? <Globe className="w-5 h-5 text-emerald-400" /> : <EyeOff className="w-5 h-5 text-rose-400" />}
                  <div>
                    <p className="text-white text-sm font-bold tracking-widest">PUBLIC LOBBY</p>
                    <p className="text-xs text-slate-500">Visible to all operatives</p>
                  </div>
                </div>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-5 h-5 accent-cyan-500" />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-colors bg-black/30">
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white text-sm font-bold tracking-widest">SAVE AS TEMPLATE</p>
                    <p className="text-xs text-slate-500">Do not start match, just save</p>
                  </div>
                </div>
                <input type="checkbox" checked={isTemplate} onChange={e => setIsTemplate(e.target.checked)} className="w-5 h-5 accent-amber-500" />
              </label>
            </div>
          </div>

          {/* RIGHT: PROBLEM PLAYLIST */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl flex flex-col h-full max-h-[800px]">
              <div className="p-6 border-b border-cyan-500/20 bg-cyan-950/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-widest flex items-center gap-3">
                  <Swords className="w-5 h-5 text-cyan-400" />
                  PROBLEM PLAYLIST
                </h2>
                <span className="text-xs text-cyan-400 font-bold tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  {selectedProblemIds.length} SELECTED
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-3">
                {availableProblems.map((prob) => {
                  const isSelected = selectedProblemIds.includes(prob.id);
                  const isHard = prob.difficulty_level === "HARD";
                  const isMed = prob.difficulty_level === "MEDIUM";
                  
                  return (
                    <div 
                      key={prob.id}
                      onClick={() => toggleProblemSelection(prob.id)}
                      className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all
                        ${isSelected ? "bg-cyan-500/10 border-cyan-500" : "bg-black/40 border-slate-800 hover:border-cyan-500/50"}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center
                          ${isSelected ? "bg-cyan-500 border-cyan-500 text-black" : "border-slate-600"}
                        `}>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`font-bold tracking-wider text-sm ${isSelected ? "text-cyan-400" : "text-white"}`}>
                            {prob.name}
                          </p>
                          {prob.isCustom && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block">
                              Custom Problem
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-bold tracking-widest
                        ${isHard ? "text-rose-400" : isMed ? "text-amber-400" : "text-emerald-400"}
                      `}>
                        {prob.difficulty_level}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </form>

        <div className="fixed bottom-0 left-0 w-full bg-[#0a0b0e]/90 backdrop-blur border-t border-cyan-500/20 p-6 z-50 flex justify-end">
          <div className="max-w-5xl w-full mx-auto flex justify-end">
             <button 
                onClick={handleSubmit}
                disabled={loading || selectedProblemIds.length === 0}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-widest px-8 py-4 rounded-xl flex items-center gap-3 transition-all disabled:opacity-50"
              >
                {loading ? <Activity className="w-5 h-5 animate-pulse" /> : <ShieldAlert className="w-5 h-5" />}
                {isTemplate ? "SAVE TEMPLATE" : "INITIALIZE ROOM"}
              </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateRoom;
