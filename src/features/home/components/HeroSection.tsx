import { ChevronRight, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <div className="max-w-4xl w-full flex flex-col items-center text-center z-10 min-h-[80vh] justify-center pb-20">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-default">
        <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
        Live DSA Solutions
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-textwhite via-textlightwhite to-textgray mb-6 drop-shadow-sm">
        Master Algorithms <br />
        <span className="bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">One File at a Time</span>
      </h1>

      <p className="text-lg md:text-xl text-textdimwhite max-w-2xl mb-10 leading-relaxed">
        Explore a carefully curated collection of Data Structures and Algorithms solutions. Browse the file tree, read the code, and elevate your problem-solving skills.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          to="/terminal"
          className="group relative px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            Browse Files <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-textwhite font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center gap-2">
          <GitBranch className="w-4 h-4 text-textdimwhite" />
          View Commits
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
