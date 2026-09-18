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
    <section className="w-full min-h-[100vh] py-16 sm:py-24 flex flex-col justify-center items-center font-mono select-none border-b border-subtle-line">
      {/* Header Section */}
      <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-accent-primary/40 bg-accent-primary/10 text-accent-primary text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
          <Cpu className="w-4 h-4 text-accent-primary" />
          <span>ARCHITECTURE // CAPABILITIES</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-fg tracking-tight leading-tight mb-4">
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
