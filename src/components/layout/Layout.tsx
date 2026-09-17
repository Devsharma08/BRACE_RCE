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

  // These routes manage their own full-screen layout
  const isFullscreen =
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname.startsWith('/battle')

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#050608] text-[#F0F4FF]">
      <GlobalModals />

      {pathname === '/terminal' ? (
        <>
          <Header />
          <main className="h-screen w-full bg-[#050608]">
            <Outlet />
          </main>
        </>
      ) : isFullscreen ? (
        /* Full-screen routes: no header, no footer, no padding */
        <main className="flex-1 h-screen w-full bg-[#050608]">
          <Outlet />
        </main>
      ) : (
        <>
          <Header />

          {/*
            Main content sits below the fixed header (pt-14 = 3.5rem = 56px).
            The footer is a normal document-flow element so scrolling is natural.
          */}
          <main className="flex-1 w-full pt-14 bg-[#050608]">
            <Outlet />
          </main>

          <Footer />
        </>
      )}
    </div>
  )
}

export default Layout
