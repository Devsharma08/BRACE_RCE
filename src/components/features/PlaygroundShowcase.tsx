import React from "react";
import { Terminal, Braces, Layers, Zap, Play } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Braces, label: "Multi-Language Support", desc: "JS · Python · C++ · Java · C" },
  { icon: Layers, label: "Isolated Container RCE", desc: "Sandboxed execution runtime" },
  { icon: Zap,    label: "Live Telemetry",         desc: "Real-time memory & CPU stats" },
];

export const PlaygroundShowcase: React.FC = () => (
  <div className="relative w-full border border-accent-warning/30 bg-gradient-to-b from-accent-warning/10 via-black/70 to-black font-mono shadow-xl shadow-accent-warning/10">
    {/* L-bracket corners */}
    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-warning" />
    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent-warning" />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent-warning" />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-warning" />

    <div className="flex flex-col md:flex-row items-stretch">
      {/* LEFT CONTENT */}
      <div className="flex-1 p-8 flex flex-col justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-accent-warning/40 bg-accent-warning/10 text-xs text-accent-warning uppercase tracking-[0.2em] font-bold mb-4 shadow-sm">
            <Terminal className="w-4 h-4 text-accent-warning" /> ONLINE CODE SANDBOX
          </div>
          <h2 className="text-xl font-black text-fg tracking-tight uppercase leading-tight mb-3">
            TEST & EXECUTE CODE<br />
            <span className="text-accent-warning">IN REAL-TIME</span>
          </h2>
          <p className="text-xs text-subtle leading-relaxed uppercase tracking-wide max-w-md font-medium">
            Execute algorithm scripts directly in a sandboxed execution container. Write code, test custom inputs, and debug runtime output.
          </p>
        </div>

        <Link
          to="/terminal"
          className="w-max inline-flex items-center gap-2 border border-accent-warning/40 hover:border-accent-warning bg-accent-warning/10 hover:bg-accent-warning/20 text-accent-warning hover:text-fg font-mono text-xs font-black tracking-widest uppercase px-6 py-3.5 transition-all shadow-lg shadow-accent-warning/30 group"
        >
          <Play className="w-4 h-4 fill-current text-accent-warning group-hover:scale-110 transition-transform" /> LAUNCH CODE PLAYGROUND
        </Link>
      </div>

      {/* DIVIDER */}
      <div className="hidden md:block w-px bg-accent-warning/20 self-stretch" />

      {/* RIGHT PREVIEW / CAPABILITIES */}
      <div className="p-8 flex flex-col justify-center gap-5 min-w-[280px] bg-surface-hover">
        <p className="text-xs text-accent-warning tracking-[0.25em] uppercase font-bold">RCE CAPABILITIES</p>
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-9 h-9 border border-accent-warning/40 bg-accent-warning/10 flex items-center justify-center shrink-0 shadow-sm">
              <Icon className="w-4 h-4 text-accent-warning" />
            </div>
            <div>
              <p className="text-xs font-black text-fg uppercase tracking-wider">{label}</p>
              <p className="text-xs text-subtle font-medium">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

