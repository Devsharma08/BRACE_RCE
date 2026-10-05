'use client'

import { useEffect, useState } from 'react'
import type { FC } from 'react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Home hero — the "signal" hero: a headline whose words cycle through the three
 * brand accents, a live-looking waveform, and a four-cell readout strip.
 *
 * IMPORTANT: this is SECTION 1 of the home page, not a standalone page. It
 * deliberately does NOT render a <main> or a <nav>:
 *  - Layout already renders the app header, so a second nav here produced a
 *    duplicate bar.
 *  - The height is auto, not `min-h-screen`, because as a block above
 *    HomeMetricsStrip / WorkspaceTeaser / QuickNavCards / WorkspaceDirectory /
 *    CommunitySupport a forced viewport height clipped everything below it.
 *
 * The `signalColor` keyframes live in index.css rather than a <style jsx> block:
 * styled-jsx is Next.js syntax and this app is Vite, where it is emitted as
 * inert markup and the animation silently never runs.
 *
 * Colours come from the app's accent tokens (cyan / lime / violet), so the hero
 * tracks the theme instead of hard-coding hex values.
 */
const words = [
  { text: 'Compile', tone: 'cyan' },
  { text: 'Compete', tone: 'lime' },
  { text: 'Conquer', tone: 'violet' },
] as const

export const BracePixelHero: FC = () => {
  // One-shot boot: the waveform fades in once per tab session rather than on
  // every re-render, so returning to the home page does not replay the animation.
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 850)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden bg-base text-fg selection:bg-accent-primary selection:text-ink"
    >
      {/* Ambient glow + grid backdrop, contained by the wrapper's overflow-hidden. */}
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.05)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-accent-primary/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-[28%] h-px bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent" />
      <div className="pointer-events-none absolute right-[8%] top-[22%] hidden font-mono text-[9px] uppercase tracking-[0.35em] text-faint lg:block [writing-mode:vertical-rl]">
        signal / structure / runtime
      </div>

      {/* Fills the space below the 58px sticky header and centres its content, so the
          whole hero sits in one screen without the page scrolling.

          Uses `min-h-[calc(100svh-58px)]` rather than `min-h-screen`: the app
          header is a real 58px sticky bar, so 100vh would push the bottom of the
          hero (the CTAs) under the fold on every load.

          `svh` is the small-viewport height, which is the correct unit here —
          on mobile browsers `vh` does not account for the collapsing URL bar, so
          a `vh`-based hero overflows the visible area and its CTAs end up
          off-screen. The section is NOT `overflow-hidden` for layout purposes
          (only the backdrop layers are), so nothing below it can be clipped. */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-58px)] max-w-6xl flex-col items-center justify-center px-5 py-10 text-center sm:py-14 lg:px-8">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em] text-accent-primary">
          <span className="h-px w-8 bg-accent-primary sm:w-12" />
          <span className="text-faint">/</span>
          <span className="hidden sm:inline">RCE // field notes</span>
          <span className="sm:hidden">RCE</span>
          <span className="rounded-full border border-accent-success/25 bg-accent-success/[0.06] px-2 py-1 text-[8px] tracking-widest text-accent-success">
            READY
          </span>
          <span className="h-px w-8 bg-accent-primary sm:w-12" />
        </div>

        {/* Headline — each word cycles colour on its own offset delay. */}
        <h1 className="mx-auto mt-8 max-w-4xl font-mono text-[clamp(2.2rem,7vw,6.8rem)] font-bold leading-[.95] tracking-[-.07em] sm:mt-10">
          {words.map(({ text }) => (
            <span
              key={text}
              className="signal-word inline-block px-1 transition duration-500 hover:-translate-y-2 hover:scale-[1.03] sm:px-2"
            >
              {text}
              <span className="text-fg/30">.</span>{' '}
            </span>
          ))}
        </h1>

        {/* Description */}
        <p className="mx-auto mt-9 max-w-xl text-[15px] leading-7 text-subtle sm:mt-10 sm:text-lg sm:leading-8">
          A focused coding workspace for learning data structures, solving indexed
          problems, and validating your reasoning against real test cases.
        </p>

        {/* Waveform monitor — decorative, so hidden from assistive tech. */}
        <div
          aria-hidden="true"
          className="relative mx-auto mt-10 h-20 w-full max-w-2xl overflow-hidden rounded-panel border border-white/10 bg-white/[0.025] text-accent-primary"
        >
          <svg viewBox="0 0 720 80" className="h-full w-full" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="signal-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop stopColor="var(--accent-primary)" stopOpacity="0" />
                <stop offset=".2" stopColor="var(--accent-primary)" />
                <stop offset=".5" stopColor="var(--accent-success)" />
                <stop offset=".8" stopColor="var(--accent-violet)" />
                <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 40h100l18-22 24 44 18-30 22 8 18-18 18 18h80l22-9 18 17 22-27 20 38 20-29 20 10 22-20 20 18h100l18-15 18 30 18-35 22 20 20-12 20 12h100"
              stroke="url(#signal-gradient)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M0 40h720" stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 8" />
            <circle cx="360" cy="40" r="4" fill="var(--accent-success)">
              <animate attributeName="r" values="3;7;3" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div className="absolute inset-x-4 top-3 flex justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
            <span>signal / live</span>
            <span>rce monitor</span>
          </div>
          <div className="absolute inset-x-4 bottom-3 flex justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
            <span>00:00:24</span>
            <span className={booted ? 'text-accent-success/70' : 'text-faint'}>
              {booted ? 'stable' : 'syncing'}
            </span>
          </div>
        </div>

        {/* CTAs — Link, not <a>: these are in-app routes and a full page load
            would drop the SPA state and replay the boot animation. */}
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/problems"
            className="group inline-flex items-center justify-center gap-3 bg-accent-primary px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-ink transition hover:bg-fg"
          >
            Enter problems
            <ArrowDown size={14} className="transition group-hover:translate-y-1" />
          </Link>
          <Link
            to="/terminal"
            className="inline-flex items-center justify-center gap-2 border border-white/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-subtle transition hover:border-accent-primary/50 hover:text-accent-primary"
          >
            Open workspace
            <ArrowUpRight size={14} />
          </Link>
        </div>

      </div>
    </section>
  )
}

/** Kept for callers that imported the old name. */
export const BraceRcePixelArt = BracePixelHero

export default BracePixelHero
