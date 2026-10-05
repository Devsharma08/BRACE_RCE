'use client'

import type { FC } from 'react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMediaQuery } from '../../../hooks/useMediaQuery'

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
/**
 * One gradient per word (`.signal-word--*` in index.css): a diagonal for
 * Compile, a vertical for Compete, a radial for Conquer — three completely
 * different styles, none of them animated.
 */
const words = [
  { text: 'Compile', tone: 'signal-word--compile' },
  { text: 'Compete', tone: 'signal-word--compete' },
  { text: 'Conquer', tone: 'signal-word--conquer' },
] as const

export const BracePixelHero: FC = () => {
  // Only the background SVG animates. Its colour travel is an SVG
  // <animateTransform>, which CSS cannot disable — prefers-reduced-motion has
  // to remove the element from the DOM, not just restyle it. The headline text
  // never animates, so it needs no gating.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden bg-base text-fg selection:bg-accent-primary selection:text-ink"
    >
      {/* Ambient glow + grid backdrop, contained by the wrapper's overflow-hidden. */}
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.05)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-accent-primary/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-[28%] h-px bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent" />
        {/* Three separate side markers, one per hero concept, split across the
            gutters: signal top-right, structure centred left, runtime
            bottom-right. Large screens only — below lg the content fills the
            width and there is no gutter to sit in. */}
        <div className="pointer-events-none absolute right-5 top-[24%] hidden font-mono text-[9px] uppercase tracking-[0.35em] text-faint lg:block [writing-mode:vertical-rl]">
          signal
        </div>
        <div className="pointer-events-none absolute left-5 top-1/2 hidden -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.35em] text-faint lg:block [writing-mode:vertical-rl]">
          structure
        </div>
        <div className="pointer-events-none absolute right-5 bottom-[24%] hidden font-mono text-[9px] uppercase tracking-[0.35em] text-faint lg:block [writing-mode:vertical-rl]">
          runtime
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
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-58px)] max-w-6xl flex-col items-center justify-center px-5 py-8 text-center sm:py-10 lg:px-8">
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

        {/* Headline + trace.

            The trace is a single continuous line drawn BEHIND the words with no
            border or card around it. Division of labour: the words are STATIC
            (each with its own fixed gradient via `.signal-word`, never
            animated, so they stay on screen), and only this background svg
            moves — its gradient slides left to right so the colour travels
            along the line.

            Stacking: wrapper `relative`, svg absolute at z-0, heading relative
            at z-10. Reversed, the line paints over the glyphs. */}
        <div className="relative mx-auto mt-6 w-full max-w-5xl sm:mt-7">
          {/* The drift keyframe animates `transform`, which would REPLACE the
              translate used to centre this element. Centring uses inset +
              margin:auto instead, leaving transform free for the animation. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 160"
            preserveAspectRatio="none"
            className={`signal-drift pointer-events-none absolute inset-x-2 top-[18%] bottom-[18%] z-0 m-auto h-auto w-[calc(100%-1rem)] opacity-70 ${
              reducedMotion ? 'signal-trace-static' : ''
            }`}
            fill="none"
          >
            {/* The gradient itself is fixed; <animateTransform> below slides
                it, which is what makes the colour appear to travel. */}
            <defs>
              <linearGradient id="trace-travel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--accent-primary)" stopOpacity="0" />
                <stop offset=".25" stopColor="var(--accent-primary)" />
                <stop offset=".5" stopColor="var(--accent-success)" />
                <stop offset=".75" stopColor="var(--accent-violet)" />
                <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0" />
                {/* THE animation: slides the gradient left -> right so colour
                    travels along the line instead of the whole stroke changing
                    at once. Omitted under prefers-reduced-motion. */}
                {!reducedMotion && (
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    values="-1 0; 0 0; 1 0; 0 0"
                    keyTimes="0; .25; .5; .75"
                    dur="9s"
                    repeatCount="indefinite"
                  />
                )}
              </linearGradient>
            </defs>
            {/* One unbroken line across the full width: flat lead-in, a single
                pulse, flat lead-out. A dashed or repeating trace read as a row
                of separate marks rather than one continuous signal. */}
            <path
              d="M0 80h250c40 0 60-10 90-10s60 60 100 60 70-100 120-100 80 50 130 50h310"
              stroke="url(#trace-travel)"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0 80h250c40 0 60-10 90-10s60 60 100 60 70-100 120-100 80 50 130 50h310"
              stroke="currentColor"
              strokeOpacity=".07"
              strokeWidth="7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <h1 className="relative z-10 font-mono text-[clamp(1.9rem,6.2vw,5.4rem)] font-bold leading-[.92] tracking-[-.06em]">
            {words.map(({ text, tone }) => (
              <span
                key={text}
                className={`signal-word ${tone} inline-block px-1 sm:px-2`}
              >
                {text}
                <span className="text-fg/30">.</span>{' '}
              </span>
            ))}
          </h1>
        </div>

        {/* Description */}
        <p className="mx-auto mt-7 max-w-xl text-[15px] leading-7 text-subtle sm:mt-8 sm:text-lg sm:leading-8">
          A focused coding workspace for learning data structures, solving indexed
          problems, and validating your reasoning against real test cases.
        </p>

        {/* CTAs — Link, not <a>: these are in-app routes and a full page load
            would drop the SPA state and replay the boot animation. */}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
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
