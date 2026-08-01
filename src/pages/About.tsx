import React from 'react';
import { 
  Info, 
  User, 
  Heart, 
  Smartphone, 
  Timer, 
  BookOpen, 
  Cpu, 
  Database, 
  Languages, 
  GitBranch, 
  ArrowRight
} from 'lucide-react';

type RoadmapItem = {
  title: string;
  desc: string;
  version: string;
  status: "UPCOMING" | "IN_RESEARCH" | "PLANNED";
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  badgeColorClass: string;
};

const roadmapFeatures: RoadmapItem[] = [
  {
    title: "MOBILE-FRIENDLY WORKSPACE UI",
    desc: "REFFACTOR MONACO EDITOR SCOPES, COLLAPSIBLE SPLIT PANELS, AND OUTPUT CONSOLE SHEETS TO RENDER FLAWLESSLY ON PHONE AND TABLET VIEWPORTS.",
    version: "V1.1.0",
    status: "UPCOMING",
    Icon: Smartphone,
    colorClass: "text-cyan-400 border-cyan-500/20 bg-cyan-950/5",
    badgeColorClass: "text-cyan-400 bg-cyan-950/20 border-cyan-500/30"
  },
  {
    title: "INTERACTIVE PRACTICE TIMER",
    desc: "A BUILT-IN DIAGNOSTIC STOPWATCH IN THE WORKSPACE TOOLBAR TO TRACK SOLUTION SPEED AND SIMULATE STRICT, REAL-WORLD TECH INTERVIEW TIME BOUNDS.",
    version: "V1.2.0",
    status: "UPCOMING",
    Icon: Timer,
    colorClass: "text-amber-400 border-amber-500/20 bg-amber-950/5",
    badgeColorClass: "text-amber-400 bg-amber-950/20 border-amber-500/30"
  },
  {
    title: "INTEGRATED SCRATCHPAD NOTES",
    desc: "A MARKDOWN-SUPPORTED NOTES PANEL INSIDE EACH CHALLENGE LAYOUT TO BOOKMARK FORMULAS, WORKINGS, AND EXPERIMENTAL LOGIC ON THE FLY.",
    version: "V1.2.0",
    status: "PLANNED",
    Icon: BookOpen,
    colorClass: "text-purple-400 border-purple-500/20 bg-purple-950/5",
    badgeColorClass: "text-purple-400 bg-purple-950/20 border-purple-500/30"
  },
  {
    title: "TELEMETRY PERFORMANCE TUNING",
    desc: "FURTHER MINIMIZE DOCKER SANDBOXING BOOTSTRAP OVERHEAD, REDUCE COMPILATION TIME LAGS, AND OPTIMIZE CACHING PIPELINES.",
    version: "V1.3.0",
    status: "IN_RESEARCH",
    Icon: Cpu,
    colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-950/5",
    badgeColorClass: "text-emerald-400 bg-emerald-950/20 border-emerald-500/30"
  },
  {
    title: "CHALLENGE DATABASE SCALE-UP",
    desc: "AUTOMATED RUNNER SCRIPTS TO CONTINUOUSLY PARSE AND POPULATE THE VERIFIED DATABASE WITH HUNDREDS OF CATEGORIZED CHALLENGE TEMPLATES.",
    version: "V1.4.0",
    status: "PLANNED",
    Icon: Database,
    colorClass: "text-blue-400 border-blue-500/20 bg-blue-950/5",
    badgeColorClass: "text-blue-400 bg-blue-950/20 border-blue-500/30"
  },
  {
    title: "POLYGLOT LANGUAGE RUNTIMES",
    desc: "EXPAND COMPILER AND RUNNER INFRASTRUCTURE TO EXECUTE C++, PYTHON, GO, AND RUST TEMPLATES WITH DYNAMIC TELEMETRY BADGES.",
    version: "V1.5.0",
    status: "IN_RESEARCH",
    Icon: Languages,
    colorClass: "text-rose-400 border-rose-500/20 bg-rose-950/5",
    badgeColorClass: "text-rose-400 bg-rose-950/20 border-rose-500/30"
  }
];

