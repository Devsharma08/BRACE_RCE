import { Link } from "react-router-dom";
import { bentoItems } from "../content";
import BentoPixelArt from "./BentoPixelArt";
import { Database } from "lucide-react";

const BentoGrid = () => {
  // Split items into 2 rows for infinite ticker movement
  const row1 = bentoItems.slice(0, 4);
  const row2 = bentoItems.slice(4);

  // Duplicate items for continuous seamless loop
  const row1Items = [...row1, ...row1, ...row1];
  const row2Items = [...row2, ...row2, ...row2];

  return (
    <section className="w-full min-h-[100vh] py-16 sm:py-24 flex flex-col justify-center items-center font-mono select-none overflow-hidden border-b border-white/10">
      {/* Keyframe Styles for Dual Infinite Marquee Ticker */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marqueeLeft {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee-left {
          animation: marqueeLeft 35s linear infinite;
        }
        .animate-marquee-right {
          animation: marqueeRight 35s linear infinite;
        }
        .animate-marquee-left:hover, .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      ` }} />

      {/* Header Section */}
      <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>DATA STRUCTURES // CATEGORIES</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
          Master Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400">Structure</span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-300 font-sans max-w-xl mx-auto leading-relaxed">
          Dive deep into categorized data structure concepts directly from the repository.
        </p>
      </div>

      {/* Dual Row Infinite Moving Carousel Container */}
      <div className="relative w-full flex flex-col gap-8 overflow-hidden py-4">
        {/* Left & Right Fade Vignette Overlay */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-r from-[#02040a] to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-l from-[#02040a] to-transparent z-20 pointer-events-none" />

        {/* Row 1: Leftward Moving Ticker */}
        <div className="flex w-max gap-6 animate-marquee-left">
          {row1Items.map((item, idx) => (
            <Link
              key={`row1-${item.slug}-${idx}`}
              to={`/ds/${item.slug}`}
              className="group relative flex items-center justify-between gap-6 w-[360px] sm:w-[440px] h-[160px] shrink-0 overflow-hidden rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-6 sm:p-7 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300"
            >
              <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="flex-1 flex flex-col justify-center relative z-20">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight transition-colors duration-300 group-hover:text-cyan-300 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm font-sans font-normal leading-relaxed line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <div className="relative z-10 shrink-0 flex items-center justify-center scale-110">
                <BentoPixelArt slug={item.slug} />
              </div>
            </Link>
          ))}
        </div>

        {/* Row 2: Rightward Moving Ticker (Opposite Direction) */}
        <div className="flex w-max gap-6 animate-marquee-right">
          {row2Items.map((item, idx) => (
            <Link
              key={`row2-${item.slug}-${idx}`}
              to={`/ds/${item.slug}`}
              className="group relative flex items-center justify-between gap-6 w-[360px] sm:w-[440px] h-[160px] shrink-0 overflow-hidden rounded-none border border-white/20 border-l-4 border-b-4 border-l-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-6 sm:p-7 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300"
            >
              <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="flex-1 flex flex-col justify-center relative z-20">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight transition-colors duration-300 group-hover:text-cyan-300 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm font-sans font-normal leading-relaxed line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <div className="relative z-10 shrink-0 flex items-center justify-center scale-110">
                <BentoPixelArt slug={item.slug} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
