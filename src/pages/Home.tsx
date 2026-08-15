import { Link } from "react-router-dom";
import BentoGrid from "../features/home/components/BentoGrid";
import HeroSection from "../features/home/components/HeroSection";
import FriendsDashboard from "../components/FriendDashboard";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import { ProfileScoreCard } from "../components/profileScoreCard";
import { QuickNavHub } from "../components/QuickNavHub";
import { HistoryLedgerSection } from "../components/HistoryLedgerSection";
import { ProblemTableSection } from "../components/ProblemTableSection";
import { Footer } from "../components/Footer";
import { useSocket } from "../context/socketContext";
import { useState, useEffect } from "react";
import { api } from "../config/api";

const Home = () => {
  const {
    findMatch,
    socket,
    matchmakingStatus,
    activeBattleRoom,
    isConnected,
    cancelMatch,
    createCustomRoom,
    joinCustomRoom,
    waitingTime,

  } = useSocket();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [difficulty,setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [profRes, probRes] = await Promise.all([
          api.get("/profile").catch(() => null),
          api.get("/problem/all").catch(() => null)
        ]);

        if (profRes?.data?.data) {
          const u = profRes.data.data;
          setProfile(u);
          setStats({
            totalScore: u.score || 1000,
            winRate: u.winRate || 0,
            totalMatches: u.totalMatches || 0,
            wins: u.wins || 0,
            losses: u.losses || 0
          });
          setHistory(u.performances || u.history || []);
        }

        if (probRes?.data?.problems) {
          setProblems(probRes.data.problems);
        }
      } catch (err) {
        console.error("Failed to load dashboard telemetry:", err);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <section className="flex h-full w-full flex-col gap-10 items-center px-4 pt-24 sm:px-6 max-w-7xl mx-auto">
      {/* 1. HERO BANNER */}
      <HeroSection />

      {/* 2. TOP GRID: PROFILE WITH SCORE (LEFT) & QUICK NAV'S (RIGHT) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ProfileScoreCard
            profile={profile}
            stats={stats}
            activeBattleRoom={activeBattleRoom}
          />
        </div>
        <div className="md:col-span-2">
          <QuickNavHub
            onFindMatch={(diff) => findMatch(diff)}
            matchmakingStatus={matchmakingStatus}
            onCancelMatch={cancelMatch}
            onCreateCustomRoom={() => setShowCreateModal(true)}
            onJoinCustomRoom={(code) => {
              setJoinCode(code);
              setShowJoinModal(true);
            }}
            waitingTime={waitingTime}
          />
        </div>
      </div>

      {/* 3. MIDDLE SECTION: HISTORY LEDGER */}
      <HistoryLedgerSection
        history={history}
        currentUserId={profile?.id || ""}
      />

      {/* 4. LOWER SECTION: PROBLEM'S TABLE WITH PAGINATION */}
      <ProblemTableSection problems={problems} />

      {/* 5. SHOWCASE & BENTO */}
      <FriendsDashboard />
      <StickyFeatureShowcase />
      <BentoGrid />

      {/* Futuristic Launcher Callout Grid Card */}
      <div
        className="z-10 mx-auto mb-20 w-full max-w-6xl overflow-hidden border border-white/5 bg-[#060709] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ borderRadius: "2rem" }}
      >
        {/* Left Side: Launch context */}
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <div className="text-[10px] text-cyan-500/50 tracking-[0.25em] uppercase font-bold select-none">
            // SYS // COMPILER_ONLINE
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
            Ready to compile solutions?
          </h3>
          <p className="text-textdimwhite text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
            Launch the high-performance remote execution workspace to compile,
            run, and solve Data Structures challenges with custom sandboxed
            diagnostics.
          </p>
        </div>

        {/* Right Side: Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {activeBattleRoom ? (
            // this should be defualt no additional condition should be there
            <Link
              to={`/battle/${activeBattleRoom.roomId}?oid=${activeBattleRoom.problemId}`}
              className="group relative inline-flex items-center justify-center gap-2 border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 py-4 px-8 font-mono text-xs font-bold tracking-[0.15em] text-emerald-400 transition-all rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse w-full sm:w-auto"
            >
              [ REJOIN ACTIVE BATTLE ]
            </Link>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={matchmakingStatus !== "IDLE"}
                className="bg-black/40 border border-slate-700/50 text-slate-300 font-mono text-xs font-bold tracking-widest px-4 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
              <button
                onClick={() => findMatch(difficulty)}
                disabled={!isConnected || matchmakingStatus !== "IDLE"}
                className="group relative inline-flex items-center justify-center gap-2 border border-rose-500/35 bg-rose-950/10 hover:border-rose-400 hover:text-rose-400 py-4 px-6 sm:px-8 font-mono text-xs font-bold tracking-[0.15em] text-rose-400 transition-all cursor-pointer rounded-xl w-full sm:w-auto text-center disabled:opacity-50"
              >
                {matchmakingStatus === "SEARCHING" && (
                  <Activity className="w-4 h-4 animate-pulse text-rose-400" />
                )}
                <span>
                  {matchmakingStatus === "IDLE" && "[ PvP: FIND MATCH ]"}
                  {matchmakingStatus === "SEARCHING" && "[ SEARCHING... ]"}
                  {matchmakingStatus === "FOUND_PENDING" && "[ MATCH FOUND! ]"}
                </span>
              </button>

              {!activeBattleRoom && (
                <div className="flex flex-col sm:flex-row gap-2 w-full mt-4">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="group relative inline-flex items-center justify-center gap-2 border border-violet-500/35 bg-violet-950/10 hover:border-violet-400 hover:text-violet-400 py-3 px-6 font-mono text-xs font-bold tracking-[0.15em] text-violet-400 transition-all cursor-pointer rounded-xl w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={matchmakingStatus !== "IDLE"}
                  >
                    [ CREATE ROOM ]
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="group relative inline-flex items-center justify-center gap-2 border border-orange-500/35 bg-orange-950/10 hover:border-orange-400 hover:text-orange-400 py-3 px-6 font-mono text-xs font-bold tracking-[0.15em] text-orange-400 transition-all cursor-pointer rounded-xl w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={matchmakingStatus !== "IDLE"}
                  >
                    [ JOIN ROOM ]
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Existing Terminal Button */}
          <Link
            to={matchmakingStatus === "IDLE" ? "/terminal" : "#"}
            className={`group relative inline-flex items-center justify-center gap-2 border border-cyan-500/35 bg-cyan-950/10 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-950/20 py-4 px-6 sm:px-8 font-mono text-xs font-bold tracking-[0.15em] text-cyan-400 transition-all duration-300 cursor-pointer select-none rounded-xl w-full sm:w-auto text-center ${matchmakingStatus !== "IDLE" ? "pointer-events-none opacity-50" : ""}`}
          >
            <span className="hidden sm:inline">[ JUMP_TO_TERMINAL ]</span>
            <span className="inline sm:hidden">[ LAUNCH_WORKSPACE ]</span>
            <span className="w-2 h-3.5 bg-cyan-400 animate-pulse group-hover:bg-cyan-300 shrink-0"></span>
          </Link>
        </div>
      </div>
      {/* CANCEL SEARCH BUTTON */}
      {/* MATCHMAKING SEARCH MODAL */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center p-12 bg-[#0b0c0e] border border-cyan-500/30 rounded-2xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-white tracking-widest mb-6 animate-pulse">
              FINDING OPPONENT...
            </h2>

            <div className="w-full bg-black/50 p-6 rounded-lg border border-slate-800 mb-8">
              <p className="text-slate-400 text-xs mb-4 uppercase tracking-widest">
                Searching Difficulties:
              </p>
              <div className="flex gap-3 mb-6">
                {searchState && searchState.levels.map((lvl) => (
                  <span
                    key={lvl}
                    className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-xs font-bold"
                  >
                    {lvl}
                  </span>
                ))}
              </div>

                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>WAITING: {waitingTime}s</span>
                  <span>
                    {waitingTime < 10
                      ? "Expanding search in " + (10 - waitingTime) + "s..."
                      : waitingTime < 20
                        ? "Expanding search in " + (20 - waitingTime) + "s..."
                        : "Search fully expanded"}
                  </span>
                </div>
            </div>

            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-rose-500/50 text-rose-400 hover:bg-rose-950/40 rounded-lg tracking-widest font-bold"
            >
              [ CANCEL SEARCH ]
            </button>
          </div>
        </div>
      )}



      {/* ----------------------------- */}
      {/* CREATE ROOM MODAL */}
      {/* ----------------------------- */}
      {showCreateModal && !customLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col p-8 bg-[#0b0c0e] border border-violet-500/30 rounded-2xl w-full max-w-md">
            <h2 className="font-mono text-2xl font-bold tracking-[0.2em] text-violet-400 mb-6">
              CONFIGURE ROOM
            </h2>

            <label className="text-xs font-mono text-violet-300/70 mb-2">
              MAX PLAYERS
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={roomMaxUsers}
              onChange={(e) => setRoomMaxUsers(Number(e.target.value))}
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-4 focus:border-violet-500 outline-none"
            />

            <label className="text-xs font-mono text-violet-300/70 mb-2">
              PASSWORD (OPTIONAL)
            </label>
            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Leave blank for open room"
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-8 focus:border-violet-500 outline-none"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-1/2 py-3 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  createCustomRoom(roomMaxUsers, roomPassword, difficulty);
                  setShowCreateModal(false);
                }}
                className="w-1/2 py-3 bg-violet-950/40 border border-violet-500/50 hover:bg-violet-900 text-violet-300 font-mono text-xs font-bold tracking-widest rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* JOIN ROOM MODAL */}
      {/* ----------------------------- */}
      {showJoinModal && !customLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col p-8 bg-[#0b0c0e] border border-orange-500/30 rounded-2xl w-full max-w-md">
            <h2 className="font-mono text-2xl font-bold tracking-[0.2em] text-orange-400 mb-6">
              JOIN ROOM
            </h2>

            <label className="text-xs font-mono text-orange-300/70 mb-2">
              ROOM CODE
            </label>
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. A7X9B2"
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-4 focus:border-orange-500 outline-none uppercase tracking-widest"
            />

            <label className="text-xs font-mono text-orange-300/70 mb-2">
              PASSWORD (IF REQUIRED)
            </label>
            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-8 focus:border-orange-500 outline-none"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-1/2 py-3 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  joinCustomRoom(joinCode, roomPassword);
                  setShowJoinModal(false);
                }}
                className="w-1/2 py-3 bg-orange-950/40 border border-orange-500/50 hover:bg-orange-900 text-orange-300 font-mono text-xs font-bold tracking-widest rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* ACTIVE WAITING LOBBY */}
      {/* ----------------------------- */}
      {customLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
          <div className="flex flex-col items-center p-12 bg-[#060709] border-2 border-violet-500/50 rounded-2xl shadow-[0_0_50px_rgba(139,92,246,0.15)] max-w-lg w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

            <p className="text-violet-400/70 text-xs tracking-[0.3em] mb-2 relative z-10 font-mono uppercase">
              LOBBY CODE
            </p>
            <h1 className="font-mono text-6xl font-black tracking-[0.2em] text-white mb-8 relative z-10 drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              {customLobby.roomCode}
            </h1>

            <div className="w-full bg-black/40 border border-violet-500/20 rounded-xl p-4 mb-10 relative z-10 flex flex-col items-center gap-2">
              <p className="font-mono text-sm text-slate-400 uppercase tracking-widest">
                Players Connected
              </p>
              <p className="font-mono text-3xl font-bold text-violet-300">
                {customLobby.currentUsers}{" "}
                <span className="text-violet-500/50 text-xl">
                  / {customLobby.maxUsers}
                </span>
              </p>
            </div>

            <div className="flex gap-4 w-full relative z-10">
              <button
                onClick={leaveCustomMatch}
                className="w-1/3 py-4 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 font-mono text-xs font-bold tracking-widest rounded-xl transition-all"
              >
                LEAVE
              </button>

              {customLobby.isHost ? (
                <button
                  onClick={startCustomMatch}
                  className="w-2/3 py-4 bg-violet-600 hover:bg-violet-500 text-white font-mono text-sm font-bold tracking-widest rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all"
                >
                  START MATCH
                </button>
              ) : (
                <button
                  disabled
                  className="w-2/3 py-4 bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs font-bold tracking-widest rounded-xl"
                >
                  WAITING FOR HOST...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Home;
