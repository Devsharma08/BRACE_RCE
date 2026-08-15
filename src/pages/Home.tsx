import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import BentoGrid from "../features/home/components/BentoGrid";

const Home: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Redirect authenticated operatives to their Command Center Dashboard
  if (!isLoading && (isAuthenticated || user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="flex h-full w-full flex-col gap-10 items-center px-4 pt-24 sm:px-6 max-w-7xl mx-auto">
      <HeroSection />
      <StickyFeatureShowcase />
      <BentoGrid />
    </section>
  );
};

export default Home;
