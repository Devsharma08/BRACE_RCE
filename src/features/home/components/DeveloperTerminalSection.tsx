import { Code2, Database, Terminal as TerminalIcon, type LucideIcon } from "lucide-react";

type DeveloperFeature = {
  title: string;
  desc: string;
  Icon: LucideIcon;
  iconClassName: string;
  iconShellClassName: string;
};

const developerFeatures: DeveloperFeature[] = [
  {
    title: "CLI Integration",
    desc: "Interact with your data structures through our simulated command line interface.",
    Icon: TerminalIcon,
    iconClassName: "text-indigo-400",
    iconShellClassName: "bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20",
  },
  {
    title: "Local Caching",
    desc: "10ms response times powered by NodeCache. We keep the GitHub API limits completely out of your way.",
    Icon: Database,
    iconClassName: "text-purple-400",
    iconShellClassName: "bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20",
  },
  {
    title: "Code Highlighting",
    desc: "Beautiful syntax highlighting for every algorithm, rendering exactly like your favorite IDE.",
    Icon: Code2,
    iconClassName: "text-pink-400",
    iconShellClassName: "bg-pink-500/10 border-pink-500/20 group-hover:bg-pink-500/20",
  },
];

const DeveloperTerminalSection = () => {
  return (
    <div className="w-full max-w-6xl mx-auto mt-20 z-10 pb-40 px-4 flex flex-col lg:flex-row gap-16 items-center">
      <div className="w-full lg:w-1/2 flex flex-col gap-8">
        <h2 className="text-4xl md:text-5xl font-bold text-textwhite leading-tight">
          Developer First. <br />
          <span className="text-indigo-400">Terminal Ready.</span>
        </h2>
        <p className="text-lg text-textdimwhite">
          DSAHub is built for developers who live in their editors. Experience a platform that feels right at home with your workflow.
        </p>

        <div className="flex flex-col gap-6 mt-4">
          {developerFeatures.map(({ title, desc, Icon, iconClassName, iconShellClassName }) => (
            <div key={title} className="flex gap-5 group">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border flex-shrink-0 transition-colors ${iconShellClassName}`}>
                <Icon className={`w-5 h-5 ${iconClassName}`} />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-textwhite">{title}</h4>
                <p className="text-textdimwhite mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117]/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] transform transition-transform hover:scale-[1.02] duration-500">
          <div className="bg-[#161b22]/90 px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="ml-4 text-xs font-mono text-textdimwhite/40 select-none">user@dsahub:~</span>
          </div>

          <div className="p-6 md:p-8 font-mono text-sm sm:text-base leading-relaxed text-gray-300 min-h-[300px]">
            <div className="flex gap-3">
              <span className="text-indigo-400">&rsaquo;</span>
              <span className="text-white font-semibold tracking-wide">dsa-cli fetch --repo="DSA-LEETCODE"</span>
            </div>

            <div className="mt-3 text-textdimwhite/80 space-y-1">
              <p>[i] Connecting to GitHub API...</p>
              <p>
                <span className="text-green-400">&#10003;</span> Authentication successful
              </p>
              <p>
                <span className="text-green-400">&#10003;</span> Fetched 50+ algorithm files
              </p>
              <p>[i] Building abstract syntax trees...</p>
              <p>
                <span className="text-green-400">&#10003;</span> Cache populated in 120ms
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <span className="text-indigo-400">&rsaquo;</span>
              <span className="text-white font-semibold flex items-center gap-2 tracking-wide">
                cat <span className="text-purple-400">BinarySearch.java</span>
                <span className="w-2.5 h-5 bg-white/70 animate-pulse inline-block"></span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperTerminalSection;
