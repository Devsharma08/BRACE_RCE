import { Outlet } from "react-router-dom";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useMyRating } from "../hooks/useLeaderboard";
import { useAuth } from "../context/AuthContext";

/**
 * ConsoleShell — the layout route wrapping every authenticated console page.
 *
 * Renders the rail, the mobile bottom nav and the sidebar width offset ONCE,
 * then swaps content via <Outlet />. Nine pages previously each carried their
 * own copy of that shell, so a change to the rail had to be made nine times
 * and a mismatch let the content column slide under a fixed rail.
 *
 * Why a route layout rather than useState + conditional render: the URL stays
 * the source of truth, so deep links, the browser back button and the per-page
 * lazy chunks all keep working. A state switch would trade all three away for
 * a duplicated-component saving.
 *
 * The offset wrapper is a <div>, not a <main> — Layout.tsx already owns the
 * single <main> landmark for the document. Nested <main> elements are invalid
 * HTML and hand screen-reader users duplicate landmarks. Pages keep their own
 * <main> so each can still pick its layout model (scrolling document vs.
 * fixed-viewport with internally scrolling columns).
 */
const ConsoleShell = () => {
  const { isAuthenticated } = useAuth();
  // react-query keys this as ["my-rating"] with a 10-min staleTime, so pages
  // that also call useMyRating() share one request instead of adding any.
  const { data: myRating } = useMyRating(isAuthenticated);

  return (
    <div className="relative flex min-h-0 w-full bg-base text-fg font-mono">
      <DashboardSidebar rating={myRating?.rating} />
      <MobileBottomNav />

      {/* Offset for the fixed rail. A plain wrapper so pages own the <main>
          and its padding / scroll model. */}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:ml-[var(--sidebar-width)]">
        <Outlet />
      </div>
    </div>
  );
};

export default ConsoleShell;
