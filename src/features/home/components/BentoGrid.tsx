import { bentoItems } from "../content";

const BentoGrid = () => {
  return (
    <div className="w-full max-w-6xl mx-auto mt-20 z-10 pb-32 px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-textwhite mb-4">Master Every Structure</h2>
        <p className="text-textdimwhite text-lg">Dive deep into categorized concepts directly from the repository.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 md:gap-6">
        {bentoItems.map((item) => (
          <div
            key={item.title}
            className={`group relative overflow-hidden rounded-3xl cursor-default border border-white/10 shadow-lg ${item.className}`}
          >
            <img
              src={item.img}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110 opacity-50 group-hover:opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/60 to-transparent group-hover:from-darkbg/90 transition-all duration-500"></div>

            <div className="absolute inset-0 p-8 flex flex-col justify-end">
              <h3 className="text-2xl font-bold text-textwhite mb-1 transform transition-transform duration-500 group-hover:-translate-y-2">
                {item.title}
              </h3>
              <p className="text-textdimwhite text-sm font-medium opacity-0 transform translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0 line-clamp-2">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BentoGrid;
