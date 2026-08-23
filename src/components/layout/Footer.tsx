import React from "react";
import { Activity, ShieldCheck, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => (
  <footer className="relative w-full border-t border-cyan-500/20 bg-slate-950/90 backdrop-blur-md font-mono text-slate-300 z-20">
    {/* Subtle top glow line */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
      {/* LEFT: BRAND + TELEMETRY */}
      <div className="flex flex-col gap-2.5">
        <Link to="/" className="inline-flex items-center gap-2 text-base font-black tracking-widest text-white uppercase group">
          <Terminal className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          BRACE <span className="text-cyan-400">// RCE</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-sm">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> ENGINE ONLINE
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-semibold">PING 24ms</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-semibold">v2.4.0</span>
        </div>
      </div>

      {/* CENTER NAV LINKS */}
      <nav className="flex items-center gap-6 text-xs text-slate-400 tracking-wider font-semibold uppercase">
        {[
          { label: "DASHBOARD", to: "/dashboard" },
          { label: "TERMINAL",  to: "/terminal" },
          { label: "PROFILE",   to: "/profile" },
          { label: "ABOUT",     to: "/about" },
        ].map(({ label, to }) => (
          <Link key={label} to={to} className="hover:text-cyan-400 transition-colors py-1">
            {label}
          </Link>
        ))}
      </nav>

      {/* RIGHT COPYRIGHT */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <ShieldCheck className="w-4 h-4 text-cyan-400/80" />
        <span>© 2026 BRACE_RCE. ALL RIGHTS RESERVED.</span>
      </div>
    </div>
  </footer>
);

