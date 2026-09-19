import React from "react";
import { features } from "../content";
import { Cpu } from "lucide-react";
import BentoCapabilityGrid, { type BentoCapabilityItem } from "../../../components/shared/BentoCapabilityGrid";

const featureBadges = ["IDE_WORKSPACE", "PLAYGROUND", "TELEMETRY", "SCRATCHPAD", "BATTLE_ARENA", "RANKINGS", "FRIENDS", "MATCH_REVIEW"];

const StickyFeatureShowcase: React.FC = () => {
  const items: BentoCapabilityItem[] = features.map((f, idx) => ({
    title: f.title,
    desc: f.desc,
    img: f.img,
    badge: featureBadges[idx % featureBadges.length],
  }));

  return (
    <section aria-labelledby="home-capabilities-title" className="w-full border-t border-subtle-line py-12 sm:py-16 flex flex-col items-center font-mono select-none">
      {/* Header Section */}
      <div className="mb-8 w-full max-w-3xl px-4 text-left sm:mb-10 sm:text-center">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-label">03 // Core capabilities</p>
        <div className="inline-flex items-center gap-2 rounded-none border border-accent-primary/40 bg-accent-primary/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-primary shadow-[0_0_15px_rgba(0,212,255,0.2)]">
          <Cpu className="w-4 h-4 text-accent-primary" />
          <span>ARCHITECTURE // CAPABILITIES</span>
        </div>
        <h2 id="home-capabilities-title" className="text-3xl sm:text-4xl md:text-5xl font-black text-fg tracking-tight leading-tight mb-4">
          Engineered for <span className="text-accent-primary">Peak Performance</span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-subtle font-sans leading-relaxed max-w-xl mx-auto">
          A coding workspace, a practice habit, and a shared arena — built to help you learn, compete, and review your progress.
        </p>
      </div>

      <BentoCapabilityGrid items={items} />
    </section>
  );
};

export default StickyFeatureShowcase;
