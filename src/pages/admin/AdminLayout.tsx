import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Flag, HelpCircle, Settings, Shield,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// `end` is declared on every entry (defaulting to false) so destructuring it in
// the map callback is type-safe; `as const` alone would make the property
// absent on the five items that don't set it.
const navItems: { label: string; icon: LucideIcon; path: string; end: boolean }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', end: true },
  { label: 'Users', icon: Users, path: '/admin/users', end: false },
  { label: 'Feedback', icon: MessageSquare, path: '/admin/feedback', end: false },
  { label: 'Reports', icon: Flag, path: '/admin/reports', end: false },
  { label: 'Questions', icon: HelpCircle, path: '/admin/questions', end: false },
  { label: 'Settings', icon: Settings, path: '/admin/settings', end: false },
];

export const AdminLayout = () => {
  const { logout } = useAuth();

  // Active state comes from NavLink's own isActive callback. The previous
  // `pathname === path || (path === '/admin' && pathname === '/admin')` had a
  // redundant second clause (a strict subset of the first) and, without `end`,
  // would also light up "Dashboard" on every /admin/* child page.
  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-none border-l-2 whitespace-nowrap text-sm font-bold tracking-wider transition-all ${
      isActive
        ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
        : 'border-transparent text-subtle hover:text-accent-primary hover:bg-accent-primary/5'
    }`;

  return (
    // No min-h-screen here: this renders INSIDE Layout's <main>, which already
    // carries the site header + footer. A 100vh block made the document ~100vh
    // taller than the viewport, producing a phantom second scrollbar.
    <div className="flex flex-col md:flex-row bg-base font-mono">
      {/* Sidebar — stacks horizontally and scrolls on small screens so the nav
          is reachable on a phone instead of eating a 256px column. */}
      <aside className="w-full shrink-0 border-b md:border-b-0 md:border-r border-subtle-line bg-raised flex flex-col md:py-6">
        {/* Logo */}
        <div className="px-5 py-4 md:mb-8 md:pb-5 flex items-center gap-3 border-b border-subtle-line">
          <Shield className="w-6 h-6 shrink-0 text-accent-primary" />
          <span className="text-lg md:text-xl font-extrabold tracking-widest text-fg uppercase">
            ADMIN // PANEL
          </span>
        </div>

        {/* Nav — horizontal scroller below md, vertical rail from md up */}
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-x-visible md:py-0">
          {navItems.map(({ icon: Icon, label, path, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => linkClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-primary' : ''}`} />
                  {label.toUpperCase()}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          className="mx-3 mb-4 md:mb-6 flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-none border border-accent-danger/40 bg-accent-danger/10 text-accent-danger font-bold tracking-wider text-sm transition-all hover:bg-accent-danger/20"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          SIGN OUT
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};