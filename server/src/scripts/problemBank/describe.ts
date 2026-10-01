/**
 * Builds the HTML stored in Problem.problem_definition.
 *
 * The shape mirrors the existing LeetCode-derived rows in the database
 * (`<p>`, `<strong class="example">`, `<pre>`, `<ul>`) so the frontend renders
 * new and legacy problems identically.
 */

export interface DescExample {
  /** e.g. "nums = [2,7,11,15], target = 9" */
  input: string;
  output: string;
  explanation?: string;
  /**
   * Machine-checkable form of `input`, as the argument list the wrapper would
   * receive. `verify_problem_bank.ts` asserts that the reference solution
   * returns exactly `output`, so a documented example can never drift away
   * from the stored expected outputs.
   */
  args?: unknown[];
}

export interface DescSpec {
  /** Main statement. Plain text with optional inline HTML. */
  intro: string[];
  /** Extra explanatory paragraphs (intuition / why it works). */
  notes?: string[];
  /** Bullet list of the technique, shown as "Approach". */
  approach?: string[];
  examples: DescExample[];
  constraints: string[];
  /** e.g. "Time O(n) / Space O(1)" */
  complexity?: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const describe = (spec: DescSpec): string => {
  const parts: string[] = [];

  for (const p of spec.intro) parts.push(`<p>${p}</p>`);

  if (spec.notes?.length) {
    parts.push(`<p><strong>Key idea:</strong></p>`);
    parts.push('<ul>');
    for (const n of spec.notes) parts.push(`<li>${n}</li>`);
    parts.push('</ul>');
  }

  if (spec.approach?.length) {
    parts.push(`<p><strong>Approach:</strong></p>`);
    parts.push('<ul>');
    for (const a of spec.approach) parts.push(`<li>${a}</li>`);
    parts.push('</ul>');
  }

  spec.examples.forEach((ex, i) => {
    parts.push('');
    parts.push(`<p><strong class="example">Example ${i + 1}:</strong></p>`);
    parts.push('<pre>');
    parts.push(`<strong>Input:</strong> ${ex.input}`);
    parts.push(`<strong>Output:</strong> ${ex.output}`);
    if (ex.explanation) {
      parts.push(`<strong>Explanation:</strong> ${ex.explanation}`);
    }
    parts.push('</pre>');
  });

  if (spec.complexity) {
    parts.push('');
    parts.push(
      `<p><strong>Complexity:</strong> ${spec.complexity}</p>`,
    );
  }

  parts.push('');
  parts.push(`<p><strong>Constraints:</strong></p>`);
  parts.push('<ul>');
  for (const c of spec.constraints) parts.push(`<li>${esc(c)}</li>`);
  parts.push('</ul>');

  return parts.join('\n');
};