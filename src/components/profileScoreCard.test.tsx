import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileScoreCard } from './profileScoreCard';

describe('ProfileScoreCard Component', () => {
  const mockProfile = {
    username: 'CYBER_LEGEND',
    avatarUrl: 'https://example.com/avatar.png',
  };

  const mockStats = {
    wins: 15,
    losses: 5,
    totalMatches: 20,
    totalScore: 5500,
  };

  test('renders operative username and rank badge correctly', () => {
    render(
      <MemoryRouter>
        <ProfileScoreCard profile={mockProfile} stats={mockStats} activeBattleRoom={null} />
      </MemoryRouter>
    );

    expect(screen.getByText('CYBER_LEGEND')).toBeDefined();
    // 5500 totalScore should compute to MAINFRAME ELITE rank
    expect(screen.getByText('MAINFRAME ELITE')).toBeDefined();
  });

  test('calculates and renders correct win rate percentage (75% for 15W/5L)', () => {
    render(
      <MemoryRouter>
        <ProfileScoreCard profile={mockProfile} stats={mockStats} activeBattleRoom={null} />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/75%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15/i).length).toBeGreaterThan(0);
  });

  test('calculates INITIATE rank for lower score (e.g. 1200 score)', () => {
    const lowScoreStats = {
      wins: 2,
      losses: 1,
      totalMatches: 3,
      totalScore: 1200,
    };

    render(
      <MemoryRouter>
        <ProfileScoreCard profile={mockProfile} stats={lowScoreStats} activeBattleRoom={null} />
      </MemoryRouter>
    );

    expect(screen.getByText('INITIATE')).toBeDefined();
  });
});
