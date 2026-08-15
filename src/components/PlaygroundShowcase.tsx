import React from "react";
import { Terminal, Cpu, Braces, Layers, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const PlaygroundShowcase: React.FC = () => {
  const features = [
    { icon: Braces, label: "Multi-Language", desc: "JS · Python · C++ · Java" },
    { icon: Layers, label: "Isolated RCE", desc: "Sandboxed container runtime" },
    { icon: Zap, label: "Live Telemetry", desc: "Real-time memory & CPU metrics" },
  ];

  return (
    <div className="relative w-full bg-[#080a0d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
      {/* TOP GLOW LINE */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
      {/* BG GRID PATTERN */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      {/* CORNER GLOW */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch gap-0">
        {/* LEFT: LAUNCHER */}
        <div className="flex-1 p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[10px] font-mono font-bold tracking-widest mb-6">
              <Terminal className="w-3.5 h-3.5" /> ONLINE CODE SANDBOX
            </div>
            <h2 className="font-mono text-2xl font-black text-white tracking-tight leading-tight mb-3">
              TEST & EXECUTE CODE<br />
              <span className="text-purple-400">IN REAL-TIME</span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-sans max-w-md">
              Run and debug algorithm snippets inside a fully isolated remote execution container. No environment setup required — just write, execute, and iterate.
            </p>
          </div>

          <Link
            to="/terminal"
            className="mt-8 w-max inline-flex items-center gap-2.5 px-6 py-3 bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-purple-100 font-mono text-xs font-black tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:shadow-[0_0_40px_rgba(139,92,246,0.3)]"
          >
            <Cpu className="w-4 h-4" /> LAUNCH CODE PLAYGROUND
          </Link>
        </div>

        {/* DIVIDER */}
        <div className="hidden md:block w-px bg-white/[0.05] self-stretch" />

        {/* RIGHT: FEATURE PILLARS */}
        <div className="flex flex-col justify-center gap-4 p-8 min-w-[240px]">
          <span className="text-[9px] font-mono text-slate-600 tracking-[0.3em] uppercase mb-1">CAPABILITIES</span>
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3.5 group">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                <Icon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="font-mono text-xs font-black text-white/90 tracking-wider">{label}</p>
                <p className="text-[10px] text-slate-600 font-sans">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
