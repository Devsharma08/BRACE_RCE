/**
 * Anti-Cheat & Plagiarism Detection Engine (ROADMAP §3) — starter heuristics.
 *
 * Pure functions (no DB) so they can be unit-tested:
 *  - AST-ish structure comparison via token-shape normalization (language agnostic).
 *  - Focus-loss telemetry evaluation (tab switches / blur events during a duel).
 */

export interface SimilarityResult {
  similarity: number; // 0..1
  flagged: boolean;
  reason: string;
}

/** Normalize code into a structural token stream (identifiers/literals abstracted). */
export function normalizeCodeStructure(code: string): string {
  return (code || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ") // block comments
    .replace(/(^|\s)\/\/.*$/gm, "$1") // line comments
    .replace(/#.*$/gm, " ") // python/shell comments
    .replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, " STR ") // docstrings
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, " STR ") // string literals
    .replace(/\b\d+(\.\d+)?\b/g, " NUM ") // numbers
    .replace(/[A-Za-z_][A-Za-z0-9_]*/g, " ID ") // identifiers
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(structure: string): Set<string> {
  return new Set(structure.split(" ").filter(Boolean));
}

function bigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) out.add(`${tokens[i]}|${tokens[i + 1]}`);
  return out;
}

/**
 * Jaccard similarity over structural bigrams.
 * Threshold default 0.85 — above this, submissions are flagged for review.
 */
export function compareCodeStructure(a: string, b: string, threshold = 0.85): SimilarityResult {
  const sa = normalizeCodeStructure(a);
  const sb = normalizeCodeStructure(b);
  if (!sa || !sb) {
    return { similarity: 0, flagged: false, reason: "Empty submission — cannot compare" };
  }
  if (sa === sb) {
    return { similarity: 1, flagged: true, reason: "Identical code structure (possible copy-paste)" };
  }
  const ta = sa.split(" ").filter(Boolean);
  const tb = sb.split(" ").filter(Boolean);
  const setA = bigrams(ta);
  const setB = bigrams(tb);
  if (setA.size === 0 || setB.size === 0) {
    // Fall back to token Jaccard for tiny snippets
    const fa = tokenSet(sa);
    const fb = tokenSet(sb);
    const inter = [...fa].filter((t) => fb.has(t)).length;
    const union = new Set([...fa, ...fb]).size || 1;
    const similarity = inter / union;
    return {
      similarity: Math.round(similarity * 100) / 100,
      flagged: similarity >= threshold,
      reason: similarity >= threshold ? "High structural overlap (possible plagiarism)" : "No significant overlap",
    };
  }
  let inter = 0;
  for (const g of setA) if (setB.has(g)) inter++;
  const union = setA.size + setB.size - inter || 1;
  const similarity = Math.round((inter / union) * 100) / 100;
  return {
    similarity,
    flagged: similarity >= threshold,
    reason: similarity >= threshold ? "High structural overlap (possible plagiarism)" : "No significant overlap",
  };
}

export interface FocusEvent {
  type: "blur" | "tab_hidden" | "focus";
  atMs: number;
}

export interface FocusEvaluation {
  blurCount: number;
  hiddenCount: number;
  totalAwayMs: number;
  flagged: boolean;
  reason: string;
}

/**
 * Evaluate focus-loss telemetry for a duel window [startMs, endMs].
 * Flags when blur/hidden events exceed maxEvents OR total away time exceeds maxAwayMs.
 */
export function evaluateFocusTelemetry(
  events: FocusEvent[],
  startMs: number,
  endMs: number,
  opts: { maxEvents?: number; maxAwayMs?: number } = {},
): FocusEvaluation {
  const maxEvents = opts.maxEvents ?? 5;
  const maxAwayMs = opts.maxAwayMs ?? 60_000;
  const sorted = [...(events || [])].sort((x, y) => x.atMs - y.atMs);

  let blurCount = 0;
  let hiddenCount = 0;
  let totalAwayMs = 0;
  let awaySince: number | null = null;

  for (const e of sorted) {
    if (e.atMs < startMs || e.atMs > endMs) continue;
    if (e.type === "blur") blurCount++;
    if (e.type === "tab_hidden") hiddenCount++;
    if (e.type === "blur" || e.type === "tab_hidden") {
      awaySince = awaySince ?? e.atMs;
    } else if (e.type === "focus" && awaySince !== null) {
      totalAwayMs += Math.max(0, e.atMs - awaySince);
      awaySince = null;
    }
  }
  if (awaySince !== null) totalAwayMs += Math.max(0, endMs - awaySince);

  const eventCount = blurCount + hiddenCount;
  const flagged = eventCount > maxEvents || totalAwayMs > maxAwayMs;
  return {
    blurCount,
    hiddenCount,
    totalAwayMs,
    flagged,
    reason: flagged
      ? `Excessive focus loss (${eventCount} events, ${Math.round(totalAwayMs / 1000)}s away)`
      : "Focus telemetry within limits",
  };
}
