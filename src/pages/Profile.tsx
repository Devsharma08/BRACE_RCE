import React, { useEffect, useState } from "react";
import { Activity, Trophy, Crosshair, Clock, Shield, Target, ChevronLeft, Hexagon } from "lucide-react";
import { Link } from "react-router-dom";
import {api} from "../config/api";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

interface MatchStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalTimeMs: number;
}

interface MatchRecord {
  id: string;
  status: string;
  timeTakenMs: number | null;
  createdAt: string;
  problem?: { title: string; difficulty: string };
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get("/profile"),
          api.get("/profile/stats"),
        ]);
        
        setProfile(profileRes.data.data);
        setStats(statsRes.data.stats);
        setHistory(statsRes.data.recentMatches);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-cyan-400">
        <Activity className="w-8 h-8 animate-pulse mb-4 mx-auto" />
        <p className="tracking-widest animate-pulse">DECRYPTING NEURAL PROFILE...</p>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-rose-500">
        <p className="tracking-widest">ERROR: PROFILE DATA CORRUPTED</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-8 pt-24 font-mono relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER */}
        <Link to="/" className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-400 transition-colors mb-8 text-sm tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          RETURN TO MAINFRAME
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: IDENTITY CARD */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="bg-[#0a0b0e] border border-cyan-500/30 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.05)]">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Hexagon className="w-32 h-32" />
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-2 border-cyan-400/50 p-1 mb-6 relative group">
                  <div className="absolute inset-0 border-2 border-cyan-400 rounded-full animate-[spin_4s_linear_infinite] border-t-transparent" />
                  <img 
                    src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} 
                    alt="avatar" 
                    className="w-full h-full rounded-full bg-slate-900 object-cover"
                  />
                </div>
                
                <h1 className="text-3xl font-bold text-white tracking-widest mb-1">{profile.username}</h1>
                <p className="text-cyan-500/80 text-sm tracking-widest mb-6">OP. ID: {profile.id.substring(0,8)}</p>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-6" />

                <div className="w-full flex justify-between items-center px-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">RANK</p>
                    <p className="text-lg text-emerald-400 font-bold">
                      {stats.winRate >= 70 ? 'S-TIER' : stats.winRate >= 50 ? 'A-TIER' : 'B-TIER'}
                    </p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800" />
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">WR</p>
                    <p className="text-lg text-cyan-400 font-bold">{stats.winRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="bg-[#0a0b0e] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs text-slate-500 tracking-widest mb-4 uppercase">Combat Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm"><Target className="w-4 h-4 text-slate-400" /> Matches</span>
                  <span className="text-white font-bold">{stats.totalMatches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm"><Trophy className="w-4 h-4 text-emerald-400" /> Victories</span>
                  <span className="text-emerald-400 font-bold">{stats.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm"><Crosshair className="w-4 h-4 text-rose-400" /> Defeats</span>
                  <span className="text-rose-400 font-bold">{stats.losses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-cyan-400" /> Time in Grid</span>
                  <span className="text-cyan-400 font-bold">{(stats.totalTimeMs / 60000).toFixed(1)}m</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: MATCH HISTORY LEDGER */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl flex flex-col h-full max-h-[800px]">
              <div className="p-6 border-b border-cyan-500/20 bg-cyan-950/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-widest flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  BATTLE LEDGER
                </h2>
                <span className="text-xs text-cyan-500/60 tracking-widest">LAST 10 ENGAGEMENTS</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                    <Activity className="w-12 h-12 mb-4" />
                    <p>NO COMBAT RECORDS FOUND</p>
                  </div>
                ) : (
                  history.map((record) => {
                    const isWin = record.status === "WON" || record.status === "PASSED";
                    const isLoss = record.status === "LOST" || record.status === "FAILED" || record.status === "SURRENDER";
                    
                    return (
                      <div 
                        key={record.id} 
                        className={`flex items-center justify-between p-4 rounded-xl border bg-black/40 transition-colors hover:bg-black/60
                          ${isWin ? "border-emerald-500/20" : isLoss ? "border-rose-500/20" : "border-slate-800"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 rounded-full ${isWin ? "bg-emerald-500" : isLoss ? "bg-rose-500" : "bg-slate-500"}`} />
                          <div>
                            <p className="text-white font-bold text-sm tracking-wider mb-1">
                              {record.problem?.title || "UNKNOWN ANOMALY"}
                            </p>
                            <div className="flex gap-4 text-xs text-slate-500">
                              <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                              <span>{record.timeTakenMs ? `${(record.timeTakenMs / 1000).toFixed(1)}s` : "--"}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-bold tracking-widest ${isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"}`}>
                            {record.status}
                          </p>
                          <p className="text-[10px] text-slate-600 tracking-widest uppercase mt-1">
                            {record.problem?.difficulty || "SYS_ERROR"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Profile;
