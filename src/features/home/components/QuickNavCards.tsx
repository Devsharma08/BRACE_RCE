import { Link } from "react-router-dom";
import {
  Swords,
  Users,
  Code2,
  Layers3,
} from "lucide-react";

/**
 * QuickNavCards — four uniform navigation cards on the home page.
 *
 * Battle · Terminal · Friends · Problems
 *
 * Every card shares the same size, radius, border, surface fill, icon
 * treatment, heading size, and description style so the whole home page
 * reads as one continuous system (the pixel-art hero is the only exception).
 */

const cards = [
  {
    href: "/battle",
    icon: Swords,
    accent: "text-accent-violet",
    label: "Competition",
    title: "Battle arena",
    description:
      "Enter ranked rooms, synchronize with an opponent, and solve under a shared clock.",
  },
  {
    href: "/ds",
    icon: Layers3,
    accent: "text-accent-primary",
    label: "Structure",
    title: "Data structures",
    description:
      "Eight domains, one execution engine. Open a structure, study the theory and implementations, then solve the matching problems.",
    footerLabel: "Explore",
    footerAction: "Browse →",
  },
  {
    href: "/friends",
    icon: Users,
    accent: "text-accent-warning",
    label: "Network",
    title: "Friends & challenges",
    description:
      "Track operative presence, compare progress, and issue direct coding challenges.",
  },
  {
    href: "/problems",
    icon: Code2,
    accent: "text-accent-success",
    label: "Learning",
    title: "Problem workspace",
    description:
      "Browse algorithm problems beside a focused editor, hints, examples, and test cases.",
  },
];

export function QuickNavCards() {
  return (
    <section aria-label="Quick navigation" className="w-full py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header — identical treatment to every other section */}
        <div className="mb-10 sm:mb-14 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,212,255,0.9)]" />
            quick navigation
          </div>
          <h2 className="mt-5 font-mono text-4xl font-bold tracking-[-0.04em] text-fg md:text-5xl">
            Four entry points.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-subtle mx-auto">
            Battle arena · data structures · friends · problem workspace — each is a front door into the same execution engine.
          </p>
        </div>

        {/* Card grid — uniform radius, surface, border, icon, heading, copy */}
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {cards.map(({ href, icon: Icon, accent, label, title, description, footerLabel, footerAction }) => (
            <Link
              key={href}
              to={href}
              className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-line-mid hover:bg-surface-hover md:p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              {/* Label + icon row */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
                  {label}
                </span>
                <span className={`grid h-9 w-9 place-items-center rounded-full border border-line bg-black/20 ${accent} transition duration-300 group-hover:scale-105 group-hover:border-line-mid`}>
                  <Icon size={17} />
                </span>
              </div>
              {/* Title + description */}
              <div className="mt-4 flex flex-col gap-2">
                <h3 className="font-mono text-lg font-bold tracking-tight text-fg group-hover:text-accent-primary transition-colors">
                  {title}
                </h3>
                <p className="text-sm leading-6 text-subtle group-hover:text-subtle transition-colors">
                  {description}
                </p>
              </div>
              {/* Footer chip */}
                            <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">
                  {footerLabel ?? "Open protocol"}
                </span>
                <span className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest ${accent}`}>
                  {footerAction ?? "Go"} <span className="transition group-hover:translate-x-0.5 group-hover:translate-y-[-0.5]">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default QuickNavCards;
