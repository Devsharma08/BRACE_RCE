import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeComparisonModal } from './CodeComparisonModal';

describe('CodeComparisonModal Component', () => {
  const mockPerformances = [
    {
      userId: 'user-1',
      user: { id: 'user-1', username: 'HERO_DEV', avatarUrl: 'https://example.com/hero.png' },
      score: 100,
      timeTakenMs: 45000,
      submissions: [
        {
          id: 'sub-1',
          attemptNumber: 1,
          submittedCode: 'function solution() { return true; }',
          language: 'javascript',
          status: 'PASSED',
          runtimeMs: 45,
          memoryKb: 12800,
          passedCase: 5,
          totalCases: 5,
          isBestSubmission: true,
        },
      ],
    },
    {
      userId: 'user-2',
      user: { id: 'user-2', username: 'RIVAL_DEV', avatarUrl: 'https://example.com/rival.png' },
      score: 50,
      timeTakenMs: 80000,
      submissions: [
        {
          id: 'sub-2',
          attemptNumber: 1,
          submittedCode: 'def solution(): return False',
          language: 'python',
          status: 'FAILED',
          runtimeMs: 120,
          memoryKb: 15400,
          passedCase: 2,
          totalCases: 5,
          isBestSubmission: true,
        },
      ],
    },
  ];

  const defaultProps = {
    currentUserId: 'user-1',
    performances: mockPerformances,
    onClose: vi.fn(),
    onReturnHome: vi.fn(),
  };

  test('renders the battle review heading', () => {
    render(<CodeComparisonModal {...defaultProps} />);
    expect(screen.getByText('Battle analysis & code review')).toBeDefined();
  });

  test('displays submitted code snippets for user and opponent', () => {
    render(<CodeComparisonModal {...defaultProps} />);
    expect(screen.getByText('function solution() { return true; }')).toBeDefined();
    expect(screen.getByText('def solution(): return False')).toBeDefined();
  });

  test('triggers onClose when the close button is clicked', () => {
    const handleClose = vi.fn();
    render(<CodeComparisonModal {...defaultProps} onClose={handleClose} />);

    fireEvent.click(screen.getByLabelText('Close review'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('triggers onReturnHome when the Mainframe button is clicked', () => {
    const handleReturnHome = vi.fn();
    render(<CodeComparisonModal {...defaultProps} onReturnHome={handleReturnHome} />);

    const homeBtn = screen.getByText('Mainframe');
    fireEvent.click(homeBtn);

    expect(handleReturnHome).toHaveBeenCalledTimes(1);
  });

  test('formats memory into MB and shows the opponent score', () => {
    render(<CodeComparisonModal {...defaultProps} />);
    // 12800 KB -> 12.5 MB, 15400 KB -> 15.0 MB
    expect(screen.getByText('12.5 MB')).toBeDefined();
    expect(screen.getByText('15.0 MB')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
  });

  test('keeps code panes scrollable instead of hiding the scrollbar', () => {
    const { container } = render(<CodeComparisonModal {...defaultProps} />);
    const panes = container.querySelectorAll('pre.themed-scroll');
    expect(panes.length).toBe(2);
    panes.forEach((pane) => expect(pane.className).not.toContain('scrollbar-hide'));
  });
});
