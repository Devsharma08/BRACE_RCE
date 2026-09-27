import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Regression guard for the Layout → Footer wiring.
 *
 * ConsoleShell mounts a FIXED DashboardSidebar rail and a FIXED
 * MobileBottomNav, but Layout renders <Footer /> outside that shell. Without
 * `offsetRail` the rail paints over the footer's left edge (the giant
 * wordmark reads as trimmed) and the bottom nav over the copyright row.
 * Layout owns the route list, so Layout owns the test for it.
 */

// Header pulls in auth + scroll context, GlobalModals pulls in the socket —
// neither is what we're asserting on, and both drag in providers Layout
// itself doesn't provide.
vi.mock("./Header", () => ({ default: () => <header>HEADER</header> }));
vi.mock("../features/GlobalModals", () => ({ default: () => null }));

const Layout = (await import("./Layout")).default;

afterEach(cleanup);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<p>HOME_PAGE</p>} />
          <Route path="dashboard" element={<p>DASHBOARD_PAGE</p>} />
          <Route path="problems" element={<p>PROBLEMS_PAGE</p>} />
          <Route path="lobby" element={<p>LOBBY_PAGE</p>} />
          <Route path="friends" element={<p>FRIENDS_PAGE</p>} />
          <Route path="profile" element={<p>PROFILE_PAGE</p>} />
          <Route path="create-room" element={<p>CREATE_ROOM_PAGE</p>} />
          <Route path="admin" element={<p>ADMIN_PAGE</p>} />
          <Route path="about" element={<p>ABOUT_PAGE</p>} />
          <Route path="signin" element={<p>SIGNIN_PAGE</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const railOffsetClass = "md:ml-[var(--sidebar-width)]";

test.each([
  ["/dashboard", "DASHBOARD_PAGE"],
  ["/problems", "PROBLEMS_PAGE"],
  ["/lobby", "LOBBY_PAGE"],
  ["/friends", "FRIENDS_PAGE"],
  ["/profile", "PROFILE_PAGE"],
  ["/create-room", "CREATE_ROOM_PAGE"],
])("offsets the footer from the fixed rail on %s", (path, page) => {
  renderAt(path);
  expect(screen.getByText(page)).toBeInTheDocument();
  expect(screen.getByRole("contentinfo").className).toContain(railOffsetClass);
});

test.each([
  ["/", "HOME_PAGE"],
  ["/about", "ABOUT_PAGE"],
  // AdminLayout's sidebar is an in-flow <aside>, not a fixed rail.
  ["/admin", "ADMIN_PAGE"],
])("keeps the footer full-bleed on %s", (path, page) => {
  renderAt(path);
  expect(screen.getByText(page)).toBeInTheDocument();
  expect(screen.getByRole("contentinfo").className).not.toContain(
    railOffsetClass,
  );
});

test("/profile still gets the compact footer alongside the rail offset", () => {
  renderAt("/profile");
  expect(
    screen.getByText("BRACE RCE / built by Dev Sharma"),
  ).toBeInTheDocument();
  expect(screen.getByRole("contentinfo").className).toContain(railOffsetClass);
});

test("fullscreen routes render no footer at all", () => {
  renderAt("/signin");
  expect(screen.getByText("SIGNIN_PAGE")).toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
});