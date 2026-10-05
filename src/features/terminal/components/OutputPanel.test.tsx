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

  test('every case renders its real input and expected output', () => {
    // Cases are no longer withheld: all 15 ship in full. Only the first three
    // carry the SAMPLE badge.
    const testCases: ProblemTestCase[] = Array.from({ length: 15 }, (_, i) => ({
      input: `in-${i}`,
      expectedOutput: `out-${i}`,
      isPublic: i < 3,
    }));

    const { container } = renderTestsTab({ testCases, onRunSingleTestCase: vi.fn() });

    expect(screen.getByText('15 CASES RENDERED')).toBeInTheDocument();
    // Every card shows its input, not a "withheld" placeholder.
    expect(screen.queryByText(/withheld/)).not.toBeInTheDocument();
    for (let i = 0; i < 15; i++) {
      expect(screen.getByText(`in-${i}`)).toBeInTheDocument();
      expect(screen.getByText(`out-${i}`)).toBeInTheDocument();
    }
    // And every one of them can be run on its own.
    expect(screen.getAllByText(/RUN TEST #\d+ ONLY/)).toHaveLength(15);
    expect(container).toBeTruthy();
  });

  test('only the first three cases are badged as samples', () => {
    const testCases: ProblemTestCase[] = Array.from({ length: 15 }, (_, i) => ({
      input: `in-${i}`,
      expectedOutput: `out-${i}`,
      isPublic: i < 3,
    }));

    renderTestsTab({ testCases, onRunSingleTestCase: vi.fn() });
    expect(screen.getAllByText('[ SAMPLE ]')).toHaveLength(3);
    expect(screen.queryAllByText('[ HIDDEN ]')).toHaveLength(0);
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

  test('a single-case run is labelled as partial, never as a solved problem', async () => {
    // "Run test #3 only" grades 1 of 15. Reporting "1/1 PASSED" would read as
    // accepted, so the header names the case and the verdict stays partial.
    const output: ExecutionResult = {
      status: 'PASSED',
      totalCases: 1,
      passedCases: 1,
      details: [makeDetail(2, true)],
    };

    renderTestsTab({
      testCases: Array.from({ length: 15 }, (_, i) => ({
        ...makeCase(`in-${i}`, `out-${i}`),
        isPublic: i < 3,
      })),
      output,
    });

    expect(screen.getByText('15 CASES RENDERED')).toBeInTheDocument();
    expect(screen.getByText('CASE 3 ONLY · 1/1 PASSED')).toBeInTheDocument();
    // It must NOT claim the whole set passed.
    expect(screen.queryByText('15/15 PASSED')).not.toBeInTheDocument();
    // The verdict still lands on card 3, not card 1.
    expect(screen.getByText('CASE #3')).toBeInTheDocument();
  });

  test('a full run still reports the whole set', async () => {
    const output: ExecutionResult = {
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
      output,
    });

    expect(screen.getByText('15/15 PASSED')).toBeInTheDocument();
    expect(screen.queryByText(/CASE \d+ ONLY/)).not.toBeInTheDocument();
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
