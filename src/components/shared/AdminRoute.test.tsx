import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';

// Mutable so each test can flip the role the mocked provider reports.
let mockIsAdmin = false;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: mockIsAdmin,
    isLoading: false,
    user: { username: 'tester', email: 'test@example.com', role: mockIsAdmin ? 'ADMIN' : 'USER' },
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

beforeEach(() => {
  mockIsAdmin = false;
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>ADMIN CONSOLE</div>} />
          <Route path="/admin/users" element={<div>USER MANAGEMENT</div>} />
        </Route>
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('AdminRoute', () => {
  test('blocks a signed-in non-admin from the admin console', () => {
    mockIsAdmin = false;
    renderAt('/admin');
    expect(screen.getByText(/clearance denied/i)).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONSOLE')).not.toBeInTheDocument();
  });

  test('blocks non-admins from nested admin sections too', () => {
    mockIsAdmin = false;
    renderAt('/admin/users');
    expect(screen.getByText(/clearance denied/i)).toBeInTheDocument();
    expect(screen.queryByText('USER MANAGEMENT')).not.toBeInTheDocument();
  });

  test('admits an admin to the console', () => {
    mockIsAdmin = true;
    renderAt('/admin');
    expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
    expect(screen.queryByText(/clearance denied/i)).not.toBeInTheDocument();
  });

  test('admits an admin to nested sections', () => {
    mockIsAdmin = true;
    renderAt('/admin/users');
    expect(screen.getByText('USER MANAGEMENT')).toBeInTheDocument();
  });
});
