import React from 'react';
import {
  Info, User, Heart, Smartphone, Timer, BookOpen, Cpu,
  Database, Languages, GitBranch, ArrowRight, CheckCircle2,
  Swords, Users, Terminal, Shield, Zap, Bot, Trophy,
  FlaskConical, Globe, UserPlus, Radio, LayoutDashboard, Clock
} from 'lucide-react';

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const completedFeatures = [
  { icon: Terminal,        label: "Remote Code Execution Engine",  desc: "Sandboxed Docker runners for JavaScript, Python, C++, Java with live output streaming." },
  { icon: Swords,          label: "1v1 PvP Battle System",         desc: "Real-time ranked matchmaking. Fastest accepted runtime wins. Score and ELO updates on result." },
  { icon: Users,           label: "Custom Room Lobbies",            desc: "Create or join password-protected custom rooms with configurable player limits." },
  { icon: Shield,          label: "Operative Profile & Scores",    desc: "User profiles with ELO scores, match history, performance tracking, and rank derivation." },
  { icon: BookOpen,        label: "Battle Code Review",             desc: "Side-by-side code comparison modal with runtime/memory analysis after every match." },
  { icon: Database,        label: "Algorithm Problem Databank",     desc: "Searchable, filterable, paginated table of challenges seeded from GitHub DSA repositories." },
  { icon: LayoutDashboard, label: "Command Center Dashboard",       desc: "Authenticated user dashboard with profile, quick-nav hub, history ledger, and problem explorer." },
  { icon: Zap,             label: "Battle Time Persistence",        desc: "Remaining battle time persisted across page refreshes via backend socket sync." },
  { icon: CheckCircle2,    label: "Google OAuth Integration",       desc: "Sign in with Google alongside email/password auth, with JWT session management." },
];

type RoadmapStatus = "BUILDING" | "DESIGNING" | "PROTOTYPING" | "EXPLORING" | "PLANNED" | "IN_RESEARCH";

interface RoadmapItem {
  icon: React.ElementType;
  label: string;
  desc: string;
  version: string;
  status: RoadmapStatus;
  progress: number;
  accentCls: string;
  badgeCls: string;
}

