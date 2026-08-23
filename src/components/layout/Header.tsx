import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { UseHeadroom } from '../../utils/styles/headRoom'
import { useAuth } from '../../context/AuthContext'
import { House, MenuIcon, Terminal, X, LogIn, LogOut } from 'lucide-react'

const Header = () => {
   const direction = UseHeadroom();
   const { pathname } = useLocation();
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const { isAuthenticated, logout, user } = useAuth();

   const isActive = (path: string) => {
      if (path === '/') return pathname === '/';
      return pathname.startsWith(path);
   };

   const desktopLinkClass = (path: string) =>
      `transition-colors duration-200 uppercase tracking-wider py-1 ${
         isActive(path)
            ? 'text-cyan-400 font-bold border-b-2 border-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]'
            : 'text-slate-400 hover:text-cyan-400'
      }`;

   const mobileLinkClass = (path: string) =>
      `flex items-center gap-2 px-3 py-2 transition-all uppercase font-mono ${
         isActive(path)
            ? 'bg-cyan-950/40 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
            : 'text-slate-400 hover:bg-cyan-950/10 hover:text-cyan-400 border border-transparent'
      }`;

  return (
    <nav className={`fixed top-0 right-0 left-0 z-50 backdrop-blur-md backdrop-saturate-150 py-4 px-6 w-full shadow-none bg-black/70 border-b border-white/10 font-mono text-xs transition-transform duration-100 ${direction === 'down' ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className='flex items-center max-w-7xl mx-auto justify-between'>
         <Link to="/" onClick={() => setIsMenuOpen(false)} className='flex items-center gap-2.5 group'>
            <div className='border border-cyan-500/40 bg-cyan-950/20 p-2 rounded-none transition-all duration-300 group-hover:border-cyan-400 group-hover:bg-cyan-950/40 shadow-sm shadow-cyan-950/50'>
               <Terminal className='w-4 h-4 text-cyan-400' />
            </div>
            <span className='text-sm uppercase tracking-widest text-white font-bold'>
               BRACE // <span className='text-cyan-400'>RCE</span>
            </span>
         </Link>
         
         {/* DESKTOP NAV */}
         <div className='hidden wmd:flex items-center space-x-6'>
            <Link to="/" className={`flex items-center gap-1.5 ${desktopLinkClass('/')}`}>
               <House className='w-3.5 h-3.5' />
               <span>[ HOME ]</span>
            </Link>
            {isAuthenticated && (
               <Link to="/dashboard" className={desktopLinkClass('/dashboard')}>
                  [ DASHBOARD ]
               </Link>
            )}
            <Link to="/terminal" className={desktopLinkClass('/terminal')}>[ TERMINAL ]</Link>
            <Link to="/about" className={desktopLinkClass('/about')}>[ ABOUT ]</Link>
            
            {isAuthenticated ? (
               <button onClick={logout} className='flex items-center gap-2 px-3 py-1.5 bg-red-950/30 border border-red-500/40 hover:border-red-400 rounded-none transition-all duration-300 text-red-400 hover:text-red-300 uppercase tracking-wider cursor-pointer font-bold shadow-sm'>
                  <LogOut className='w-3.5 h-3.5' />
                  <span>[ LOGOUT - {user?.username} ]</span>
               </button>
            ) : (
               <Link to="/signin" className={desktopLinkClass('/signin')}>
                  <span className='flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/30 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 font-bold'>
                     <LogIn className='w-3.5 h-3.5' />
                     <span>[ LOGIN ]</span>
                  </span>
               </Link>
            )}
         </div>

         {/* MOBILE MENU TOGGLE */}
         <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className='wmd:hidden block p-2 rounded-none bg-black/60 border border-white/15 text-cyan-400 cursor-pointer hover:bg-cyan-950/20 transition-all'
         >
            {isMenuOpen ? <X className='w-4 h-4'/> : <MenuIcon className='w-4 h-4'/>}
         </button>
      </div>
      
      {/* MOBILE MENU */}
      {isMenuOpen && (
         <div className="wmd:hidden mx-auto mt-4 grid max-w-7xl gap-1.5 border-t border-white/10 pt-4 text-xs font-mono">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/')}>
               <House className='w-3.5 h-3.5' />
               <span>[ HOME ]</span>
            </Link>
            {isAuthenticated && (
               <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/dashboard')}>
                  <span>[ DASHBOARD ]</span>
               </Link>
            )}
            <Link to="/terminal" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/terminal')}>
               <span>[ TERMINAL ]</span>
            </Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/about')}>
               <span>[ ABOUT ]</span>
            </Link>
            
            {isAuthenticated ? (
               <button onClick={() => { logout(); setIsMenuOpen(false); }} className='flex items-center gap-2 rounded-none px-3 py-2 text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/30 transition-all uppercase w-full text-left cursor-pointer font-bold mt-1'>
                  <LogOut className='w-3.5 h-3.5' />
                  <span>[ LOGOUT - {user?.username} ]</span>
               </button>
            ) : (
               <Link to="/signin" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/signin')}>
                  <LogIn className='w-3.5 h-3.5' />
                  <span>[ LOGIN ]</span>
               </Link>
            )}
         </div>
      )}
    </nav>
  )
}

export default Header
