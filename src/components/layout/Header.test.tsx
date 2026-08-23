import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

// Mock useAuth context hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

describe('Header Component', () => {
  test('renders logo branding title BRACE // RCE', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText(/BRACE \/\//i)).toBeDefined();
    expect(screen.getByText('RCE')).toBeDefined();
  });

  test('renders navigation links for desktop', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText('[ HOME ]')).toBeDefined();
    expect(screen.getByText('[ DASHBOARD ]')).toBeDefined();
    expect(screen.getByText('[ TERMINAL ]')).toBeDefined();
    expect(screen.getByText('[ ABOUT ]')).toBeDefined();
  });
});
