import { StrictMode, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App.tsx";


//----------------- admin routes ------------------
const AdminLayout = lazy(()=>import('./pages/admin/AdminLayout.tsx').then((m)=>({default:m.AdminLayout})));
const AdminDashboard = lazy(()=>import('./pages/admin/AdminDashboard.tsx'));
const AdminUsers = lazy(()=>import('./pages/admin/AdminUsers.tsx'));
const AdminQuestions = lazy(()=>import('./pages/admin/AdminQuestions.tsx'));  
const AdminReports = lazy(()=>import('./pages/admin/AdminReports.tsx'));  
const AdminSettings = lazy(()=>import('./pages/admin/AdminSettings.tsx'));  
const AdminFeedback = lazy(()=>import('./pages/admin/AdminFeedback.tsx'));

// -------------  normal routes  ------------------
const About = lazy(() => import("./pages/About.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const Terminal = lazy(() => import("./pages/Terminal.tsx"));
const DataStructureDetail = lazy(
  () => import("./pages/DataStructureDetail.tsx"),
);
const DataStructureDirectory = lazy(
  () => import("./pages/DataStructureDirectory.tsx"),
);
const ConsoleShell = lazy(()=>import('./pages/ConsoleShell.tsx'));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const MatchAnalysis = lazy(() => import("./pages/MatchAnalysis.tsx"));
const Battle = lazy(() => import("./pages/Battle.tsx").then((m) => ({ default: m.Battle })));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx").then((m) => ({ default: m.Dashboard })));
const Problems = lazy(() => import("./pages/Problems.tsx").then((m) => ({ default: m.Problems })));
const FriendsDashboard = lazy(() => import("./components/features/FriendDashboard.tsx"));
const CreateRoom = lazy(() => import("./pages/CreateRoom.tsx"));
const Lobby = lazy(() => import("./pages/Lobby.tsx"));

import { AuthProvider } from "./context/AuthContext.tsx";
import { SocketProvider } from "./context/SocketContext.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import  {Login}  from "./features/auth/Login.tsx";
import {Signup} from "./features/auth/Signup.tsx";
import { TerminalProvider } from "./context/TerminalContext.tsx";
import { RouteLoadingSkeleton } from "./components/ui/Skeleton.tsx";
import { ScrollToTop } from "./components/shared/ScrollToTop.tsx";
import { ProtectedRoute } from "./components/shared/ProtectedRoute.tsx";
import { AdminRoute } from "./components/shared/AdminRoute.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { wireAuthInvalidation } from "./config/api.ts";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "not-configured";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

// Instant auth invalidation (point 40/52): any 401 from a non-auth endpoint
// flips auth-me to logged-out immediately, regardless of staleTime. Wired
// once at module scope — safe under StrictMode remounts.
wireAuthInvalidation(queryClient);

export const Root = () => {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <ScrollToTop />
            {/* Sonner toast viewport — styled to match the dark cyber-arena theme */}
            <Toaster
              position="bottom-right"
              toastOptions={
                (
                  {
                    style: {
                      background: "rgba(6, 8, 14, 0.92)",
                      border: "1px solid color-mix(in srgb, var(--accent-primary) 35%, transparent)",
                      color: "var(--text-primary)",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: "12px",
                    },
                    classNames: {
                      error: "toast-error",
                      info: "toast-info",
                      success: "toast-success",
                      warning: "toast-warning",
                    },
                    // Accessibility: announce toasts to screen readers
                    ariaLive: "polite",
                    ariaAtomic: true,
                  } as never
                )
              }
            />
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <SocketProvider>
                <AuthProvider>
                  <Routes>
                    <Route path="/" element={<App />}>
                      {/* Public Routes */}
                      <Route index element={<Home />} />
                      <Route path="about" element={<About />} />
                      <Route path="/signin" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/ds" element={<DataStructureDirectory />} />
                      <Route
                        path="/ds/:slug"
                        element={<DataStructureDetail />}
                      />

                      {/* Protected Routes */}
  
                      <Route element={<ProtectedRoute />}>
                        {/* Admin Console Routes.
                            Wrapped in <AdminRoute> so non-admins never see the
                            console. That guard is presentation only — every
                            /api/admin/* endpoint independently re-checks the
                            caller's role and 403s.

                            NOTE: child paths MUST be relative. React Router v7
                            throws "Absolute route path "/users" nested under
                            path "/admin" is not valid" at runtime, which
                            TypeScript/tsc will not catch. */}
                        <Route element={<AdminRoute />}>
                          <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="questions" element={<AdminQuestions />} />
                            <Route path="reports" element={<AdminReports />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="feedback" element={<AdminFeedback />} />
                          </Route>
                        </Route>
                        {/* Console pages — all share <ConsoleShell />, which owns
                            the rail, the mobile bottom nav and the sidebar
                            offset. Declared as a PARENT route with children
                            nested beneath it: mounted as a leaf it would have
                            an empty <Outlet /> and render a blank page.
                            Child paths are relative — React Router v7 throws
                            "Absolute route path ... is not valid" at runtime
                            and tsc does not catch it. */}
                        <Route element={<ConsoleShell />}>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/friends" element={<FriendsDashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          {/* Post-battle review — ownership-checked match detail */}
                          <Route path="/analysis/:matchId" element={<MatchAnalysis />} />
                          <Route path="/lobby" element={<Lobby />} />
                          <Route path="/problems" element={<Problems />} />
                          <Route path="/rooms/create" element={<CreateRoom />} />
                          <Route path="/create-room" element={<CreateRoom />} />
                        </Route>

                        {/* Fullscreen / standalone routes keep their own shell */}
                        <Route path="/battle/:roomId" element={<Battle />} />

                        <Route
                          path="terminal"
                          element={
                            <TerminalProvider>
                              <Terminal />
                            </TerminalProvider>
                          }
                        />
                      </Route>
                    </Route>
                  </Routes>
              </AuthProvider>
            </SocketProvider>
            </GoogleOAuthProvider>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </StrictMode>
  );
};

export default Root;
