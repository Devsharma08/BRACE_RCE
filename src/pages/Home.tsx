import React from "react";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import BentoGrid from "../features/home/components/BentoGrid";

const Home: React.FC = () => {
  return (
    <section className="flex h-full w-full flex-col gap-10 items-center px-4 pt-24 sm:px-6 max-w-7xl mx-auto">
      <HeroSection />
      <StickyFeatureShowcase />
      <BentoGrid />
    </section>
  );
};

export default Home;
