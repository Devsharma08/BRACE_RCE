import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentProps } from 'react';
import OutputPanel from './OutputPanel';
import type { ExecutionDetail, ExecutionResult, ProblemTestCase } from '../types';

const makeCase = (input: string, expectedOutput: string): ProblemTestCase => ({
  input,
  expectedOutput,
});

const makeDetail = (index: number, passed = true): ExecutionDetail => ({
  testCaseIndex: index,
  passed,
  output: `out-${index}`,
  expectedOutput: `out-${index}`,
  metrics: { durationMs: 10 + index, memoryKb: 4096 },
});

const renderTestsTab = (overrides: Partial<ComponentProps<typeof OutputPanel>> = {}) => {
  const props: ComponentProps<typeof OutputPanel> = {
    isExecuting: false,
    isOutputActive: true,
    isCustomInputRun: false,
    output: null,
    outputHeight: 320,
    outputText: '',
    testCases: [],
    customInput: '',
    customInputActive: false,
    onResizeStart: vi.fn(),
    setOutputHeight: vi.fn(),
    setCustomInput: vi.fn(),
    setCustomInputActive: vi.fn(),
    setIsOutputActive: vi.fn(),
    ...overrides,
  };

  const utils = render(<OutputPanel {...props} />);
  fireEvent.click(screen.getByText('Test Cases'));
  return utils;
};

describe('OutputPanel — Test Cases tab', () => {
  test('renders a card for every executed case, not only the public ones', () => {
    // The API only ships 2 public cases, but the runtime executes all 4 and
    // returns a detail row for each — every one of them must be visible.
    const output: ExecutionResult = {
      status: 'PASSED',
      totalCases: 4,
      passedCases: 4,
      details: [0, 1, 2, 3].map((i) => makeDetail(i)),
    };

    renderTestsTab({
      testCases: [makeCase('1 2', '3'), makeCase('3 4', '7')],
      output,
    });

    ['CASE #1', 'CASE #2', 'CASE #3', 'CASE #4'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText('4 CASES RENDERED')).toBeInTheDocument();
    expect(screen.getByText('4/4 PASSED')).toBeInTheDocument();
  });

  test('labels cases whose input was never sent to the client as hidden', () => {
    const output: ExecutionResult = {
      status: 'FAILED',
      totalCases: 3,
      passedCases: 2,
      details: [0, 1, 2].map((i) => makeDetail(i, i < 2)),
    };

    renderTestsTab({
      testCases: [makeCase('1 2', '3'), makeCase('3 4', '7')],
      output,
      onRunSingleTestCase: vi.fn(),
    });

    expect(screen.getAllByText('[ HIDDEN ]')).toHaveLength(1);
    expect(
      screen.getByText('// hidden case — input not exposed to the client'),
    ).toBeInTheDocument();
    // A case with no local input cannot be replayed on its own.
    expect(screen.getAllByText(/RUN TEST #\d+ ONLY/)).toHaveLength(2);
  });

  test('custom input runs do not fabricate hidden rows from the custom detail', () => {
    renderTestsTab({
      isCustomInputRun: true,
      customInputActive: true,
      customInput: '5 5',
      testCases: [makeCase('1 2', '3')],
      output: {
        status: 'PASSED',
        totalCases: 1,
        passedCases: 1,
        details: [makeDetail(0)],
      },
    });

    expect(screen.getByText('CASE #1')).toBeInTheDocument();
    expect(screen.queryByText('CASE #2')).not.toBeInTheDocument();
    expect(screen.queryByText('[ HIDDEN ]')).not.toBeInTheDocument();
  });

  test('the case list owns its own scrollbar instead of clipping', () => {
    const { container } = renderTestsTab({
      testCases: Array.from({ length: 12 }, (_, i) => makeCase(`in-${i}`, `out-${i}`)),
    });

    const scroller = container.querySelector('.themed-scroll');
    expect(scroller).not.toBeNull();
    expect(scroller).toHaveClass('overflow-y-auto');
    expect(scroller).toHaveClass('overscroll-contain');
    expect(scroller).toHaveClass('min-h-0');
    expect(screen.getByText('12 CASES RENDERED')).toBeInTheDocument();
  });

  test('shows the empty state when no case is known yet', () => {
    renderTestsTab();
    expect(
      screen.getByText('NO_TEST_CASES // SYNTAX_SEEDED_EXERCISE'),
    ).toBeInTheDocument();
  });
});
