import BentoGrid from "../features/home/components/BentoGrid";
import DeveloperTerminalSection from "../features/home/components/DeveloperTerminalSection";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";

const Home = () => {
  return (
    <section className="flex flex-col items-center pt-24 px-6 relative w-full h-full">
      <HeroSection />
      <StickyFeatureShowcase />
      <BentoGrid />
      <DeveloperTerminalSection />
    </section>
  );
};

export default Home;
