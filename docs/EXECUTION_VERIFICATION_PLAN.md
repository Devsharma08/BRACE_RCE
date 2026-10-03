# Plan: verifying every language executes every problem correctly

Status: the tooling for stages 1–3 exists and runs today. Stages 4–5 need work.

## Why the current coverage is not enough

Until now the only execution check was `verify_execution.ts`, which runs **every
problem but only in JavaScript**. That asymmetry is exactly why four P0 defects
survived to production:

| Defect | Caught by problem-bank tests? |
|---|---|
| C read every argument from the wrong stdin line | No — JS has no synthetic size param |
| Java wrapper emitted invalid char literals | No — JS never generates Java |
| Java declared `ListNode` before `Main` | No — JS has no entry-point class |
| `detectKind` mishandled `std::` qualified types | No — JS has no type detection |

Every one of them lived in the code that *builds* a submission, not in any
problem. Testing more problems in the same language would not have found any of
them. Coverage has to move along the **language** axis, not the problem axis.

## The two axes

```
                     problem coverage (how many problems)
                   ┌───────────────────────────────────────┐
  language         │                                       │
  coverage         │   1. verify_execution.ts   (JS only)    │
  (how many        │   2. verify_languages.ts    (1 problem) │
   languages)      │   3. verify_wrapper_shapes  (synthetic) │
                   │                                       │
                   │   4. verify_matrix.ts       (TODO)      │
                   │   5. CI gates + canary      (TODO)      │
                   └───────────────────────────────────────┘
```

Stages 1–3 are cheap and catch wrapper defects. Stages 4–5 catch
problem-specific defects. You need both; neither substitutes for the other.

## Stage 1 — every problem, JavaScript (EXISTS)

```bash
NODE_MODE=development npx tsx src/scripts/verify_execution.ts
```

194 problems × 10–15 cases = **893 cases** through real Piston. Catches wrong
expected outputs and broken reference solutions. Currently 893/893.

## Stage 2 — one problem, all five languages (EXISTS)

```bash
NODE_MODE=development npx tsx src/scripts/verify_languages.ts
```

Two-sum implemented five ways through the real `prepareFinalCode` and the exact
production payload. Catches "this language cannot run at all" and records the
cost profile. Currently 5/5.

## Stage 3 — every signature shape, every language (EXISTS)

```bash
NODE_MODE=development npx tsx src/scripts/verify_wrapper_shapes.ts
```
## Stage 4 — every problem, every language (NOT BUILT)

The real gap. Blocker first:

### 4a. Blocker — there are no non-Java reference solutions

`code_snippet` holds **187 java** and **194 javascript** rows and **zero** for
python, c, cpp. A cross-language matrix needs a correct reference per problem per
language, and for linked-list/tree/operation problems that is not mechanical —
the pointer types and return conventions genuinely differ.

Options, cheapest first:

1. **Hand-write a reference set for a representative sample** (~25 problems
   covering every signature shape) and gate on those. Cheap, honest, and it is
   what actually protects users today.
2. **Transpile the JavaScript reference** per language. Risky for pointer
   problems, fine for pure-array/int problems. Accept the coverage gap and
   label it.
3. **Generate references from the signature metadata** already produced by
   `prepareFinalCode`. Best long-term, largest initial cost.

Recommend (1) now, (3) later.

### 4b. Build the runner

```bash
NODE_MODE=development npx tsx src/scripts/verify_matrix.ts --langs=c,cpp --sample=25
```

Behaviour:
- For each (problem, language) pair, build the submission with `prepareFinalCode`
  using the **real** snippet from the database — not a hand-made one.
- Run every stored test case, compare to `expectedOutput` byte for byte.
- Emit a matrix report: `problem × language → pass/fail/skip`, plus wall time,
  CPU time and memory so regressions in cost are visible too.
- `--sample=N` for a random-but-seeded subset; `--full` for everything.
- Skip languages with no snippet and say so explicitly, so a gap is never silent.

### 4c. Cost reality check

Full matrix today is ~194 problems × 5 languages × ~12 cases ≈ **11,600 sandbox
runs**. Measured per-run cost on this box:

| Language | Wall per run | Runs in 1h |
|---|---|---|
| javascript | ~0.13 s | ~27,000 |
| python | ~0.14 s | ~25,000 |
| c | ~0.32 s | ~11,000 |
| cpp | ~2.7 s | ~1,300 |
| java | ~2.4 s | ~1,500 |

## Stage 5 — making it continuous (NOT BUILT)

Three tiers with different costs:

**Tier 1 — every commit (minutes).**
Stage 3 only: 50 shape cases, ~4 min. Catches wrapper regressions, which is
where the historically dangerous bugs live. Plus `tsc` and jest.

**Tier 2 — nightly (~1–2 h).**
Stage 1 (JS, every problem) plus stage 2, plus a **seeded sample** of stage 4
across all five languages — say 25 problems × 5 languages × 3 cases ≈ 375 runs,
dominated by ~200 compiled runs at ~2.5 s ≈ 8 min. Comfortable.

