import React from "react";
import { Bot, Trophy, Swords, UserPlus, Globe, FlaskConical, Rocket } from "lucide-react";

interface Service {
  id: string;
  title: string;
  description: string;
  progress: number;
  statusLabel: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
  badgeClass: string;
  icon: React.ElementType;
}

const services: Service[] = [
  {
    id: "friend-challenge",
    title: "SQUAD CHALLENGE",
    description: "Invite online friends directly from the friends panel and enter a live 1v1 duel. Friend presence detection and real-time invite notifications.",
    progress: 70,
    statusLabel: "IN PROGRESS",
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    glowColor: "rgba(16,185,129,0.08)",
    badgeClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    icon: UserPlus,
  },
  {
    id: "solo-playground",
    title: "SOLO PRACTICE SANDBOX",
    description: "Offline algorithmic sandbox with pre-loaded problems, zero time pressure, and side-by-side solution hints. Perfect for learning and exploring edge cases.",
    progress: 55,
    statusLabel: "DESIGNING",
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    glowColor: "rgba(139,92,246,0.08)",
    badgeClass: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    icon: Globe,
  },
  {
    id: "ai-coach",
    title: "AI CODE COACH",
    description: "Automated intelligence providing Big-O time & space complexity breakdowns, edge-case vulnerability detection, and alternative approach suggestions after every submission.",
    progress: 85,
    statusLabel: "BUILDING",
    accentColor: "text-cyan-400",
    borderColor: "border-cyan-500/20 hover:border-cyan-500/40",
    glowColor: "rgba(34,211,238,0.08)",
    badgeClass: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    icon: Bot,
  },
  {
    id: "ranked-leagues",
    title: "GLOBAL RANKED LEAGUES",
    description: "Season 1 MMR ladder with 6 competitive tiers: Recruit → Initiate → Operative → Elite → Mainframe → Apex Architect. Weekly resets, exclusive badge cosmetics, and leaderboard rankings.",
    progress: 40,
    statusLabel: "DESIGNING",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    glowColor: "rgba(245,158,11,0.08)",
    badgeClass: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    icon: Trophy,
  },
  {
    id: "ffa-arena",
    title: "4-PLAYER FFA BATTLE ROYALE",
    description: "Simultaneous 4-way elimination combat. After each round, the operative with the slowest accepted runtime is eliminated — last algorithm standing wins.",
    progress: 25,
    statusLabel: "PROTOTYPING",
    accentColor: "text-rose-400",
    borderColor: "border-rose-500/20 hover:border-rose-500/40",
    glowColor: "rgba(239,68,68,0.08)",
    badgeClass: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    icon: Swords,
  },
  {
    id: "problem-studio",
    title: "CUSTOM PROBLEM STUDIO",
    description: "Community problem builder with auto testcase generators, memory footprint constraints, spaced repetition scheduling, and shareable problem links.",
    progress: 30,
    statusLabel: "EXPLORING",
    accentColor: "text-sky-400",
    borderColor: "border-sky-500/20 hover:border-sky-500/40",
    glowColor: "rgba(56,189,248,0.08)",
    badgeClass: "bg-sky-500/10 border-sky-500/30 text-sky-400",
    icon: FlaskConical,
  },
];

export const UpcomingServicesSection: React.FC = () => {
  return (
    <div className="relative w-full bg-[#080a0d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/30">
        <h2 className="font-mono text-sm font-black text-white tracking-[0.15em] flex items-center gap-2.5 uppercase">
          <Rocket className="w-4 h-4 text-amber-400" /> Services & Operations
          <span className="text-[10px] text-amber-500/60 font-normal ml-1">// COMING SOON</span>
        </h2>
        <span className="text-[9px] text-slate-600 font-mono tracking-widest">{services.length} IN PIPELINE</span>
      </div>

      {/* SERVICES GRID */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`relative bg-black/40 border ${s.borderColor} rounded-xl p-5 flex flex-col gap-4 transition-all group overflow-hidden`}
              style={{ boxShadow: `0 0 30px ${s.glowColor}` }}
            >
              {/* SUBTLE BG GLOW */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
                style={{ background: `radial-gradient(ellipse at top left, ${s.glowColor} 0%, transparent 70%)` }}
              />

              {/* ICON + TITLE + BADGE */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${s.borderColor} bg-black/40`}>
                    <Icon className={`w-4 h-4 ${s.accentColor}`} />
                  </div>
                  <span className={`font-mono text-xs font-black tracking-wide ${s.accentColor}`}>
                    {s.title}
                  </span>
                </div>
                <span className={`text-[8px] px-2 py-0.5 rounded-full border font-mono font-black tracking-widest shrink-0 ${s.badgeClass}`}>
                  {s.statusLabel}
                </span>
              </div>

              {/* DESCRIPTION */}
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans relative z-10">
                {s.description}
              </p>

              {/* PROGRESS BAR */}
              <div className="relative z-10">
                <div className="flex justify-between text-[9px] font-mono text-slate-700 mb-1.5">
                  <span>COMPLETION</span>
                  <span className={s.accentColor}>{s.progress}%</span>
                </div>
                <div className="h-1 bg-black/60 rounded-full border border-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${s.progress}%`,
                      background: `linear-gradient(90deg, currentColor, currentColor)`,
                      // we override with explicit color via classname trick
                    }}
                  >
                    <div
                      className="w-full h-full"
                      style={{
                        background: `linear-gradient(90deg, ${
                          s.accentColor.includes("emerald") ? "#10b981, #34d399"
                          : s.accentColor.includes("purple") ? "#8b5cf6, #a78bfa"
                          : s.accentColor.includes("cyan") ? "#06b6d4, #22d3ee"
                          : s.accentColor.includes("amber") ? "#f59e0b, #fbbf24"
                          : s.accentColor.includes("rose") ? "#f43f5e, #fb7185"
                          : "#38bdf8, #7dd3fc"
                        })`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
