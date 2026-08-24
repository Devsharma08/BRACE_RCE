import React from "react";
import {
  LayoutDashboard,
  Swords,
  Code2,
  User,
  Zap,
  LogOut,
} from "lucide-react";
import { SidebarLink } from "../shared/SpanbarLink";
import { useAuth } from "../../context/AuthContext";

interface DashboardSidebarProps {
  rating?: number;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ rating = 1248 }) => {
  const { user, logout } = useAuth();
  const displayName = (user?.username || "DEV").toUpperCase();

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[245px] bg-[#07080a] border-r border-cyan-500/20 font-mono flex-col justify-between p-4 z-40 select-none">
      <div className="flex flex-col gap-6">
        {/* BRAND HEADER */}
        <div className="flex items-center gap-2 px-2 pt-2">
          <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Zap className="w-4 h-4 fill-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest text-white flex items-center gap-1">
              <span>BRACE</span>
              <span className="text-cyan-400 text-xs">RCE</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase">
              CYBER ARENA v2.0
            </p>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-col gap-1.5">
          <SidebarLink
            icon={<LayoutDashboard className="w-4 h-4" />}
            to="/dashboard"
            label="Dashboard"
          />
          <SidebarLink
            icon={<Swords className="w-4 h-4" />}
            to="/lobby"
            label="Battle"
          />
          <SidebarLink
            icon={<Code2 className="w-4 h-4" />}
            to="/problems"
            label="Problems"
          />
          <SidebarLink
            icon={<User className="w-4 h-4" />}
            to="/profile"
            label="Profile"
          />
        </nav>
      </div>

      {/* USER CARD AT BOTTOM WITH LOGOUT BUTTON */}
      <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex flex-col gap-2 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white tracking-wide truncate">
            {displayName}
          </span>
          <button
            onClick={logout}
            title="Logout"
            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/50 border border-transparent hover:border-red-500/40 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-cyan-500/10 pt-1.5 mt-0.5">
          <span>Rating:</span>
          <span className="font-bold text-cyan-400">{rating.toLocaleString()}</span>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;