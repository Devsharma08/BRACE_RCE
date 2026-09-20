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

          <Footer variant={isTrimmedFooter ? 'compact' : 'full'} />
        </>
      )}
    </div>
  )
}

export default Layout
