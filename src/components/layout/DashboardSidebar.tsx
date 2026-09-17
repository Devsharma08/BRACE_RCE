import React, { useState } from "react";
import {
  LayoutDashboard,
  Swords,
  Code2,
  User,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface DashboardSidebarProps {
  rating?: number;
}

const NAV_LINKS = [
  { icon: LayoutDashboard, to: "/dashboard", label: "Dashboard" },
  { icon: Swords,          to: "/lobby",     label: "Battle"    },
  { icon: Code2,           to: "/problems",  label: "Problems"  },
  { icon: User,            to: "/profile",   label: "Profile"   },
  { icon: UserPlus,        to: "/friends",   label: "Friends"   },
] as const;

const getTier = (rating: number): string => {
  if (rating >= 1800) return "Cyber-Master";
  if (rating >= 1500) return "Platinum";
  if (rating >= 1300) return "Gold";
  if (rating >= 1100) return "Silver";
  return "Bronze";
};

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ rating }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const displayName = (user?.username || "DEV").toUpperCase();
  const tier = getTier(rating ?? 1000);
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
            <div className="w-8 h-8 border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.2)]">
              <Zap className="w-4 h-4 fill-cyan-400" />
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 shrink-0 border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.2)]">
                <Zap className="w-4 h-4 fill-cyan-400" />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-sm font-black tracking-widest text-white flex items-center gap-1 whitespace-nowrap"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  <span>BRACE</span>
                  <span className="text-cyan-500/40 mx-1">//</span>
                   <span className="text-cyan-400">RCE</span>
                </h1>
                <p className="text-[10px] text-cyan-500/30 tracking-wider uppercase whitespace-nowrap">
                  CYBER ARENA v2.0
                </p>
              </div>
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

        {/* ── PROFILE CARD ────────────────────────────────────────────── */}
        {!collapsed && (
          <div className="mx-3 border border-cyan-500/15 bg-raised p-3 shadow-[0_0_12px_rgba(0,212,255,0.08)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-widest">
                Operative
              </span>
              <span className="text-[8px] font-bold text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5">
                {tier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <div className="text-[10px] font-black text-cyan-400">--</div>
                <div className="text-[8px] text-slate-500 uppercase">Win Rate</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-cyan-400">--</div>
                <div className="text-[8px] text-slate-500 uppercase">Duels</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-cyan-400">--</div>
                <div className="text-[8px] text-slate-500 uppercase">Exec ms</div>
              </div>
            </div>
          </div>
        )}

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
          <div className="border border-cyan-500/15 bg-raised p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span
                className="text-xs font-mono font-bold text-white tracking-wide truncate"
                title={displayName}
              >
                {displayName}
              </span>
              <button
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="shrink-0 p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/40 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-cyan-500/10 pt-1.5">
              <span>Rating:</span>
              <span
                className="font-black font-mono text-sm text-cyan-400"
                style={{ filter: "drop-shadow(0 0 5px rgba(0,212,255,0.35))" }}
              >
                {typeof rating === "number" ? rating.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
