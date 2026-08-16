import {
  User, Heart, BookOpen,
  Database, GitBranch, ArrowRight, CheckCircle2,
  Swords, Users, Terminal, Shield, Zap, Bot, Trophy,
  FlaskConical, Globe, UserPlus, LayoutDashboard, Clock, Code2, Cpu
} from 'lucide-react';

// ─────────────────────────────────────────────
// COMPLETED SYSTEMS (BENTO DATA)
// ─────────────────────────────────────────────

const completedSystems = [
  {
    icon: Terminal,
    title: "Sandboxed RCE Engine",
    desc: "Isolated Docker runners for JS, Py, C++, Java & C with streaming telemetry.",
    colSpan: "md:col-span-2",
    theme: "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-950/80 to-black hover:border-emerald-400 shadow-emerald-950/20",
    badge: "text-emerald-300 bg-emerald-950/70 border-emerald-500/40",
    accentIcon: Cpu,
  },
  {
    icon: Swords,
    title: "1v1 PvP Battles",
    desc: "Real-time 1v1 matchmaking with instant winner validation.",
    colSpan: "md:col-span-1",
    theme: "border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-slate-950/80 to-black hover:border-rose-400 shadow-rose-950/20",
    badge: "text-rose-300 bg-rose-950/70 border-rose-500/40",
    accentIcon: Zap,
  },
  {
    icon: Users,
    title: "Custom Room Lobbies",
    desc: "Private/public rooms with password protection and custom timers.",
    colSpan: "md:col-span-1",
    theme: "border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-950/80 to-black hover:border-purple-400 shadow-purple-950/20",
    badge: "text-purple-300 bg-purple-950/70 border-purple-500/40",
    accentIcon: Shield,
  },
  {
    icon: BookOpen,
    title: "Battle Code Reviewer",
    desc: "Post-match side-by-side code diff analysis drawer.",
    colSpan: "md:col-span-1",
    theme: "border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-950/80 to-black hover:border-amber-400 shadow-amber-950/20",
    badge: "text-amber-300 bg-amber-950/70 border-amber-500/40",
    accentIcon: Code2,
  },
  {
    icon: Database,
    title: "Algorithm Databank",
    desc: "Searchable problem repository with hidden test cases.",
    colSpan: "md:col-span-1",
    theme: "border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-950/80 to-black hover:border-indigo-400 shadow-indigo-950/20",
    badge: "text-indigo-300 bg-indigo-950/70 border-indigo-500/40",
    accentIcon: Database,
  },
  {
    icon: LayoutDashboard,
    title: "Command Center & Time Sync",
    desc: "Centralized dossier with socket-persisted match timers across page refreshes.",
    colSpan: "md:col-span-2",
    theme: "border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-950/80 to-black hover:border-cyan-400 shadow-cyan-950/20",
    badge: "text-cyan-300 bg-cyan-950/70 border-cyan-500/40",
    accentIcon: Clock,
  },
];

// ─────────────────────────────────────────────
// ROADMAP PIPELINE (BENTO DATA)
// ─────────────────────────────────────────────

