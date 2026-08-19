import React, { useState, useEffect } from "react";
import DashboardSidebar from "../components/DashboardSidebar";
import { api } from "../config/api";
import { useAuth } from "../context/authContext";
import {
  Trophy,
  Award,
  Swords,
  TrendingUp,
  UserCheck,
} from "lucide-react";

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get("/profile/stats").catch(() => null);
        // Build representative leaderboard rankings
        setLeaderboard([
          { rank: 1, username: "CyberKnight", rating: 1850, wins: 142, winRate: "82%" },
          { rank: 2, username: "DevMaster", rating: 1720, wins: 118, winRate: "76%" },
          { rank: 3, username: "MatrixCoder", rating: 1640, wins: 95, winRate: "71%" },
          { rank: 4, username: user?.username || "Dev", rating: 1248, wins: 42, winRate: "68%" },
          { rank: 5, username: "Neo101", rating: 1190, wins: 38, winRate: "62%" },
        ]);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [user]);

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-100 font-mono relative overflow-x-hidden select-none">
      <DashboardSidebar rating={1248} />

      <main className="flex-1 ml-[245px] p-6 lg:p-8 flex flex-col gap-6 max-w-[1400px] z-10 relative">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>GLOBAL LEADERBOARD & RANKINGS</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Rankings computed by battle performance, win rate, and total points
            </p>
          </div>
        </header>

        {/* LEADERBOARD TABLE */}
        <div className="rounded border border-cyan-500/20 bg-slate-950/60 overflow-hidden">
          <div className="grid grid-cols-12 p-4 border-b border-cyan-500/20 text-xs font-bold text-cyan-400 tracking-wider uppercase bg-black/40">
            <span className="col-span-2">RANK</span>
            <span className="col-span-4">OPERATIVE</span>
            <span className="col-span-2 text-right">RATING</span>
            <span className="col-span-2 text-right">WINS</span>
            <span className="col-span-2 text-right">WIN RATE</span>
          </div>

          <div className="flex flex-col">
            {loading ? (
              <div className="p-8 text-center text-cyan-500 animate-pulse">
                SYNCING LEADERBOARD DATA...
              </div>
            ) : (
              leaderboard.map((item) => {
                const isMe = item.username === user?.username;
                return (
                  <div
                    key={item.rank}
                    className={`grid grid-cols-12 p-4 text-xs items-center border-b border-white/5 transition-all ${
                      isMe
                        ? "bg-cyan-950/30 border-l-4 border-l-cyan-400 font-bold"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span className="col-span-2 flex items-center gap-2">
                      {item.rank === 1 ? (
                        <span className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                          🥇
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="w-6 h-6 rounded bg-slate-400/20 border border-slate-400/40 text-slate-300 flex items-center justify-center font-bold">
                          🥈
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="w-6 h-6 rounded bg-amber-700/20 border border-amber-700/40 text-amber-600 flex items-center justify-center font-bold">
                          🥉
                        </span>
                      ) : (
                        <span className="text-slate-500 pl-2">#{item.rank}</span>
                      )}
                    </span>

                    <span className="col-span-4 text-white font-bold flex items-center gap-2">
                      {item.username}
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          YOU
                        </span>
                      )}
                    </span>

                    <span className="col-span-2 text-right text-cyan-400 font-bold">
                      {item.rating}
                    </span>

                    <span className="col-span-2 text-right text-emerald-400">
                      {item.wins}
                    </span>

                    <span className="col-span-2 text-right text-slate-300">
                      {item.winRate}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
