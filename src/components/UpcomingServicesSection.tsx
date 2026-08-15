import React from "react";
import { Sparkles, Bot, Trophy, Swords, Cpu, Clock, Wrench } from "lucide-react";

export const UpcomingServicesSection: React.FC = () => {
  const services = [
    {
      id: "ai-coach",
      title: "AI CODE COACH & DIAGNOSTICS",
      status: "IN DEVELOPMENT (85%)",
      statusColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
      icon: Bot,
      iconColor: "text-cyan-400",
      description:
        "Automated AI assistant providing real-time Big-O complexity analysis, edge-case vulnerability detection, and interactive refactoring suggestions."
    },
    {
      id: "ranked-leagues",
      title: "SEASON 1 GLOBAL RANKED LEAGUES",
      status: "LAUNCHING Q3 2026",
      statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      icon: Trophy,
      iconColor: "text-amber-400",
      description:
        "Competitive MMR ladder with weekly division tiers (Initiate -> Mainframe Operative -> S-Tier Architect) and exclusive profile cosmetic badges."
    },
    {
      id: "ffa-arena",
      title: "4-PLAYER BATTLE ROYALE ARENA",
      status: "PROTOTYPING",
      statusColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      icon: Swords,
      iconColor: "text-rose-400",
      description:
        "Simultaneous 4-player FFA elimination combat where the slowest runtime solution gets purged each round until one champion remains."
    },
    {
      id: "problem-studio",
      title: "CUSTOM PROBLEM STUDIO & STRESS TEST",
      status: "IN PROGRESS (60%)",
      statusColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
      icon: Cpu,
      iconColor: "text-purple-400",
      description:
        "Community problem creation suite with automated testcase generators, memory footprint benchmarking, and custom RCE container constraints."
    }
  ];

  return (
    <div className="w-full bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl p-6 font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-cyan-500/20 pb-4 mb-6 gap-2">
        <h3 className="text-base text-cyan-400 font-bold tracking-widest flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" /> UPCOMING SERVICES & IN-PROGRESS OPERATIONS
        </h3>
        <span className="text-[10px] bg-black/60 border border-slate-800 text-slate-400 px-3 py-1 rounded font-bold tracking-wider flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-cyan-400 animate-spin" /> ROADMAP HORIZON
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const IconComp = service.icon;
          return (
            <div
              key={service.id}
              className="bg-black/50 border border-white/5 hover:border-cyan-500/30 rounded-xl p-5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-white text-sm tracking-wider flex items-center gap-2">
                    <IconComp className={`w-4 h-4 ${service.iconColor}`} /> {service.title}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${service.statusColor}`}>
                    {service.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">
                  {service.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-500/60" /> STATUS: DEPLOYING SOON
                </span>
                <span className="text-cyan-400 group-hover:underline cursor-pointer">
                  [ VIEW SPECS ]
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
