import { features } from "../content";
import { useActiveSection } from "../hooks/useActiveSection";

const StickyFeatureShowcase = () => {
  const { activeIndex, sectionRefs } = useActiveSection(features.length);

  return (
    <div className="relative w-full px-4 lg:px-10" style={{ height: `${features.length * 100}vh` }}>
      <div className="sticky top-24 md:top-32 w-full h-[70vh] md:h-[80vh] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              activeIndex === index ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={feature.img}
              alt={feature.title}
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                activeIndex === index
                  ? "scale-100 translate-y-0"
                  : activeIndex > index
                    ? "scale-105 -translate-y-8"
                    : "scale-105 translate-y-8"
              }`}
            />

            <div className="absolute inset-0 bg-gradient-to-r from-darkbg/95 via-darkbg/70 to-transparent"></div>

            <div
              className={`absolute inset-0 flex flex-col justify-center px-8 md:px-20 w-full md:w-[60%] transition-all duration-1000 delay-100 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                activeIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
              }`}
            >
              <h2 className="text-4xl md:text-6xl font-extrabold text-textwhite mb-6 leading-tight drop-shadow-2xl">
                {feature.title}
              </h2>
              <p className="text-lg md:text-xl text-textdimwhite leading-relaxed drop-shadow-lg">
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none pt-[35vh]">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            ref={(element) => {
              sectionRefs.current[index] = element;
            }}
            className="w-full h-[100vh]"
          />
        ))}
      </div>
    </div>
  );
};

export default StickyFeatureShowcase;
