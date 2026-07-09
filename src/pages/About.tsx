import { Info, IceCream as Github, User, Heart } from 'lucide-react'

const About = () => {
  return (
    <section className="flex flex-col items-center pt-24 px-6 relative overflow-hidden h-full">

      <div className="max-w-4xl w-full flex flex-col items-center text-center z-10 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-default">
          <Info className="w-4 h-4" />
          About This Project
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-textwhite mb-6">
          Bridging the Gap Between <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Learning & Doing</span>
        </h1>
        
        <p className="text-lg text-textdimwhite max-w-2xl leading-relaxed">
          DSAHub is an open-source platform designed to make exploring Data Structures and Algorithms seamless. By connecting directly to GitHub, it provides a real-time, cached, and interactive way to study code.
        </p>
      </div>

      <div className="w-full max-w-3xl bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-md z-10 relative shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent rounded-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-300">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-semibold text-textwhite">The Creator</h3>
            <p className="text-textdimwhite leading-relaxed">
              Built by Dev Sharma as a way to share coding solutions and experiment with modern web technologies, combining the power of GitHub APIs with high-performance caching.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30 text-pink-300">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-semibold text-textwhite">Open Source</h3>
            <p className="text-textdimwhite leading-relaxed">
              Everything you see here is open-source. We believe that coding education should be accessible and visually engaging for everyone.
            </p>
            <a href="https://github.com/Devsharma08/DSA-LEETCODE" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-2 text-indigo-400 hover:text-indigo-300 transition-colors font-medium w-fit">
              <Github className="w-4 h-4" /> View Repository
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
