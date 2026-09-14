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
} from "lucide-react";
import { UserPlus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface DashboardSidebarProps {
  rating?: number;
}

const NAV_LINKS = [
  { icon: LayoutDashboard, to: "/dashboard", label: "Dashboard" },
  { icon: Swords, to: "/lobby", label: "Battle" },
  { icon: Code2, to: "/problems", label: "Problems" },
  { icon: User, to: "/profile", label: "Profile" },
  { icon: UserPlus, to: "/friends", label: "Friends" },
];

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
      className={`hidden md:flex fixed top-0 left-0 h-screen ${sidebarWidth} bg-[#080d1a] border-r border-cyan-500/15 font-mono flex-col justify-between z-40 select-none transition-all duration-300 overflow-hidden`}
    >
      {/* Dot-grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(rgba(0,243,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="flex flex-col gap-4 relative z-10">
        {/* BRAND HEADER */}
        <div className={`flex items-center border-b border-white/10 ${collapsed ? "justify-center p-3" : "gap-2 justify-between px-3 py-3"}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-none border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.25)]">
              <Zap className="w-4 h-4 fill-cyan-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.25)]">
                  <Zap className="w-4 h-4 fill-cyan-400" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-widest text-white flex items-center gap-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    <span>BRACE</span>
                    <span className="text-cyan-400 text-xs">// RCE</span>
                  </h1>
                  <p className="text-[10px] text-cyan-500/30 tracking-wider uppercase">
                    CYBER ARENA v2.0
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Collapse toggle button */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`${collapsed ? "absolute top-3 right-1.5" : ""} p-1 rounded-none border border-white/10 bg-[#06080e] text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3" />
              : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

        {/* PROFILE CARD */}
        {!collapsed && (
          <div className="mx-3 border border-cyan-500/20 bg-[#0b1021] p-3 shadow-[0_0_15px_rgba(0,212,255,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-cyan-400/70 uppercase tracking-widest">Operative</span>
              <span className="text-[8px] font-bold text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5">{tier}</span>
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

        {/* NAVIGATION LINKS */}
        <nav className={`flex flex-col gap-1 ${collapsed ? "px-1.5" : "px-2"}`}>
          {NAV_LINKS.map(({ icon: Icon, to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center rounded-none border transition-all duration-150 cursor-pointer ${
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "border-l-2 border-l-cyan-500 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_8px_rgba(0,243,255,0.05)]"
                    : "border border-white/5 bg-[#06080e] text-slate-500 hover:text-cyan-400 hover:border-white/20 hover:bg-cyan-950/10"
                }`
              }
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400"} transition-colors`} />
                  {!collapsed && (
                    <span className={`text-xs font-bold tracking-widest uppercase ${isActive ? "text-cyan-400" : ""}`}>
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* USER CARD AT BOTTOM */}
      <div className={`relative z-10 border-t border-white/10 ${collapsed ? "flex flex-col items-center gap-2 p-2" : "p-3"}`}>
        {collapsed ? (
          <>
            <NavLink
              to="/profile"
              className="p-2.5 rounded-none border border-white/10 bg-[#06080e] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
              title={`Profile — ${displayName}`}
            >
              <User className="w-4 h-4" />
            </NavLink>
            <button
              onClick={logout}
              title="Logout"
              className="p-2.5 rounded-none border border-transparent text-slate-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="border border-white/20 border-l-4 border-l-cyan-500/70 bg-[#06080e] p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide truncate">
                {displayName}
              </span>
              <button
                onClick={logout}
                title="Logout"
                className="p-1 rounded-none text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/40 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-1.5 mt-0.5">
              <span>Rating:</span>
              <span className="font-black font-mono text-sm text-cyan-400" style={{ filter: 'drop-shadow(0 0 6px rgba(0,243,255,0.4))' }}>
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
