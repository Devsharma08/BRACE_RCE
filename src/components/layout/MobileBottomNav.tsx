import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Swords,
  Code2,
  User,
  UserPlus,
} from "lucide-react";

/**
 * MobileBottomNav
 *
 * Shown on screens smaller than md (768px) for authenticated dashboard pages.
 * Provides the primary navigation that the desktop sidebar covers on larger screens.
 *
 * Uses `mobile-bottom-nav` CSS class for safe-area inset (notch) support.
 */
const NAV_ITEMS = [
  { icon: LayoutDashboard, to: "/dashboard", label: "Dashboard" },
  { icon: Swords,          to: "/lobby",     label: "Battle"    },
  { icon: Code2,           to: "/problems",  label: "Problems"  },
  { icon: UserPlus,        to: "/friends",   label: "Friends"   },
  { icon: User,            to: "/profile",   label: "Profile"   },
] as const;

export const MobileBottomNav: React.FC = () => {
  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 flex md:hidden h-14 items-stretch bg-[#080d1a]/95 backdrop-blur-xl border-t border-cyan-500/15"
    >
      {NAV_ITEMS.map(({ icon: Icon, to, label }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          title={label}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-mono font-bold uppercase tracking-wide transition-all ${
              isActive
                ? "text-[#00D4FF] border-t-2 border-[#00D4FF] bg-cyan-500/8 -mt-px"
                : "text-[#8892A4] hover:text-white border-t-2 border-transparent"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? "text-[#00D4FF]" : "text-[#8892A4]"
                }`}
              />
              <span className="leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
