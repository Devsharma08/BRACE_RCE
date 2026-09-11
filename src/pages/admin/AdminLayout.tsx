import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Flag, HelpCircle, Settings, Shield,
  LogOut, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Feedback', icon: MessageSquare, path: '/admin/feedback' },
  { label: 'Reports', icon: Flag, path: '/admin/reports' },
  { label: 'Questions', icon: HelpCircle, path: '/admin/questions' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export const AdminLayout = () => {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) =>
    pathname === path || (path === '/admin' && pathname === '/admin');

  return (
    <div className="flex min-h-screen bg-[#02040a] font-mono">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#06080e] flex flex-col py-6 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 mb-8 flex items-center gap-3 border-b border-white/5 pb-5">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="text-xl font-extrabold tracking-widest text-white uppercase">
            ADMIN // PANEL
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-none border-l-2 text-sm font-bold tracking-wider transition-all ${
                  active
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                    : 'border-transparent text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/20'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-cyan-400' : ''}`} />
                {item.label.toUpperCase()}
              </NavLink>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="border-t border-white/10 my-4" />

        {/* Logout */}
        <button
          onClick={logout}
          className="mx-3 mb-6 flex items-center gap-3 px-4 py-3 rounded-none border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 font-bold tracking-wider text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          SIGN OUT
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};