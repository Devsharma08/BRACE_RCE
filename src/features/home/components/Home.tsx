import { BraceRcePixelArt } from "./HeroSection";
import { HomeMetricsStrip } from "./HomeMetricsStrip";
import { QuickNavCards } from "./QuickNavCards";
import { CategoryDirectory } from "./CategoryDirectory";
import { WorkspaceDirectory } from "./WorkspaceDirectory";
import { CommunitySupport } from "./CommunitySupport";

export { BraceRcePixelArt } from "./HeroSection";
export { HomeMetricsStrip } from "./HomeMetricsStrip";
export { QuickNavCards } from "./QuickNavCards";
export { CategoryDirectory } from "./CategoryDirectory";
export { WorkspaceDirectory } from "./WorkspaceDirectory";
export { CommunitySupport } from "./CommunitySupport";

const Home = () => {
  return (
    <>
      {/* 1. Hero — pixel art BRACE RCE (exempt from section uniformity) */}
      <BraceRcePixelArt />

      {/* 2. Raw fact strip — four headline numbers */}
      <HomeMetricsStrip />

      {/* 3. Four navigation cards — Battle, Terminal, Friends, Problems */}
      <QuickNavCards />

      {/* 4. Learning — tabular data-structure directory */}
      <CategoryDirectory />

      {/* 5. Bento — five service protocol cards */}
      <WorkspaceDirectory />

      {/* 6. Built by operators — reviews + feedback desk */}
      <CommunitySupport />
    </>
  );
};

export default Home;
