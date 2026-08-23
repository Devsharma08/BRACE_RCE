import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'ALEX_DEV', email: 'alex@example.com' },
  }),
}));


describe('DashboardSidebar Component', () => {
  test('renders brand header title BRACE RCE and version', () => {
    render(
      <MemoryRouter>
        <DashboardSidebar rating={1450} />
      </MemoryRouter>
    );

    expect(screen.getByText('BRACE')).toBeDefined();
    expect(screen.getByText('RCE')).toBeDefined();
    expect(screen.getByText('CYBER ARENA v2.0')).toBeDefined();
  });

  test('renders navigation sidebar links (Dashboard, Battle, Problems, Profile)', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardSidebar rating={1450} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Battle')).toBeDefined();
    expect(screen.getByText('Problems')).toBeDefined();
    expect(screen.getByText('Profile')).toBeDefined();
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
