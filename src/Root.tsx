import { StrictMode, Suspense, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import About from './pages/About.tsx'
import Home from './pages/Home.tsx'
import Terminal from './pages/Terminal.tsx'
import DataStructureDetail from './pages/DataStructureDetail.tsx'

// content import's
import { CodeContext, type TestCase } from './context/codeContext.tsx'
import { FileNamesContext, type FileEntry } from './context/fileNamesContext.tsx'
import { UserResponseContext } from './context/responseContent.tsx'
import { AuthProvider } from './context/authContext.tsx'
import { SocketProvider } from './context/socketContext.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Login } from './features/auth/Login.tsx'
import { Signup } from './features/auth/Signup.tsx'
import type { SupportedLanguage, ExecutionResult } from './features/terminal/types'
import { Battle } from './pages/Battle.tsx'
import FriendsDashboard from './components/FriendDashboard.tsx'
import Profile from './pages/Profile.tsx'
import CreateRoom from './pages/CreateRoom.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import Lobby from './pages/Lobby.tsx'
import { Problems } from './pages/Problems.tsx'
import { Analytics } from './pages/Analytics.tsx'
import { Settings } from './pages/Settings.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const Root = () => {
  // initial states for context
  const [filesData, setFilesData] = useState<FileEntry[]>([])
  const [code, setCode] = useState<string>('')
  const [language, setLanguage] = useState<SupportedLanguage>('javascript')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [customInput, setCustomInput] = useState<string>('')
  const [customInputActive, setCustomInputActive] = useState<boolean>(false)
  const [output, setOutput] = useState<ExecutionResult | null>(null)

  // response context states
  const [responseContent, setResponseContent] = useState('')
  const [status, setStatus] = useState<"SUCCESS" | "ERROR" | "LOADING" | "IDLE">('IDLE')

  return (
    <StrictMode>
      <Suspense fallback={<div>loading</div>}>
        <Router>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <SocketProvider>
          <Routes>

            <Route path="/" element={<App />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="about" element={<About />} />
              <Route path='/signin' element={<Login/>}/>
              <Route path='/signup' element={<Signup/>}/>
              <Route path="/ds/:slug" element={<DataStructureDetail />} />
              <Route path="/friends" element={<FriendsDashboard/>} />
              <Route path="/profile" element={<Profile/>} />
              <Route path="/settings" element={<Settings/>} />
              <Route path="/battle/:roomId" element={<Battle />} />
              <Route path="/rooms/create" element={<CreateRoom/>} />
              <Route path="/lobby" element={<Lobby/>} />
              <Route path="/problems" element={<Problems/>} />
              <Route path="/analytics" element={<Analytics/>} />
              <Route path="/leaderboard" element={<Analytics/>} />

              <Route
                path="terminal"
                element={
                  <FileNamesContext.Provider value={{ filesData, setFilesData }}>
                    <CodeContext.Provider
                      value={{
                        code,
                        language,
                        setCode,
                        setLanguage,
                        testCases,
                        setTestCases,
                        activeFile,
                        setActiveFile,
                        output,
                        setOutput,
                        customInput,
                        setCustomInput,
                        customInputActive,
                        setCustomInputActive
                      }}
                    >
                      <UserResponseContext.Provider
                        value={{
                          responseContent,
                          setResponseContent,
                          status,
                          setStatus,
                        }}
                      >
                        <Terminal />
                      </UserResponseContext.Provider>
                    </CodeContext.Provider>
                  </FileNamesContext.Provider>
                }
              />
            </Route>
          </Routes>
          </SocketProvider>
          </AuthProvider>
          </GoogleOAuthProvider>
        </Router>
      </Suspense>
    </StrictMode>
  )
}

export default Root
