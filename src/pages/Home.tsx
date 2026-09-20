import type { FC } from "react";
import { BraceRcePixelArt } from "../features/home/components/HeroSection";
import { HomeMetricsStrip } from "../features/home/components/HomeMetricsStrip";
import { QuickNavCards } from "../features/home/components/QuickNavCards";
import { CategoryDirectory } from "../features/home/components/CategoryDirectory";
import WorkspaceDirectory from "../features/home/components/WorkspaceDirectory";
import { CommunitySupport } from "../features/home/components/CommunitySupport";

/**
 * Home page — the full BRACE RCE operative system.
 *
 * Six sections in vertical order:
 * 1. Hero (pixel-art BRACE RCE — exempt from section uniformity)
 * 2. HomeMetricsStrip (raw fact figures)
 * 3. QuickNavCards (Battle / Terminal / Friends / Problems)
 * 4. CategoryDirectory (tabular data-structure ledger)
 * 5. WorkspaceDirectory (5-card bento service grid)
 * 6. CommunitySupport (Built by operators + reviews + feedback)
 */
const Home: FC = () => {
  return (
    <div className="flex w-full min-w-0 flex-col bg-base text-fg">
      {/* 1. Hero — pixel-art BRACE RCE (exempt from uniformity) */}
      <BraceRcePixelArt />
      {/* 2. Raw fact strip */}
      <HomeMetricsStrip />
      {/* 3. Four navigation cards */}
      <QuickNavCards />
      {/* 4. Learning — tabular data structures */}
      <CategoryDirectory />
      {/* 5. Bento — five service cards */}
      <WorkspaceDirectory />
      {/* 6. Built by operators + reviews + feedback */}
      <CommunitySupport />
    </div>
  );
};

export default Home;
