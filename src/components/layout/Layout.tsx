import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import {Footer} from './Footer'
import { useAuth } from '../../context/AuthContext'



import GlobalModals from '../features/GlobalModals'

const Layout = () => {
  const { pathname } = useLocation()
  const hidden = pathname === "/terminal" || pathname === "/signin" || pathname === "/signup" || pathname.includes("/battle") ;
  
  return (
    <div className='flex flex-col min-h-screen relative w-full'>
      <GlobalModals />
      <div className='z-10 flex flex-col glex-grow w-full relative'>
        {hidden ? null : <Header />}
        <main className={`flex-grow ${hidden ? 'h-screen' : 'h-fit'}`}>
          <Outlet/>
        </main>
        {hidden ? null : <Footer />}
      </div>
    </div>
  )
}

export default Layout
