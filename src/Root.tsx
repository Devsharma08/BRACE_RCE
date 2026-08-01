import { StrictMode, Suspense, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import About from './pages/About.tsx'
import Home from './pages/Home.tsx'
import Terminal from './pages/Terminal.tsx'

// content import's
import { CodeContext, type TestCase } from './context/codeContext.tsx'
import { FileNamesContext, type FileEntry } from './context/fileNamesContext.tsx'
import { UserResponseContext } from './context/responseContent.tsx'
import { AuthProvider } from './context/authContext.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Login } from './features/auth/Login.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const Root = () => {
  const [filesData, setFilesData] = useState<FileEntry[]>([])
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [activeFile, setActiveFile] = useState('')
  const [output, setOutput] = useState<unknown>(null)

  // response context states
  const [responseContent, setResponseContent] = useState('')
  const [status, setStatus] = useState<"SUCCESS" | "ERROR" | "LOADING" | "IDLE">('IDLE')

  return (
    <StrictMode>
      <Suspense fallback={<div>loading</div>}>
        <Router>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
          <Routes>

            <Route path="/" element={<App />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path='/login' element={<Login/>}/>
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
          </AuthProvider>
          </GoogleOAuthProvider>
        </Router>
      </Suspense>
    </StrictMode>
  )
}

export default Root
