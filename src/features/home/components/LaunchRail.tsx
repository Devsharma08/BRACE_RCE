import { ArrowUpRight, BookOpen, Swords, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

const destinations = [
  {
    title: "Battle arena",
    description: "Challenge another operative in a live coding match.",
    meta: "10 min · live rooms",
    to: "/lobby",
    icon: Swords,
    featured: true,
  },
  {
    title: "Practice problems",
    description: "Build your skills with focused algorithm challenges.",
    meta: "15–30 min · solo",
    to: "/problems",
    icon: BookOpen,
    featured: false,
  },
  {
    title: "Launch terminal",
    description: "Write, run, and debug in your coding workspace.",
    meta: "Any runtime · sandboxed",
    to: "/terminal",
    icon: Terminal,
    featured: false,
  },
];

export default function LaunchRail() {
  return (
    <nav aria-label="Home launch rail" className="w-full py-8 sm:py-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-fg">Choose your workspace</h2>
        <p className="text-xs text-subtle">Sign in to enter your workspace</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {destinations.map(({ title, description, meta, to, icon: Icon, featured }) => (
          <Link
            key={to}
            to={to}
            className={`group relative min-w-0 rounded-card border p-5 transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-primary ${
              featured
                ? "border-accent-primary/60 bg-accent-primary/10 shadow-glow-accent"
                : "border-subtle-line bg-surface"
            }`}
          >
            {featured && (
              <span className="absolute right-4 top-4 rounded-full border border-accent-primary/30 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-primary">
                Recommended
              </span>
            )}
            <div className="mb-8 flex items-center justify-between text-accent-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <h3 className="font-mono text-sm font-bold text-fg">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-subtle">{description}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-label">{meta}</p>
          </Link>
        ))}
      </div>
    </nav>
  );
}
