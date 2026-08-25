import React from "react";

export interface BentoCapabilityItem {
  title: string;
  desc: string;
  img: string;
  badge: string;
}

interface BentoCapabilityGridProps {
  items: BentoCapabilityItem[];
  numbers?: string[];
}

const borderEdgeStyles = [
  "border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 hover:border-r-cyan-400 hover:border-b-cyan-400",
  "border-l-4 border-b-4 border-l-cyan-500/70 border-b-cyan-500/70 hover:border-l-cyan-400 hover:border-b-cyan-400",
  "border-t-4 border-r-4 border-t-cyan-500/70 border-r-cyan-500/70 hover:border-t-cyan-400 hover:border-r-cyan-400",
  "border-t-4 border-l-4 border-t-cyan-500/70 border-l-cyan-500/70 hover:border-t-cyan-400 hover:border-l-cyan-400",
];

const defaultNumbers = ["01", "02", "03", "04"];

const BentoCapabilityGrid: React.FC<BentoCapabilityGridProps> = ({
  items,
  numbers = defaultNumbers,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 w-full max-w-7xl mx-auto px-2 sm:px-6">
      {items.map((item, idx) => {
        const num = numbers[idx % numbers.length];
        const edgeStyle = borderEdgeStyles[idx % borderEdgeStyles.length];

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
            key={idx}
            className={`group relative overflow-hidden rounded-none border border-white/20 bg-[#06080e] p-6 sm:p-8 flex flex-col justify-between hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(6,182,212,0.18)] transition-all duration-300 ${edgeStyle} ${gridSpanClass}`}
          >
            {/* Full Card Background Image */}
            <img
              src={item.img}
              alt={item.title.replace(/<[^>]*>/g, "")}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700 select-none pointer-events-none"
            />

            {/* High-Contrast Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06080e] via-[#06080e]/90 to-[#06080e]/50 z-10 pointer-events-none" />

            {/* Dot grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] z-10" />

            {/* Glow aura on hover */}
            <div className="absolute -right-14 -top-14 w-52 h-52 bg-cyan-500/0 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-700 z-10" />

            {/* Watermark Number */}
            <div className="absolute right-6 top-4 text-6xl sm:text-7xl font-extrabold text-cyan-400/20 pointer-events-none font-mono z-10 select-none">
              {num}
            </div>

            {/* Top Bar: Badge */}
            <div className="relative z-20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-none bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md">
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase font-mono">
                  {item.badge}
                </span>
              </div>
            </div>

            {/* Bottom Left Content */}
            <div className="relative z-20 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-500 ease-out max-w-xl">
              <h3
                className="text-xl sm:text-2xl font-extrabold text-white mb-2.5 leading-snug tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors font-mono"
                dangerouslySetInnerHTML={{ __html: item.title }}
              />
              <p
                className="text-xs sm:text-sm font-sans font-normal text-slate-300 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
                dangerouslySetInnerHTML={{ __html: item.desc }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BentoCapabilityGrid;
