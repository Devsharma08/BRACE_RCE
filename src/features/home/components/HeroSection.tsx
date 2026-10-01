/**
 * Home hero — lighter, calmer composition.
 *
 * Rebuilds the BRACE RCE signature as a two-column hero (copy + signature card)
 * plus a protocol trio, using the project's design tokens only (no hardcoded
 * colours — every surface/accent resolves through index.css custom properties).
 *
 * "Stable" specifically means:
 *   - no `Math.random()` at render time — the boot sequence is fully
 *     deterministic, so it never re-randomises between renders/hydration;
 *   - the boot plays at most once per tab session (sessionBoot);
 *   - `prefers-reduced-motion` skips the sequence entirely;
 *   - the pointer glow runs on a single rAF loop with zero React state updates.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, CircleDot, Swords, Terminal } from 'lucide-react';
import { hasBooted, markBooted } from '../../../utils/sessionBoot';

// ─────────────────────────────────────────────────────────────────────────────
// MATRIX DEFINITIONS — 11-row × 8-col letter templates (artwork unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const LETTER_B = [
  [1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 0, 0],
];

const LETTER_R = [
  [1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 0, 1],
];

const LETTER_A = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 0, 0, 1, 1, 0],
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
];

const LETTER_C = [
  [0, 0, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 1, 1],
  [0, 0, 1, 1, 1, 1, 1, 0],
];

const LETTER_E = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

// ─────────────────────────────────────────────────────────────────────────────
// BRACE RCE 15×100 binary matrix — artwork never changes
// ─────────────────────────────────────────────────────────────────────────────

const MATRIX_DATA: number[][] = [];
MATRIX_DATA.push(new Array(100).fill(0));
MATRIX_DATA.push(new Array(100).fill(0));
for (let i = 0; i < 11; i++) {
  MATRIX_DATA.push([
    ...new Array(9).fill(0),
    ...LETTER_B[i], ...[0, 0],
    ...LETTER_R[i], ...[0, 0],
    ...LETTER_A[i], ...[0, 0],
    ...LETTER_C[i], ...[0, 0],
    ...LETTER_E[i], ...[0, 0, 0, 0, 0, 0],
    ...LETTER_R[i], ...[0, 0],
    ...LETTER_C[i], ...[0, 0],
    ...LETTER_E[i],
    ...new Array(9).fill(0),
  ]);
}
MATRIX_DATA.push(new Array(100).fill(0));
MATRIX_DATA.push(new Array(100).fill(0));

const COLS = MATRIX_DATA[0].length; // 100

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC PIXEL METADATA — fixed seed, computed once at module scope.
//
// A constant seed is what makes the boot sequence reproducible. The previous
// implementation seeded from `Date.now() ^ Math.random()`, so the sweep order
// and per-pixel jitter changed on every page load.
// ─────────────────────────────────────────────────────────────────────────────

/** xorshift32 — small, fast, deterministic. */
function seededRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

const BOOT_SEED = 0x5eed1234;

interface PixelMeta {
  delay: number;
}