const roadmapItems: RoadmapItem[] = [
  {
    icon: UserPlus,    label: "Squad Direct Challenge",      progress: 70,
    desc:    "Invite an online friend from the friends panel into a live 1v1 duel with real-time invite notifications.",
    version: "V2.1", status: "BUILDING",
    accentCls: "text-emerald-400 border-emerald-500/20",
    badgeCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    icon: Globe,       label: "Solo Practice Sandbox",       progress: 55,
    desc:    "Offline algorithm sandbox with pre-loaded problems, zero time pressure, and optional step-through hints.",
    version: "V2.1", status: "DESIGNING",
    accentCls: "text-purple-400 border-purple-500/20",
    badgeCls: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  },
  {
    icon: Bot,         label: "AI Code Coach & Diagnostics", progress: 85,
    desc:    "Big-O complexity breakdown, edge-case detection, and alternative approach suggestions after each submission.",
    version: "V2.2", status: "BUILDING",
    accentCls: "text-cyan-400 border-cyan-500/20",
    badgeCls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  },
  {
    icon: Trophy,      label: "Global Ranked Leagues",       progress: 40,
    desc:    "Season 1 MMR ladder with 6 tiers, weekly division resets, leaderboard rankings, and exclusive cosmetics.",
    version: "V2.3", status: "DESIGNING",
    accentCls: "text-amber-400 border-amber-500/20",
    badgeCls: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  {
    icon: Swords,      label: "4-Player FFA Battle Royale",  progress: 25,
    desc:    "Simultaneous 4-way elimination. The operative with the slowest accepted runtime is purged each round.",
    version: "V2.4", status: "PROTOTYPING",
    accentCls: "text-rose-400 border-rose-500/20",
    badgeCls: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  },
  {
    icon: FlaskConical, label: "Custom Problem Studio",      progress: 30,
    desc:    "Community problem builder with auto testcase generators, memory constraints, and shareable problem links.",
    version: "V2.5", status: "EXPLORING",
    accentCls: "text-sky-400 border-sky-500/20",
    badgeCls: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  },
  {
    icon: Smartphone,  label: "Mobile-Responsive Workspace", progress: 20,
    desc:    "Monaco editor scopes, collapsible split panels, and output console sheets for phone and tablet viewports.",
    version: "V2.6", status: "PLANNED",
    accentCls: "text-slate-400 border-slate-500/20",
    badgeCls: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  },
  {
    icon: Languages,   label: "Polyglot Runtime Expansion",  progress: 15,
    desc:    "Expand compiler infrastructure to support Go, Rust, PHP, and Swift with live telemetry badges per language.",
    version: "V2.7", status: "IN_RESEARCH",
    accentCls: "text-orange-400 border-orange-500/20",
    badgeCls: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  },
  {
    icon: Timer,       label: "Interview Practice Timer",    progress: 10,
    desc:    "Built-in diagnostic stopwatch in the workspace toolbar to simulate strict tech interview time limits.",
    version: "V2.7", status: "PLANNED",
    accentCls: "text-slate-400 border-slate-500/20",
    badgeCls: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  },
];

const statusLabel: Record<RoadmapStatus, string> = {
  BUILDING:    "BUILDING",
  DESIGNING:   "DESIGNING",
  PROTOTYPING: "PROTOTYPING",
  EXPLORING:   "EXPLORING",
  PLANNED:     "PLANNED",
  IN_RESEARCH: "IN RESEARCH",
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const About = () => {
  return (
    <section className="relative flex h-full flex-col items-center overflow-hidden px-4 pt-24 pb-28 sm:px-6 font-mono text-slate-300">
      {/* Blueprint Grid Canvas Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025] bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:14px_14px]" />

      {/* ── HERO ─────────────────────────────────── */}
      <div className="relative z-10 mb-14 flex w-full max-w-4xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/20 bg-cyan-950/10 text-[10px] text-cyan-400 uppercase tracking-[0.2em] mb-6">
          <Info className="w-3.5 h-3.5" /> SYS // ABOUT & ROADMAP
        </div>
        <h1 className="mb-5 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl uppercase leading-tight">
          BRIDGING THE GAP BETWEEN<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
            LEARNING & DOING
          </span>
        </h1>
        <p className="max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm uppercase tracking-wide">
          BraceRCE is an open-source competitive programming platform that connects directly
          to GitHub for challenges and runs code inside isolated remote containers with real-time telemetry.
        </p>
      </div>

      {/* ── CREATOR CARDS ───────────────────────── */}
      <div className="relative z-10 w-full max-w-4xl border border-white/5 bg-black/40 p-8 backdrop-blur-md mb-16">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/25" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/25" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/25" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/25" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 flex items-center justify-center border border-cyan-500/30 bg-cyan-950/15 text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">// THE CREATOR</h3>
            <p className="text-slate-500 text-xs leading-relaxed uppercase tracking-wide">
              Built by Dev Sharma as a way to share coding solutions and experiment with modern
              web technologies, combining the power of GitHub APIs and sandboxed code execution.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 flex items-center justify-center border border-rose-500/30 bg-rose-950/15 text-rose-400">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">// OPEN SOURCE</h3>
            <p className="text-slate-500 text-xs leading-relaxed uppercase tracking-wide">
              Everything here is open-source. The core compiler engine runs in one repository and
              challenge templates populate from a separate GitHub DSA repository.
            </p>
            <div className="flex flex-wrap gap-4 mt-1">
              {[
                { label: "SOURCE CODE", href: "https://github.com/Devsharma08/ONLINE_IDE" },
                { label: "CHALLENGES", href: "https://github.com/Devsharma08/DSA-LEETCODE" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-black text-[10px] uppercase tracking-widest"
                >
                  [ {label} ]
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPLETED FEATURES ──────────────────── */}
      <div className="relative z-10 w-full max-w-4xl mb-16">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> LIVE SYSTEMS
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">// COMPLETED & DEPLOYED</h2>
          <p className="text-[11px] text-slate-600 uppercase tracking-wider mt-1">
            Features currently live and operational on the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {completedFeatures.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="group flex flex-col gap-3 border border-emerald-500/10 hover:border-emerald-500/30 bg-black/30 hover:bg-emerald-950/10 p-4 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 flex items-center justify-center border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-black text-[10px] text-emerald-400 tracking-wider uppercase">{label}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed uppercase tracking-wide">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROADMAP ─────────────────────────────── */}
      <div className="relative z-10 w-full max-w-4xl mb-16">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
            <Clock className="w-3.5 h-3.5" /> IN PIPELINE
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">// SERVICES IN PROGRESS & PLANNED</h2>
          <p className="text-[11px] text-slate-600 uppercase tracking-wider mt-1">
            Features actively being designed, built, or researched for upcoming releases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roadmapItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`group relative flex flex-col gap-4 border ${item.accentCls} bg-black/30 hover:bg-black/60 p-5 transition-all overflow-hidden`}
              >
                {/* VERSION TAG */}
                <div className="absolute top-3 right-3 text-[8px] text-slate-700 tracking-widest font-bold">
                  {item.version}
                </div>

                {/* ICON + TITLE */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 flex items-center justify-center border ${item.accentCls} bg-black/40`}>
                    <Icon className={`w-4 h-4 ${item.accentCls.split(' ')[0]}`} />
                  </div>
                  <span className={`font-black text-[10px] tracking-wider uppercase ${item.accentCls.split(' ')[0]}`}>
                    {item.label}
                  </span>
                </div>

                {/* DESC */}
                <p className="text-[10px] text-slate-600 leading-relaxed uppercase tracking-wide flex-1">
                  {item.desc}
                </p>

                {/* PROGRESS + STATUS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className={`px-2 py-0.5 border tracking-widest ${item.badgeCls}`}>
                      {statusLabel[item.status]}
                    </span>
                    <span className="text-slate-600">{item.progress}%</span>
                  </div>
                  <div className="h-1 bg-white/5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${item.progress}%`,
                        background: item.accentCls.includes("emerald") ? "#10b981"
                          : item.accentCls.includes("purple") ? "#8b5cf6"
                          : item.accentCls.includes("cyan") ? "#06b6d4"
                          : item.accentCls.includes("amber") ? "#f59e0b"
                          : item.accentCls.includes("rose") ? "#f43f5e"
                          : item.accentCls.includes("sky") ? "#38bdf8"
                          : item.accentCls.includes("orange") ? "#fb923c"
                          : "#64748b",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONTRIBUTION BLOCK ──────────────────── */}
      <div className="relative z-10 w-full max-w-4xl border border-white/5 bg-black/40 p-8 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/25" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/25" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/25" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/25" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 flex items-center justify-center border border-cyan-500/25 bg-cyan-950/15 text-cyan-400 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] text-cyan-400 font-bold tracking-[0.2em] uppercase block">SYS // OPEN SOURCE</span>
              <h3 className="text-base font-black text-white uppercase tracking-wider">// CONTRIBUTIONS WELCOME</h3>
              <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-wide mt-2 max-w-lg">
                BRACE RCE is fully open-source. Whether you're passionate about sandboxed systems,
                compiler engineering, or visual dashboards — your contribution scales our boundaries.
              </p>
            </div>
          </div>
          <a
            href="https://github.com/Devsharma08/ONLINE_IDE"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 border border-white/10 bg-black/60 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-950/20 py-3 px-6 text-xs uppercase tracking-widest text-slate-300 font-black transition-all shrink-0"
          >
            JOIN CONTRIBUTION NETWORK
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default About;
