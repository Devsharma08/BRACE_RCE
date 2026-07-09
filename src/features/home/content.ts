export type HomeFeature = {
  title: string;
  desc: string;
  img: string;
};

export type BentoItem = HomeFeature & {
  className: string;
};

export const features: HomeFeature[] = [
  {
    title: "Seamless GitHub Integration",
    desc: "Our platform directly fetches your DSA repository from GitHub. No manual updates required. Push your code and see it live instantly on your customized interface.",
    img: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=2000&auto=format&fit=crop",
  },
  {
    title: "Blazing Fast In-Memory Cache",
    desc: "We use advanced in-memory caching to ensure that your file tree and code snippets load instantly without hitting GitHub rate limits or causing delays.",
    img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2000&auto=format&fit=crop",
  },
  {
    title: "Detailed Commit History",
    desc: "Track every algorithmic change. Analyze your past commits and see how your problem-solving skills have evolved over time with deep insights.",
    img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2000&auto=format&fit=crop",
  },
];

export const bentoItems: BentoItem[] = [
  {
    title: "Trees & Graphs",
    desc: "Traverse deep into non-linear structures. Master BSTs, Tries, and complex Graph algorithms.",
    img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1000&auto=format&fit=crop",
    className: "md:col-span-2 md:row-span-2 min-h-[300px] md:min-h-[400px]",
  },
  {
    title: "Dynamic Programming",
    desc: "Break down problems and build up efficient solutions.",
    img: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=800&auto=format&fit=crop",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
  },
  {
    title: "Arrays & Strings",
    desc: "The core foundation of all algorithmic logic.",
    img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop",
    className: "md:col-span-1 md:row-span-1 min-h-[200px]",
  },
  {
    title: "Linked Lists",
    desc: "Sequential access and pointer mastery.",
    img: "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?q=80&w=800&auto=format&fit=crop",
    className: "md:col-span-1 md:row-span-1 min-h-[200px]",
  },
  {
    title: "Sorting & Searching",
    desc: "Optimize performance with key techniques.",
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
  },
  {
    title: "Math & Geometry",
    desc: "Number theory, primes, and spatial logic.",
    img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
    className: "md:col-span-2 md:row-span-1 min-h-[200px]",
  },
];
