import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import { Footer } from './Footer'

import GlobalModals from '../features/GlobalModals'

const Layout = () => {
  const { pathname } = useLocation()
  const hidden = pathname === "/terminal" || pathname === "/signin" || pathname === "/signup" || pathname.includes("/battle");
  
  return (
    <div className="flex flex-col min-h-screen relative w-full bg-[#02040a]">
      <GlobalModals />

      {hidden ? (
        <main className="h-screen w-full relative z-10 bg-[#02040a]">
          <Outlet />
        </main>
      ) : (
        <>
          <Header />
          {/* Main content wrapper with margin-bottom to reveal expanded 380px/340px fixed curtain footer on scroll */}
          <main className="flex-grow min-h-screen w-full relative z-10 bg-[#02040a] mb-[380px] sm:mb-[340px] shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
            <Outlet />
          </main>
          <Footer />
        </>
      )}
    </div>
  )
}

export default Layout
