import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OutputPanel from '../features/terminal/components/OutputPanel';
import { buildProblemTestCases } from '../features/terminal/executionOutput';
import type { ProblemTestCase, ExecutionResult } from '../features/terminal/types';

// Reproduces the reported symptom: after a RUN that returns only case 0's detail,
// what does the panel show for the cases it never received a detail for?
describe('repro: expected output renders as null', () => {
  test('single-case run then inspect all cards', async () => {
    const API = 'http://localhost:3000/api';
    const email = `r_${Date.now()}@example.com`;
    const sr = await fetch(`${API}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Str0ngPass!234', name: 'R', username: `r${Date.now()%100000}` }) });
    const cookie = (sr.headers.get('set-cookie') ?? '').split(';')[0];
    const j: any = await (await fetch(`${API}/problems/system?page=1&limit=1`, { headers: { cookie } })).json();
    const p0 = j.problems[0];
    console.log('API case0 keys:', Object.keys(p0.test_cases[0]));
    console.log('API case0 expectedOutput:', JSON.stringify(p0.test_cases[0].expectedOutput));

    const cases: ProblemTestCase[] = buildProblemTestCases({ test_cases: p0.test_cases, id: p0.id } as any);
    console.log('built cases:', cases.length, '| case0.expectedOutput =', JSON.stringify(cases[0].expectedOutput));

    // A single-case run on index 0
    const r: ExecutionResult = await (await fetch(`${API}/execute`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ code: 'function twoSum(a,b){return [0,1];}', language: 'javascript', oid: p0.id, mode: 'RUN', testCaseIndex: 0 }) })).json();
    console.log('RUN totalCases:', r.totalCases, 'details len:', r.details?.length, 'detail0.expectedOutput:', JSON.stringify(r.details?.[0]?.expectedOutput));

    render(<OutputPanel isExecuting={false} isOutputActive isCustomInputRun={false} output={r}
      outputHeight={300} outputText="" testCases={cases} customInput="" customInputActive={false}
      onResizeStart={()=>{}} setOutputHeight={()=>{}} setCustomInput={()=>{}} setCustomInputActive={()=>{}} setIsOutputActive={()=>{}} />);
    screen.getByText('Test Cases').click();

    const dashes = screen.queryAllByText('-');
    console.log('cards showing "-" for expected:', dashes.length);
    expect(cases.length).toBe(15);
  }, 120000);
});
