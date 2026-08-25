import React from "react";
import { Activity, ShieldCheck, Terminal, Cpu, GitBranch, Zap, ArrowUpRight, Lock, Code2, Server } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => (
  <footer className="fixed bottom-0 left-0 right-0 w-full border-t border-cyan-500/30 bg-[#03060d] font-mono text-slate-300 z-0 h-[380px] sm:h-[340px] flex flex-col justify-between overflow-hidden shadow-[0_-15px_40px_rgba(0,0,0,0.9)]">

    {/* Blurred Cyber-Dark Gradient Glow Image Backdrop */}
    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.25),rgba(15,23,42,0))]" />
    
    {/* Dark blurred graphic mesh background */}
    <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-br from-cyan-950/40 via-[#03060d] to-indigo-950/40 backdrop-blur-2xl" />

    {/* Subtle top cyan glow line */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.8)]" />

    {/* Background Grid texture overlay */}
    <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px]" />

    {/* Watermark Logo Text in Background */}
    <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-8xl sm:text-9xl font-black text-white/[0.02] tracking-[0.3em] pointer-events-none select-none uppercase">
      BRACE_RCE
    </div>

    <div className="w-full max-w-full px-6 sm:px-12 md:px-16 pt-8 sm:pt-10 pb-6 flex flex-col justify-between h-full relative z-10">

      {/* TOP SECTION: Expanded 4-Column Directory Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-6">
        
        {/* Column 1: Brand & Status */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-widest text-white uppercase group">
            <Terminal className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            BRACE <span className="text-cyan-400">// RCE</span>
          </Link>
          <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-xs font-normal">
            High-performance browser execution playground with sandboxed telemetry and real-time DSA telemetry.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-none text-[11px]">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> ENGINE ONLINE
            </span>
            <span className="text-[11px] text-cyan-300/80 font-bold bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-none">
              PING 24ms
            </span>
          </div>
        </div>

        {/* Column 2: Core Platform Links */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" /> // PLATFORM
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-300 font-medium">
            <li><Link to="/terminal" className="hover:text-cyan-300 transition-colors flex items-center gap-1">Monaco Workspace <ArrowUpRight className="w-3 h-3 text-slate-500" /></Link></li>
            <li><Link to="/dashboard" className="hover:text-cyan-300 transition-colors flex items-center gap-1">Telemetry Dashboard <ArrowUpRight className="w-3 h-3 text-slate-500" /></Link></li>
            <li><Link to="/battle" className="hover:text-cyan-300 transition-colors flex items-center gap-1">1v1 Code Battle <ArrowUpRight className="w-3 h-3 text-slate-500" /></Link></li>
            <li><Link to="/rooms/create" className="hover:text-cyan-300 transition-colors flex items-center gap-1">Multiplayer Lobby <ArrowUpRight className="w-3 h-3 text-slate-500" /></Link></li>
          </ul>
        </div>

        {/* Column 3: Data Structures */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> // ALGORITHMS
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-300 font-medium">
            <li><Link to="/ds/tree" className="hover:text-cyan-300 transition-colors">Trees & Graphs</Link></li>
            <li><Link to="/ds/dynamic-programming" className="hover:text-cyan-300 transition-colors">Dynamic Programming</Link></li>
            <li><Link to="/ds/array" className="hover:text-cyan-300 transition-colors">Arrays & Strings</Link></li>
            <li><Link to="/ds/stack" className="hover:text-cyan-300 transition-colors">Stacks & Queues</Link></li>
          </ul>
        </div>

        {/* Column 4: System Specs */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> // SYSTEM SPECS
          </span>
          <div className="flex flex-col gap-2 text-xs text-slate-400 font-mono">
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span>RUNTIME</span>
              <span className="text-cyan-300 font-bold">NODE_V20</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span>SANDBOX</span>
              <span className="text-cyan-300 font-bold">DOCKER_RCE</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span>SECURITY</span>
              <span className="text-emerald-400 font-bold">ISOLATED</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Copyright & Telemetry Meta */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>© 2026 BRACE_RCE. ALL RIGHTS RESERVED.</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-cyan-400" /> SSL SECURED</span>
          <span>•</span>
          <span className="flex items-center gap-1"><GitBranch className="w-3 h-3 text-amber-400" /> MAIN // v2.4.0</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-400" /> RCE_TELEMETRY</span>
        </div>
      </div>

    </div>
  </footer>
);
