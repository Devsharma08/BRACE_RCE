import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Regression guard for the console-shell layout route.
 *
 * ConsoleShell was originally mounted as a LEAF route
 * (`<Route path="/dashboard" element={<ConsoleShell/>} />`). A layout route
 * only renders children if it is a PARENT with routes nested beneath it, so
 * that version had an empty <Outlet/> — /dashboard rendered the rail over a
 * blank page. Nothing caught it: `tsc` and `vite build` both passed, and no
 * test covered Root.tsx's route tree.
 *
 * These tests assert the shape, not the styling, so a future edit that
 * re-introduces a leaf mount fails here instead of shipping.
 */

let mockIsAdmin = true;

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: mockIsAdmin,
    isLoading: false,
    user: { username: "tester", email: "t@example.com", role: "ADMIN" },
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

vi.mock("../hooks/useLeaderboard", () => ({
  useMyRating: () => ({ data: { rating: 1200 } }),
  getDivision: () => "Gold",
  TIER_COLORS: {},
}));

vi.mock("../components/layout/DashboardSidebar", () => ({ default: () => <nav>RAIL</nav> }));
vi.mock("../components/layout/MobileBottomNav", () => ({ default: () => <nav>BOTTOM_NAV</nav> }));

const ConsoleShell = (await import("./ConsoleShell")).default;
const Dashboard = () => <p>DASHBOARD_PAGE</p>;
const Problems = () => <p>PROBLEMS_PAGE</p>;
const Profile = () => <p>PROFILE_PAGE</p>;

// Mirrors the ConsoleShell block in Root.tsx.
const Tree = () => (
  <Routes>
    <Route element={<ConsoleShell />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/problems" element={<Problems />} />
      <Route path="/profile" element={<Profile />} />
    </Route>
  </Routes>
);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Tree />
    </MemoryRouter>,
  );

beforeEach(() => {
  mockIsAdmin = true;
});

describe("ConsoleShell layout route", () => {
  test("renders the rail and the child page together at /dashboard", () => {
    renderAt("/dashboard");
    // The rail proving the shell mounted...
    expect(screen.getByText("RAIL")).toBeInTheDocument();
    // ...and the content proving the <Outlet/> was NOT empty.
    expect(screen.getByText("DASHBOARD_PAGE")).toBeInTheDocument();
  });

  test("mounts the mobile bottom nav inside the shell", () => {
    renderAt("/dashboard");
    expect(screen.getByText("BOTTOM_NAV")).toBeInTheDocument();
  });

  test("swaps the child page while the rail stays mounted", () => {
    const { unmount } = renderAt("/problems");
    expect(screen.getByText("PROBLEMS_PAGE")).toBeInTheDocument();
    expect(screen.getByText("RAIL")).toBeInTheDocument();
    unmount();

    renderAt("/profile");
    expect(screen.getByText("PROFILE_PAGE")).toBeInTheDocument();
    expect(screen.getByText("RAIL")).toBeInTheDocument();
  });

  test("does not render a nested <main> landmark inside the shell", () => {
    const { container } = renderAt("/dashboard");
    // Layout.tsx owns the single document <main>; the shell must not add one.
    expect(container.querySelectorAll("main")).toHaveLength(0);
  });
});
