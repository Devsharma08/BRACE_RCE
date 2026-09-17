import React, { useState } from "react";
import {
  LayoutDashboard,
  Swords,
  Code2,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ rating }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const displayName = (user?.username || "DEV").toUpperCase();
  const tier = getDivision(rating ?? 1000);
  const sidebarWidth = collapsed ? "w-[60px]" : "w-[245px]";

  return (
    <aside
      aria-label="Dashboard sidebar navigation"
      className={`
        hidden md:flex fixed top-14 left-0
        h-[calc(100vh-var(--header-height,3.5rem))]
        ${sidebarWidth}
        bg-panel border-r border-cyan-500/15
        font-mono flex-col justify-between
        z-40 select-none transition-all duration-300 overflow-hidden
      `}
    >
      {/* Dot-grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="flex flex-col gap-3 relative z-10">

        {/* ── BRAND HEADER ───────────────────────────────────────────── */}
        <div
          className={`flex items-center border-b border-cyan-500/10 ${
            collapsed ? "justify-center p-3" : "justify-between gap-2 px-3 py-3"
          }`}
        >
          {collapsed ? (
            <div className="flex h-8 w-8 items-center justify-center border border-accent-primary/40 bg-accent-primary/10 text-accent-primary shadow-glow-accent">
              <User className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn border border-accent-primary/40 bg-accent-primary/10 text-accent-primary shadow-glow-accent">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-label">Operative profile</p>
                <h1 className="truncate text-sm font-black uppercase tracking-widest text-fg">{displayName}</h1>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-accent-warning">{tier}</span>
                  <span className="text-muted">·</span>
                  <span className="text-accent-primary">
                    <span>{typeof rating === "number" ? rating.toLocaleString() : "—"}</span> ELO
                  </span>
                </div>
              </div>
              <span className="sr-only">BRACE <span>//</span> <span>RCE</span> <span>CYBER ARENA v2.0</span></span>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`${
              collapsed ? "absolute top-3 right-1.5" : "shrink-0"
            } p-1 border border-cyan-500/15 bg-transparent text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer`}
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3" />
              : <ChevronLeft  className="w-3 h-3" />
            }
          </button>
        </div>

        {/* ── NAVIGATION LINKS ────────────────────────────────────────── */}
        <nav
          aria-label="Sidebar navigation"
          className={`flex flex-col gap-1 ${collapsed ? "px-1.5" : "px-2"}`}
        >
          {NAV_LINKS.map(({ icon: Icon, to, label }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center border-l-2 transition-all duration-150 cursor-pointer ${
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "border-l-cyan-400 bg-cyan-500/10 text-cyan-400"
                    : "border-l-transparent bg-transparent text-slate-500 hover:text-cyan-400 hover:border-l-white/15 hover:bg-cyan-950/8"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-cyan-400"
                        : "text-slate-500 group-hover:text-cyan-400"
                    }`}
                  />
                  {!collapsed && (
                    <span
                      className={`text-xs font-bold tracking-widest uppercase whitespace-nowrap ${
                        isActive ? "text-cyan-400" : ""
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

      {/* ── USER CARD / FOOTER ───────────────────────────────────────────── */}
      <div
        className={`relative z-10 border-t border-cyan-500/10 pt-3 mt-3 ${
          collapsed ? "flex flex-col items-center gap-2 p-2" : "p-3"
        }`}
      >
        {collapsed ? (
          <>
            <NavLink
              to="/profile"
              aria-label={`Profile — ${displayName}`}
              title={`Profile — ${displayName}`}
              className="p-2.5 border border-cyan-500/15 bg-raised text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
            >
              <User className="w-4 h-4" />
            </NavLink>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="p-2.5 border border-transparent text-slate-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/25 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="flex w-full items-center justify-center gap-2 border border-accent-danger/20 bg-accent-danger/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-accent-danger transition-all hover:border-accent-danger/40 hover:bg-accent-danger/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
