import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeComparisonModal } from './CodeComparisionModel';

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

  test('renders BATTLE ANALYSIS & CODE REVIEW header', () => {
    render(<CodeComparisonModal {...defaultProps} />);
    expect(screen.getByText('BATTLE ANALYSIS & CODE REVIEW')).toBeDefined();
  });

  test('displays submitted code snippets for user and opponent', () => {
    render(<CodeComparisonModal {...defaultProps} />);
    expect(screen.getByText('function solution() { return true; }')).toBeDefined();
    expect(screen.getByText('def solution(): return False')).toBeDefined();
  });

  test('triggers onClose when [ CLOSE REVIEW ] button is clicked', () => {
    const handleClose = vi.fn();
    render(<CodeComparisonModal {...defaultProps} onClose={handleClose} />);

    const closeBtn = screen.getByText('[ CLOSE REVIEW ]');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('triggers onReturnHome when [ MAINFRAME ] button is clicked', () => {
    const handleReturnHome = vi.fn();
    render(<CodeComparisonModal {...defaultProps} onReturnHome={handleReturnHome} />);

    const homeBtn = screen.getByText('[ MAINFRAME ]');
    fireEvent.click(homeBtn);

    expect(handleReturnHome).toHaveBeenCalledTimes(1);
  });
});
