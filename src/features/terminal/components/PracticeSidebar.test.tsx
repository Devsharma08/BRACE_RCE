import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeSidebar, {
  stripDuplicateExamples,
  type PracticeProblem,
} from './PracticeSidebar';

const problem: PracticeProblem = {
  id: 'p1',
  name: 'Two Sum',
  problem_number: 1,
  difficulty_level: 'EASY',
  isSolved: false,
  problem_definition:
    '<p>Given an integer array nums and an integer target, return the indices of the two numbers that add up to target.</p>' +
    '<strong class="example">Example 1:</strong>' +
    '<pre>Input: nums = [2,7,11,9], target = 9\nOutput: [0,1]</pre>' +
    '<strong class="example">Example 2:</strong>' +
    '<pre>Input: nums = [3,2,4], target = 6\nOutput: [1,2]</pre>',
  problem_hints: ['Hash the complement while scanning.'],
  test_cases: [
    { id: 'c1', input: '2,7,11,9', expectedOutput: '[0,1]', is_public: true },
    { id: 'c2', input: '3,2,4', expectedOutput: '[1,2]', is_public: true },
  ],
};

const renderSidebar = (activeProblem: PracticeProblem | null = problem) =>
  render(
    <PracticeSidebar
      problems={[problem]}
      activeProblem={activeProblem}
      onSelectProblem={vi.fn()}
      width={360}
      onResizeStart={vi.fn()}
    />,
  );

describe('PracticeSidebar — problem description', () => {
  test('renders the worked examples inside the statement', () => {
    renderSidebar();

    expect(screen.getByText('PROBLEM DESCRIPTION')).toBeInTheDocument();
    expect(screen.getByText(/Example 1:/)).toBeInTheDocument();
    expect(screen.getByText(/Example 2:/)).toBeInTheDocument();
    expect(screen.getByText(/Output: \[0,1\]/)).toBeInTheDocument();
  });

  test('no longer repeats the public cases as a TEST CASES section', () => {
    renderSidebar();

    expect(screen.queryByText('TEST CASES')).not.toBeInTheDocument();
    expect(screen.queryByText('EXPECTED_OUTPUT')).not.toBeInTheDocument();
    expect(screen.queryByText('CASE #1')).not.toBeInTheDocument();
    expect(screen.queryByText('CASE #2')).not.toBeInTheDocument();
  });

  test('shows an empty state when no problem is selected', () => {
    renderSidebar(null);
    expect(screen.getByText('SELECT A PROBLEM TO VIEW DETAILS')).toBeInTheDocument();
  });
});

describe('stripDuplicateExamples — opt-in helper (Battle arena only)', () => {
  test('still strips legacy <h3>Example N</h3> blocks for callers that ask', () => {
    const html = '<p>Body</p><h3>Example 1</h3><p>Input: 1</p><p>Output: 2</p>';
    const cleaned = stripDuplicateExamples(html);

    expect(cleaned).not.toContain('Example 1');
    expect(cleaned).toContain('Body');
  });
});
