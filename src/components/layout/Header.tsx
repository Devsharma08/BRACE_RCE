import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { UseHeadroom } from '../../utils/styles/headRoom'
import { useAuth } from '../../context/AuthContext'
import {
  House,
  Terminal,
  LogIn,
  LayoutDashboard,
  Info,
  User,
  UserPlus,
  Menu,
  X,
} from 'lucide-react'
import { NotificationCenter } from '../features/NotificationCenter'

const Header = () => {
  const { visible } = UseHeadroom()
  const { pathname } = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    // Small delay so the toggle click itself doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileOpen])

  // Close on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  const desktopLinkClass = (path: string) =>
    `flex items-center px-4 py-2 font-mono text-xs uppercase tracking-wide font-semibold transition-all duration-200 ${
      isActive(path)
        ? 'border-b-2 border-[#00D4FF] bg-cyan-500/8 text-[#00D4FF] pb-[6px]'
        : 'text-[#8892A4] hover:text-white border-b-2 border-transparent hover:border-white/20'
    }`

  const mobileLinkClass = (path: string) =>
    `flex items-center gap-3 w-full px-4 py-3.5 font-mono text-xs uppercase tracking-wide font-medium transition-all ${
      isActive(path)
        ? 'border-l-2 border-[#00D4FF] text-[#00D4FF] bg-cyan-500/5'
        : 'text-[#8892A4] hover:text-white border-l-2 border-transparent hover:bg-white/3'
    }`

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className={`fixed top-0 left-0 right-0 z-50 h-14 bg-[#0b1021]/92 backdrop-blur-xl border-b border-cyan-500/15 font-mono text-xs transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-14 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-8 h-full">

        {/* BRAND LOGO */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group shrink-0"
          style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.5))' }}
        >
          <img
            src="/favicon.svg"
            alt="BRACE RCE"
            className="w-7 h-7 transition-transform duration-300 group-hover:scale-110"
          />
          <span
            className="hidden sm:inline text-sm uppercase tracking-widest text-white font-black font-mono"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            BRACE //{' '}
            <span className="text-[#00D4FF] font-black drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]">RCE</span>
          </span>
        </Link>

        {/* CENTER MODE INDICATOR — desktop only */}
        <div className="hidden md:flex items-center gap-4 absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-400/70">
            1v1 BATTLE ARENA
          </span>
          <span className="text-[10px] font-mono text-emerald-400/80">
            PING: 14ms
          </span>
        </div>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <Link to="/" className={desktopLinkClass('/')}>HOME</Link>

          {isAuthenticated && (
            <>
              <Link to="/dashboard" className={desktopLinkClass('/dashboard')}>
                DASHBOARD
              </Link>
              <Link to="/friends" className={desktopLinkClass('/friends')}>
                FRIENDS
              </Link>
            </>
          )}

          <Link to="/terminal" className={desktopLinkClass('/terminal')}>
            TERMINAL
          </Link>
          <Link to="/about" className={desktopLinkClass('/about')}>
            ABOUT
          </Link>

          {isAuthenticated ? (
            <>
              <div className="relative w-8 h-8 flex items-center justify-center border-l border-cyan-500/10 pl-3 ml-1">
                <NotificationCenter />
              </div>
              <Link to="/profile" className="ml-1">
                <span className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/15 bg-[#0b1021] text-[#00D4FF] font-mono font-bold text-xs transition-all hover:border-cyan-400 hover:bg-cyan-500/10">
                  <span className="w-1.5 h-1.5 bg-[#00FF87] animate-pulse rounded-full" />
                  <span className="max-w-[120px] truncate" title={user?.username}>
                    {user?.username || 'PROFILE'}
                  </span>
                </span>
              </Link>
            </>
          ) : (
            <Link to="/signin" className="ml-1">
              <span className="flex items-center gap-2 bg-[#00D4FF] text-[#050608] font-bold px-4 py-2 text-xs transition-all hover:bg-cyan-300">
                <LogIn className="w-4 h-4" />
                LOGIN
              </span>
            </Link>
          )}
        </div>

        {/* MOBILE: notification + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated && <NotificationCenter />}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            className="p-2 border border-white/10 text-[#8892A4] hover:text-white hover:border-[#00D4FF]/50 transition-all"
          >
            {mobileOpen
              ? <X className="w-5 h-5" />
              : <Menu className="w-5 h-5" />
            }
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN — outside the flex row so it can be full-width */}
      <div
        id="mobile-nav-menu"
        role="menu"
        aria-label="Mobile navigation"
        className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out ${
          mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } bg-[#0b1021]/98 backdrop-blur-xl border-b border-white/6`}
      >
        <div className="flex flex-col py-2">
          <Link to="/" className={mobileLinkClass('/')} role="menuitem">
            <House className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </Link>

          {isAuthenticated && (
            <>
              <Link to="/dashboard" className={mobileLinkClass('/dashboard')} role="menuitem">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </Link>
              <Link to="/friends" className={mobileLinkClass('/friends')} role="menuitem">
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Friends</span>
              </Link>
            </>
          )}

          <Link to="/terminal" className={mobileLinkClass('/terminal')} role="menuitem">
            <Terminal className="w-4 h-4 shrink-0" />
            <span>Terminal</span>
          </Link>
          <Link to="/about" className={mobileLinkClass('/about')} role="menuitem">
            <Info className="w-4 h-4 shrink-0" />
            <span>About</span>
          </Link>

          {isAuthenticated ? (
            <Link to="/profile" className={mobileLinkClass('/profile')} role="menuitem">
              <User className="w-4 h-4 shrink-0" />
              <span>Profile</span>
            </Link>
          ) : (
            <Link to="/signin" className={mobileLinkClass('/signin')} role="menuitem">
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Header
