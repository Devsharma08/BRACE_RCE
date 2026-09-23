import Layout from './components/layout/Layout'
import { SidebarProvider } from './context/SidebarContext'

const App = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-base text-fg font-mono selection:bg-accent-primary/30 selection:text-accent-primary">
        <Layout/>
      </div>
    </SidebarProvider>
  )
}

export default App