const PIXEL_META: (PixelMeta | null)[][] = MATRIX_DATA.map((row, ri) =>
  row.map((lit, ci) => {
    if (!lit) return null;
    const rng = seededRng(BOOT_SEED ^ (ri * 997 + ci * 31337));
    const jitter = rng() * 90; // deterministic per-cell noise
    const sweep = (ci / (COLS - 1)) * 620; // calm left-to-right wave
    return { delay: Math.round(sweep + jitter + 160) };
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// FLAT LIT-CELL INDEX — effects iterate only lit pixels (~300), not all 1500.
// ─────────────────────────────────────────────────────────────────────────────

/** Row index per lit pixel, index-aligned with the ref matrix below. */
const LIT_FLAT: number[] = [];

const LIT_INDEX: number[][] = MATRIX_DATA.map((row, ri) =>
  row.map((lit, ci) => {
    if (!lit || !PIXEL_META[ri][ci]) return -1;
    return LIT_FLAT.push(ri) - 1;
  })
);
const LIT_COUNT = LIT_FLAT.length;

/**
 * Read the lit cells out of the grid by their `data-lit` slot index.
 * Returns an index-aligned array so the glow loop can address cells directly.
 */
function collectLitEls(grid: HTMLElement): (HTMLDivElement | null)[] {
  const out: (HTMLDivElement | null)[] = new Array(LIT_COUNT).fill(null);
  for (const el of grid.querySelectorAll<HTMLDivElement>('[data-lit]')) {
    const i = Number(el.dataset.lit);
    if (Number.isInteger(i) && i >= 0 && i < LIT_COUNT) out[i] = el;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
const PROTOCOLS = [
  {
    tag: '01 / train',
    accent: 'text-accent-primary',
    title: 'Practice deliberately.',
    body: 'Structured problems, clear feedback, measurable progress.',
  },
  {
    tag: '02 / execute',
    accent: 'text-accent-success',
    title: 'Run with signal.',
    body: 'Sandboxed execution with transparent runtime output.',
  },
  {
    tag: '03 / compete',
    accent: 'text-accent-violet',
    title: 'Battle in real time.',
    body: 'Join rooms, challenge friends, and sharpen your edge.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-shot boot flag, module-scoped.
 *
 * Deliberately NOT a ref: reading `ref.current` during render trips React 19's
 * `react-hooks/refs` rule, and a ref only buys per-instance initialisation that
 * is wrong here anyway — the flag is per *tab session* (sessionBoot), so the
 * same value must be shared by every mount of the hero.
 */
let bootAlreadyPlayedCache: boolean | null = null;
function bootAlreadyPlayedOnce(): boolean {
  if (bootAlreadyPlayedCache === null) {
    bootAlreadyPlayedCache = hasBooted('hero-boot');
    markBooted('hero-boot');
  }
  return bootAlreadyPlayedCache;
}

export const BraceRcePixelArt: React.FC = () => {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const litElsRef = React.useRef<(HTMLDivElement | null)[]>(new Array(LIT_COUNT).fill(null));

  const rafRef = React.useRef<number>(0);
  const pointerRef = React.useRef({ x: -9999, y: -9999, active: false });
  const visibleRef = React.useRef(true);
  const reducedMotionRef = React.useRef(false);

  const bootAlreadyPlayed = bootAlreadyPlayedOnce();

  // ── Reduced motion ────────────────────────────────────────────────────────
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = media.matches;
    const onChange = () => {
      reducedMotionRef.current = media.matches;
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // ── Pointer glow: one rAF loop, zero React renders ────────────────────────
  React.useEffect(() => {
    const grid = gridRef.current;
    const container = containerRef.current;
    if (!grid || !container) return;

    // A coarse pointer (touch) gains nothing from the glow, and measuring the
    // pixel centres is the expensive part, so skip it entirely.
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    /** Write styles straight to the DOM — no React state inside the loop. */
    const writePixelStyle = (i: number, filter: string) => {
      const el = litElsRef.current[i];
      if (el) el.style.filter = filter;
    };

    // Collect lit cells from the DOM once. Each cell publishes its flat slot as
    // `data-lit`, so the render phase never reads or writes a ref — which also
    // satisfies React 19's `react-hooks/refs` rule.
    litElsRef.current = collectLitEls(grid);

    let positions: ({ cx: number; cy: number } | null)[] = new Array(LIT_COUNT).fill(null);
    let bounds: DOMRect | null = null;

    const measure = () => {
      bounds = grid.getBoundingClientRect();
      if (coarse) return;
      positions = litElsRef.current.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      });
    };

    const tick = () => {
      if (reducedMotionRef.current || !visibleRef.current) {
        rafRef.current = 0;
        return;
      }
      if (!bounds) measure();

      const { x, y, active } = pointerRef.current;
      if (active && !coarse && bounds) {
        const R = 130;
        for (let i = 0; i < LIT_COUNT; i++) {
          const p = positions[i];
          if (!p) continue;
          const d = Math.hypot(p.cx - x, p.cy - y);
          const k = Math.max(0, 1 - d / R);
          writePixelStyle(i, k > 0 ? `brightness(${1 + k * 1.5})` : '');
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (!rafRef.current && !reducedMotionRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
      bounds = null; // pointer moved → pixel centres need re-measuring
      ensureLoop();
    };

    const onLeave = () => {
      pointerRef.current = { ...pointerRef.current, active: false };
      for (let i = 0; i < LIT_COUNT; i++) writePixelStyle(i, '');
    };

    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });

    // Re-measure at most once per frame on resize (was 1500 rects per event).
    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        bounds = null;
      });
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Stop all frame work while the hero is off-screen.
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          visibleRef.current = entries.some((e) => e.isIntersecting);
        },
        { rootMargin: '80px' },
      );
      observer.observe(container);
    }

    return () => {
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      observer?.disconnect();
    };
  }, []);

  // ── Boot: plays at most once per tab, never for reduced motion ────────────
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reduced motion renders the finished artwork immediately; everyone else gets
  // the CSS boot animation (which is paused by the global reduced-motion rule).
  const showPixels = bootAlreadyPlayed || prefersReduced;

  return (
    <div
      ref={containerRef}
      className="home-hero relative z-10 w-full border-b border-subtle-line bg-base text-fg select-none"
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-subtle-line px-5 py-4 sm:flex-nowrap lg:px-8">
        <Link
          to="/"
          aria-label="BRACE RCE home"
          className="flex items-center gap-3 font-mono text-sm font-bold tracking-[0.18em] transition-colors hover:text-accent-primary"
        >
          <span className="grid h-8 w-8 place-items-center border border-accent-primary/40 bg-accent-primary/10 text-accent-primary">
            <Terminal size={15} />
          </span>
          BRACE RCE
        </Link>

        <div className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-[0.2em] text-faint md:flex">
          <a href="#protocols" className="transition-colors hover:text-accent-primary">
            Protocols
          </a>
          {/* #telemetry lives on the About page, so this needs the router,
              not an in-page anchor. */}
          <Link to="/about#telemetry" className="transition-colors hover:text-accent-primary">
            Telemetry
          </Link>
          <Link to="/problems" className="transition-colors hover:text-accent-primary">
            Problem set
          </Link>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-subtle">
          <CircleDot size={12} className="text-accent-success" />
          v1.0 / live
        </div>
      </nav>

      {/* ── Hero grid ───────────────────────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8 lg:py-30">
        {/* Copy column */}
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em] text-accent-primary">
            <span className="h-px w-10 bg-accent-primary/60" />
            Mission // RCE online
          </div>

          <h1 className="max-w-[10ch] font-mono text-[clamp(2.6rem,9vw,7rem)] font-bold leading-[0.86] tracking-[-0.04em]">
            {/* Staggered diagonal: the top and bottom lines pull left, the middle
                line pushes right, so the stack reads as a stepped shape instead
                of a flat block. Transforms (not margins) keep layout stable. */}
            <span className="inline-block -translate-x-3 transition-transform duration-500 ease-out hover:-translate-x-6 sm:-translate-x-6 sm:hover:-translate-x-10">
              COMPILE.
            </span>
            <br />
            <span className="inline-block translate-x-4 text-accent-primary transition-transform duration-500 ease-out hover:translate-x-8 sm:translate-x-8 sm:hover:translate-x-14">
              COMPETE.
            </span>
            <br />
            <span className="inline-block -translate-x-3 text-faint transition-transform duration-500 ease-out hover:-translate-x-6 sm:-translate-x-6 sm:hover:-translate-x-10">
              CONQUER.
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-sm leading-6 text-subtle">
            A high-performance coding battlefield for operatives who write, execute,
            and validate under pressure.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
            <Link
              to="/problems"
              className="group inline-flex items-center gap-3 bg-accent-primary px-5 py-3 font-bold text-ink transition-colors hover:bg-fg"
            >
              Enter system
              <ArrowDown size={14} className="transition-transform group-hover:translate-y-0.5" />
            </Link>
            <a
              href="#protocols"
              className="inline-flex items-center gap-2 border border-subtle-line px-5 py-3 text-subtle transition-colors hover:border-accent-primary/50 hover:text-accent-primary"
            >
              Read protocol
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-subtle-line pt-4 font-mono text-[9px] uppercase tracking-widest text-faint">
            <span>
              <b className="text-subtle">01</b> realtime
            </span>
            <span>
              <b className="text-subtle">02</b> polyglot
            </span>
            <span>
              <b className="text-subtle">03</b> sandboxed
            </span>
          </div>
        </div>

        {/* Signature card — a size container so the "2.0" watermark can size itself
            in `cqw` and stay proportional to the card at every breakpoint. */}
        <div className="@container relative min-w-0">
          {/* Soft ambient wash — deliberately faint to keep the page light */}
          <div className="pointer-events-none absolute -inset-8 bg-accent-primary/[0.04]" />

          {/* Oversized "2.0" watermark.
            `left-[97%]` anchors its LEFT edge just before the card's right edge, so
            the numerals begin where the artwork ends and bleed off-screen. The
            parent is a size container (@container), so `cqw` resolves against the
            card width and the mark always overshoots the card at every size. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-[97%] z-0 select-none font-mono font-bold leading-none tracking-[-0.06em] text-fg/[0.07] sm:text-fg/[0.09]"
            style={{ fontSize: 'clamp(9rem, 44cqw, 21rem)' }}
          >
            2.0
          </div>

          <div className="relative z-10 border border-subtle-line bg-raised p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-subtle-line pb-4 font-mono text-[9px] uppercase tracking-widest text-faint">
              <span className="flex items-center gap-2">
                <Terminal size={13} className="text-accent-primary" />
                brace_signature.bin
              </span>
              <span className="text-accent-success">
                {showPixels ? 'verified' : 'booting'}
              </span>
            </div>

            <div className="flex min-h-[200px] items-center justify-center overflow-hidden border border-subtle-line/60 bg-base/60 p-4 sm:min-h-[280px] sm:p-8">
              <div
                className="pixel-grid"
                ref={gridRef}
                aria-hidden="true"
                style={{ contain: 'layout' }}
              >
                {MATRIX_DATA.map((row, ri) => (
                  <div key={`row-${ri}`} className="pixel-row">
                    {row.map((lit, ci) => {
                      const pm = PIXEL_META[ri][ci];
                      if (!lit || !pm) {
                        return (
                          <div
                            key={`px-${ri}-${ci}`}
                            className="pixel-cell border border-transparent"
                          />
                        );
                      }
                      const flat = LIT_INDEX[ri][ci];
                      return (
                        <div
                          key={`px-${ri}-${ci}`}
                          // The flat slot is published as a data attribute and
                          // collected inside the effect below, so nothing reads
                          // or writes a ref during render.
                          data-lit={flat >= 0 ? String(flat) : undefined}
                          className="pixel-cell border-[0.2px] border-line-low sm:border-[0.5px]"
                          style={
                            showPixels
                              ? ({
                                  '--tc': 'var(--accent-primary)',
                                  '--ts': 'var(--shadow-glow-accent)',
                                  backgroundColor: 'var(--accent-primary)',
                                  opacity: 1,
                                } as React.CSSProperties)
                              : ({
                                  '--tc': 'var(--accent-primary)',
                                  '--ts': 'var(--shadow-glow-accent)',
                                  backgroundColor: 'var(--accent-primary)',
                                  opacity: 0,
                                  animation: `bootPixel 0.7s cubic-bezier(0.16,1,0.3,1) ${pm.delay}ms forwards`,
                                } as React.CSSProperties)
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-subtle-line pt-4 font-mono text-[9px] uppercase tracking-widest text-faint">
              <span>signature: BRACE RCE</span>
              <span className="text-accent-success">ready to deploy</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Protocol trio ────────────────────────────────────────────────── */}
      <section
        id="protocols"
        className="mx-auto grid w-full max-w-7xl scroll-mt-16 gap-3 border-t border-subtle-line px-5 pb-12 pt-8 sm:grid-cols-3 lg:px-8"
      >
        {PROTOCOLS.map((p) => (
          <div
            key={p.tag}
            className="border border-subtle-line bg-raised p-6 transition-colors hover:border-accent-primary/30"
          >
            <p className={`font-mono text-[9px] uppercase tracking-widest ${p.accent}`}>
              {p.tag}
            </p>
            <h2 className="mt-3 font-mono text-lg font-bold">{p.title}</h2>
            <p className="mt-2 text-xs leading-5 text-faint">{p.body}</p>
          </div>
        ))}
      </section>

      {/* ── Secondary CTA ────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-5 pb-14 lg:px-8">
        <Link
          to="/lobby"
          className="inline-flex items-center gap-2 border border-subtle-line px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-subtle transition-colors hover:border-accent-primary/50 hover:text-accent-primary"
        >
          <Swords size={14} className="text-faint" />
          1v1 battle arena
        </Link>
      </div>
    </div>
  );
};

export default BraceRcePixelArt;
