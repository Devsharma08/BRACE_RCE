import React from "react";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import BentoGrid from "../features/home/components/BentoGrid";
import CommunitySupportSection from "../features/home/components/CommunitySupportSection";
import LaunchRail from "../features/home/components/LaunchRail";

/**
 * Home page
 *
 * The hero, launch rail, and feature showcase share a constrained container.
 * BentoGrid and CommunitySupportSection manage their own full-width sections.
 */
const Home: React.FC = () => {
  return (
    <div className="flex flex-col w-full items-center bg-void">
      {/* Constrained hero area */}
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 flex flex-col items-center">
        <HeroSection />
        <LaunchRail />
        <StickyFeatureShowcase />
      </div>

      {/* Full-bleed sections — these manage their own internal max-width */}
      <BentoGrid />
      <CommunitySupportSection />
    </div>
  );
};

export default Home;
