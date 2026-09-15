import React from "react";
import {
  Activity,
  ShieldCheck,
  Terminal,
  Cpu,
  GitBranch,
  Zap,
  ArrowUpRight,
  Lock,
  Code2,
  Server,
} from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <footer className="relative w-full border-t border-cyan-500/20 bg-[#03060d] font-mono text-slate-300 overflow-hidden">

      {/* ── Decorative backgrounds (pointer-events-none) ─────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(6,182,212,0.20), rgba(15,23,42,0))",
        }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-br from-cyan-950/40 via-[#03060d] to-indigo-950/40" />

      {/* Subtle top cyan glow line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.6)]" />

      {/* Background grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Watermark */}
      <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-8xl sm:text-9xl font-black text-white/[0.018] tracking-[0.3em] pointer-events-none select-none uppercase whitespace-nowrap">
        BRACE_RCE
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 md:px-14 pt-10 pb-8">

        {/* Arena one-liner strip */}
        <div className="relative mb-8 border border-white/8 bg-black/30 px-5 py-3">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_120%_at_50%_0%,rgba(6,182,212,0.07),transparent_70%)]" />
          <p className="relative z-10 text-center font-sans text-[11px] sm:text-sm font-bold uppercase leading-relaxed tracking-[0.12em] text-slate-200">
            Live 1v1 duels · Global ELO ladder · Polyglot RCE —{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400">
              one submission at a time.
            </span>
          </p>
        </div>

        {/* 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Column 1: Brand & Status */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-base font-extrabold tracking-widest text-white uppercase group"
            >
              <Terminal className="w-5 h-5 text-cyan-400 transition-transform group-hover:rotate-12" />
              BRACE <span className="text-cyan-400">// RCE</span>
            </Link>
            <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-xs font-normal">
              Live 1v1 coding duels with a polyglot RCE sandbox, global ELO
              ladder, and real-time battle telemetry.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 text-[11px]">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                ENGINE ONLINE
              </span>
              <span className="text-[11px] text-cyan-300/80 font-bold bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5">
                PING 24ms
              </span>
            </div>
          </div>

          {/* Column 2: Platform links */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> // PLATFORM
            </span>
            <ul className="flex flex-col gap-2 text-xs text-slate-300 font-medium">
              <li>
                <Link to="/lobby" className="hover:text-cyan-300 transition-colors flex items-center gap-1">
                  Live Lobby <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-cyan-300 transition-colors flex items-center gap-1">
                  Telemetry Dashboard <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link to="/terminal" className="hover:text-cyan-300 transition-colors flex items-center gap-1">
                  Monaco Workspace <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link to="/rooms/create" className="hover:text-cyan-300 transition-colors flex items-center gap-1">
                  Host a Room <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Explore links (removed duplicate "Live Lobby") */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> // EXPLORE
            </span>
            <ul className="flex flex-col gap-2 text-xs text-slate-300 font-medium">
              <li>
                <Link to="/problems" className="hover:text-cyan-300 transition-colors">
                  Problem Bank
                </Link>
              </li>
              <li>
                <Link to="/friends" className="hover:text-cyan-300 transition-colors">
                  Friends &amp; Duels
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-cyan-300 transition-colors">
                  About the Arena
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-cyan-300 transition-colors">
                  Your Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: System Specs */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> // SYSTEM
            </span>
            <div className="flex flex-col gap-2 text-xs text-slate-400 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span>RUNTIME</span>
                <span className="text-cyan-300 font-bold">NODE_V20</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span>SANDBOX</span>
                <span className="text-cyan-300 font-bold">GUARDED_RCE</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span>SECURITY</span>
                <span className="text-emerald-400 font-bold">RATE_LIMITED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>© 2026 BRACE_RCE. ALL RIGHTS RESERVED.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" /> SSL SECURED
            </span>
            <span aria-hidden>•</span>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-amber-400" /> MAIN // v2.4.0
            </span>
            <span aria-hidden>•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> RCE_TELEMETRY
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
