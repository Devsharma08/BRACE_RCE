import React,{memo} from "react";
import {
  LayoutDashboard,
  Swords,
  Code2,
  User,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import { getDivision } from "../../hooks/useLeaderboard";

interface DashboardSidebarProps {
  rating?: number;
}

const NAV_LINKS = [
  { icon: LayoutDashboard, to: "/dashboard", label: "Dashboard" },
  { icon: Swords, to: "/lobby", label: "Battle" },
  { icon: Code2, to: "/problems", label: "Problems" },
  { icon: User, to: "/profile", label: "Profile" },
  { icon: UserPlus, to: "/friends", label: "Friends" },
] as const;

const DashboardSidebar: React.FC<DashboardSidebarProps> = memo(({ rating }) => {
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const displayName = (user?.username || "DEV").toUpperCase();
  const tier = getDivision(rating ?? 1000);
  const formattedRating = typeof rating === "number" ? rating.toLocaleString() : "—";

  return (
    <>
      {/* COLLAPSE TOGGLE — sits *outside* the rail, flush against its right
          edge. Both the button offset and the <aside> width read the same
          --sidebar-width custom property (index.css), which SidebarProvider
          flips via data-sidebar on <html>; hardcoding 245/60 here is what
          previously let the button drift away from the edge. */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        className="
          fixed top-1/2 -translate-y-1/2 z-50 hidden md:flex
          left-[var(--sidebar-width)]
          items-center justify-center
          w-4 h-10
          rounded-r-md border border-l-0 border-subtle-line
          bg-panel text-subtle
          transition-all duration-300
          hover:border-accent hover:text-accent
        "
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <aside
        aria-label="Dashboard sidebar navigation"
        className="
          hidden md:flex fixed top-14 left-0
          h-[calc(100vh-var(--header-height,3.5rem))]
          w-[var(--sidebar-width)]
          bg-panel border-r border-subtle-line
          font-mono flex-col justify-between
          z-40 select-none transition-all duration-300 overflow-hidden
        "
      >

        <div className="flex flex-col gap-3 relative z-10">
          {/* USER PROFILE CARD — always shows the avatar photo; the full
              identity block only appears when expanded */}
          <div className="relative border-b border-subtle-line p-4">
            <div className="absolute right-0 top-0 h-20 w-20 border-l border-b border-accent-primary/15" />
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-accent-primary/30">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={17} className="text-accent-primary" />
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-muted">
                    Operative profile
                  </p>
                  <p className="mt-1 text-sm font-bold tracking-wider text-fg">{displayName}</p>
                  <div className="mt-1 flex items-center gap-2 text-[9px] uppercase tracking-widest">
                    <span className="text-accent-warning">{tier}</span>
                    <span className="text-muted">/</span>
                    <span className="flex items-center gap-1 text-accent-primary">
                      <span>{formattedRating}</span>
                      <span className="text-[8px] uppercase tracking-widest text-muted">elo</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav
            aria-label="Sidebar navigation"
            className={`flex flex-col gap-1 ${collapsed ? "px-2" : "px-3"}`}
          >
            {NAV_LINKS.map(({ icon: Icon, to, label }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `group flex w-full items-center border-l-2 transition-all duration-150 cursor-pointer ${
                    collapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5"
                  } ${
                    isActive
                      ? "border-l-accent bg-accent/10 text-accent"
                      : "border-l-transparent bg-transparent text-subtle hover:text-accent hover:border-l-line-mid hover:bg-line-low"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-accent"
                          : "text-subtle group-hover:text-accent"
                      }`}
                    />
                    {!collapsed && (
                      <span
                        className={`text-xs font-bold tracking-widest uppercase whitespace-nowrap ${
                          isActive ? "text-accent" : ""
                        }`}
                      >
                        {label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* FOOTER / SYSTEM STATUS */}
        <div
          className={`relative z-10 border-t border-subtle-line ${
            collapsed ? "flex flex-col items-center gap-2 p-3" : "p-4"
          }`}
        >
          {!collapsed && (
            <div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-accent-success">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-success shadow-glow-success" />
              system ready
            </div>
          )}
          <button
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className={`flex w-full items-center justify-center gap-2 rounded-lg border border-accent-danger/20 bg-accent-danger/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-accent-danger transition-all hover:border-accent-danger/40 hover:bg-accent-danger/10 ${
              collapsed ? "px-2" : ""
            }`}
          >
            <LogOut size={13} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
});

export default DashboardSidebar;
