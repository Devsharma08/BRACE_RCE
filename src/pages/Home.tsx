import React from "react";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import BentoGrid from "../features/home/components/BentoGrid";
import CommunitySupportSection from "../features/home/components/CommunitySupportSection";

/**
 * Home page
 *
 * HeroSection and StickyFeatureShowcase are content-centered and use their
 * own max-width internally, so they are wrapped with a max-w + mx-auto container.
 *
 * BentoGrid and CommunitySupportSection are intentionally full-bleed sections
 * (they use overflow-hidden marquee animations and need edge-to-edge width),
 * so they are rendered outside the constrained container.
 */
const Home: React.FC = () => {
  return (
    <div className="flex flex-col w-full items-center">
      {/* Constrained hero area */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 flex flex-col gap-10 items-center">
        <HeroSection />
        <StickyFeatureShowcase />
      </div>

      {/* Full-bleed sections — these manage their own internal max-width */}
      <BentoGrid />
      <CommunitySupportSection />
    </div>
  );
};

export default Home;
