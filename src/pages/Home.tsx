import { Link } from "react-router-dom";
import BentoGrid from "../features/home/components/BentoGrid";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import { useSocket } from "../context/socketContext";
import { useState } from "react";

const Home = () => {
  const { findMatch, matchmakingStatus, isConnected, acceptMatch, declineMatch,cancelMatch } = useSocket();
  const [difficulty,setDifficulty] = useState("ANY");

  return (
    <section className="flex h-full w-full flex-col gap-10 items-center px-4 pt-24 sm:px-6">
      <HeroSection />
      <StickyFeatureShowcase />
      <BentoGrid />

      {/* Futuristic Launcher Callout Grid Card */}
      <div 
        className="z-10 mx-auto mb-20 w-full max-w-6xl overflow-hidden border border-white/5 bg-[#060709] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ borderRadius: '2rem' }}
      >
        {/* Left Side: Launch context */}
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <div className="text-[10px] text-cyan-500/50 tracking-[0.25em] uppercase font-bold select-none">// SYS // COMPILER_ONLINE</div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">Ready to compile solutions?</h3>
          <p className="text-textdimwhite text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
            Launch the high-performance remote execution workspace to compile, run, and solve Data Structures challenges with custom sandboxed diagnostics.
          </p>
        </div>

        {/* Right Side: Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  {/* NEW PVP MATCHMAKING BUTTON & FILTER */}
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Difficulty Selector */}
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={matchmakingStatus !== "IDLE"}
              className="bg-black/40 border border-slate-700/50 text-slate-300 font-mono text-xs font-bold tracking-widest px-4 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            >
              <option value="ANY">ALL LEVELS</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>

            <button 
              onClick={() => findMatch(difficulty)}
              disabled={!isConnected || matchmakingStatus !== "IDLE"}
              className="group relative inline-flex items-center justify-center gap-2 border border-rose-500/35 bg-rose-950/10 hover:border-rose-400 hover:text-rose-400 hover:bg-rose-950/20 py-4 px-6 sm:px-8 font-mono text-xs font-bold tracking-[0.15em] text-rose-400 transition-all duration-300 cursor-pointer select-none rounded-xl w-full sm:w-auto text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {matchmakingStatus === "IDLE" && "[ PvP: FIND MATCH ]"}
                {matchmakingStatus === "SEARCHING" && "[ SEARCHING... ]"}
                {matchmakingStatus === "FOUND_PENDING" && "[ MATCH FOUND! ]"}
              </span>
              {matchmakingStatus === "SEARCHING" && (
                <span className="w-2 h-3.5 bg-rose-400 animate-ping shrink-0"></span>
              )}
            </button>
          </div>


          {/* Existing Terminal Button */}
          <Link 
            to="/terminal" 
            className="group relative inline-flex items-center justify-center gap-2 border border-cyan-500/35 bg-cyan-950/10 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-950/20 py-4 px-6 sm:px-8 font-mono text-xs font-bold tracking-[0.15em] text-cyan-400 transition-all duration-300 cursor-pointer select-none rounded-xl w-full sm:w-auto text-center"
          >
            <span className="hidden sm:inline">[ JUMP_TO_TERMINAL ]</span>
            <span className="inline sm:hidden">[ LAUNCH_WORKSPACE ]</span>
            <span className="w-2 h-3.5 bg-cyan-400 animate-pulse group-hover:bg-cyan-300 shrink-0"></span>
          </Link>

        </div>
      </div>
            {/* CANCEL SEARCH BUTTON */}
      {matchmakingStatus === "SEARCHING" && (
        <button 
          onClick={cancelMatch}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-2 border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono text-sm tracking-widest rounded-full backdrop-blur-md transition-all"
        >
          [ CANCEL SEARCH ]
        </button>
      )}

      {/* MATCH ACCEPTANCE MODAL */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center p-12 bg-[#0b0c0e] border border-cyan-500/30 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(34,211,238,0)_0%,rgba(34,211,238,0.1)_100%)] animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-0 border-[40px] border-[#0b0c0e] rounded-full scale-150" />
            
            <h2 className="font-mono text-3xl font-bold tracking-[0.2em] text-white mb-2 relative z-10 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
              MATCH FOUND
            </h2>
            <p className="text-cyan-400/70 text-xs tracking-widest mb-10 relative z-10 font-mono">
              AWAITING OPPONENT...
            </p>

            <div className="flex gap-4 w-full relative z-10">
              <button 
                onClick={declineMatch}
                className="w-1/2 py-4 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                [ DECLINE ]
              </button>
              <button 
                onClick={acceptMatch}
                className="w-1/2 py-4 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/80 hover:border-cyan-400 text-cyan-100 font-mono font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                [ ACCEPT ]
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Home;
