import { Link } from "react-router-dom";
import { bentoItems } from "../content";
import BentoPixelArt from "./BentoPixelArt";

const BentoGrid = () => {
  return (
    <div className="z-10 mx-auto mt-16 w-full max-w-6xl px-0 pb-12 sm:mt-20 sm:px-4 sm:pb-15">
      <div className="mb-7 text-center sm:mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-textwhite mb-4">Master Every Structure</h2>
        <p className="text-base text-textdimwhite sm:text-lg">Dive deep into categorized concepts directly from the repository.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-4 gap-4 md:gap-6 px-4 md:px-0">
        {bentoItems.map((item) => (
          <Link
            key={item.title}
            to={`/ds/${item.slug}`}
            className={`group relative flex flex-col wsm:flex-row items-start wsm:items-center justify-between gap-4 wsm:gap-6 overflow-hidden rounded-3rem cursor-pointer border border-white/5 bg-[#060709] p-6 sm:p-8 hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.04)] transition-all duration-500 ${item.className}`}
            style={{
              borderRadius: '2rem'
            }}
          >
            {/* Subtle background technical matrix grid coordinate texture */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {/* Glowing blur aura behind the icon block */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-24 h-24 bg-cyan-500/0 rounded-full blur-[30px] pointer-events-none group-hover:bg-cyan-500/5 transition-all duration-700"></div>

            {/* Left side: Content copy */}
            <div className="flex-1 flex flex-col justify-center relative z-20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg sm:text-xl font-bold text-textwhite tracking-tight transition-colors duration-300 group-hover:text-cyan-400">
                  {item.title}
                </h3>
              </div>
              <p className="text-textdimwhite text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                {item.desc}
              </p>
            </div>

            {/* Right side: Glassmorphic Pixel Art Icon wrapper */}
            <div className="relative z-10 shrink-0 flex items-center justify-center self-center wsm:self-auto">
              <BentoPixelArt slug={item.slug} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BentoGrid;


