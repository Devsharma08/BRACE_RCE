import React from 'react';

// high-fidelity 11x8 letter matrix definitions for smooth curve rendering
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
  [1, 1, 1, 1, 1, 1, 0, 0]
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
  [1, 1, 0, 0, 0, 0, 0, 1]
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
  [1, 1, 0, 0, 0, 0, 1, 1]
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
  [0, 0, 1, 1, 1, 1, 1, 0]
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
  [1, 1, 1, 1, 1, 1, 1, 1]
];

// programmatically construct 15-Row x 100-Column high-density binary matrix for BRACE RCE
const MATRIX_DATA: number[][] = [];

// 2 empty padding rows at top
MATRIX_DATA.push(new Array(100).fill(0));
MATRIX_DATA.push(new Array(100).fill(0));

// Generate the 11 character rows
for (let i = 0; i < 11; i++) {
  const row = [
    ...new Array(9).fill(0),        // left pad: 9 cols
    ...LETTER_B[i], ...[0, 0],      // B (8) + gap (2)
    ...LETTER_R[i], ...[0, 0],      // R (8) + gap (2)
    ...LETTER_A[i], ...[0, 0],      // A (8) + gap (2)
    ...LETTER_C[i], ...[0, 0],      // C (8) + gap (2)
    ...LETTER_E[i], ...[0, 0, 0, 0, 0, 0], // E (8) + word separator (6)
    ...LETTER_R[i], ...[0, 0],      // R (8) + gap (2)
    ...LETTER_C[i], ...[0, 0],      // C (8) + gap (2)
    ...LETTER_E[i],                 // E (8)
    ...new Array(9).fill(0)         // right pad: 9 cols
  ];
  MATRIX_DATA.push(row);
}

// 2 empty padding rows at bottom
MATRIX_DATA.push(new Array(100).fill(0));
MATRIX_DATA.push(new Array(100).fill(0));

