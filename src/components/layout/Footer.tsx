type FooterVariant = "full" | "compact";

/**
 * Shared application footer.
 *
 * `full` is the marketing-scale footer for public browsing pages.
 * `compact` is a slim system strip for dense app views (e.g. /profile)
 * where a full-size footer would crowd the layout.
 */
export const Footer = ({ variant = "full" }: { variant?: FooterVariant } = {}) => {
  if (variant === "compact") {
    return (
      <footer className="w-full border-t border-subtle-line bg-base px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 font-mono text-[10px] uppercase tracking-widest text-faint sm:flex-row">
          <span className="text-subtle">BRACE RCE — built with love by Dev Sharma</span>
          <span>DSA journey × web development</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-subtle-line bg-base px-4 py-12 text-center sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="font-sans text-5xl font-black leading-none tracking-tighter text-white sm:text-7xl md:text-8xl lg:text-9xl">BRACE RCE</p>
        <p className="mt-6 text-sm text-subtle">Built with love by Dev Sharma.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-subtle">A little piece of my DSA journey, brought to life with my web development skills.</p>
      </div>
    </footer>
  );
};
