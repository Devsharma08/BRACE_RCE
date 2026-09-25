import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { UseHeadroom } from '../../utils/styles/headRoom'
import { useAuth } from '../../context/AuthContext'
import {
  Bell,
  Info,
  LayoutDashboard,
  Menu,
  Shield,
  Terminal,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import { NotificationCenter } from '../features/NotificationCenter'

/**
 * SiteHeader — floating pill navigation.
 *
 * Sticky (in document flow) so pages scroll under it without padding hacks.
 * Keeps the app's real auth state, NotificationCenter, and headroom
 * hide-on-scroll behaviour; only the chrome styling changed.
 */
const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
  { href: '/friends', label: 'Friends', icon: UserPlus, auth: true },
  { href: '/terminal', label: 'Terminal', icon: Terminal },
  { href: '/about', label: 'About', icon: Info },
  // Admin-only. `admin: true` entries are filtered on the role so regular users
  // never see a link that would land them on a clearance-denied screen.
  { href: '/admin', label: 'Admin', icon: Shield, admin: true },
]

const Header = () => {
  const { visible } = UseHeadroom()
  const { pathname } = useLocation()
  const { isAuthenticated, isAdmin, user } = useAuth()
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname.startsWith(href)

  const visibleLinks = links.filter((link) => {
    if ('admin' in link && link.admin) return isAdmin
    return !('auth' in link && link.auth) || isAuthenticated
  })

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false)
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
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <header
      ref={navRef}
      className={`sticky top-0 z-50 bg-base/90 font-mono text-fg backdrop-blur-xl transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-[calc(100%+16px)] pointer-events-none'
      }`}
    >
      <div className='border-b border-line bg-base/95'>
        <div className='mx-auto flex h-[58px] items-center justify-between max-w-7xl px-4 sm:px-6'>
          {/* BRAND */}
          <Link to='/' className='group flex shrink-0 items-center gap-3' onClick={() => setOpen(false)}>
            <img
              src='/favicon.svg'
              alt='BRACE RCE'
              className='h-9 w-9 rounded-xl bg-accent-primary transition-transform duration-300 group-hover:rotate-6'
            />
            <span className='hidden text-xs font-bold tracking-[0.2em] sm:block'>
              BRACE <span className='text-accent-primary'>// RCE</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav
            aria-label='Main navigation'
            className='hidden items-center gap-1 rounded-xl border border-line bg-surface/60 p-1 md:flex'
          >
            {visibleLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                className={`rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                  isActive(href)
                    ? 'bg-surface-hover text-fg shadow-inner'
                    : 'text-faint hover:bg-surface-hover/60 hover:text-subtle'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* DESKTOP ACTIONS */}
          <div className='hidden items-center gap-2 md:flex'>
            <div className='flex items-center gap-2 border border-accent-success/20 bg-accent-success/[0.05] px-2 py-1 text-[9px] uppercase tracking-widest text-accent-success'>
              <span className='h-1.5 w-1.5 rounded-full bg-accent-success shadow-[0_0_9px_rgba(0,255,135,0.9)]' />
              ready
            </div>
            {isAuthenticated && (
              <div className='flex h-9 w-9 items-center justify-center'>
                <NotificationCenter />
              </div>
            )}
            {isAuthenticated ? (
              <Link
                to='/profile'
                aria-label={`Profile — ${user?.username || 'account'}`}
                className='grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-hover text-[10px] font-bold text-accent-primary transition hover:border-accent-primary/40'
              >
                <User size={15} />
              </Link>
            ) : (
              <Link
                to='/signin'
                aria-label='Sign in'
                className='grid place-items-center px-2 py-1 border border-accent-primary/50 bg-accent-primary/10 text-accent-primary transition hover:bg-accent-primary/20'
              >
                {/* <Bell size={0} className='hidden' /> */}
                <span className='text-[10px] font-bold tracking-widest'>LOG IN</span>
              </Link>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls='mobile-header-nav'
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            className='grid h-10 w-10 place-items-center rounded-xl border border-line text-subtle transition hover:border-accent-primary/50 hover:text-accent-primary md:hidden'
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}

<div
  id='mobile-header-nav'
  className={`mx-4 overflow-hidden transition-all duration-200 sm:mx-6 md:hidden ${
    open ? 'max-h-[80vh] overflow-y-auto py-3 opacity-100' : 'max-h-0 py-0 opacity-0'
  }`}
>
  <nav
    aria-label='Mobile navigation'
    className='rounded-card border border-subtle-line bg-surface p-2'
  >


          {visibleLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setOpen(false)}
              role='menuitem'
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                isActive(href)
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-faint hover:bg-surface-hover hover:text-fg'
              }`}
            >
              {Icon ? <Icon size={15} /> : <span className='h-1.5 w-1.5 rounded-full bg-current' />}
              {label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link
              to='/profile'
              onClick={() => setOpen(false)}
              role='menuitem'
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                isActive('/profile')
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-faint hover:bg-surface-hover hover:text-fg'
              }`}
            >
              <User size={15} />
              Profile
            </Link>
          ) : (
            <Link
            to='/signin'
            onClick={() => setOpen(false)}
            role='menuitem'
            className='flex items-center gap-3 rounded-xl px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-primary transition hover:bg-accent-primary/10'
            >
            <Bell size={15} />
            Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
