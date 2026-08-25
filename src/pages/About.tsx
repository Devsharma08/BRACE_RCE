import {
  User, Heart, BookOpen,
  Database, GitBranch, ArrowRight, CheckCircle2,
  Swords, Users, Terminal, Shield, Zap, Bot, Trophy,
  FlaskConical, Globe, UserPlus, LayoutDashboard, Clock, Code2, Cpu
} from 'lucide-react';
import BentoCapabilityGrid, { type BentoCapabilityItem } from '../components/shared/BentoCapabilityGrid';

// ─────────────────────────────────────────────
// ARCHITECTURE CAPABILITIES (reuses home's shared bento)
// ─────────────────────────────────────────────

const architectureCapabilities: BentoCapabilityItem[] = [
  {
    title: "Side-by-Side <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold\">Problem Workspace</span>",
    desc: "Write solutions inside a premium <span class=\"text-cyan-400 font-bold\">Monaco Editor</span> while reviewing detailed problem definitions, constraints, and hints side-by-side in a unified workspace layout.",
    img: "/ss-1-ide-with-prob-desc.png",
    badge: "IDE_WORKSPACE",
  },
  {
    title: "Isolated <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold\">RCE Sandbox Engine</span>",
    desc: "Secure Docker-isolated runners for JS, Python, C++, Java & C with streaming <span class=\"text-cyan-400 font-bold\">execution telemetry</span> and runtime diagnostics.",
    img: "/ss-custom-inp.png",
    badge: "RCE_ENGINE",
  },
  {
    title: "Precise <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold\">Telemetry Verification</span>",
    desc: "Execute complete test suites inside secure sandboxes, receiving detailed color-coded status badges, <span class=\"text-cyan-400 font-bold\">runtimes</span>, and expected output comparisons.",
    img: "/ss-dsa-que-with-desc-test-cases.png",
    badge: "TELEMETRY",
  },
  {
    title: "Real-time <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold\">1v1 Battle Arena</span>",
    desc: "Live WebSocket matchmaking with instant winner validation, post-match code diff reviews, and <span class=\"text-cyan-400 font-bold\">persistent session timers</span>.",
    img: "/ss-localfile.png",
    badge: "BATTLE_ARENA",
  },
];

// ─────────────────────────────────────────────
// COMPLETED SYSTEMS (BENTO DATA)
// ─────────────────────────────────────────────

