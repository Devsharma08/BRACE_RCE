import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { UseHeadroom } from '../../utils/styles/headRoom'
import { useAuth } from '../../context/AuthContext'
import { House, MenuIcon, Terminal, X, LogIn, LayoutDashboard, Info, User } from 'lucide-react'

const Header = () => {
   const direction = UseHeadroom();
   const { pathname } = useLocation();
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const { isAuthenticated, user } = useAuth();

   const isActive = (path: string) => {
      if (path === '/') return pathname === '/';
      return pathname.startsWith(path);
   };

   const desktopLinkClass = (path: string) =>
      `relative flex items-center px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider font-semibold transition-all duration-300 ${
         isActive(path)
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)] backdrop-blur-md'
            : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 border border-transparent'
      }`;

   const mobileLinkClass = (path: string) =>
      `flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all uppercase font-mono text-xs ${
         isActive(path)
            ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            : 'text-slate-300 hover:bg-white/5 hover:text-cyan-300 border border-transparent'
      }`;

  return (
    <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl rounded-full bg-[#0a0d14]/90 backdrop-blur-2xl backdrop-saturate-200 py-3.5 px-5 sm:px-8 border border-white/20 shadow-[0_10px_38px_0_rgba(0,0,0,0.8),0_0_1px_1px_rgba(255,255,255,0.1)] font-mono text-xs transition-all duration-300 ${direction === 'down' ? '-translate-y-28 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
      <div className='flex items-center justify-between'>
         {/* BRAND LOGO - FAVICON SVG IMAGE & ALWAYS VISIBLE TITLE */}
         <Link to="/" onClick={() => setIsMenuOpen(false)} className='flex items-center gap-2.5 group shrink-0'>
            <img 
               src="/favicon.svg" 
               alt="BRACE RCE Logo" 
               className='w-7 h-7 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]'
            />
            <span className='text-sm sm:text-base uppercase tracking-widest text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'>
               BRACE // <span className='text-cyan-400 font-black'>RCE</span>
            </span>
         </Link>
         
         {/* DESKTOP NAV (TEXT ONLY - NO ICONS ON LARGE SCREENS) */}
         <div className='hidden md:flex items-center space-x-2 lg:space-x-3'>
            <Link to="/" className={desktopLinkClass('/')}>
               <span>HOME</span>
            </Link>
            {isAuthenticated && (
               <Link to="/dashboard" className={desktopLinkClass('/dashboard')}>
                  <span>DASHBOARD</span>
               </Link>
            )}
            <Link to="/terminal" className={desktopLinkClass('/terminal')}>
               <span>TERMINAL</span>
            </Link>
            <Link to="/about" className={desktopLinkClass('/about')}>
               <span>ABOUT</span>
            </Link>
            
            {isAuthenticated ? (
               <Link to="/profile" className='ml-2'>
                  <span className={`flex items-center gap-2 px-4 py-2 bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-bold rounded-full transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] ${isActive('/profile') ? 'bg-cyan-600/30 border-cyan-300 text-white' : ''}`}>
                     <User className='w-4 h-4' />
                     <span>PROFILE ({user?.username?.toUpperCase()})</span>
                  </span>
               </Link>
            ) : (
               <Link to="/signin" className='ml-2'>
                  <span className={`flex items-center gap-2 px-4.5 py-2 bg-indigo-950/60 border border-indigo-400/50 hover:border-indigo-300 text-indigo-200 font-bold rounded-full transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] ${isActive('/signin') ? 'bg-indigo-600/40 border-indigo-300 text-white' : ''}`}>
                     <LogIn className='w-4 h-4' />
                     <span>LOGIN</span>
                  </span>
               </Link>
            )}
         </div>

         {/* SMALL SCREEN ICON-ONLY BAR (SMALL MOBILE SCREENS < MD) */}
         <div className='flex md:hidden items-center gap-1.5 sm:gap-2.5'>
            <Link to="/" title="Home" className={`p-2.5 rounded-full transition-all ${isActive('/') ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 border border-transparent'}`}>
               <House className='w-4.5 h-4.5' />
            </Link>

            {isAuthenticated && (
               <Link to="/dashboard" title="Dashboard" className={`p-2.5 rounded-full transition-all ${isActive('/dashboard') ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 border border-transparent'}`}>
                  <LayoutDashboard className='w-4.5 h-4.5' />
               </Link>
            )}

            <Link to="/terminal" title="Terminal" className={`p-2.5 rounded-full transition-all ${isActive('/terminal') ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 border border-transparent'}`}>
               <Terminal className='w-4.5 h-4.5' />
            </Link>

            <Link to="/about" title="About" className={`p-2.5 rounded-full transition-all ${isActive('/about') ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 border border-transparent'}`}>
               <Info className='w-4.5 h-4.5' />
            </Link>

            {isAuthenticated ? (
               <Link to="/profile" title={`Profile (${user?.username})`} className={`p-2.5 rounded-full bg-cyan-950/50 border border-cyan-500/50 text-cyan-300 hover:text-white transition-all ml-1 shadow-[0_0_12px_rgba(6,182,212,0.25)] ${isActive('/profile') ? 'bg-cyan-600/40 border-cyan-300 text-white' : ''}`}>
                  <User className='w-4.5 h-4.5' />
               </Link>
            ) : (
               <Link to="/signin" title="Login" className={`p-2.5 rounded-full bg-indigo-950/60 border border-indigo-500/50 text-indigo-200 hover:text-white transition-all ml-1 shadow-[0_0_12px_rgba(99,102,241,0.25)] ${isActive('/signin') ? 'bg-indigo-600/40 border-indigo-300 text-white' : ''}`}>
                  <LogIn className='w-4.5 h-4.5' />
               </Link>
            )}

            {/* MOBILE MENU DROPDOWN TOGGLE */}
            <button
               type="button"
               onClick={() => setIsMenuOpen((open) => !open)}
               aria-label="Toggle Navigation Menu"
               className='p-2.5 rounded-full bg-[#121824] border border-white/20 text-cyan-400 cursor-pointer hover:bg-cyan-950/50 hover:border-cyan-400/40 transition-all ml-1'
            >
               {isMenuOpen ? <X className='w-4.5 h-4.5'/> : <MenuIcon className='w-4.5 h-4.5'/>}
            </button>
         </div>
      </div>
      
      {/* MOBILE EXPANDED MENU */}
      {isMenuOpen && (
         <div className="md:hidden mx-auto mt-4 grid gap-2 border-t border-white/15 pt-4 text-xs font-mono">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/')}>
               <House className='w-4.5 h-4.5' />
               <span>HOME</span>
            </Link>
            {isAuthenticated && (
               <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/dashboard')}>
                  <LayoutDashboard className='w-4.5 h-4.5' />
                  <span>DASHBOARD</span>
               </Link>
            )}
            <Link to="/terminal" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/terminal')}>
               <Terminal className='w-4.5 h-4.5' />
               <span>TERMINAL</span>
            </Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/about')}>
               <Info className='w-4.5 h-4.5' />
               <span>ABOUT</span>
            </Link>
            
            {isAuthenticated ? (
               <Link to="/profile" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/profile')}>
                  <User className='w-4.5 h-4.5' />
                  <span>PROFILE ({user?.username?.toUpperCase()})</span>
               </Link>
            ) : (
               <Link to="/signin" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/signin')}>
                  <LogIn className='w-4.5 h-4.5' />
                  <span>LOGIN</span>
               </Link>
            )}
         </div>
      )}
    </nav>
  )
}

export default Header
