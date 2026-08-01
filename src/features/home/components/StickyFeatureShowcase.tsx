import { features } from "../content";
import { useActiveSection } from "../hooks/useActiveSection";

const StickyFeatureShowcase = () => {
  const { activeIndex, sectionRefs } = useActiveSection(features.length);

  return (
    <div className="w-full px-0 sm:px-4 lg:px-10">
      
      {/* 1. DESKTOP STICKY FEATURE SHOWCASE (Hidden on mobile/tablet under 768px, visible on md+) */}
      <div 
        className="hidden md:block relative w-full" 
        style={{ height: `${features.length * 80}vh` }} /* Decreased scroll height from 100vh to 80vh */
      >
        <div className="sticky top-32 z-10 h-[72vh] w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#02040a]">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                activeIndex === index ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {/* Feature Screenshot Background */}
              <img
                src={feature.img}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  activeIndex === index
                    ? "scale-100 translate-y-0"
                    : activeIndex > index
                      ? "scale-105 -translate-y-8"
                      : "scale-105 translate-y-8"
                }`}
              />

              {/* High-Contrast Gradient Overlay for flawless text legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#08090a]/98 via-[#08090a]/75 to-transparent z-10" />

              {/* Text Content Overlay */}
              <div
                className={`absolute top-0 left-0 z-20 flex h-full w-[52%] flex-col justify-center px-16 lg:px-20 transition-all delay-100 duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  activeIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
                }`}
              >
                <h2 
                  className="mb-6 text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                  dangerouslySetInnerHTML={{ __html: feature.title }}
                />
                <p 
                  className="text-sm lg:text-base leading-relaxed text-slate-300 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] font-sans"
                  dangerouslySetInnerHTML={{ __html: feature.desc }}
                />
              </div>

            </div>
          ))}
        </div>

        {/* Scroll Triggers */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none pt-[30vh]">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
              className="w-full h-[80vh]"
            />
          ))}
        </div>
      </div>

      {/* 2. MOBILE CLEAN STATIC CARDS (Visible on mobile/tablet under 768px, hidden on md+) */}
      <div className="flex md:hidden flex-col gap-6 w-full px-4 mt-4">
        {features.map((feature) => (
          <div 
            key={`mobile-${feature.title}`}
            className="w-full rounded-2xl border border-white/5 bg-[#060709] p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden"
            style={{ borderRadius: '1.5rem' }}
          >
            {/* Subtle background technical matrix grid coordinate texture */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px]"></div>

            {/* Title & Description stack - 100% visible, zero overlay clashes */}
            <div className="relative z-10 flex flex-col gap-3">
              <h3 
                className="text-lg sm:text-xl font-bold leading-snug text-white uppercase"
                dangerouslySetInnerHTML={{ __html: feature.title }}
              />
              <p 
                className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: feature.desc }}
              />
            </div>

            {/* Embedded framed screenshot graphic at the bottom */}
            <div className="relative z-10 w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <img 
                src={feature.img} 
                alt="" 
                className="w-full h-40 sm:h-52 object-cover object-top select-none"
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default StickyFeatureShowcase;