const roadmapItems = [
  {
    icon: Bot,
    title: "AI Code Diagnostics",
    desc: "Big-O complexity breakdown & vulnerability detection post-match.",
    colSpan: "md:col-span-2",
    version: "V2.2",
    status: "BUILDING",
    progress: 85,
    theme: "border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-950/80 to-black hover:border-cyan-400",
    badge: "text-cyan-300 bg-cyan-950/80 border-cyan-500/40",
    barColor: "from-cyan-600 to-cyan-400",
  },
  {
    icon: UserPlus,
    title: "Squad Direct Duel",
    desc: "Direct friend invites into 1v1 duels with live notifications.",
    colSpan: "md:col-span-1",
    version: "V2.1",
    status: "BUILDING",
    progress: 75,
    theme: "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-950/80 to-black hover:border-emerald-400",
    badge: "text-emerald-300 bg-emerald-950/80 border-emerald-500/40",
    barColor: "from-emerald-600 to-emerald-400",
  },
  {
    icon: Trophy,
    title: "Ranked Leagues",
    desc: "Season 1 MMR ladder with 6 tiers & weekly resets.",
    colSpan: "md:col-span-1",
    version: "V2.3",
    status: "DESIGNING",
    progress: 40,
    theme: "border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-950/80 to-black hover:border-amber-400",
    badge: "text-amber-300 bg-amber-950/80 border-amber-500/40",
    barColor: "from-amber-600 to-amber-400",
  },
  {
    icon: Globe,
    title: "Practice Sandbox",
    desc: "Offline practice playground with solution hints.",
    colSpan: "md:col-span-1",
    version: "V2.1",
    status: "DESIGNING",
    progress: 55,
    theme: "border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-950/80 to-black hover:border-purple-400",
    badge: "text-purple-300 bg-purple-950/80 border-purple-500/40",
    barColor: "from-purple-600 to-purple-400",
  },
  {
    icon: Swords,
    title: "4-Player FFA",
    desc: "4-way elimination battle royale format.",
    colSpan: "md:col-span-1",
    version: "V2.4",
    status: "PROTOTYPE",
    progress: 30,
    theme: "border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-slate-950/80 to-black hover:border-rose-400",
    badge: "text-rose-300 bg-rose-950/80 border-rose-500/40",
    barColor: "from-rose-600 to-rose-400",
  },
  {
    icon: FlaskConical,
    title: "Problem Studio",
    desc: "Community challenge builder & auto testcase generator.",
    colSpan: "md:col-span-1",
    version: "V2.5",
    status: "EXPLORING",
    progress: 25,
    theme: "border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-950/80 to-black hover:border-sky-400",
    badge: "text-sky-300 bg-sky-950/80 border-sky-500/40",
    barColor: "from-sky-600 to-sky-400",
  },
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const About = () => {
  return (
    <section className="relative flex h-full flex-col items-center overflow-hidden px-4 pt-24 pb-28 sm:px-6 font-mono text-slate-200">
      {/* Dynamic Background Glow Canvas */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] -z-10" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* ── BENTO HEADER ─────────────────────────── */}
      <div className="relative z-10 mb-12 flex w-full max-w-6xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-cyan-500/40 bg-cyan-950/40 text-xs text-cyan-300 font-bold uppercase tracking-[0.25em] mb-4 shadow-lg shadow-cyan-950/50">
          <Terminal className="w-4 h-4 text-cyan-400" /> SYS // ARCHITECTURE BENTO MATRIX
        </div>
        <h1 className="mb-4 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl uppercase leading-tight">
          HIGH PERFORMANCE<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
            COMPUTATIONAL ARENA
          </span>
        </h1>
        <p className="max-w-2xl text-xs sm:text-sm text-slate-300 uppercase tracking-wide font-medium">
          Isolated RCE execution • Real-time 1v1 WebSocket battles • Open-source pipeline
        </p>

        {/* STATS BENTO ROW */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
          {[
            { label: "LIVE SYSTEMS", val: "9 OPERATIONAL", color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20" },
            { label: "PIPELINE",     val: "6 UPCOMING",    color: "text-amber-400 border-amber-500/30 bg-amber-950/20" },
            { label: "RUNTIMES",     val: "5 LANGUAGES",   color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/20" },
            { label: "ECOSYSTEM",    val: "100% OPEN",     color: "text-purple-400 border-purple-500/30 bg-purple-950/20" },
          ].map((s) => (
            <div key={s.label} className={`border px-3 py-2.5 rounded-sm ${s.color}`}>
              <span className="block text-[10px] text-slate-400 tracking-widest font-bold uppercase">{s.label}</span>
              <span className="block text-xs font-black tracking-wider mt-0.5">{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BENTO GRID 1: CORE ECOSYSTEM & CREATOR ── */}
      <div className="relative z-10 w-full max-w-6xl mb-12">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-400 tracking-[0.2em] uppercase flex items-center gap-2">
            <Shield className="w-4 h-4" /> 01 // FOUNDATION & REPOSITORIES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BENTO HERO CARD: CREATOR */}
          <div className="md:col-span-2 relative border border-cyan-500/30 bg-gradient-to-br from-cyan-950/25 via-slate-950/80 to-black p-6 shadow-xl shadow-cyan-950/10 flex flex-col justify-between gap-4">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-300">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">// CREATOR & ARCHITECTURE</h3>
                  <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">BY DEV SHARMA</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 tracking-widest uppercase">
                PROD DEPLOYED
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed uppercase tracking-wide font-medium">
              Designed to merge isolated execution environments with real-time socket multiplayer battles, offering instant feedback and post-match code reviews.
            </p>

            <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>STACK: REACT 19 • EXPRESS 5 • PRISMA • SOCKET.IO</span>
              <span className="text-cyan-400">v2.4.0 ONLINE</span>
            </div>
          </div>

          {/* BENTO CARD: OPEN SOURCE */}
          <div className="md:col-span-1 relative border border-rose-500/30 bg-gradient-to-br from-rose-950/25 via-slate-950/80 to-black p-6 shadow-xl shadow-rose-950/10 flex flex-col justify-between gap-4">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-rose-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rose-400" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-rose-500/40 bg-rose-950/40 flex items-center justify-center text-rose-300">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">// OPEN SOURCE</h3>
                <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase">GITHUB REPOSITORIES</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed uppercase tracking-wide font-medium">
              100% open-source compiler engine & DSA problem databank repositories.
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-rose-500/20">
              <a
                href="https://github.com/Devsharma08/ONLINE_IDE"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 border border-rose-500/40 hover:border-rose-300 bg-rose-950/40 text-rose-300 hover:text-white font-black text-xs uppercase tracking-widest transition-all text-center"
              >
                [ ENGINE REPOSITORY ]
              </a>
              <a
                href="https://github.com/Devsharma08/DSA-LEETCODE"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 border border-rose-500/40 hover:border-rose-300 bg-rose-950/40 text-rose-300 hover:text-white font-black text-xs uppercase tracking-widest transition-all text-center"
              >
                [ DSA DATA REPOSITORY ]
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── BENTO GRID 2: LIVE DEPLOYED SYSTEMS ───── */}
      <div className="relative z-10 w-full max-w-6xl mb-12">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-400 tracking-[0.2em] uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> 02 // OPERATIONAL PLATFORM SYSTEMS
          </span>
          <span className="text-xs font-bold text-emerald-300 border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 uppercase tracking-widest">
            {completedSystems.length} DEPLOYED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {completedSystems.map((sys) => {
            const Icon = sys.icon;
            const Accent = sys.accentIcon;
            return (
              <div
                key={sys.title}
                className={`group relative border p-5 flex flex-col justify-between gap-4 transition-all shadow-lg ${sys.colSpan} ${sys.theme}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-white/10 bg-black/60 flex items-center justify-center text-white shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wide">{sys.title}</h4>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2.5 py-1 border font-black tracking-widest uppercase shrink-0 ${sys.badge}`}>
                    ACTIVE
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed uppercase tracking-wide font-medium">
                  {sys.desc}
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Accent className="w-3.5 h-3.5 opacity-60" /> FEATURE DEPLOYED
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BENTO GRID 3: ROADMAP PIPELINE ───────── */}
      <div className="relative z-10 w-full max-w-6xl mb-12">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400 tracking-[0.2em] uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" /> 03 // DEVELOPMENT ROADMAP
          </span>
          <span className="text-xs font-bold text-amber-300 border border-amber-500/40 bg-amber-950/40 px-3 py-1 uppercase tracking-widest">
            {roadmapItems.length} IN PIPELINE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roadmapItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative border p-5 flex flex-col justify-between gap-4 transition-all shadow-lg overflow-hidden ${item.colSpan} ${item.theme}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-white/10 bg-black/60 flex items-center justify-center text-white shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wide">{item.title}</h4>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 tracking-widest font-mono border border-white/10 bg-black/40 px-2 py-0.5">
                    {item.version}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed uppercase tracking-wide font-medium">
                  {item.desc}
                </p>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`px-2.5 py-0.5 border text-[10px] tracking-widest ${item.badge}`}>
                      {item.status}
                    </span>
                    <span className="text-slate-300 font-mono">{item.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-black/60 border border-white/10 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.barColor} transition-all duration-1000 shadow-sm`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BENTO FOOTER CTA ────────────────────── */}
      <div className="relative z-10 w-full max-w-6xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-slate-950/80 to-black p-8 shadow-xl shadow-cyan-950/20">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 shrink-0 shadow-md">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-cyan-400 font-bold tracking-[0.25em] uppercase block">SYS // OPEN SOURCE COMMUNITY</span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mt-0.5">// CONTRIBUTE TO BRACE_RCE</h3>
              <p className="text-xs text-slate-300 leading-relaxed uppercase tracking-wide mt-1 max-w-xl font-medium">
                Contribute container runtimes, new languages, algorithm test cases, and UI features on GitHub.
              </p>
            </div>
          </div>
          <a
            href="https://github.com/Devsharma08/ONLINE_IDE"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2.5 border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-950/70 hover:border-cyan-400 py-3.5 px-6 text-xs uppercase tracking-widest text-cyan-200 hover:text-white font-black transition-all shrink-0 shadow-lg shadow-cyan-950/40"
          >
            JOIN CONTRIBUTION NETWORK
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default About;

