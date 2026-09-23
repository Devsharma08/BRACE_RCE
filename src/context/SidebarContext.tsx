import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Shared state for the DashboardSidebar shell.
 *
 * The sidebar is rendered by each console page rather than by Layout, so its
 * collapse flag used to live in per-instance useState: collapsing on
 * /dashboard and navigating to /problems snapped the rail back open. Hoisting
 * it here keeps the rail width stable across navigation.
 *
 * The provider also mirrors the flag onto <html> as `data-sidebar`, which is
 * what lets `--sidebar-width` (index.css) resolve responsively. Pages offset
 * their <main> with `ml-0 md:ml-[var(--sidebar-width)]`, so toggling the rail
 * reflows the content column instead of letting it slide underneath — the old
 * hardcoded `md:ml-[60px] lg:ml-[245px]` never reflowed at all.
 */

const STORAGE_KEY = "brace:sidebar-collapsed";

/** Below this width the rail starts collapsed so it never eats the content column. */
const AUTO_COLLAPSE_BELOW = 1024;

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
};

const noop = () => {};

/**
 * Safe default keeps the sidebar renderable outside the provider (unit tests,
 * isolated stories) instead of throwing on a missing context.
 */
const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: noop,
  setCollapsed: noop,
});

const readInitialCollapsed = (): boolean => {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;

  // No stored preference yet — default by viewport.
  return window.innerWidth < AUTO_COLLAPSE_BELOW;
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

  const value = useMemo(
    () => ({ collapsed, toggle, setCollapsed }),
    [collapsed, toggle]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => useContext(SidebarContext);

export default SidebarContext;
