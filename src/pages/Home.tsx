import { Link } from "react-router-dom";
import BentoGrid from "../features/home/components/BentoGrid";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";

const Home = () => {
  return (
    <section className="flex h-full w-full flex-col gap-10 items-center px-4 pt-24 sm:px-6">
      <HeroSection />
      <StickyFeatureShowcase />
      <BentoGrid />

      {/* Futuristic Launcher Callout Grid Card */}
      <div 
        className="z-10 mx-auto mb-20 w-full max-w-6xl overflow-hidden border border-white/5 bg-[#060709] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{
          borderRadius: '2rem'
        }}
      >
        {/* Left Side: Launch context */}
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <div className="text-[10px] text-cyan-500/50 tracking-[0.25em] uppercase font-bold select-none">// SYS // COMPILER_ONLINE</div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">Ready to compile solutions?</h3>
          <p className="text-textdimwhite text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
            Launch the high-performance remote execution workspace to compile, run, and solve Data Structures challenges with custom sandboxed diagnostics.
          </p>
        </div>

        {/* Right Side: Blinking pixel styled button */}
        <Link 
          to="/terminal" 
          className="group relative inline-flex items-center justify-center gap-2 border border-cyan-500/35 bg-cyan-950/10 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-950/20 py-4 px-6 sm:px-8 font-mono text-xs font-bold tracking-[0.15em] text-cyan-400 transition-all duration-300 cursor-pointer select-none rounded-xl w-full sm:w-auto text-center"
        >
          <span className="hidden sm:inline">[ JUMP_TO_TERMINAL_WORKSPACE ]</span>
          <span className="inline sm:hidden">[ LAUNCH_WORKSPACE ]</span>
          <span className="w-2 h-3.5 bg-cyan-400 animate-pulse group-hover:bg-cyan-300 shrink-0"></span>
        </Link>
      </div>
    </section>
  );
};

export default Home;

