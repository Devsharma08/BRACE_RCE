import { Link } from "react-router-dom";
import { bentoItems } from "../content";
import BentoPixelArt from "./BentoPixelArt";
import { Database } from "lucide-react";

const BentoGrid = () => {
  return (
    <section aria-labelledby="home-categories-title" className="w-full overflow-hidden border-b border-subtle-line py-16 font-mono sm:py-24">
      <div className="mx-auto mb-8 max-w-3xl px-4 text-center sm:mb-12">
        <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-btn border border-subtle-line bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wider text-accent-primary">
          <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Data structures // Categories</span>
        </div>
        <h2 id="home-categories-title" className="mb-4 text-3xl font-black leading-tight tracking-tight text-fg sm:text-4xl md:text-5xl">Master Every <span className="text-accent-primary">Structure</span></h2>
        <p className="mx-auto max-w-xl font-sans text-sm leading-relaxed text-subtle">Dive deep into categorized data structure concepts directly from the repository.</p>
      </div>
      {/* Stationary cards keep every category reachable on touch and keyboard. */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-2 sm:px-6 md:grid-cols-2">
        {bentoItems.map(item => (
          <Link key={item.slug} to={`/ds/${item.slug}`} className="group flex min-w-0 items-center gap-4 rounded-card border border-subtle-line bg-surface p-4 transition-colors hover:border-accent-primary/50 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary sm:p-6">
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-base font-black tracking-tight text-fg group-hover:text-accent-primary sm:text-lg">{item.title}</h3>
              <p className="font-sans text-sm leading-relaxed text-subtle">{item.desc}</p>
            </div>
            <div className="hidden shrink-0 sm:block" aria-hidden="true"><BentoPixelArt slug={item.slug} /></div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BentoGrid;
