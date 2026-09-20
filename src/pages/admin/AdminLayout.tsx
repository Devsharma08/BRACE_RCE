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
    <div className="flex min-h-screen bg-base font-mono">
      {/* Sidebar */}
      <aside className="w-64 border-r border-subtle-line bg-raised flex flex-col py-6 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 mb-8 flex items-center gap-3 border-b border-subtle-line pb-5">
          <Shield className="w-6 h-6 text-accent-primary" />
          <span className="text-xl font-extrabold tracking-widest text-fg uppercase">
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
                    ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                    : 'border-transparent text-subtle hover:text-accent-primary hover:bg-accent-primary/5'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-accent-primary' : ''}`} />
                {item.label.toUpperCase()}
              </NavLink>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="border-t border-subtle-line my-4" />

        {/* Logout */}
        <button
          onClick={logout}
          className="mx-3 mb-6 flex items-center gap-3 px-4 py-3 rounded-none border border-accent-danger/40 bg-accent-danger/10 hover:bg-accent-danger/10 text-accent-danger hover:text-accent-danger font-bold tracking-wider text-sm transition-all"
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