const completedSystems = [
  {
    icon: Terminal,
    title: "Sandboxed RCE Engine",
    desc: "Isolated Docker runners for JS, Py, C++, Java & C with streaming telemetry.",
    colSpan: "md:col-span-2",
    theme: "border-r-4 border-b-4 border-r-emerald-500/60 border-b-emerald-500/60",
    badge: "text-emerald-300 bg-emerald-950/70 border-emerald-500/40",
    accentIcon: Cpu,
    accentColor: "text-emerald-400",
  },
  {
    icon: Swords,
    title: "1v1 PvP Battles",
    desc: "Real-time 1v1 matchmaking with instant winner validation.",
    colSpan: "md:col-span-1",
    theme: "border-l-4 border-b-4 border-l-rose-500/60 border-b-rose-500/60",
    badge: "text-rose-300 bg-rose-950/70 border-rose-500/40",
    accentIcon: Zap,
    accentColor: "text-rose-400",
  },
  {
    icon: Users,
    title: "Custom Room Lobbies",
    desc: "Private/public rooms with password protection and custom timers.",
    colSpan: "md:col-span-1",
    theme: "border-t-4 border-r-4 border-t-purple-500/60 border-r-purple-500/60",
    badge: "text-purple-300 bg-purple-950/70 border-purple-500/40",
    accentIcon: Shield,
    accentColor: "text-purple-400",
  },
  {
    icon: BookOpen,
    title: "Battle Code Reviewer",
    desc: "Post-match side-by-side code diff analysis drawer.",
    colSpan: "md:col-span-1",
    theme: "border-r-4 border-b-4 border-r-amber-500/60 border-b-amber-500/60",
    badge: "text-amber-300 bg-amber-950/70 border-amber-500/40",
    accentIcon: Code2,
    accentColor: "text-amber-400",
  },
  {
    icon: Database,
    title: "Algorithm Databank",
    desc: "Searchable problem repository with hidden test cases.",
    colSpan: "md:col-span-1",
    theme: "border-l-4 border-b-4 border-l-indigo-500/60 border-b-indigo-500/60",
    badge: "text-indigo-300 bg-indigo-950/70 border-indigo-500/40",
    accentIcon: Database,
    accentColor: "text-indigo-400",
  },
  {
    icon: LayoutDashboard,
    title: "Command Center & Time Sync",
    desc: "Centralized dossier with socket-persisted match timers across page refreshes.",
    colSpan: "md:col-span-2",
    theme: "border-t-4 border-l-4 border-t-cyan-500/60 border-l-cyan-500/60",
    badge: "text-cyan-300 bg-cyan-950/70 border-cyan-500/40",
    accentIcon: Clock,
    accentColor: "text-cyan-400",
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
    theme: "border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60",
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
    theme: "border-l-4 border-b-4 border-l-emerald-500/60 border-b-emerald-500/60",
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
    theme: "border-t-4 border-r-4 border-t-amber-500/60 border-r-amber-500/60",
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
    theme: "border-r-4 border-b-4 border-r-purple-500/60 border-b-purple-500/60",
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
    theme: "border-l-4 border-b-4 border-l-rose-500/60 border-b-rose-500/60",
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
    theme: "border-t-4 border-l-4 border-t-sky-500/60 border-l-sky-500/60",
    badge: "text-sky-300 bg-sky-950/80 border-sky-500/40",
    barColor: "from-sky-600 to-sky-400",
  },
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const About = () => {
  return (
    <div className="relative min-h-screen bg-[#02040a] font-mono text-slate-200 overflow-x-hidden">
      {/* Global dot-grid background texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] -z-10" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/8 blur-[140px] pointer-events-none -z-10" />

      {/* ── SECTION 1: HERO HEADER ─────────────────────────────── */}
      <section className="min-h-[100vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 py-24 border-b border-white/10">
        <div className="max-w-6xl w-full mx-auto flex flex-col items-center">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>SYS // ARCHITECTURE BENTO MATRIX</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4 uppercase">
            HIGH PERFORMANCE<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400">
              COMPUTATIONAL ARENA
            </span>
          </h1>

          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-10">
            Isolated RCE execution · Real-time 1v1 WebSocket battles · Open-source pipeline
          </p>

          {/* Stats Bento Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
            {[
              { label: "LIVE SYSTEMS", val: "9 OPERATIONAL", borderClass: "border-r-4 border-b-4 border-r-emerald-500/60 border-b-emerald-500/60", color: "text-emerald-400" },
              { label: "PIPELINE",     val: "6 UPCOMING",    borderClass: "border-l-4 border-b-4 border-l-amber-500/60 border-b-amber-500/60",   color: "text-amber-400" },
              { label: "RUNTIMES",     val: "5 LANGUAGES",   borderClass: "border-t-4 border-r-4 border-t-cyan-500/60 border-r-cyan-500/60",     color: "text-cyan-400" },
              { label: "ECOSYSTEM",    val: "100% OPEN",     borderClass: "border-t-4 border-l-4 border-t-purple-500/60 border-l-purple-500/60", color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className={`rounded-none border border-white/20 bg-[#06080e] px-3 py-3 relative overflow-hidden ${s.borderClass}`}>
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
                <span className="block text-[10px] text-slate-400 tracking-widest font-bold uppercase mb-1">{s.label}</span>
                <span className={`block text-sm font-extrabold tracking-wider ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: FOUNDATION & REPOSITORIES ─────────────── */}
      <section className="min-h-[100vh] flex flex-col justify-center items-center px-4 sm:px-6 py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-6xl w-full mx-auto">
          {/* Section Header */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>01 // FOUNDATION & REPOSITORIES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
              Architecture &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400">Open Source</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-xl">
              The engineering foundation behind BRACE RCE — built in the open.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Creator Card */}
            <div className="md:col-span-2 relative rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-6 flex flex-col justify-between gap-4 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-300">
              <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-none border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-300">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider">// CREATOR & ARCHITECTURE</h3>
                    <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">BY DEV SHARMA</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-cyan-300 border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 tracking-widest uppercase shrink-0">
                  PROD DEPLOYED
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed relative z-10">
                Designed to merge isolated execution environments with real-time socket multiplayer battles, offering instant feedback and post-match code reviews.
              </p>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold relative z-10">
                <span>STACK: REACT 19 · EXPRESS 5 · PRISMA · SOCKET.IO</span>
                <span className="text-cyan-400">v2.4.0 ONLINE</span>
              </div>
            </div>

            {/* Open Source Card */}
            <div className="md:col-span-1 relative rounded-none border border-white/20 border-l-4 border-b-4 border-l-rose-500/60 border-b-rose-500/60 bg-[#06080e] p-6 flex flex-col justify-between gap-4 hover:border-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.12)] transition-all duration-300">
              <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-none border border-rose-500/40 bg-rose-950/40 flex items-center justify-center text-rose-300">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">// OPEN SOURCE</h3>
                  <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase">GITHUB REPOSITORIES</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed relative z-10">
                100% open-source compiler engine & DSA problem databank repositories.
              </p>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/10 relative z-10">
                <a
                  href="https://github.com/Devsharma08/ONLINE_IDE"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-none border border-rose-500/40 hover:border-rose-300 bg-rose-950/40 text-rose-300 hover:text-white font-extrabold text-xs uppercase tracking-widest transition-all text-center"
                >
                  [ ENGINE REPOSITORY ]
                </a>
                <a
                  href="https://github.com/Devsharma08/DSA-LEETCODE"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-none border border-rose-500/40 hover:border-rose-300 bg-rose-950/40 text-rose-300 hover:text-white font-extrabold text-xs uppercase tracking-widest transition-all text-center"
                >
                  [ DSA DATA REPOSITORY ]
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: OPERATIONAL PLATFORM SYSTEMS ──────────── */}
      <section className="min-h-[100vh] flex flex-col justify-center items-center px-4 sm:px-6 py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-6xl w-full mx-auto">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>02 // OPERATIONAL PLATFORM SYSTEMS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">{completedSystems.length} Systems</span> Deployed
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-xl">
              Live, battle-tested subsystems powering the BRACE RCE arena.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completedSystems.map((sys) => {
              const Icon = sys.icon;
              const Accent = sys.accentIcon;
              return (
                <div
                  key={sys.title}
                  className={`group relative rounded-none border border-white/20 bg-[#06080e] p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] ${sys.colSpan} ${sys.theme}`}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-none border border-white/10 bg-black/60 flex items-center justify-center text-white shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-extrabold text-sm text-white uppercase tracking-wide">{sys.title}</h4>
                    </div>
                    <span className={`text-[9px] px-2.5 py-1 rounded-none border font-extrabold tracking-widest uppercase shrink-0 ${sys.badge}`}>
                      ACTIVE
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed relative z-10">{sys.desc}</p>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold relative z-10">
                    <span className={`flex items-center gap-1.5 ${sys.accentColor}`}>
                      <Accent className="w-3.5 h-3.5 opacity-70" /> FEATURE DEPLOYED
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: DEVELOPMENT ROADMAP ───────────────────── */}
      <section className="min-h-[100vh] flex flex-col justify-center items-center px-4 sm:px-6 py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-6xl w-full mx-auto">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>03 // DEVELOPMENT ROADMAP</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400">{roadmapItems.length} Features</span> In Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-xl">
              Upcoming systems currently in design, prototyping, or active development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roadmapItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`group relative rounded-none border border-white/20 bg-[#06080e] p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-[0_0_25px_rgba(6,182,212,0.10)] overflow-hidden ${item.colSpan} ${item.theme}`}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-none border border-white/10 bg-black/60 flex items-center justify-center text-white shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-extrabold text-sm text-white uppercase tracking-wide">{item.title}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400 tracking-widest border border-white/10 bg-black/40 px-2 py-0.5 shrink-0">
                      {item.version}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed relative z-10">{item.desc}</p>

                  <div className="space-y-2 pt-2 border-t border-white/10 relative z-10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`px-2.5 py-0.5 rounded-none border text-[10px] tracking-widest ${item.badge}`}>
                        {item.status}
                      </span>
                      <span className="text-slate-300 font-mono">{item.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-black/60 border border-white/10 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.barColor} transition-all duration-1000`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: CONTRIBUTE CTA ─────────────────────────── */}
      <section className="min-h-[60vh] flex flex-col justify-center items-center px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-6xl w-full mx-auto">
          <div className="relative rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-8 sm:p-12">
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute top-20 right-20 w-64 h-64 bg-cyan-500/5 blur-[80px] pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-none border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 shrink-0">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400 font-bold tracking-widest uppercase mb-2">
                    <span>SYS // OPEN SOURCE COMMUNITY</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wider mb-2">// CONTRIBUTE TO BRACE_RCE</h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-xl">
                    Contribute container runtimes, new languages, algorithm test cases, and UI features on GitHub.
                  </p>
                </div>
              </div>
              <a
                href="https://github.com/Devsharma08/ONLINE_IDE"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2.5 rounded-none border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-950/70 hover:border-cyan-400 py-3.5 px-6 text-xs uppercase tracking-widest text-cyan-200 hover:text-white font-extrabold transition-all shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                JOIN CONTRIBUTION NETWORK
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
