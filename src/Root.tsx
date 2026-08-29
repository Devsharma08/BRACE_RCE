import { StrictMode, Suspense, useState, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App.tsx";

const About = lazy(() => import("./pages/About.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const Terminal = lazy(() => import("./pages/Terminal.tsx"));
const DataStructureDetail = lazy(
  () => import("./pages/DataStructureDetail.tsx"),
);
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Lobby = lazy(() => import("./pages/Lobby.tsx"));
const Battle = lazy(() => import("./pages/Battle.tsx").then((m) => ({ default: m.Battle })));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx").then((m) => ({ default: m.Dashboard })));
const Problems = lazy(() => import("./pages/Problems.tsx").then((m) => ({ default: m.Problems })));
const FriendsDashboard = lazy(() => import("./components/features/FriendDashboard.tsx"));
const CreateRoom = lazy(() => import("./pages/CreateRoom.tsx"));

import { CodeContext, type TestCase } from "./context/CodeContext.tsx";
import {
  FileNamesContext,
  type FileEntry,
} from "./context/FileNamesContext.tsx";
import { UserResponseContext } from "./context/ResponseContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { SocketProvider } from "./context/SocketContext.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Login } from "./features/auth/Login.tsx";
import { Signup } from "./features/auth/Signup.tsx";
import type {
  SupportedLanguage,
  ExecutionResult,
} from "./features/terminal/types";

import { PageSkeleton } from "./components/ui/Skeleton.tsx";
import { ScrollToTop } from "./components/shared/ScrollToTop.tsx";
import { ProtectedRoute } from "./components/shared/ProtectedRoute.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "not-configured";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

export const Root = () => {
  // initial states for context
  const [filesData, setFilesData] = useState<FileEntry[]>([]);
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [customInput, setCustomInput] = useState<string>("");
  const [customInputActive, setCustomInputActive] = useState<boolean>(false);
  const [output, setOutput] = useState<ExecutionResult | null>(null);

  // response context states
  const [responseContent, setResponseContent] = useState("");
  const [status, setStatus] = useState<
    "SUCCESS" | "ERROR" | "LOADING" | "IDLE"
  >("IDLE");

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<PageSkeleton />}>
          <Router>
            <ScrollToTop />
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <AuthProvider>
                <SocketProvider>
                  <Routes>
                    <Route path="/" element={<App />}>
                      {/* Public Routes */}
                      <Route index element={<Home />} />
                      <Route path="about" element={<About />} />
                      <Route path="/signin" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route
                        path="/ds/:slug"
                        element={<DataStructureDetail />}
                      />

                      {/* Protected Routes */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="/friends" element={<FriendsDashboard />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/battle/:roomId" element={<Battle />} />
                        <Route path="/rooms/create" element={<CreateRoom />} />
                        <Route path="/lobby" element={<Lobby />} />
                        <Route path="/problems" element={<Problems />} />

                        <Route
                          path="terminal"
                          element={
                            <FileNamesContext.Provider
                              value={{ filesData, setFilesData }}
                            >
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
                                  setCustomInputActive,
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
                    </Route>
                  </Routes>
                </SocketProvider>
              </AuthProvider>
            </GoogleOAuthProvider>
          </Router>
        </Suspense>
      </QueryClientProvider>
    </StrictMode>
  );
};

export default Root;
