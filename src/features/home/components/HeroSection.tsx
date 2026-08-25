import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MATRIX DEFINITIONS — unchanged 11-row × 8-col letter templates
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
// BRACE RCE 15×100 binary matrix — never changes
// ─────────────────────────────────────────────────────────────────────────────

const MATRIX_DATA: number[][] = [];
MATRIX_DATA.push(new Array(100).fill(0));
MATRIX_DATA.push(new Array(100).fill(0));
for (let i = 0; i < 11; i++) {
  const row = [
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
  ];
  MATRIX_DATA.push(row);
}
MATRIX_DATA.push(new Array(100).fill(0));
MATRIX_DATA.push(new Array(100).fill(0));

const ROWS = MATRIX_DATA.length;    // 15
const COLS = MATRIX_DATA[0].length; // 100

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC VISIT SEED — generated ONCE per page life, stable across renders
// ─────────────────────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Generated once at module init — NOT inside any React function
const VISIT_SEED = Date.now() ^ (Math.random() * 0x7fffffff | 0);
const _rng = seededRng(VISIT_SEED);

// Activation pattern: 0=left→right, 1=center→outward, 2=diagonal, 3=scanline
const ACTIVATION_PATTERN = Math.floor(_rng() * 4);

// Pre-compute stable delay per pixel using the visit seed
const PIXEL_DELAYS: number[][] = MATRIX_DATA.map((row, ri) =>
  row.map((pixel, ci) => {
    if (!pixel) return 0;
    const rng = seededRng(VISIT_SEED ^ (ri * 997 + ci * 31337));
    const noise = rng() * 120;
    let base = 0;
    switch (ACTIVATION_PATTERN) {
      case 0: base = (ci / (COLS - 1)) * 700; break;
      case 1: {
        const cx = COLS / 2, cy = ROWS / 2;
        const dist = Math.hypot(ci - cx, ri - cy);
        const maxDist = Math.hypot(cx, cy);
        base = (dist / maxDist) * 700;
        break;
      }
      case 2: base = ((ci + ri) / (COLS + ROWS - 2)) * 750; break;
      case 3: base = (ri / (ROWS - 1)) * 650 + rng() * 60; break;
    }
    return Math.round(base + noise + 200);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// BASE GRADIENT — cyan → amber, computed once, stable
// ─────────────────────────────────────────────────────────────────────────────

interface PixelMeta {
  baseColor: string;
  baseR: number;
  baseG: number;
  baseB: number;
  baseShadow: string;
  delay: number;
}

const PIXEL_META: (PixelMeta | null)[][] = MATRIX_DATA.map((row, ri) =>
  row.map((pixel, ci) => {
    if (!pixel) return null;
    const ratio = ci / (COLS - 1);
    const r = Math.round(34 + (245 - 34) * ratio);
    const g = Math.round(211 + (158 - 211) * ratio);
    const b = Math.round(238 + (11 - 238) * ratio);
    return {
      baseColor: `rgb(${r},${g},${b})`,
      baseR: r, baseG: g, baseB: b,
      baseShadow: `0 0 8px rgba(${r},${g},${b},0.45)`,
      delay: PIXEL_DELAYS[ri][ci],
    };
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const BraceRcePixelArt: React.FC = () => {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Refs for pointer RAF loop — zero React state updates ever
  const rafRef = React.useRef<number>(0);
  const pointerRef = React.useRef({ x: -9999, y: -9999, active: false });
  const trailRef = React.useRef<Map<string, { energy: number; ts: number }>>(new Map());

  // Pre-allocate 2-D ref matrix at declaration time so ref callbacks fire immediately during render
  const pixelElemsRef = React.useRef<(HTMLDivElement | null)[][]>(
    MATRIX_DATA.map(() => new Array(COLS).fill(null))
  );
  const pixelRectsRef = React.useRef<({ cx: number; cy: number } | null)[][]>([]);
  const gridBoundsRef = React.useRef<DOMRect | null>(null);
  const isMobileRef = React.useRef(false);
  const prefersReducedRef = React.useRef(false);

  // Boot state
  const bootPhaseRef = React.useRef(0);
  const bootDoneRef = React.useRef(false);

  // Scan sweep state
  const scanActiveRef = React.useRef(false);
  const scanStartTimeRef = React.useRef(0);

  // Idle glitch timer
  const lastGlitchRef = React.useRef(0);

  // ── Detect mobile & reduced-motion ONCE ────────────────────────────────
  React.useEffect(() => {
    isMobileRef.current = window.matchMedia('(pointer: coarse)').matches;
    prefersReducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // ── Measure pixel positions on mount & resize ──────────────────────────
  const measurePixelPositions = React.useCallback(() => {
    if (!gridRef.current) return;
    gridBoundsRef.current = gridRef.current.getBoundingClientRect();
    const rects: ({ cx: number; cy: number } | null)[][] = [];
    for (let ri = 0; ri < ROWS; ri++) {
      rects[ri] = [];
      for (let ci = 0; ci < COLS; ci++) {
        const el = pixelElemsRef.current[ri]?.[ci];
        if (!el || !MATRIX_DATA[ri][ci]) { rects[ri][ci] = null; continue; }
        const r = el.getBoundingClientRect();
        rects[ri][ci] = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      }
    }
    pixelRectsRef.current = rects;
  }, []);

  React.useEffect(() => {
    const t = setTimeout(measurePixelPositions, 600);
    const onResize = () => { gridBoundsRef.current = null; measurePixelPositions(); };
    window.addEventListener('resize', onResize, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [measurePixelPositions]);

  // ── Boot sequence controller ────────────────────────────────────────────
  React.useEffect(() => {
    if (prefersReducedRef.current) {
      bootDoneRef.current = true;
      bootPhaseRef.current = 5;
      return;
    }

    const maxDelay = PIXEL_META.flat().reduce((m, pm) => pm ? Math.max(m, pm.delay) : m, 0);

    const t1 = setTimeout(() => {
      bootPhaseRef.current = 3;

      // Stabilization flash
      PIXEL_META.forEach((row, ri) => row.forEach((pm, ci) => {
        if (!pm) return;
        const el = pixelElemsRef.current[ri]?.[ci];
        if (!el) return;
        el.style.filter = 'brightness(1.35)';
      }));

      setTimeout(() => {
        PIXEL_META.forEach((row, ri) => row.forEach((pm, ci) => {
          if (!pm) return;
          const el = pixelElemsRef.current[ri]?.[ci];
          if (!el) return;
          el.style.filter = '';
        }));

        // Phase 4 — signature energy scan
        bootPhaseRef.current = 4;
        scanActiveRef.current = true;
        scanStartTimeRef.current = performance.now();
        startScanRAF();
      }, 350);
    }, maxDelay + 900);

    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Signature scan RAF ─────────────────────────────────────────────────
  const startScanRAF = React.useCallback(() => {
    const SCAN_DURATION = 950;
    const TRAIL_WIDTH = 12;

    const tick = (now: number) => {
      if (!scanActiveRef.current) return;
      const elapsed = now - scanStartTimeRef.current;
      const progress = Math.min(elapsed / SCAN_DURATION, 1);
      const wavefront = Math.floor(progress * (COLS + TRAIL_WIDTH));

      for (let ri = 0; ri < ROWS; ri++) {
        for (let ci = 0; ci < COLS; ci++) {
          const pm = PIXEL_META[ri][ci];
          const el = pixelElemsRef.current[ri]?.[ci];
          if (!pm || !el) continue;

          const dist = wavefront - ci;
          if (dist < 0 || dist > TRAIL_WIDTH) {
            el.style.filter = '';
            el.style.boxShadow = pm.baseShadow;
            continue;
          }
          const t = 1 - dist / TRAIL_WIDTH;
          const intensity = Math.exp(-4 * (1 - t) * (1 - t));
          const bright = 1 + intensity * 1.6;
          el.style.filter = `brightness(${bright}) saturate(${1 + intensity * 0.6})`;
          el.style.boxShadow = `0 0 ${6 + intensity * 18}px rgba(120,220,255,${0.3 + intensity * 0.7})`;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        scanActiveRef.current = false;
        PIXEL_META.forEach((row, ri) => row.forEach((pm, ci) => {
          if (!pm) return;
          const el = pixelElemsRef.current[ri]?.[ci];
          if (!el) return;
          el.style.filter = '';
          el.style.boxShadow = pm.baseShadow;
        }));
        bootPhaseRef.current = 5;
        bootDoneRef.current = true;
        measurePixelPositions();
      }
    };
    requestAnimationFrame(tick);
  }, [measurePixelPositions]);

  // ── Pointer energy RAF loop ────────────────────────────────────────────
  React.useEffect(() => {
    if (isMobileRef.current) return;

    const RADIUS = 120;
    const TRAIL_DECAY = 500;

    const processFrame = (now: number) => {
      rafRef.current = 0;

      if (!bootDoneRef.current) return;

      const px = pointerRef.current.x;
      const py = pointerRef.current.y;

      for (let ri = 0; ri < ROWS; ri++) {
        for (let ci = 0; ci < COLS; ci++) {
          const pm = PIXEL_META[ri][ci];
          const el = pixelElemsRef.current[ri]?.[ci];
          const rect = pixelRectsRef.current[ri]?.[ci];
          if (!pm || !el || !rect) continue;

          const dx = px - rect.cx;
          const dy = py - rect.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let liveEnergy = 0;
          if (dist < RADIUS) {
            const t = dist / RADIUS;
            liveEnergy = 1 - t * t * (3 - 2 * t); // smoothstep
          }

          const key = `${ri},${ci}`;
          const trailEntry = trailRef.current.get(key);
          let trailEnergy = 0;
          if (trailEntry) {
            const age = now - trailEntry.ts;
            if (age < TRAIL_DECAY) {
              trailEnergy = trailEntry.energy * (1 - age / TRAIL_DECAY);
            } else {
              trailRef.current.delete(key);
            }
          }

          if (liveEnergy > 0) {
            trailRef.current.set(key, { energy: liveEnergy, ts: now });
          }

          const energy = Math.max(liveEnergy, trailEnergy * 0.65);

          if (energy < 0.01) {
            el.style.filter = '';
            el.style.boxShadow = pm.baseShadow;
            el.style.transform = '';
            continue;
          }

          const bright = 1 + energy * 0.85;
          const sat = 1 + energy * 0.55;
          el.style.filter = `brightness(${bright.toFixed(2)}) saturate(${sat.toFixed(2)})`;
          el.style.boxShadow = `0 0 ${(6 + energy * 20).toFixed(1)}px rgba(${Math.round(pm.baseR * (1 - energy * 0.5) + 80 * energy)},${Math.round(pm.baseG * (1 - energy * 0.3) + 200 * energy)},${Math.round(pm.baseB * (1 - energy * 0.1) + 255 * energy)},${(0.3 + energy * 0.7).toFixed(2)})`;
          el.style.transform = energy > 0.4 ? `scale(${(1 + energy * 0.1).toFixed(3)})` : '';
        }
      }

      // Micro-glitch (very rare, only after boot)
      if (bootDoneRef.current && now - lastGlitchRef.current > 15000) {
        if (Math.random() < 0.003) {
          triggerMicroGlitch();
          lastGlitchRef.current = now;
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(processFrame);
      }
    };

    const onPointerLeave = () => {
      pointerRef.current = { x: -9999, y: -9999, active: false };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(processFrame);
      }
    };

    const hero = containerRef.current;
    if (!hero) return;
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Micro glitch ───────────────────────────────────────────────────────
  const triggerMicroGlitch = React.useCallback(() => {
    const startRow = 2 + Math.floor(Math.random() * 10);
    const numRows = 1 + Math.floor(Math.random() * 2);

    for (let ri = startRow; ri < Math.min(startRow + numRows, ROWS); ri++) {
      for (let ci = 0; ci < COLS; ci++) {
        const pm = PIXEL_META[ri][ci];
        const el = pixelElemsRef.current[ri]?.[ci];
        if (!pm || !el) continue;
        el.style.filter = 'brightness(2.2) saturate(0.5)';
        el.style.transform = `translateX(${(Math.random() - 0.5) * 3}px)`;
      }
    }

    const DURATION = 50 + Math.random() * 80;
    setTimeout(() => {
      for (let ri = startRow; ri < Math.min(startRow + numRows, ROWS); ri++) {
        for (let ci = 0; ci < COLS; ci++) {
          const el = pixelElemsRef.current[ri]?.[ci];
          if (!el) continue;
          el.style.filter = '';
          el.style.transform = '';
        }
      }
    }, DURATION);
  }, []);

  // ── CSS (keyframes + responsive sizing) ───────────────────────────────
  const styles = `
    @keyframes bootPixel {
      0%   { opacity: 0; transform: scale(0.25); box-shadow: none; }
      45%  { opacity: 0.65; transform: scale(1.08); box-shadow: 0 0 10px var(--tc); }
      100% { opacity: 1;  transform: scale(1);    box-shadow: var(--ts); }
    }
    @keyframes statusFade {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes descFade {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .animate-desc-fade {
      animation: descFade 1s cubic-bezier(0.16,1,0.3,1) forwards;
      animation-delay: 2.4s;
    }

    /* Pixel cell sizing — responsive breakpoints unchanged from original */
    .pixel-cell {
      height: 1.6px; width: 1.6px; border-radius: 0.2px;
      transition: filter 0.12s ease, box-shadow 0.12s ease, transform 0.1s ease;
      will-change: filter, box-shadow, transform;
    }
    @media (min-width: 360px)  { .pixel-cell { height: 2.2px; width: 2.2px; } }
    @media (min-width: 440px)  { .pixel-cell { height: 3.2px; width: 3.2px; } }
    @media (min-width: 640px)  { .pixel-cell { height: 5.2px; width: 5.2px; border-radius: 0.5px; } }
    @media (min-width: 768px)  { .pixel-cell { height: 6.8px; width: 6.8px; } }
    @media (min-width: 1024px) { .pixel-cell { height: 8.5px; width: 8.5px; } }

    .pixel-row  { display: flex; gap: 0.8px; }
    @media (min-width: 360px)  { .pixel-row { gap: 1px; } }
    @media (min-width: 440px)  { .pixel-row { gap: 1.5px; } }
    @media (min-width: 640px)  { .pixel-row { gap: 2.5px; } }
    @media (min-width: 768px)  { .pixel-row { gap: 3px; } }

    .pixel-grid { display: flex; flex-direction: column; gap: 0.8px; }
    @media (min-width: 360px)  { .pixel-grid { gap: 1px; } }
    @media (min-width: 440px)  { .pixel-grid { gap: 1.5px; } }
    @media (min-width: 640px)  { .pixel-grid { gap: 2.5px; } }
    @media (min-width: 768px)  { .pixel-grid { gap: 3px; } }

    /* Reduced-motion overrides */
    @media (prefers-reduced-motion: reduce) {
      .pixel-cell { transition: none !important; }
      .animate-desc-fade { animation: none !important; opacity: 1 !important; transform: none !important; }
    }
  `;

  const maxDelay = PIXEL_META.flat().reduce((m, pm) => pm ? Math.max(m, pm.delay) : m, 0);

  return (
    <div
      ref={containerRef}
      className="z-10 flex min-h-[90vh] w-full max-w-7xl flex-col items-center justify-center py-12 font-mono text-slate-200 select-none px-4 sm:px-8 border-b border-white/10"
    >
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Blueprint grid canvas */}
      <div
        className="relative w-full pt-16 pb-12 px-4 sm:pt-20 sm:pb-12 sm:px-12 flex justify-center items-center overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right,  rgba(6,182,212,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6,182,212,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      >
        {/* CRT scanline overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/[0.01] to-transparent bg-[length:100%_4px] opacity-80" />

        {/* Radial ambient glow behind logo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 48%, rgba(34,211,238,0.05) 0%, transparent 70%)' }}
        />

        {/* ── Pixel matrix ──────────────────────────────────────────── */}
        <div className="pixel-grid" ref={gridRef}>
          {MATRIX_DATA.map((row, ri) => (
            <div key={`row-${ri}`} className="pixel-row">
              {row.map((pixel, ci) => {
                const pm = PIXEL_META[ri][ci];
                return (
                  <div
                    key={`px-${ri}-${ci}`}
                    ref={el => { if (pixelElemsRef.current[ri]) pixelElemsRef.current[ri][ci] = el; }}
                    className={`pixel-cell ${
                      pixel
                        ? 'border-[0.2px] sm:border-[0.5px]'
                        : 'bg-transparent border border-transparent'
                    }`}
                    style={
                      pixel && pm
                        ? ({
                          '--tc': pm.baseColor,
                          '--ts': pm.baseShadow,
                          backgroundColor: pm.baseColor,
                          borderColor: 'rgba(255,255,255,0.12)',
                          boxShadow: pm.baseShadow,
                          opacity: 0,
                          animation: `bootPixel 0.7s cubic-bezier(0.16,1,0.3,1) ${pm.delay}ms forwards`,
                        } as React.CSSProperties)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Initialization status — fades out before scan */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] text-cyan-400/30 font-mono tracking-[0.3em] uppercase pointer-events-none select-none whitespace-nowrap"
          style={{
            opacity: 0,
            animation: `statusFade 0.6s ease-out 100ms forwards, statusFade 0.4s ease-in ${maxDelay + 600}ms reverse forwards`,
          }}
        >
          ▸ INITIALIZING RCE CORE
        </div>

        {/* Online status — appears after boot */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] text-cyan-300/60 font-mono tracking-[0.3em] uppercase pointer-events-none select-none whitespace-nowrap"
          style={{
            opacity: 0,
            animation: `statusFade 0.8s cubic-bezier(0.16,1,0.3,1) ${maxDelay + 1700}ms forwards`,
          }}
        >
          RCE CORE // ONLINE
        </div>
      </div>

      {/* Description subtext */}
      <div className="mt-10 flex flex-col items-center text-center max-w-2xl px-4 animate-desc-fade opacity-0">
        <h2 className="text-xs sm:text-sm font-bold tracking-[0.35em] text-cyan-400/90 uppercase mb-3.5 select-none flex flex-wrap items-center justify-center gap-2">
          <span>// CRX // REMOTE_CODE_EXECUTION_IDE</span>
          <span className="px-1.5 py-0.5 border border-cyan-500/25 text-[9px] font-bold tracking-wider rounded-none uppercase text-amber-500 bg-cyan-950/15 select-none">
            [ v1.0.0 ]
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-[0.05em] leading-relaxed max-w-xl">
          A high-performance sandboxed playground to run, compile, and solve Data Structures and Algorithms challenges live with high-precision execution telemetry.
        </p>
      </div>
    </div>
  );
};

export default BraceRcePixelArt;
