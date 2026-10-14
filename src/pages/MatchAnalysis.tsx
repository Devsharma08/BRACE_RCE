import type { FC } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Clock3, Code2, GitCompareArrows, Target, Trophy, X } from "lucide-react";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";

type AnalysisMode = "1v1" | "multiplayer" | "single"
type Attempt = { who: string; time: string; attempt: string; status: "PASSED" | "FAILED"; cases: string; runtime: string; mine?: boolean }

const attemptsByMode: Record<AnalysisMode, Attempt[]> = {
  "1v1": [
    { who: "You", time: "09:42:18", attempt: "01", status: "PASSED", cases: "18 / 18", runtime: "42 ms", mine: true },
    { who: "rhea", time: "09:41:51", attempt: "03", status: "FAILED", cases: "12 / 18", runtime: "—", mine: false },
    { who: "You", time: "09:40:06", attempt: "00", status: "FAILED", cases: "07 / 18", runtime: "—", mine: true },
  ],
  multiplayer: [
    { who: "You", time: "09:42:18", attempt: "01", status: "PASSED", cases: "18 / 18", runtime: "42 ms", mine: true },
    { who: "mika", time: "09:41:51", attempt: "02", status: "PASSED", cases: "18 / 18", runtime: "49 ms" },
    { who: "rhea", time: "09:40:06", attempt: "03", status: "FAILED", cases: "12 / 18", runtime: "—" },
  ],
  single: [
    { who: "You", time: "09:42:18", attempt: "01", status: "PASSED", cases: "18 / 18", runtime: "42 ms", mine: true },
    { who: "You", time: "09:40:06", attempt: "00", status: "FAILED", cases: "07 / 18", runtime: "—", mine: true },
  ],
}

/**
 * Match analysis — client component (react-router stack).
 *
 * Layout (large screens):
 *   header + stat tiles
 *   -> performance chart sits SIDE-BY-SIDE with the head-to-head table
 *   -> code review panel sits at the BOTTOM (last)
 */
const MatchAnalysis: FC = () => {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: match, isLoading, isError } = useQuery<any>({
    queryKey: ["match-analysis", matchId],
    queryFn: async () => {
      const res = await api.get(`/profile/matches/${matchId}`)
      return res.data.match as any
    },
    enabled: Boolean(matchId),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-subtle">
          Loading match telemetry…
        </p>
      </div>
    )
  }

  if (isError || !match) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="max-w-md border border-accent-danger/30 bg-accent-danger/5 p-6">
          <AlertTriangle className="mx-auto h-5 w-5 text-accent-danger" />
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-accent-danger">
            Match not found
          </p>
          <p className="mt-2 font-sans text-[11px] text-subtle">
            This battle may have been pruned, or it belongs to another account.
          </p>
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent-primary hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to profile
        </Link>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-6 font-mono text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/profile" className="mb-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-cyan-300"><ArrowLeft size={14} /> Back to profile</Link>
        <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0f16] shadow-[0_24px_80px_rgba(0,0,0,.2)]">
          <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.045] via-transparent to-cyan-300/[0.035] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-6"><div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-lg border border-lime-300/25 bg-lime-300/[0.05] px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-lime-300"><Trophy size={12} /> Victory</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-widest text-slate-500">1v1 match</span></div><p className="mt-6 text-[9px] uppercase tracking-[0.24em] text-cyan-300">Post-battle analysis / 001</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">Two Sum</h1><div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest"><span className="rounded-md bg-white/[0.06] px-2 py-1 text-slate-400">#001</span><span className="rounded-md bg-amber-300/[0.08] px-2 py-1 text-amber-300">Easy</span><span className="rounded-md bg-cyan-300/[0.08] px-2 py-1 text-cyan-300">Arrays</span><span className="px-1 text-slate-600">14 Oct 2026</span></div></div><div className="text-left sm:text-right"><p className="text-[9px] uppercase tracking-widest text-slate-600">Opponent</p><p className="mt-2 text-lg font-bold text-rose-300">rhea</p><p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">486 pts / defeated</p></div></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat icon={Target} label="Score" value="920" tone="text-cyan-300" /><Stat icon={Clock3} label="Time" value="42s" /><Stat icon={Code2} label="Attempts" value="3" /><Stat icon={Check} label="Solved" value="2" tone="text-lime-300" /></div></div>
        </section>
        {/* Chart sits beside the head-to-head table on large screens. */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.12fr_1.12fr] lg:gap-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f16] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">Performance map</p><h2 className="mt-1 text-base font-bold">Player comparison</h2><p className="mt-1 text-[10px] text-slate-500">Normalized score across solve progress.</p></div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-300" />mika</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-300" />rhea</span></div>
            </div>
            <PerformanceChart multiplayer />
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f16] p-5 sm:p-6">
            <div className="flex items-center gap-2 pb-3"><p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">Head to head</p><h2 className="mt-1 text-base font-bold">Metric comparison</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="border-b border-white/[0.07] bg-white/[0.02] text-[9px] uppercase tracking-widest text-slate-600"><tr><th className="px-5 py-3 font-normal">Metric</th><th className="px-5 py-3 font-normal text-cyan-300">You</th><th className="px-5 py-3 font-normal">Mika</th><th className="px-5 py-3 font-normal">Signal</th></tr></thead>
                <tbody className="divide-y divide-white/[0.06] text-xs"><tr><td className="px-5 py-3 text-slate-500">Runtime</td><td className="px-5 py-3 font-bold text-cyan-300">42 ms</td><td className="px-5 py-3 text-slate-300">51 ms</td><td className="px-5 py-3 text-lime-300">18% faster</td></tr><tr><td className="px-5 py-3 text-slate-500">Memory</td><td className="px-5 py-3 font-bold text-cyan-300">48.2 MB</td><td className="px-5 py-3 text-slate-300">62.8 MB</td><td className="px-5 py-3 text-lime-300">efficient</td></tr><tr><td className="px-5 py-3 text-slate-500">Test coverage</td><td className="px-5 py-3 font-bold text-cyan-300">18 / 18</td><td className="px-5 py-3 text-slate-300">12 / 18</td><td className="px-5 py-3 text-lime-300">complete</td></tr><tr><td className="px-5 py-3 text-slate-500">Attempts</td><td className="px-5 py-3 font-bold text-cyan-300">2</td><td className="px-5 py-3 text-slate-300">3</td><td className="px-5 py-3 text-slate-500">lower is better</td></tr></tbody>
              </table>
            </div>
          </div>
        </section>
        {/* Code review is the final section on every screen. */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#0a0f16] p-5 shadow-[0_20px_60px_rgba(34,211,238,.04)] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/25 bg-violet-300/[0.06] text-violet-300"><GitCompareArrows size={18} /></div>
            <div><p className="text-[9px] uppercase tracking-[0.2em] text-violet-300">Code review</p><h2 className="mt-1 text-base font-bold">Side-by-side compare</h2></div>
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-400">Compare your accepted approach with rhea&apos;s attempts, inspect runtime trade-offs, and understand where the solution diverged.</p>
          <div className="mt-6 space-y-3"><MiniMetric icon={Cpu} label="Your runtime" value="42 ms" /><MiniMetric icon={Target} label="Test coverage" value="18 / 18" /><MiniMetric icon={ArrowUpRight} label="Complexity" value="O(n)" /></div>
          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-950 transition hover:bg-white"><Code2 size={14} /> Open code review</button>
        </section>
      </div>
    </main>
  )
}

