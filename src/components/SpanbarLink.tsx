import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

interface SidebarLinkProps {
  icon: ReactNode;
  label: string;
  to: string;
  collapsed?: boolean;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({
  icon,
  label,
  to,
  collapsed = false,
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all text-xs font-mono tracking-wider ${
        isActive
          ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      } ${collapsed ? "justify-center" : "justify-start"}`}
      title={label}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
};
