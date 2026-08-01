import { Link } from 'react-router-dom'

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-md mt-auto relative z-10 font-mono text-xs">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <span className="text-sm font-bold tracking-widest text-white">
            BRACE // <span className="text-cyan-400">RCE</span>
          </span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">
            BRIDGING_THE_GAP_BETWEEN_LEARNING_AND_DOING
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6">
          <Link to="/" className="text-slate-400 hover:text-cyan-400 transition-colors uppercase">[ HOME ]</Link>
          <Link to="/about" className="text-slate-400 hover:text-cyan-400 transition-colors uppercase">[ ABOUT ]</Link>
          <a href="https://github.com/Devsharma08/DSA-LEETCODE" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 transition-colors uppercase">[ REPOSITORY ]</a>
        </div>

        <div className="flex items-center gap-4">
          <a href="https://github.com/Devsharma08/DSA-LEETCODE" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 transition-colors">
            <span className="sr-only">GitHub</span>
            <GithubIcon className="w-4 h-4" />
          </a>
          <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">
            <span className="sr-only">Twitter</span>
            <TwitterIcon className="w-4 h-4" />
          </a>
        </div>
      </div>
      
      <div className="w-full border-t border-white/5 py-4 text-center">
        <p className="text-[9px] text-slate-600 uppercase">
          &copy; {new Date().getFullYear()} BRACERCE. OPEN_SOURCE // BUILT_FOR_DEVELOPERS.
        </p>
      </div>
    </footer>
  )
}

export default Footer
