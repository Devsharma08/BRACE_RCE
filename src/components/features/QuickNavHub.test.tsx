import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickNavHub } from './QuickNavHub';

describe('QuickNavHub Component', () => {
  const defaultProps = {
    onFindMatch: vi.fn(),
    matchmakingStatus: 'IDLE',
    onCancelMatch: vi.fn(),
    onCreateCustomRoom: vi.fn(),
    onJoinCustomRoom: vi.fn(),
    waitingTime: 0,
  };

  test('renders 1V1 MATCHMAKING QUEUE title and online status', () => {
    render(<QuickNavHub {...defaultProps} />);
    expect(screen.getByText('1V1 MATCHMAKING QUEUE')).toBeDefined();
    expect(screen.getByText('SYSTEM ONLINE')).toBeDefined();
  });

  test('renders difficulty selector buttons (ANY, EASY, MEDIUM, HARD)', () => {
    render(<QuickNavHub {...defaultProps} />);
    expect(screen.getByText('ANY')).toBeDefined();
    expect(screen.getByText('EASY')).toBeDefined();
    expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
    expect(screen.getByText('HARD')).toBeDefined();
  });

  test('calls onFindMatch with selected difficulty when match button is clicked', () => {
    const handleFindMatch = vi.fn();
    render(<QuickNavHub {...defaultProps} onFindMatch={handleFindMatch} />);

    // Select EASY difficulty
    const easyBtn = screen.getByText('EASY');
    fireEvent.click(easyBtn);

    // Click ENTER 1V1 MATCHMAKING BATTLE
    const matchBtn = screen.getByText(/ENTER 1V1 MATCHMAKING BATTLE/i);
    fireEvent.click(matchBtn);

    expect(handleFindMatch).toHaveBeenCalledWith('EASY');
  });

  test('shows IN QUEUE badge and cancel button when matchmakingStatus is SEARCHING', () => {
    render(
      <QuickNavHub
        {...defaultProps}
        matchmakingStatus="SEARCHING"
        waitingTime={12}
      />
    );

    expect(screen.getByText(/IN QUEUE \(12s\)/i)).toBeDefined();
    expect(screen.getByText(/CANCEL MATCHMAKING QUEUE/i)).toBeDefined();
  });
});
