import { IceCream as Github,Table as Twitter } from 'lucide-react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-darkbg/40 backdrop-blur-md mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <span className="text-xl font-bold tracking-tight text-textwhite bg-clip-text">
            DSA<span className="text-indigo-400">Hub</span>
          </span>
          <p className="text-sm text-textdimwhite mt-1">
            Bridging the gap between learning and doing.
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8">
          <Link to="/" className="text-textdimwhite hover:text-white transition-colors text-sm font-medium">Home</Link>
          <Link to="/about" className="text-textdimwhite hover:text-white transition-colors text-sm font-medium">About</Link>
          <a href="https://github.com/Devsharma08/DSA-LEETCODE" target="_blank" rel="noreferrer" className="text-textdimwhite hover:text-white transition-colors text-sm font-medium">Repository</a>
        </div>

        <div className="flex items-center gap-5">
          <a href="https://github.com/Devsharma08/DSA-LEETCODE" target="_blank" rel="noreferrer" className="text-textdimwhite hover:text-white transition-colors">
            <span className="sr-only">GitHub</span>
            <Github className="w-5 h-5" />
          </a>
          <a href="#" className="text-textdimwhite hover:text-white transition-colors">
            <span className="sr-only">Twitter</span>
            <Twitter className="w-5 h-5" />
          </a>
        </div>
      </div>
      
      <div className="w-full border-t border-white/5 py-6 text-center">
        <p className="text-xs text-textdimwhite/50">
          &copy; {new Date().getFullYear()} DSAHub. Open source and built for developers.
        </p>
      </div>
    </footer>
  )
}

export default Footer
