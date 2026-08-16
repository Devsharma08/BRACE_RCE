import React from "react";
import { Terminal, Braces, Layers, Zap, Play } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Braces, label: "Multi-Language Support", desc: "JS · Python · C++ · Java · C" },
  { icon: Layers, label: "Isolated Container RCE", desc: "Sandboxed execution runtime" },
  { icon: Zap,    label: "Live Telemetry",         desc: "Real-time memory & CPU stats" },
];

export const PlaygroundShowcase: React.FC = () => (
  <div className="relative w-full border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-950/70 to-black font-mono shadow-xl shadow-amber-950/10">
    {/* L-bracket corners */}
    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400" />

    <div className="flex flex-col md:flex-row items-stretch">
      {/* LEFT CONTENT */}
      <div className="flex-1 p-8 flex flex-col justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-amber-500/40 bg-amber-950/40 text-xs text-amber-300 uppercase tracking-[0.2em] font-bold mb-4 shadow-sm">
            <Terminal className="w-4 h-4 text-amber-400" /> ONLINE CODE SANDBOX
          </div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase leading-tight mb-3">
            TEST & EXECUTE CODE<br />
            <span className="text-amber-400">IN REAL-TIME</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed uppercase tracking-wide max-w-md font-medium">
            Execute algorithm scripts directly in a sandboxed execution container. Write code, test custom inputs, and debug runtime output.
          </p>
        </div>

        <Link
          to="/terminal"
          className="w-max inline-flex items-center gap-2 border border-amber-500/50 hover:border-amber-400 bg-amber-950/40 hover:bg-amber-950/70 text-amber-200 hover:text-white font-mono text-xs font-black tracking-widest uppercase px-6 py-3.5 transition-all shadow-lg shadow-amber-950/50 group"
        >
          <Play className="w-4 h-4 fill-current text-amber-400 group-hover:scale-110 transition-transform" /> LAUNCH CODE PLAYGROUND
        </Link>
      </div>

      {/* DIVIDER */}
      <div className="hidden md:block w-px bg-amber-500/20 self-stretch" />

      {/* RIGHT PREVIEW / CAPABILITIES */}
      <div className="p-8 flex flex-col justify-center gap-5 min-w-[280px] bg-black/50">
        <p className="text-xs text-amber-400 tracking-[0.25em] uppercase font-bold">RCE CAPABILITIES</p>
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-9 h-9 border border-amber-500/40 bg-amber-950/40 flex items-center justify-center shrink-0 shadow-sm">
              <Icon className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">{label}</p>
              <p className="text-xs text-slate-300 font-medium">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

