import React from "react";
import { features } from "../content";
import { LayoutGrid, Cpu, Terminal, ShieldCheck } from "lucide-react";

const featureIcons = [LayoutGrid, Cpu, Terminal, ShieldCheck];
const featureBadges = ["IDE_WORKSPACE", "PLAYGROUND", "TELEMETRY", "SCRATCHPAD"];
const featureNumbers = ["01", "02", "03", "04"];

// Preserved 2-adjacent edge thicker border combinations per card index with stronger 3px borders
const borderEdgeStyles = [
  "border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 hover:border-r-cyan-400 hover:border-b-cyan-400",
  "border-l-4 border-b-4 border-l-cyan-500/70 border-b-cyan-500/70 hover:border-l-cyan-400 hover:border-b-cyan-400",
  "border-t-4 border-r-4 border-t-cyan-500/70 border-r-cyan-500/70 hover:border-t-cyan-400 hover:border-r-cyan-400",
  "border-t-4 border-l-4 border-t-cyan-500/70 border-l-cyan-500/70 hover:border-t-cyan-400 hover:border-l-cyan-400",
];

const StickyFeatureShowcase: React.FC = () => {
  return (
    <section className="w-full min-h-[100vh] py-16 sm:py-24 flex flex-col justify-center items-center font-mono select-none border-b border-white/10">
      {/* Header Section */}
      <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>ARCHITECTURE // CAPABILITIES</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400">Peak Performance</span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-300 font-sans leading-relaxed max-w-xl mx-auto">
          A high-precision suite of browser-native development utilities built to execute, debug, and benchmark algorithms in real-time.
        </p>
      </div>

      {/* Chroma Asymmetric Image-Background Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 w-full max-w-7xl mx-auto px-2 sm:px-6">
        {features.map((feature, idx) => {
          const badge = featureBadges[idx % featureBadges.length];
          const num = featureNumbers[idx % featureNumbers.length];
          const edgeStyle = borderEdgeStyles[idx % borderEdgeStyles.length];

          // Bento Grid Card Spans
          const gridSpanClass =
            idx === 0
              ? "md:col-span-7 min-h-[320px] sm:min-h-[360px]"
              : idx === 1
                ? "md:col-span-5 min-h-[320px] sm:min-h-[360px]"
                : idx === 2
                  ? "md:col-span-5 min-h-[320px] sm:min-h-[360px]"
                  : "md:col-span-7 min-h-[320px] sm:min-h-[360px]";

          return (
            <div
              key={feature.title}
              className={`group relative overflow-hidden rounded-none border border-white/20 bg-[#06080e] p-6 sm:p-8 flex flex-col justify-between hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(6,182,212,0.18)] transition-all duration-300 ${edgeStyle} ${gridSpanClass}`}
            >
              {/* Full Card Background Image */}
              <img
                src={feature.img}
                alt={feature.title.replace(/<[^>]*>/g, "")}
                className="absolute inset-0 w-full h-full object-cover object-top opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700 select-none pointer-events-none"
              />

              {/* High-Contrast Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06080e] via-[#06080e]/90 to-[#06080e]/50 z-10 pointer-events-none" />

              {/* Subtle grid texture background overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] z-10" />

              {/* Glowing gradient aura on hover */}
              <div className="absolute -right-14 -top-14 w-52 h-52 bg-cyan-500/0 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-700 z-10" />

              {/* Watermark Number */}
              <div className="absolute right-6 top-4 text-6xl sm:text-7xl font-extrabold text-cyan-400/20 opacity-100 transition-opacity duration-500 pointer-events-none font-mono z-10 select-none">
                {num}
              </div>

              {/* Top Bar: Badge */}
              <div className="relative z-20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-none bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md">
                  <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase font-mono">
                    {badge}
                  </span>
                </div>
              </div>

              {/* Bottom Left Content Stack */}
              <div className="relative z-20 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-500 ease-out max-w-xl">
                <h3
                  className="text-xl sm:text-2xl font-extrabold text-white mb-2.5 leading-snug tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors"
                  dangerouslySetInnerHTML={{ __html: feature.title }}
                />
                <p
                  className="text-xs sm:text-sm font-sans font-normal text-slate-300 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
                  dangerouslySetInnerHTML={{ __html: feature.desc }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StickyFeatureShowcase;
