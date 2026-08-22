import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders initial formatted time (e.g. 05:00 for 300 seconds)', () => {
    render(<Timer initialSeconds={300} isActive={true} />);
    expect(screen.getByText('05:00')).toBeDefined();
  });

  test('decrements time by 1 second on interval tick', () => {
    render(<Timer initialSeconds={60} isActive={true} />);
    expect(screen.getByText('01:00')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('00:59')).toBeDefined();
  });

  test('triggers onTimeUp callback when countdown reaches zero', () => {
    const handleTimeUp = vi.fn();
    render(<Timer initialSeconds={2} isActive={true} onTimeUp={handleTimeUp} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(handleTimeUp).toHaveBeenCalledTimes(1);
  });
});
