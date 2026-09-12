import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './Header';

// Mock useAuth context hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

// Mock socket context (NotificationCenter registers listeners on it)
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ socket: null, isConnected: false }),
}));

// NotificationCenter uses react-query hooks, so provide a client per test
const renderHeader = (initialEntries?: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Header />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Header Component', () => {
  test('renders logo branding title BRACE // RCE', () => {
    renderHeader();

    expect(screen.getByText(/BRACE \/\//i)).toBeDefined();
    expect(screen.getByText('RCE')).toBeDefined();
  });

  test('renders navigation links for desktop', () => {
    renderHeader(['/dashboard']);

    expect(screen.getByText('HOME')).toBeDefined();
    expect(screen.getByText('DASHBOARD')).toBeDefined();
    expect(screen.getByText('TERMINAL')).toBeDefined();
    expect(screen.getByText('ABOUT')).toBeDefined();
  });
});
