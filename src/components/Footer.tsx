import React from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <footer className="relative w-full border-t border-white/[0.05] bg-[#050607] font-mono overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* LEFT: BRAND + TELEMETRY */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black tracking-widest text-white uppercase">
              BRACE <span className="text-cyan-400">// RCE</span>
            </span>
            <span className="text-slate-800">|</span>
            <span className="text-[10px] text-slate-600">v2.4.0-CYBER</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Activity className="w-3 h-3 animate-pulse" /> RCE ENGINE ONLINE
            </span>
            <span className="text-slate-800">·</span>
            <span className="text-slate-600">PING 24ms</span>
            <span className="text-slate-800">·</span>
            <span className="text-slate-600">UPTIME 99.97%</span>
          </div>
        </div>

        {/* CENTER: NAV LINKS */}
        <nav className="flex items-center gap-6 text-[10px] text-slate-600 tracking-wider">
          {[
            { label: "DASHBOARD", to: "/dashboard", internal: true },
            { label: "TERMINAL", to: "/terminal", internal: true },
            { label: "PROFILE", to: "/profile", internal: true },
            { label: "FRIENDS", to: "/friends", internal: true },
          ].map((item) =>
            item.internal ? (
              <Link key={item.label} to={item.to} className="hover:text-cyan-400 transition-colors">
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.to} className="hover:text-cyan-400 transition-colors">
                {item.label}
              </a>
            )
          )}
        </nav>

        {/* RIGHT: COPYRIGHT */}
        <div className="flex items-center gap-2 text-[10px] text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/40" />
          <span>© 2026 BRACE_RCE. ALL RIGHTS RESERVED.</span>
        </div>
      </div>
    </footer>
  );
};