export const BraceRcePixelArt: React.FC = () => {
  // Pre-calculate rendering targets once for stability, performance, and hydration matching
  const pixelMetadata = React.useMemo(() => {
    return MATRIX_DATA.map((row) => {
      return row.map((pixel, colIndex) => {
        if (!pixel) return null;
        
        // Smooth horizontal gradient from Cyber Cyan rgb(34, 211, 238) to Retro Amber rgb(245, 158, 11)
        const ratio = colIndex / 99;
        const r = Math.round(34 + (245 - 34) * ratio);
        const g = Math.round(211 + (158 - 211) * ratio);
        const b = Math.round(238 + (11 - 238) * ratio);
        
        const targetColor = `rgb(${r}, ${g}, ${b})`;
        const targetShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.6)`;
        
        // Snappy randomized entry delay across the grid (0 to 800ms max)
        const delay = Math.floor(Math.random() * 800);
        
        return {
          targetColor,
          targetShadow,
          delay
        };
      });
    });
  }, []);

  return (
    <div className="z-10 flex min-h-[65vh] w-full max-w-7xl flex-col items-center justify-center pb-8 font-mono text-slate-200 select-none px-4 sm:px-8">
      
      {/* Inject snappy keyframe transitions and descriptive text fade-in */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bootPixel {
          0% {
            opacity: 0;
            transform: scale(0.3);
            background-color: var(--target-color);
            border-color: rgba(255, 255, 255, 0.05);
            box-shadow: none;
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
            background-color: var(--target-color);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 8px var(--target-color);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            background-color: var(--target-color);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: var(--target-shadow);
          }
        }
        .animate-pixel-boot {
          animation: bootPixel 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInDescription {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-description-fade {
          animation: fadeInDescription 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 1s;
        }
        @keyframes fuiTextFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-fui-text-float {
          animation: fuiTextFloat 5s ease-in-out infinite;
        }

        /* High-fidelity custom media queries for responsive grid scaling without overflow */
        .pixel-cell {
          height: 1.6px;
          width: 1.6px;
          border-radius: 0.2px;
        }
        @media (min-width: 360px) {
          .pixel-cell {
            height: 2.2px;
            width: 2.2px;
          }
        }
        @media (min-width: 440px) {
          .pixel-cell {
            height: 3.2px;
            width: 3.2px;
          }
        }
        @media (min-width: 640px) {
          .pixel-cell {
            height: 5.2px;
            width: 5.2px;
            border-radius: 0.5px;
          }
        }
        @media (min-width: 768px) {
          .pixel-cell {
            height: 6.8px;
            width: 6.8px;
          }
        }
        @media (min-width: 1024px) {
          .pixel-cell {
            height: 8.5px;
            width: 8.5px;
          }
        }

        .pixel-row {
          display: flex;
          gap: 0.8px;
        }
        @media (min-width: 360px) {
          .pixel-row {
            gap: 1px;
          }
        }
        @media (min-width: 440px) {
          .pixel-row {
            gap: 1.5px;
          }
        }
        @media (min-width: 640px) {
          .pixel-row {
            gap: 2.5px;
          }
        }
        @media (min-width: 768px) {
          .pixel-row {
            gap: 3px;
          }
        }

        .pixel-grid {
          display: flex;
          flex-direction: column;
          gap: 0.8px;
        }
        @media (min-width: 360px) {
          .pixel-grid {
            gap: 1px;
          }
        }
        @media (min-width: 440px) {
          .pixel-grid {
            gap: 1.5px;
          }
        }
        @media (min-width: 640px) {
          .pixel-grid {
            gap: 2.5px;
          }
        }
        @media (min-width: 768px) {
          .pixel-grid {
            gap: 3px;
          }
        }
      `}} />

      {/* Blueprint Grid & Alignment Canvas Wrapper */}
      <div 
        className="relative w-full rounded-2xl border border-white/5 pt-16 pb-12 px-4 sm:pt-20 sm:pb-12 sm:px-12 flex justify-center items-center overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundColor: '#02040a'
        }}
      >
        {/* Scanline CRT overlay filter effect */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-b from-transparent via-cyan-500/[0.01] to-transparent bg-[length:100%_4px] opacity-80" />

        {/* Core Pixel Art Matrix Flex block with high-density spacing */}
        <div className="pixel-grid animate-fui-text-float">
          {MATRIX_DATA.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="pixel-row">
              {row.map((pixel, colIndex) => {
                const meta = pixelMetadata[rowIndex][colIndex];
                
                return (
                  <div
                    key={`pixel-${rowIndex}-${colIndex}`}
                    style={
                      pixel && meta
                        ? ({
                            '--target-color': meta.targetColor,
                            '--target-shadow': meta.targetShadow,
                            animationDelay: `${meta.delay}ms`,
                            opacity: 0
                          } as React.CSSProperties)
                        : undefined
                    }
                    className={`pixel-cell ${
                      pixel 
                        ? "animate-pixel-boot border-[0.2px] sm:border-[0.5px]" 
                        : "bg-transparent border border-transparent hover:bg-cyan-500/5 hover:border-cyan-500/10 transition-all duration-300"
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>


      {/* Straightforward Description Subtext - Fades in elegantly after boot-up */}
      <div className="mt-10 flex flex-col items-center text-center max-w-2xl px-4 animate-description-fade opacity-0">
        <h2 className="text-xs sm:text-sm font-bold tracking-[0.35em] text-cyan-400/90 uppercase mb-3.5 select-none flex flex-wrap items-center justify-center gap-2">
          <span>// CRX // REMOTE_CODE_EXECUTION_IDE</span>
          <span className="px-1.5 py-0.5 border border-cyan-500/25 text-[9px] font-bold tracking-wider rounded-none uppercase text-amber-500 bg-cyan-950/15 select-none">[ v1.0.0 ]</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-[0.05em] leading-relaxed max-w-xl">
          A high-performance sandboxed playground to run, compile, and solve Data Structures and Algorithms challenges live with high-precision execution telemetry.
        </p>
      </div>

    </div>
  );
};

export default BraceRcePixelArt;