function Stat({ icon: Icon, label, value, tone = "text-white" }: { icon: typeof Target; label: string; value: string; tone?: string }) { return <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#070a0f]/80 p-3.5 transition-colors hover:border-white/15 hover:bg-white/[0.035]"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-500 transition-colors group-hover:border-cyan-300/25 group-hover:text-cyan-300"><Icon size={14} /></div><div className="min-w-0"><p className="text-[9px] uppercase tracking-widest text-slate-600">{label}</p><p className={`mt-1 text-xl font-bold leading-none ${tone}`}>{value}</p></div></div> }
function MiniMetric({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) { return <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 text-[10px]"><span className="flex items-center gap-2 text-slate-500"><Icon size={13} /> {label}</span><b className="text-white">{value}</b></div> }
function PerformanceChart({ multiplayer }: { multiplayer: boolean }) { const players = multiplayer ? [{ name: "You", color: "#67e8f9", points: "0,74 80,68 160,55 240,48 320,28 400,18" }, { name: "mika", color: "#c4b5fd", points: "0,74 80,70 160,62 240,58 320,45 400,38" }, { name: "rhea", color: "#fda4af", points: "0,74 80,72 160,76 240,68 320,70 400,64" }] : [{ name: "You", color: "#67e8f9", points: "0,74 80,66 160,52 240,41 320,28 400,18" }, { name: "baseline", color: "#64748b", points: "0,74 80,70 160,66 240,62 320,58 400,54" }]; return <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-[#070a0f] p-3"><svg viewBox="0 0 400 90" className="h-40 w-full" role="img" aria-label="Player performance comparison chart"><path d="M0 18H400M0 46H400M0 74H400" stroke="white" strokeOpacity=".07" strokeDasharray="3 5" />{players.map((player) => <polyline key={player.name} points={player.points} fill="none" stroke={player.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}<g fill="#64748b" fontSize="7" fontFamily="monospace"><text x="0" y="88">09:40:06</text><text x="170" y="88">09:41:51</text><text x="352" y="88">09:42:18</text></g></svg></div> }

export default MatchAnalysis
