import React from "react";
import { Terminal, Cpu, Sparkles, Award } from "lucide-react";
import { Link } from "react-router-dom";

export const PlaygroundShowcase: React.FC = () => {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
      {/* CODE PLAYGROUND LAUNCHER BANNER */}
      <div className="md:col-span-2 bg-[#0a0b0e] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-purple-400 font-bold tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" /> ONLINE CODE PLAYGROUND
          </span>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-bold">
            SANDBOX MODE
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-white tracking-wider uppercase mb-2">
            Test & Debug Code Snippets Real-Time
          </h3>
          <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-xl">
            Execute custom JavaScript, Python, C++, or Java functions in an isolated remote container environment with detailed execution logs and memory telemetry.
          </p>
        </div>

        <Link
          to="/terminal"
          className="w-max px-6 py-3 bg-purple-950/50 hover:bg-purple-600 border border-purple-500/40 text-purple-100 font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-xs"
        >
          <Cpu className="w-4 h-4" /> [ LAUNCH CODE PLAYGROUND ]
        </Link>
      </div>

      {/* UPCOMING FEATURES CARDS */}
      <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
        <div>
          <span className="text-xs text-cyan-400 font-bold tracking-widest flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" /> ROADMAP & FEATURE SPOTLIGHT
          </span>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <span className="text-amber-400 font-bold block mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> SEASON 1 RANKED LEAGUES
              </span>
              <p className="text-slate-400 text-[11px] font-sans">Compete in global weekly ladder tournaments for exclusive badges.</p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <span className="text-cyan-400 font-bold block mb-1">🤖 AI CODE COACH</span>
              <p className="text-slate-400 text-[11px] font-sans">Automated AI hints and Big-O time complexity analysis.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
