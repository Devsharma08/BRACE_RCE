import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import { Footer } from './Footer'
import GlobalModals from '../features/GlobalModals'

/**
 * Shell layout wrapping all public-facing pages.
 *
 * Pages that are fullscreen experiences (battle, auth) skip
 * the header + footer entirely and render their own chrome.
 */
const Layout = () => {
  const { pathname } = useLocation()

  // These routes manage their own full-screen layout.
  // /dashboard is NOT fullscreen: it renders the DashboardSidebar shell and
  // needs to scroll past one viewport, so it flows through the standard branch
  // below (which carries the header + footer and has no h-screen clamp).
  const isFullscreen =
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname.startsWith('/battle') ||
    pathname.startsWith('/terminal');

  // Dense app views (e.g. /profile) keep the header but get a slim footer —
  // the full-size footer crowds their vertical layout.
  const isTrimmedFooter = pathname.startsWith('/profile');

  // Routes rendered inside ConsoleShell (Root.tsx). ConsoleShell mounts the
  // FIXED DashboardSidebar rail and the FIXED MobileBottomNav, but the footer
  // is rendered by Layout OUTSIDE that shell — so on these paths the footer
  // needs its own rail offset + bottom-nav clearance (see Footer.offsetRail)
  // or the rail paints over its left edge and the nav over the copyright row.
  //
  // /admin is deliberately absent: AdminLayout's sidebar is a normal in-flow
  // <aside>, not a fixed rail, so its footer already clears it.
  const isConsoleRoute =
    pathname === '/dashboard' ||
    pathname === '/problems' ||
    pathname === '/lobby' ||
    pathname === '/friends' ||
    pathname === '/profile' ||
    pathname === '/rooms/create' ||
    pathname === '/create-room';

  return (
    <div className="flex flex-col min-h-screen w-full bg-base text-fg">
      <GlobalModals />

      {isFullscreen ? (
        /* Full-screen routes: no header, no footer, no padding */
        <main className="flex-1 h-screen w-full bg-base">
          <Outlet />
        </main>
      ) : (
        <>
          <Header />

          {/*
            Header is sticky (in document flow), so main needs no top padding.
            The footer is a normal document-flow element so scrolling is natural.
          */}
          <main className="flex-1 w-full bg-base">
            <Outlet />
          </main>

          <Footer
            variant={isTrimmedFooter ? 'compact' : 'full'}
            offsetRail={isConsoleRoute}
          />
        </>
      )}
    </div>
  )
}

export default Layout
