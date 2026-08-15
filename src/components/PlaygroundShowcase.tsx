import React from "react";
import { Terminal, Braces, Layers, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Braces, label: "Multi-Language",  desc: "JS · Python · C++ · Java" },
  { icon: Layers, label: "Isolated RCE",    desc: "Sandboxed container runtime" },
  { icon: Zap,    label: "Live Telemetry",  desc: "Real-time memory & CPU metrics" },
];

export const PlaygroundShowcase: React.FC = () => (
  <div className="relative w-full border border-white/5 bg-black/40">
    {/* L-bracket corners */}
    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500/25" />
    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-purple-500/25" />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-purple-500/25" />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-500/25" />

    <div className="flex flex-col md:flex-row items-stretch">
      {/* LEFT */}
      <div className="flex-1 p-8 flex flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 border border-purple-500/25 bg-purple-950/10 text-[9px] text-purple-400 uppercase tracking-[0.2em] font-bold mb-5">
            <Terminal className="w-3 h-3" /> ONLINE CODE SANDBOX
          </div>
          <h2 className="font-mono text-xl font-black text-white tracking-tight uppercase leading-tight mb-3">
            TEST & EXECUTE CODE<br />
            <span className="text-purple-400">IN REAL-TIME</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-wide max-w-md">
            Run and debug algorithm snippets inside a fully isolated remote execution container. No environment setup — just write, execute, iterate.
          </p>
        </div>

        <Link
          to="/terminal"
          className="mt-8 w-max inline-flex items-center gap-2 border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/10 hover:bg-purple-950/30 text-purple-400 hover:text-purple-300 font-mono text-[11px] font-black tracking-widest uppercase px-5 py-2.5 transition-all"
        >
          <Terminal className="w-3.5 h-3.5" /> LAUNCH CODE PLAYGROUND
        </Link>
      </div>

      {/* DIVIDER */}
      <div className="hidden md:block w-px bg-white/5 self-stretch" />

      {/* RIGHT: CAPABILITY PILLARS */}
      <div className="p-8 flex flex-col justify-center gap-5 min-w-[220px]">
        <p className="text-[9px] text-slate-600 tracking-[0.3em] uppercase font-bold">CAPABILITIES</p>
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 border border-purple-500/20 bg-purple-950/10 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="font-mono text-[11px] font-black text-white/90 uppercase tracking-wider">{label}</p>
              <p className="text-[10px] text-slate-600 font-sans">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
