import React from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => (
  <footer className="relative w-full border-t border-white/5 bg-black/60 font-mono">
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
      {/* LEFT: BRAND + TELEMETRY */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-black tracking-widest text-white uppercase">
          BRACE <span className="text-cyan-400">// RCE</span>
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Activity className="w-3 h-3 animate-pulse" /> ENGINE ONLINE
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-600">PING 24ms</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-600">v2.4.0</span>
        </div>
      </div>

      {/* CENTER NAV */}
      <nav className="flex items-center gap-6 text-[10px] text-slate-600 tracking-widest uppercase">
        {[
          { label: "DASHBOARD", to: "/dashboard", internal: true },
          { label: "TERMINAL",  to: "/terminal",  internal: true },
          { label: "PROFILE",   to: "/profile",   internal: true },
          { label: "ABOUT",     to: "/about",     internal: true },
        ].map(({ label, to }) => (
          <Link key={label} to={to} className="hover:text-cyan-400 transition-colors">
            {label}
          </Link>
        ))}
      </nav>

      {/* RIGHT COPYRIGHT */}
      <div className="flex items-center gap-2 text-[10px] text-slate-700">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/30" />
        © 2026 BRACE_RCE. ALL RIGHTS RESERVED.
      </div>
    </div>
  </footer>
);
