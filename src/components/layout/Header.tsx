import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { UseHeadroom } from '../../utils/styles/headRoom'
import { useAuth } from '../../context/AuthContext'
import { House, Terminal, LogIn, LayoutDashboard, Info, User, UserPlus, Menu } from 'lucide-react'
import { NotificationCenter } from '../features/NotificationCenter'

const Header = () => {
   const {visible} = UseHeadroom();
   const { pathname } = useLocation();
   const { isAuthenticated, user } = useAuth();
   const [mobileOpen, setMobileOpen] = useState(false);

   const isActive = (path: string) => {
      if (path === '/') return pathname === '/';
      return pathname.startsWith(path);
   };

   const desktopLinkClass = (path: string) =>
      `flex items-center px-4 py-2 font-mono text-xs uppercase tracking-wide font-semibold transition-all duration-300 ${isActive(path)
         ? 'border-b-2 border-[#00D4FF] text-[#00D4FF] pb-[2px]'
         : 'text-[#8892A4] hover:text-white border-b-2 border-transparent'
      }`;

   const mobileLinkClass = (path: string) =>
      `flex items-center gap-3 w-full px-4 py-3 font-mono text-xs uppercase tracking-wide font-medium transition-all ${isActive(path)
         ? 'border-l-2 border-[#00D4FF] text-[#00D4FF]'
         : 'text-[#8892A4] hover:text-white border-l-2 border-transparent'
      }`;

   return (
      <>
      <nav className={`fixed top-0 left-0 right-0 z-50 w-full h-[52px] bg-[#050608]/92 border-b border-white/6 font-mono text-xs transition-all duration-300 ${
      visible
        ? "opacity-100 translate-y-0"
        : "opacity-0 -translate-y-28 pointer-events-none"
      }`}>
         <div className='flex items-center justify-between px-4 sm:px-8 h-full'>
            {/* BRAND LOGO - FAVICON SVG IMAGE & ALWAYS VISIBLE TITLE */}
            <Link to="/" className='flex items-center gap-2.5 group shrink-0'>
               <img
                  src="/favicon.svg"
                  alt="BRACE RCE Logo"
                  className='w-7 h-7 transition-transform duration-300 group-hover:scale-110'
               />
               <span className=' hidden sm:inline text-sm uppercase tracking-widest text-white font-bold'>
                  BRACE // <span className='text-[#00D4FF] font-bold'>RCE</span>
               </span>
            </Link>

            {/* DESKTOP NAV (TEXT ONLY - NO ICONS ON LARGE SCREENS) */}
            <div className='hidden md:flex items-center space-x-2 lg:space-x-3'>
               <Link to="/" className={desktopLinkClass('/')}>
                  <span>HOME</span>
               </Link>
               {isAuthenticated && (
                  <>
                    <Link to="/dashboard" className={desktopLinkClass('/dashboard')}>
                      <span>DASHBOARD</span>
                    </Link>
                    <Link to="/friends" className={desktopLinkClass('/friends')}>
                      <span>FRIENDS</span>
                    </Link>
                  </>
               )}
               <Link to="/terminal" className={desktopLinkClass('/terminal')}>
                  <span>TERMINAL</span>
               </Link>
               <Link to="/about" className={desktopLinkClass('/about')}>
                  <span>ABOUT</span>
               </Link>

               {isAuthenticated ? (
                  <>
                    <NotificationCenter />
                    <Link to="/profile" className='ml-2'>
                     <span className={`flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-[#0c0f18] text-[#00D4FF] font-bold transition-all`}>
                        <span className='w-1.5 h-1.5 bg-[#00FF87]' />
                        {user?.username || 'PROFILE'}
                     </span>
                    </Link>
                  </>
               ) : (
                  <Link to="/signin">
                     <span className={`flex items-center gap-2 bg-[#00D4FF] text-[#050608] font-bold px-4 py-2 transition-all hover:opacity-85`}>
                        <LogIn className='w-4 h-4' />
                        <span>LOGIN</span>
                     </span>
                  </Link>
               )}
            </div>

            {/* MOBILE MENU TOGGLE */}
            <button
               className="md:hidden p-2 border border-white/6 text-[#8892A4] hover:text-white hover:border-[#00D4FF] transition-all rounded-none"
               onClick={() => setMobileOpen(o => !o)}
               aria-label="Toggle menu"
            >
               <Menu className="w-5 h-5" />
            </button>
         </div>

         {/* MOBILE DROPDOWN DRAWER */}
         {mobileOpen && (
            <div className="md:hidden absolute top-[52px] left-0 right-0 bg-[#080a10] border-b border-white/6 p-2 flex flex-col gap-1 z-40">
               <Link to="/" className={mobileLinkClass('/')} onClick={() => setMobileOpen(false)}>
                  <House className="w-4 h-4" />
                  <span>Home</span>
               </Link>
               {isAuthenticated && (
                 <>
                   <Link to="/dashboard" className={mobileLinkClass('/dashboard')} onClick={() => setMobileOpen(false)}>
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="text-sm tracking-normal font-normal">Dashboard</span>
                   </Link>
                   <Link to="/friends" className={mobileLinkClass('/friends')} onClick={() => setMobileOpen(false)}>
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm tracking-normal font-normal">Friends</span>
                   </Link>
                 </>
               )}
               <Link to="/terminal" className={mobileLinkClass('/terminal')} onClick={() => setMobileOpen(false)}>
                  <Terminal className="w-4 h-4" />
                  <span>Terminal</span>
               </Link>
               <Link to="/about" className={mobileLinkClass('/about')} onClick={() => setMobileOpen(false)}>
                  <Info className="w-4 h-4" />
                  <span>About</span>
               </Link>
               {isAuthenticated ? (
                  <>
                    <NotificationCenter />
                    <Link to="/profile" className={mobileLinkClass('/profile')} onClick={() => setMobileOpen(false)}>
                       <User className="w-4 h-4" />
                       <span className="text-sm tracking-normal font-normal">Profile</span>
                    </Link>
                  </>
               ) : (
                  <Link to="/signin" className={mobileLinkClass('/signin')} onClick={() => setMobileOpen(false)}>
                     <LogIn className="w-4 h-4" />
                     <span>Login</span>
                  </Link>
               )}
            </div>
         )}
      </nav>
      </>
   )
}

export default Header
