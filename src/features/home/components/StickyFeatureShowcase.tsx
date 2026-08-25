import React from "react";
import { features } from "../content";
import { Cpu } from "lucide-react";
import BentoCapabilityGrid, { type BentoCapabilityItem } from "../../../components/shared/BentoCapabilityGrid";

const featureBadges = ["IDE_WORKSPACE", "PLAYGROUND", "TELEMETRY", "SCRATCHPAD"];

const StickyFeatureShowcase: React.FC = () => {
  const items: BentoCapabilityItem[] = features.map((f, idx) => ({
    title: f.title,
    desc: f.desc,
    img: f.img,
    badge: featureBadges[idx % featureBadges.length],
  }));

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

      <BentoCapabilityGrid items={items} />
    </section>
  );
};

export default StickyFeatureShowcase;