const About = () => {
  return (
    <section className="relative flex h-full flex-col items-center overflow-hidden px-4 pt-24 pb-28 sm:px-6 font-mono text-slate-300">
      
      {/* Blueprint Grid Canvas Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:14px_14px]"></div>

      {/* Main Header Block */}
      <div className="z-10 mb-12 flex w-full max-w-4xl flex-col items-center text-center sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none border border-cyan-500/20 bg-cyan-950/5 text-xs text-cyan-400 uppercase tracking-wider mb-6 cursor-default">
          <Info className="w-3.5 h-3.5" />
          SYS // ABOUT_&_FUTURE_SCOPE_BRACERCE 
        </div>
        
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl uppercase">
          BRIDGING_THE_GAP_BETWEEN <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">LEARNING_&_DOING</span>
        </h1>
        
        <p className="max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm uppercase tracking-wide">
          BraceRCE is an open-source platform designed to make exploring Data Structures and Algorithms seamless by connecting directly to GitHub and online IDE for simpler and secure and fast code execution.
        </p>
      </div>

      {/* Creator & Project Scope Cards Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-none border border-white/5 bg-black/40 p-6 backdrop-blur-md sm:p-10 md:p-12 mb-16">
        {/* Subtle Tech L-Bracket Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/30"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/30"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/30"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/30"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-none bg-cyan-950/15 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">// THE_CREATOR</h3>
            <p className="text-slate-400 text-xs leading-relaxed uppercase">
              Built by Dev Sharma as a way to share coding solutions and experiment with modern web technologies, combining the power of GitHub APIs.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-none bg-rose-950/15 flex items-center justify-center border border-rose-500/30 text-rose-400">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">// OPEN_SOURCE</h3>
            <p className="text-slate-400 text-xs leading-relaxed uppercase font-medium">
              Everything you see here is open-source. I believe that coding education should be accessible and visually engaging for everyone. I partition my codebase deterministically: the core compiler engine code runs in one repository, and the LeetCode challenge templates populate from another.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 select-none">
              <a 
                href="https://github.com/Devsharma08/ONLINE_IDE" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors font-bold text-[10px] sm:text-xs uppercase tracking-wider w-fit"
              >
                <span>[ VIEW_SOURCE_CODE ]</span>
              </a>
              <a 
                href="https://github.com/Devsharma08/DSA-LEETCODE" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors font-bold text-[10px] sm:text-xs uppercase tracking-wider w-fit"
              >
                <span>[ VIEW_CHALLENGES ]</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Future Scope & Contribution Section */}
      <div className="z-10 w-full max-w-4xl flex flex-col gap-6 lg:flex-row lg:gap-16">
        
        {/* Left Column: Roadmap Feature Grid */}
        <div className="w-full lg:w-3/5 flex flex-col gap-8">
          <div className="space-y-2.5">
            <h2 className="text-lg font-bold tracking-wider text-white uppercase">
              // FUTURE_SCOPE_&_UPCOMING_UPGRADES
            </h2>
            <p className="text-[10px] leading-relaxed text-slate-500 uppercase tracking-wider max-w-xl">
              We are actively scaling the platform compiler engines and telemetry metrics. Review the target optimizations planned for future releases.
            </p>
          </div>

          {/* Sharp Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roadmapFeatures.map(({ title, desc, version, status, Icon, colorClass, badgeColorClass }) => (
              <div 
                key={title} 
                className="group relative overflow-hidden rounded-none border border-white/5 bg-[#05060a]/20 p-5 hover:border-cyan-500/25 hover:bg-[#05060a]/50 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Tech version tag */}
                <div className="absolute top-0 right-0 p-2 text-[8px] text-slate-600 font-mono tracking-widest uppercase">
                  {version}
                </div>

                <div>
                  <div className={`w-10 h-10 rounded-none flex items-center justify-center border mb-4 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-2 tracking-wider group-hover:text-cyan-400 transition-colors uppercase">
                    {title}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed tracking-wide uppercase">
                    {desc}
                  </p>
                </div>

                {/* Status Pill */}
                <div className="mt-4 flex items-center gap-2 select-none">
                  <span className={`px-2 py-0.5 border text-[8px] font-bold tracking-wider rounded-none uppercase ${badgeColorClass}`}>
                    [ {status.replace("_", " ")} ]
                  </span>
                  <span className="w-1.5 h-1.5 rounded-none bg-cyan-500/30 group-hover:bg-cyan-400 animate-pulse"></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Contributor & Developer Support Block */}
        <div className="w-full lg:w-2/5 flex flex-col justify-center">
          <div 
            className="relative rounded-none border border-white/5 bg-[#03050a]/20 p-8 flex flex-col gap-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-sm"
          >
            {/* Tech Corner Bracket design tags */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/25"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/25"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/25"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/25"></div>

            <div className="flex items-center gap-2.5 select-none">
              <div className="w-10 h-10 rounded-none bg-cyan-950/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-cyan-400 font-bold tracking-[0.2em] uppercase">Sys // Open_Source</span>
                <h3 className="text-base font-bold text-white tracking-wider uppercase">// CONTRIBUTIONS</h3>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono text-slate-400 leading-relaxed uppercase tracking-wider">
              <p>
                We believe in creating free, high-performance, and completely transparent tools for algorithmic practice. <strong>BRACE RCE</strong> is fully open-source and welcomes contributions from developers around the globe.
              </p>
              <p className="text-[10px] text-cyan-500/70 border-l border-cyan-500/30 pl-4 py-1.5 bg-cyan-950/5">
                // ACTIVE_SCOPE: Compiler hardening, container scaling, telemetry profilers, language templates, and visual dashboards.
              </p>
              <p>
                Whether you are passionate about sandboxed systems, compiler engineering, or visual telemetry dashboards—your contribution scales our compiler boundaries.
              </p>
            </div>

            {/* Bracketed monospaced Git Contribution Button */}
            <a
              href="https://github.com/Devsharma08/DSA-LEETCODE"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-2 inline-flex items-center justify-center gap-2 border border-white/10 bg-black/40 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-950/15 py-3 px-4 sm:px-6 text-xs uppercase tracking-widest text-slate-300 font-bold transition-all duration-300 cursor-pointer select-none w-full sm:w-auto text-center"
            >
              <span className="hidden sm:inline">[ JOIN_CONTRIBUTION_NETWORK ]</span>
              <span className="inline sm:hidden">[ CONTRIBUTE_NOW ]</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300 shrink-0" />
            </a>
          </div>
        </div>

      </div>

    </section>
  )
}

export default About;
