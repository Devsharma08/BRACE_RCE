import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'ALEX_DEV', email: 'alex@example.com' },
    logout: vi.fn(),
  }),
}));


describe('DashboardSidebar Component', () => {
  test('renders system status footer', () => {
    render(
      <MemoryRouter>
        <DashboardSidebar rating={1450} />
      </MemoryRouter>
    );

    expect(screen.getByText('system ready')).toBeDefined();
  });

  test('renders navigation sidebar links (Dashboard, Battle, Problems, Profile, Friends)', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardSidebar rating={1450} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Battle')).toBeDefined();
    expect(screen.getByText('Problems')).toBeDefined();
    expect(screen.getByText('Profile')).toBeDefined();
    expect(screen.getByText('Friends')).toBeDefined();
  });

  test('renders user display name and formatted rating badge', () => {
    render(
      <MemoryRouter>
        <DashboardSidebar rating={1450} />
      </MemoryRouter>
    );

    expect(screen.getByText('ALEX_DEV')).toBeDefined();
    expect(screen.getByText('1,450')).toBeDefined();
  });
});
