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
      testCases: [
        { ...makeCase('1 2', '3'), isPublic: true },
        { ...makeCase('3 4', '7'), isPublic: true },
        { ...makeCase('', ''), isPublic: false },
      ],
      output,
      onRunSingleTestCase: vi.fn(),
    });

    expect(screen.getAllByText('[ HIDDEN ]')).toHaveLength(1);
    // Both the input and the expected box show the withheld notice.
    expect(screen.getAllByText('// withheld — graded on submit')).toHaveLength(2);
    // A withheld case has no client-side input, so only the 2 public ones can
    // be replayed on their own.
    expect(screen.getAllByText(/RUN TEST #\d+ ONLY/)).toHaveLength(2);
  });

  test('renders all 15 stored cases even when only 3 are public', () => {
    // The API ships every case so the list can show all 15, but withholds the
    // input/expected output of the 12 non-public ones.
    const testCases: ProblemTestCase[] = Array.from({ length: 15 }, (_, i) =>
      i < 3
        ? { ...makeCase(`in-${i}`, `out-${i}`), isPublic: true }
        : { input: '', expectedOutput: '', isPublic: false },
    );

    renderTestsTab({ testCases, onRunSingleTestCase: vi.fn() });

    expect(screen.getByText('15 CASES RENDERED')).toBeInTheDocument();
    expect(screen.getAllByText('[ HIDDEN ]')).toHaveLength(12);
    expect(screen.getAllByText('[ SAMPLE ]')).toHaveLength(3);
    // Withheld cases cannot be run individually.
    expect(screen.getAllByText(/RUN TEST #\d+ ONLY/)).toHaveLength(3);
  });

  test('marks the whole set solved only when every graded case passed', () => {
    const allPassed: ExecutionResult = {
      status: 'PASSED',
      totalCases: 15,
      passedCases: 15,
      details: Array.from({ length: 15 }, (_, i) => makeDetail(i)),
    };

    renderTestsTab({
      testCases: Array.from({ length: 15 }, (_, i) => ({
        ...makeCase(`in-${i}`, `out-${i}`),
        isPublic: i < 3,
      })),
      output: allPassed,
    });

    expect(screen.getByText('15 CASES RENDERED')).toBeInTheDocument();
    expect(screen.getByText('15/15 PASSED')).toBeInTheDocument();
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

  test('locks the panel to the track it was given so the list scrolls, not the panel', () => {
    // The panel is a grid row sized by the workspace (`h-full`); without the
    // min-h-0 guard its flex children can inflate it past that track, which is
    // how the output area used to spill out of its own container.
    const { container } = renderTestsTab({
      testCases: Array.from({ length: 12 }, (_, i) => makeCase(`in-${i}`, `out-${i}`)),
    });

    const panel = container.firstElementChild as HTMLElement;
    expect(panel).toHaveClass('h-full');
    expect(panel).toHaveClass('min-h-0');
    expect(panel).toHaveClass('flex-col');

    expect(panel).toContainElement(container.querySelector('.themed-scroll') as HTMLElement);
  });

  test('shows the empty state when no case is known yet', () => {
    renderTestsTab();
    expect(
      screen.getByText('NO_TEST_CASES // SYNTAX_SEEDED_EXERCISE'),
    ).toBeInTheDocument();
  });
});
