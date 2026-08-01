export type HomeFeature = {
  title: string;
  desc: string;
  img: string;
};

export type BentoItem = {
  title: string;
  desc: string;
  className: string;
  slug: string;
};

export const features: HomeFeature[] = [
  {
    title: "Side-by-Side <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold font-mono\">Problem Workspace</span>",
    desc: "Write solutions inside a premium <span class=\"text-cyan-400 font-bold font-mono\">Monaco Editor</span> while reviewing detailed problem definitions, constraints, and hints side-by-side in a unified <span class=\"text-teal-400 font-semibold font-mono\">Workspace Layout</span>.",
    img: "/ss-1-ide-with-prob-desc.png",
  },
  {
    title: "Interactive <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold font-mono\">Custom Input Playground</span>",
    desc: "Test your logic on arbitrary parameters. Input custom arguments on-the-fly and inspect <span class=\"text-cyan-400 font-bold font-mono\">stdout execution traces</span> and console diagnostics instantly.",
    img: "/ss-custom-inp.png",
  },
  {
    title: "Precise <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold font-mono\">Telemetry Verification</span>",
    desc: "Execute complete test suites inside secure sandboxes, receiving detailed color-coded status badges, <span class=\"text-cyan-400 font-bold font-mono\">runtimes</span>, and expected output comparisons.",
    img: "/ss-dsa-que-with-desc-test-cases.png",
  },
  {
    title: "Persistent <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-extrabold font-mono\">Local Scratchpad</span>",
    desc: "Create, save, and compile custom files stored directly in your local workspace. Experiment with <span class=\"text-cyan-400 font-bold font-mono\">custom algorithms</span> without standard problem bounds.",
    img: "/ss-localfile.png",
  }
];

export const bentoItems: BentoItem[] = [
  {
    title: "Trees & Graphs",
    desc: "Traverse deep into non-linear structures. Master BSTs, Tries, and complex Graph algorithms.",
    className: "md:col-span-2 md:row-span-2 min-h-[300px] md:min-h-[400px]",
    slug: "tree",
  },
  {
    title: "Dynamic Programming",
    desc: "Break down problems and build up efficient sub-solutions.",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
    slug: "dynamic-programming",
  },
  {
    title: "Arrays & Strings",
    desc: "The core foundation of all sequence-based logic.",
    className: "md:col-span-1 md:row-span-1 min-h-[200px]",
    slug: "array",
  },
  {
    title: "Linked Lists",
    desc: "Sequential access, cycle detection, and pointer mastery.",
    className: "md:col-span-1 md:row-span-1 min-h-[200px]",
    slug: "linked-list",
  },
  {
    title: "Sorting & Searching",
    desc: "Optimize collection performance with lookup techniques.",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
    slug: "searching",
  },
  {
    title: "Math & Geometry",
    desc: "Number theory, primes, and modular arithmetic algorithms.",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
    slug: "math",
  },
  {
    title: "Stacks & Queues",
    desc: "Master linear data flow with LIFO and FIFO structures.",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
    slug: "stack",
  },
  {
    title: "Greedy & Intervals",
    desc: "Make optimal local choices and solve range intersections.",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
    slug: "greedy",
  },
];

