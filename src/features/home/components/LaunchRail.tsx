import { ArrowUpRight, BookOpen, Swords, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

const destinations = [
  { title: "Launch terminal", description: "Write, run, and debug in your coding workspace.", to: "/terminal", icon: Terminal },
  { title: "Practice problems", description: "Build your skills with focused algorithm challenges.", to: "/problems", icon: BookOpen },
  { title: "Battle arena", description: "Head to the lobby for a competitive coding match.", to: "/lobby", icon: Swords },
];

export default function LaunchRail() {
  return (
    <nav aria-label="Home launch rail" className="w-full py-8 sm:py-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-fg">Choose your workspace</h2>
        <p className="text-xs text-subtle">Sign in to enter your workspace</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {destinations.map(({ title, description, to, icon: Icon }) => (
          <Link key={to} to={to} className="group min-w-0 rounded-card border border-subtle-line bg-surface p-5 transition-colors hover:border-accent-primary/50 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-primary">
            <div className="mb-4 flex items-center justify-between text-accent-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 className="font-mono text-sm font-bold text-fg">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-subtle">{description}</p>
          </Link>
        ))}
      </div>
    </nav>
  );
}