**Tier 3 — weekly, full matrix.**
All ~11,600 runs, ~8–10 h. Or split across several workers. Output archived as
an artefact so a regression can be diffed against the previous week.

### Canary, not just CI

CI tells you the suite is red. A canary tells you production is red. Add a small
endpoint or scheduled job that executes one known-good submission per language
against Piston every N minutes and alerts on failure. This is what would have
caught "Java stopped working entirely" within minutes rather than at the next
user report — and it does not depend on anyone remembering to run the suite.

## Definition of done

- [ ] Stage 4a resolved (reference set for a representative sample)
- [ ] `verify_matrix.ts` built and reporting a problem × language matrix
- [ ] Tier 1 wired into CI
- [ ] Tier 2 scheduled nightly
- [ ] Per-language canary running against production Piston
- [ ] **Batch test cases into one sandbox call** (section 4d) — biggest
      remaining user-facing defect: C++ submissions take ~59s
- [ ] Every `prepareFinalCode` branch has a shape in stage 3 — enforced by review

## What is already protected

Do not lose sight of how much is working: 893/893 JavaScript cases, 5/5
languages, 50/50 shapes, and per-language budgets that adapt to whatever limits
the deployed Piston actually enforces.

## How to reproduce this session's checks

```bash
cd server
NODE_MODE=production npx tsc --noEmit -p tsconfig.json          # build
NODE_OPTIONS=--experimental-vm-modules NODE_MODE=test npx jest src/services/codeExecution.test.ts
NODE_MODE=development PISTON_URL=http://localhost:2000 npx tsx src/scripts/verify_execution.ts
NODE_MODE=development PISTON_URL=http://localhost:2000 npx tsx src/scripts/verify_languages.ts
NODE_MODE=development PISTON_URL=http://localhost:2000 npx tsx src/scripts/verify_wrapper_shapes.ts
python3 server/scripts/api_audit.py                             # endpoint stats
```

So the compiled languages dominate: a full matrix is roughly **8–10 hours**, not
something to run on every commit. Design accordingly — see stage 5.

### 4d. The largest remaining user-facing defect: compile per test case

Measured end to end through the live API on Two Sum, 13 real test cases:

| Language | 13-case SUBMIT | Per case | vs JavaScript |
|---|---|---|---|
| javascript | 3.4 s | ~0.26 s | 1x |
| python | 3.6 s | ~0.27 s | 1.0x |
| c | 4.3 s | ~0.33 s | 1.3x |
| **cpp** | **51.4 s** | **~3.95 s** | **15x** |

Projected for a 15-case bank problem: **C++ ~59 s, Java ~31 s.** That is far past
any acceptable wait for a code submission, and it is now the biggest thing wrong
with the core feature.

Cause: `executeCode` issues one Piston request per test case, and every request
compiles the identical file again. For C++ roughly 3.7 s of the 3.95 s per case
is compile and toolchain startup — about 95%. Java is similar at ~2.4 s, almost
entirely JVM startup. C is nearly unaffected because gcc is much cheaper here
than g++.

Note this also explains why `compileMs` reads 0 in the execution telemetry: this
Piston build does not return `compile.time` or `run.time` at all, only
`cpu_time`, `wall_time` and `memory`. The compile cost is real but currently
invisible per-case; it only shows up in end-to-end wall time.

**The fix.** Batch every test case into a single sandbox invocation:

1. Join the case inputs with a delimiter line that cannot occur in test data.
2. Generate a `main()` that reads all of stdin, splits on the delimiter, and
   runs the user function once per chunk, printing one result per line.
3. Compare stdout line *i* against expected output *i* in the backend.

That turns N requests into 1: C++ goes from ~59 s to ~4 s for a 15-case problem,
a ~15x improvement, and it makes the full stage-4 matrix practical overnight.

**Why it is not done here.** It changes the generated `main()` for C, C++ and
Java, which is the production execution path, and the per-case output contract
that 893 JavaScript bank cases and 50 shape cases depend on. It is the right
change but it deserves its own branch and its own review rather than being
folded into an already-large session.

**When it is done**, gate it on:
- `verify_wrapper_shapes.ts` still 50/50 (it covers the multi-case framing once
  the shape suite gains a multi-case case)
- `verify_execution.ts` still 893/893
- a new shape that feeds 3 cases and asserts 3 output lines
- A/B the live API timings above to confirm the ~15x, not just that it is green


10 shapes × 5 languages = **50 cases**: int, int[], int[]+int, two args after an
array, string, string[], int[] return, empty array, negatives/zero, void with
in-place mutation, large ints. This is the highest-value cheap check and it
found two real bugs on its first run. Currently 50/50.

Growth rule: **every new branch in `prepareFinalCode` must add a shape here.**
The C `string_array` branch did not exist until this suite pointed at it.
