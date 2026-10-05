'use client'

import type { FC } from 'react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Home hero — the "signal" hero: the three-word headline over a heartbeat trace
 * that carries the brand colour cycle.
 *
 * IMPORTANT: this is SECTION 1 of the home page, not a standalone page. It
 * deliberately does NOT render a <main> or a <nav>:
 *  - Layout already renders the app header, so a second nav here produced a
 *    duplicate bar.
 *  - The height is bounded by the space below the header rather than forced to
 *    100vh, because as a block above HomeMetricsStrip / WorkspaceTeaser /
 *    QuickNavCards / WorkspaceDirectory / CommunitySupport a forced viewport
 *    height clipped everything below it.
 *
 * The heartbeat sits BEHIND the headline and animates; the words themselves are
 * static. The `signalColor` and `heartbeatDrift` keyframes live in index.css
 * rather than a <style jsx> block: styled-jsx is Next.js syntax and this app is
 * Vite, where it is emitted as inert markup and the animation silently never
 * runs.
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

        {/* Headline + heartbeat.

            The heartbeat trace is centred BEHIND the three words and carries the
            colour cycle that used to animate the text itself. The words are now
            static, so the type stays legible and the trace reads as the signal
            passing through it.

            Structure matters here: the wrapper is `relative` and stacks the svg
            (absolute, z-0) under the h1 (relative, z-10). Without the z-index the
            svg paints over the glyphs and the headline becomes unreadable. */}
        <div className="relative mx-auto mt-8 w-full max-w-4xl sm:mt-10">
          {/* The drift keyframe animates `transform`, which would REPLACE the
            -translate-x/y that centres this element — so centring is done with
            `inset` + `margin:auto` instead, leaving `transform` free for the
            animation. Two transforms on one element cannot coexist in CSS. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 720 120"
            preserveAspectRatio="none"
            className="signal-pulse signal-drift pointer-events-none absolute inset-y-0 left-0 right-0 z-0 mx-auto h-[135%] w-[112%] opacity-70"
            fill="none"
          >
            {/* One beat of the trace, reused across the width. Defining it once
                keeps the path readable; a single long path with six repeated
                humps is unreadable and unmaintainable. */}
            <defs>
              <path
                id="heartbeat-beat"
                d="M0 60h44l14-26 16 52 12-38 14 12h58l14-8 12 14 16-30 16 44 14-32 16 12h58l16-12 12 26 12-32 16 18 12-12h60"
              />
            </defs>
            <g stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round">
              {[0, 144, 288, 432, 576].map((x) => (
                <use key={x} href="#heartbeat-beat" x={x} />
              ))}
            </g>
            {/* Baseline ticks keep the trace legible where it crosses a glyph. */}
            <path d="M0 60h720" stroke="currentColor" strokeOpacity=".10" strokeDasharray="3 9" />
          </svg>

          <h1 className="relative z-10 font-mono text-[clamp(2.2rem,7vw,6.8rem)] font-bold leading-[.95] tracking-[-.07em]">
            {words.map(({ text }) => (
              <span
                key={text}
                className="inline-block px-1 transition duration-500 hover:-translate-y-2 hover:scale-[1.03] sm:px-2"
              >
                {text}
                <span className="text-fg/30">.</span>{' '}
              </span>
            ))}
          </h1>
        </div>

        {/* Description */}
        <p className="mx-auto mt-9 max-w-xl text-[15px] leading-7 text-subtle sm:mt-10 sm:text-lg sm:leading-8">
          A focused coding workspace for learning data structures, solving indexed
          problems, and validating your reasoning against real test cases.
        </p>

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
