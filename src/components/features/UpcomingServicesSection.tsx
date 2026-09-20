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
    accentColor: "text-accent-success",
    borderColor: "border-accent-success/20 hover:border-accent-success/40",
    glowColor: "rgba(0, 255, 135, 0.08)",
    badgeClass: "bg-accent-success/10 border-accent-success/30 text-accent-success",
    icon: UserPlus,
  },
  {
    id: "solo-playground",
    title: "SOLO PRACTICE SANDBOX",
    description: "Offline algorithmic sandbox with pre-loaded problems, zero time pressure, and side-by-side solution hints. Perfect for learning and exploring edge cases.",
    progress: 55,
    statusLabel: "DESIGNING",
    accentColor: "text-accent-primary",
    borderColor: "border-accent-primary/20 hover:border-accent-primary/40",
    glowColor: "rgba(0, 212, 255, 0.08)",
    badgeClass: "bg-accent-primary/10 border-accent-primary/30 text-accent-primary",
    icon: Globe,
  },
  {
    id: "ai-coach",
    title: "AI CODE COACH",
    description: "Automated intelligence providing Big-O time & space complexity breakdowns, edge-case vulnerability detection, and alternative approach suggestions after every submission.",
    progress: 85,
    statusLabel: "BUILDING",
    accentColor: "text-accent-primary",
    borderColor: "border-accent-primary/20 hover:border-accent-primary/40",
    glowColor: "rgba(34,211,238,0.08)",
    badgeClass: "bg-accent-primary/10 border-accent-primary/30 text-accent-primary",
    icon: Bot,
  },
  {
    id: "ranked-leagues",
    title: "GLOBAL RANKED LEAGUES",
    description: "Season 1 MMR ladder with 6 competitive tiers: Recruit → Initiate → Operative → Elite → Mainframe → Apex Architect. Weekly resets, exclusive badge cosmetics, and leaderboard rankings.",
    progress: 40,
    statusLabel: "DESIGNING",
    accentColor: "text-accent-warning",
    borderColor: "border-accent-warning/20 hover:border-accent-warning/40",
    glowColor: "rgba(255, 184, 0, 0.08)",
    badgeClass: "bg-accent-warning/10 border-accent-warning/30 text-accent-warning",
    icon: Trophy,
  },
  {
    id: "ffa-arena",
    title: "4-PLAYER FFA BATTLE ROYALE",
    description: "Simultaneous 4-way elimination combat. After each round, the operative with the slowest accepted runtime is eliminated — last algorithm standing wins.",
    progress: 25,
    statusLabel: "PROTOTYPING",
    accentColor: "text-accent-danger",
    borderColor: "border-accent-danger/20 hover:border-accent-danger/40",
    glowColor: "rgba(255, 59, 92, 0.08)",
    badgeClass: "bg-accent-danger/10 border-accent-danger/30 text-accent-danger",
    icon: Swords,
  },
  {
    id: "problem-studio",
    title: "CUSTOM PROBLEM STUDIO",
    description: "Community problem builder with auto testcase generators, memory footprint constraints, spaced repetition scheduling, and shareable problem links.",
    progress: 30,
    statusLabel: "EXPLORING",
    accentColor: "text-accent-primary",
    borderColor: "border-accent-primary/20 hover:border-accent-primary/40",
    glowColor: "rgba(0, 212, 255, 0.08)",
    badgeClass: "bg-accent-primary/10 border-accent-primary/30 text-accent-primary",
    icon: FlaskConical,
  },
];

export const UpcomingServicesSection: React.FC = () => {
  return (
    <div className="relative w-full bg-raised border border-subtle-line rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-warning/40 to-transparent" />

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/60">
        <h2 className="font-mono text-sm font-black text-fg tracking-[0.15em] flex items-center gap-2.5 uppercase">
          <Rocket className="w-4 h-4 text-accent-warning" /> Services & Operations
          <span className="text-[10px] text-accent-warning/60 font-normal ml-1">// COMING SOON</span>
        </h2>
        <span className="text-[9px] text-faint font-mono tracking-widest">{services.length} IN PIPELINE</span>
      </div>

      {/* SERVICES GRID */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`relative bg-black/60 border ${s.borderColor} rounded-xl p-5 flex flex-col gap-4 transition-all group overflow-hidden`}
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
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${s.borderColor} bg-black/60`}>
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
              <p className="text-[11px] text-faint leading-relaxed font-sans relative z-10">
                {s.description}
              </p>

              {/* PROGRESS BAR */}
              <div className="relative z-10">
                <div className="flex justify-between text-[9px] font-mono text-faint mb-1.5">
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
                          s.accentColor.includes("emerald") ? "var(--accent-success), var(--accent-success)"
                          : s.accentColor.includes("purple") ? "var(--accent-primary), var(--accent-primary)"
                          : s.accentColor.includes("cyan") ? "var(--accent-primary), var(--accent-primary)"
                          : s.accentColor.includes("amber") ? "var(--accent-warning), var(--accent-warning)"
                          : s.accentColor.includes("rose") ? "var(--accent-danger), var(--accent-danger)"
                          : "var(--accent-primary), var(--accent-primary)"
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
