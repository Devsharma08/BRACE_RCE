'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { ArrowDown, ArrowUpRight, Terminal } from 'lucide-react'

const word = [
  [1,1,1,1,1,1,0,0, 0,1,1,1,1,1,0,0, 0,0,1,1,1,1,0,0, 0,0,1,1,1,1,1,0, 0,1,1,1,1,1,1,1],
  [1,1,0,0,0,1,1,0, 0,1,1,0,0,0,1,0, 0,1,1,0,0,1,1,0, 0,1,1,0,0,0,1,1, 0,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,1,1, 0,1,1,0,0,0,1,0, 0,1,1,0,0,1,1,0, 1,1,0,0,0,0,0,0, 0,1,1,0,0,0,0,0],
  [1,1,1,1,1,1,0,0, 0,1,1,1,1,1,1,0, 0,1,1,1,1,1,1,1, 1,1,0,0,0,0,0,0, 0,1,1,1,1,1,1,1],
  [1,1,0,0,0,1,1,0, 0,1,1,0,0,1,1,0, 0,1,1,0,0,1,1,0, 1,1,0,0,0,0,0,0, 0,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,1,1, 0,1,1,0,0,0,1,0, 0,1,1,0,0,1,1,0, 1,1,0,0,0,0,0,0, 0,1,1,1,1,1,1,1],
  [1,1,0,0,0,0,1,1, 0,1,1,0,0,0,1,0, 0,1,1,0,0,1,1,0, 1,1,0,0,0,0,0,0, 0,1,1,0,0,0,0,0],
]

/**
 * Home hero - pixel-art "BRACE RCE" signature card beside the headline.
 *
 * IMPORTANT: this is SECTION 1 of the home page, not a standalone page. The
 * version this replaced arrived as a full-page component and was pasted in
 * verbatim, which broke the page twice over:
 *
 *  - It wrapped itself in <main className="min-h-screen overflow-hidden">. As a
 *    BLOCK sitting above HomeMetricsStrip / QuickNavCards / WorkspaceDirectory /
 *    CommunitySupport, that combination clipped everything below it:
 *    `min-h-screen` forced one viewport of height and `overflow-hidden` cut off
 *    whatever exceeded it. The hero stacks on short viewports, so the lower half
 *    of the hero - and any section below it - simply disappeared.
 *  - It rendered its own <nav>, producing a second header on top of the app
 *    Header that Layout already provides.
 *
 * So this keeps the visual and drops the page-level scaffolding: no <main>, no
 * <nav>, and no forced viewport height. The wrapper's overflow-hidden stays, but
 * only to contain the absolutely-positioned glow/grid backdrops - the element is
 * now auto-height, so nothing inside it can be clipped.
 */
export const BraceRcePixelArt: FC = () => {
  const [booted, setBooted] = useState(false)

  const pixels = useMemo(
    () =>
      word.flatMap((row, y) =>
        row.map((lit, x) => ({
          lit,
          delay: `${(x * 18 + y * 90 + Math.random() * 220).toFixed(0)}ms`,
        })),
      ),
    [],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 850)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    // Auto-height on purpose - see the note above about min-h-screen clipping.
    <section
      id="top"
      className="relative w-full overflow-hidden bg-[#05070b] text-white selection:bg-cyan-300 selection:text-slate-950"
    >
      {/* Ambient glow + grid, contained by the wrapper's overflow-hidden. */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-cyan-400/[0.045] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.05)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:gap-10 lg:px-8 lg:py-20">
        {/* Headline */}
        <div>
          <div className="mb-7 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em] text-cyan-300">
            <span className="h-px w-10 bg-cyan-300" />
            Mission // RCE online
            <span className="rounded-full border border-lime-300/25 bg-lime-300/[0.06] px-2 py-1 text-[8px] tracking-widest text-lime-300">
              SYSTEM READY
            </span>
          </div>

          <h1 className="group max-w-[9ch] font-mono text-[clamp(2.9rem,10vw,8.5rem)] font-bold leading-[.84] tracking-[-.09em]">
            <span className="inline-block bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent transition duration-500 group-hover:from-cyan-300 group-hover:via-white group-hover:to-lime-300 group-hover:drop-shadow-[0_0_18px_rgba(103,232,249,.35)]">
              COMPILE.
              <br />
              <span className="text-cyan-300">COMPETE.</span>
              <br />
              <span className="text-slate-500">CONQUER.</span>
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
            A high-performance coding battlefield for operatives who write,
            execute, and validate under pressure.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[.18em]">
            <a
              href="/problems"
              className="group flex items-center gap-3 bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-white"
            >
              Enter system
              <ArrowDown size={14} className="transition group-hover:translate-y-1" />
            </a>
            <a
              href="/terminal"
              className="flex items-center gap-2 border border-white/10 px-5 py-3 text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-300"
            >
              Open workspace
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-white/10 pt-4 font-mono text-[9px] uppercase tracking-widest text-slate-600">
            <span><b className="text-slate-300">01</b> realtime</span>
            <span><b className="text-slate-300">02</b> polyglot</span>
            <span><b className="text-slate-300">03</b> sandboxed</span>
          </div>
        </div>

        {/* Pixel-art signature card */}
        <div className="relative">
          <div className="absolute -inset-10 bg-cyan-400/10 blur-3xl" />
          <div className="relative w-full min-w-0">
            <div className="relative w-full min-w-0 rounded-[28px] border border-cyan-300/20 bg-[#090d14]/90 p-4 shadow-2xl shadow-cyan-950/30 sm:p-5">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-2">
                  <Terminal size={13} className="text-cyan-300" />
                  brace_signature.bin
                </span>
                <span className="text-lime-300">{booted ? 'verified' : 'booting'}</span>
              </div>

              {/* Canvas trimmed so the BRACE word art reads as a compact
                  signature block rather than a full-bleed panel. Cells are
                  aspect-square on a fixed column count, so the art scales with
                  the width and can never overflow the card. */}
              <div className="flex min-h-[150px] items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-[#05070b] p-3 sm:min-h-[200px] sm:p-5">
                <div
                  className="grid w-full max-w-[430px] gap-[2px] sm:gap-[3px]"
                  style={{ gridTemplateColumns: `repeat(${word[0]!.length}, minmax(0, 1fr))` }}
                >
                  {pixels.map((pixel, index) => (
                    <span
                      key={index}
                      className={`aspect-square rounded-[2px] transition-all duration-500 ${
                        pixel.lit
                          ? booted
                            ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.75)]'
                            : 'bg-cyan-300/10'
                          : 'bg-transparent'
                      }`}
                      style={{ transitionDelay: pixel.delay }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                <span>signature: BRACE RCE</span>
                <span className="text-lime-300">● ready to deploy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BraceRcePixelArt
