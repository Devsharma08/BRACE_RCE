/**
 * Execution support for OPERATION-SEQUENCE problems.
 *
 * Most problems take one JSON argument per line and return one value. But the
 * design-problems (Implement Queue using Stacks, Max Stack, Design Twitter,
 * Design Circular Queue, Find Median from Data Stream, Cache With Time Limit,
 * Kth Largest Element in a Stream) instead exercise a CLASS through a scripted
 * sequence of calls, because that is the whole point of the exercise.
 *
 * Their stored inputs look like:
 *
 *     push(1),push(2),peek(),pop(),empty()
 *     KthLargest(3,[4,5,8,2])
 *     add(3),add(5),add(10)
 *
 * and their expected outputs are the comma-joined results of the calls that
 * RETURN something:
 *
 *     1,1,false
 *
 * The previous wrapper tried to JSON.parse this input, so it always threw and
 * no submission could ever pass. This module builds a wrapper that understands
 * the format instead.
 *
 * OUTPUT RULE (kept deliberately simple, because a submission cannot express
 * the difference anyway): a call returning undefined contributes NOTHING to the
 * output, while any other value is appended. So "returns void" and "returns
 * undefined" are indistinguishable — which is exactly the ambiguity a JSON
 * wrapper would have anyway.
 */

/** Signature extracted from a prototype-style starter snippet. */
export interface OperationSignature {
  /** Class name, e.g. `MaxStack` — also the constructor's name. */
  className: string;
  /** Methods the snippet declares on the prototype. */
  methods: string[];
}

/**
 * Detect a prototype-style starter snippet.
 *
 * The `.prototype.` marker is specific: across the whole problem set only the
 * operation-sequence problems use it. Returns null for ordinary functions.
 */
export function detectOperationSignature(code: string): OperationSignature | null {
  if (!code || !code.includes('.prototype.')) return null;

  const classMatch = code.match(
    /(?:var|let|const)\s+(\w+)\s*=\s*function\s*\(/,
  );
  if (!classMatch) return null;
  const className = classMatch[1];

  const methods: string[] = [];
  const methodRe = /\w+\.prototype\.(\w+)\s*=\s*function\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = methodRe.exec(code)) !== null) methods.push(m[1]);

  if (methods.length === 0) return null;
  return { className, methods };
}

/**
 * Build the JavaScript driver for an operation-sequence problem.
 *
 * The generated code is appended after the user's snippet, so the class and its
 * prototype methods are already in scope.
 */
export function buildOperationWrapper(sig: OperationSignature): string {
  return `
// ── operation-sequence driver ────────────────────────────────────────────
// Parses "push(1),peek()" style input, drives the class, and prints the
// comma-joined results of the calls that return a value.
const __opsInput = require('fs').readFileSync(0, 'utf-8');
const __KNOWN_OPS = new Set(${JSON.stringify(sig.methods)});
// The class binding is referenced directly: a "var X = ..." declaration in a
// CommonJS module is module-scoped and so is NOT reachable via globalThis.
const __CONSTRUCTOR_NAME = ${JSON.stringify(sig.className)};
const Ctor = ${sig.className};

/** Split "a(1,2),b([3,4])" on top-level commas only. */
function __splitTopLevel(text) {
  const parts = [];
  let depth = 0, quote = '', current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === '\\\\') { current += text[++i] ?? ''; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '\`') { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Parse one call into { name, args }. */
function __parseCall(text) {
  const open = text.indexOf('(');
  if (open === -1) return null;
  const name = text.slice(0, open).trim();
  let depth = 0, quote = '', argsText = '';
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      argsText += ch;
      if (ch === '\\\\') { argsText += text[++i] ?? ''; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '\`') { quote = ch; argsText += ch; continue; }
    if (ch === '(') { depth++; if (depth === 1) continue; }
    if (ch === ')') { depth--; if (depth === 0) break; }
    argsText += ch;
  }
  let args = [];
  if (argsText.trim()) {
    const raw = argsText.trim();
    try {
      const parsed = JSON.parse(raw);
      args = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // Single-quoted strings and bare identifiers are not valid JSON.
      args = (function () {
        const fn = new Function('return [' + raw + '];');
        return fn();
      })();
    }
  }
  return { name, args };
}

/** How a returned value is rendered into the output line. */
function __format(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

async function __runOperations() {
  const lines = __opsInput
    .split(/\\r?\\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const calls = [];
  for (const line of lines) {
    for (const part of __splitTopLevel(line)) {
      const call = __parseCall(part);
      if (call) calls.push(call);
    }
  }

  // A leading call named after the class is the constructor.
  let instance;
  if (calls.length > 0 && calls[0].name === __CONSTRUCTOR_NAME) {
    const ctorCall = calls.shift();
    instance = new Ctor(...ctorCall.args);
  } else {
    instance = new Ctor();
  }

  const results = [];
  for (const call of calls) {
    // wait(ms) is a harness directive: it lets time-based caches expire.
    if (call.name === 'wait') {
      await new Promise((r) => setTimeout(r, Number(call.args[0]) || 0));
      continue;
    }
    const fn = instance[call.name];
    if (typeof fn !== 'function') {
      throw new Error('Unknown operation: ' + call.name);
    }
    const value = fn.apply(instance, call.args);
    // undefined means "returned nothing", so it adds no output segment.
    if (value !== undefined) results.push(__format(value));
  }

  console.log(results.join(','));
}

__runOperations().catch((e) => {
  console.error('EXECUTION ERROR:', e.message || e);
  process.exit(1);
});
`;
}
