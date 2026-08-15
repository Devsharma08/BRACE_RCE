import React from "react";
import { Activity, ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-cyan-500/20 bg-black/80 py-8 px-6 font-mono text-xs text-slate-400 mt-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* LEFT TELEMETRY */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-widest">
            <Activity className="w-4 h-4 animate-pulse" /> RCE ENGINE: ONLINE
          </div>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500 text-[11px]">PING: 24ms</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500 text-[11px]">VER: 2.4.0-CYBER</span>
        </div>

        {/* CENTER LINKS */}
        <div className="flex items-center gap-6 text-[11px] tracking-wider text-slate-500">
          <a href="#" className="hover:text-cyan-400 transition-colors">MAINFRAME</a>
          <a href="#" className="hover:text-cyan-400 transition-colors">DOCS</a>
          <a href="#" className="hover:text-cyan-400 transition-colors">API TELEMETRY</a>
          <a href="#" className="hover:text-cyan-400 transition-colors">TERMS OF ENGAGEMENT</a>
        </div>

        {/* RIGHT COPYRIGHT */}
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-cyan-500/50" />
          © 2026 BRACE_RCE. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
};
