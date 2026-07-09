import { Outlet } from 'react-router-dom'
import Header from './header'
import Footer from './Footer'

const BackgroundShapes = () => (
  <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
    {/* Glowing Orbs for ambiance */}
    <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-purple-600/10 blur-[100px]" />

    {/* Decorative Animated Circle SVG */}
    <svg 
      className="absolute top-[15%] left-[5%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] text-indigo-400/20 animate-[spin_40s_linear_infinite]" 
      viewBox="0 0 100 100"
      fill="none"
    >
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="0.2" />
      <circle cx="50" cy="2" r="2" fill="currentColor" />
    </svg>

    {/* Decorative Animated Rectangle SVG */}
    <svg 
      className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] min-w-[350px] min-h-[350px] text-purple-400/20 animate-[spin_50s_linear_infinite_reverse]" 
      viewBox="0 0 100 100"
      fill="none"
    >
      <rect x="10" y="10" width="80" height="80" rx="8" stroke="currentColor" strokeWidth="0.5" transform="rotate(15 50 50)" />
      <rect x="25" y="25" width="50" height="50" rx="4" stroke="currentColor" strokeWidth="0.2" strokeDasharray="2 4" transform="rotate(-15 50 50)" />
      <rect x="10" y="10" width="4" height="4" fill="currentColor" transform="rotate(15 50 50)" />
    </svg>
  </div>
)

const Layout = () => {
  return (
    <div className='flex flex-col min-h-screen relative w-full'>
      <BackgroundShapes />
      <div className="z-10 flex flex-col flex-grow w-full relative">
        <Header/>
        <main className='flex-grow w-full relative'>
          <Outlet/>
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
