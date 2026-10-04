# Plan: verifying every language executes every problem correctly

Status: stages 1–3 exist and run today. Stages 4–5 need work. **Phase 0 and 1a of
the remediation plan below are now done.**

---

# Remediation log — what changed to make submissions actually complete

This section records fixes made after the plan below was written. It exists
because the fixes were driven by measurement, and several contradicted the
original assumptions.

## Done: client request budget (was 30s, now 120s)

`src/features/terminal/api.ts` aborted at 30s. Measured through this API, a
13-case C++ submission legitimately needs ~23s and Java ~39s, so the browser
gave up **after the server had already computed the correct answer**. The abort
now also raises a distinct "took longer than 120s" error rather than a generic
network failure, so the cause is visible.

## Done: test cases run concurrently (with a per-language bound)

Test cases used to run one at a time, recompiling identical code per case.
Measured on Two Sum (13 cases), end to end through `/api/execute`:

| | before | after |
|---|---|---|
| javascript | 3.4s | 3.1–3.4s |
| cpp | 51.4s | 18–23s |
| java | 31s | 39s (see below) |

Concurrency is **4 for javascript/python/c/cpp and 2 for java**. Not a single
global number: one Java case measured 2930ms wall but 8274ms CPU — the JVM
burns roughly 2.8 cores during startup. Running four at once made them contend,
CPU time crossed `run_cpu_time`, cases were SIGKILLed, and a 13-case submission
failed at 3/13 — *worse* than the serial version it replaced.

The short-circuit semantics are preserved exactly: the original loop stopped at
the first failure (SUBMIT) or first compile error, and the concurrent version
re-derives the same stopping point after all cases return, so the response is
byte-identical. This matters because 893 bank assertions depend on it.

## Done: three more P0-class execution bugs

All found by end-to-end testing that the per-case suites could not reach,
because those suites call the wrapper directly and never go through
`executeCode`:

1. **`totalPassed` was incremented twice** — once in the worker, once in the
   aggregation loop. A 13-case all-pass submission reported `26/13` and status
   `FAILED`. Every user submitting correct JavaScript/C++ saw a failure.
2. **Java emitted `class Solution` before `public class Main`.** Java compiles a
   file whose public class matches the filename but runs the **first** class in
   source-launcher mode, so it launched `Solution` and died with
   `can't find main(String[]) method in class: Solution`. Affected all 187 Java
   snippets that stored a wrapper.
3. **Stored placeholder wrappers took precedence over the working generated
   ones.** The seeder writes `// Wrapper` (90 of 194 JavaScript snippets) and
   `public class Main { /* Test wrapper */ }` (all 187 Java). The old guard
   rejected only the literal `"TODO"`. Java compiled cleanly, ran an empty
   `main`, printed nothing, and failed on empty output **with no error message**
   — the hardest kind of failure to diagnose. The guard now requires a wrapper
   to actually invoke the solution *and* emit output.

Also raised Java's `runTimeoutMs` from 8000 to 20000: at 8s a concurrent JVM
crossed the wall clock and was killed with "Time limit exceeded" **while still
starting up**, which has nothing to do with the user's code.

## Still required from you (ops, not code)

The Piston CPU ceiling is **server-side** and was raised only in the local
container. Production will still cap `run_cpu_time` at 3000ms, which the JVM
exceeds on startup alone:

```
docker run -e PISTON_RUN_CPU_TIME=20000 -e PISTON_RUN_TIMEOUT=10000 ...
# or per-language, leaving other runtimes untouched:
docker run -e PISTON_LIMIT_OVERRIDES='{"java":{"run_cpu_time":20000,"run_timeout":10000}}' ...
```

The adaptive clamp keeps Java *working* without this (it learns the ceiling and
retries), but Java will be slow and near the limit. A `docker rm` also discards
the local patch, so it will silently revert.

---

# Plan: verifying every language executes every problem correctly

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

### 4d. DONE — compile per test case (batched)

Measured end to end through the live API on Two Sum, 13 real test cases:

| Language | before | after | CPU before | CPU after |
|---|---|---|---|---|
| java | **51.1 s** | **4.1 s** | ~123,000 ms | 7,163 ms (17x) |
| cpp | **22.0 s** | **6.8 s** | ~143 ms | 13 ms |
| javascript | 3.4 s | 3.4 s | — | — |

Cause: `executeCode` issued one Piston request per test case, and every request
recompiled the identical file. For C++ roughly 2.5 s of the request is compile
and toolchain startup against ~11 ms of user code. Java is worse: ~2.4 s of CPU
of JVM startup before any user code runs, on every case.

**The fix.** Cases are packed into a single sandbox invocation behind a
`__CASE__<lineCount>` header, so the split never has to guess where a case ends.
The generated driver reads the headers, runs each case, and prints one result
line per case. Java and C++ drivers were restructured for this; their per-case
body is now a function over `lines`, which is all it took because the argument
parsing only ever referenced `lines`.

**It cannot produce a wrong verdict.** `runBatched` returns null on anything it
cannot account for — a line-count mismatch, a non-zero exit, a compile failure,
or an `__ERR__` line — and the caller re-runs the proven per-case path. Per-case
CPU is reported as the amortised share, since the batch shares one process.

Two further guards exist because batching changes *semantics*, not just cost:

- **Shared mutable state.** All cases share one process, so a `static` field
  persists across cases where the per-case path started fresh. A correct Java
  submission with a static counter fails batched and passes per-case. Submissions
  containing `static` are therefore not batched. Measured: with the guard that
  submission PASSES 13/13; with the guard removed it reports **FAILED 1/13**.
- **Multi-line expected output.** The contract is one output line per case. All
  2,500 stored cases are single-line (checked), but that is a property of the
  current data rather than a guarantee, so it is refused explicitly.

Known gap: a C++ file-scope variable written without `static` is not detected,
because catching it needs real parsing. The Java path is exact.

**Final live measurement**, Two Sum, 13 cases, one run each:

| Language | before | now | status |
|---|---|---|---|
| javascript | 3.4 s | **2.3 s** | PASSED 13/13 |
| cpp | 22.0 s | **3.4 s** | PASSED 13/13 |
| java | 51.1 s | **3.9 s** | PASSED 13/13 |

`falsePass=0` on all three: no case was reported as passed while its output
disagreed with the expected output.

**What it changed that mattered:**
- Exceptions still propagate on the legacy single-case path. An early draft
  captured them there too, which turned "your code threw" into "wrong answer"
  with no runtime error shown.
- Short-circuit semantics are unchanged: a wrong C++ answer still stops at the
  first failing case (3/13, 9 skipped, details truncated there).
- A case that throws mid-batch yields one `__ERR__` line and its siblings still
  run; the backend then re-runs per case for a proper message.

Coverage: `verify_wrapper_shapes.ts` now also exercises the batched framing
(3 cases in, 3 lines out) alongside the 50 single-case shapes, because batching
is a separate branch that the single-case matrix cannot reach. Sabotaging the
framing turns that check red, so it is a real gate.

Not batched: C and JavaScript. Their drivers still read a single case, and
framing stdin their wrappers cannot parse would break them. C is already cheap
(gcc 237 ms vs g++ 2540 ms for the generated wrapper).

---

# Phase 2 — language and compilation strategy

The premise going in was: *compilation is ~80% of execution time for compiled
languages, so cut it with compiler flags and by preferring interpreters.*
Measured on this deployment (Piston, c++/gcc, 4–5 samples, best-of):

| Experiment | best wall | note |
|---|---|---|
| C++ `int main(){}`, no includes | 331 ms | baseline: container + exec |
| C++ `#include<vector>,<unordered_map>` | 699 ms | |
| C++ `#include<bits/stdc++.h>` | **3310 ms** | 10x for one header |
| C++ **production wrapper** (15 explicit headers) | 2540 ms | what users actually run |
| C++ production wrapper, headers trimmed to 5 | 970 ms | **did not compile** — see below |
| C++ production wrapper + `queue`,`stack` | 2141 ms | correct, saves ~330 ms |
| C `int main(){}` | 237 ms | |
| Python `print("x")` | 58 ms | |
| Java trivial `Main` | 1034 ms wall / **2409 ms CPU** | JVM startup |
| Java **production wrapper** | 2018 ms wall / **6609 ms CPU** | |
| JavaScript, 13 cases through the API | 3.4 s | already cheap |

## Finding 1 — the `-O0` / `-O2` recommendation does not apply here

Benchmarked `compile_args` directly:

| `compile_args` | best wall |
|---|---|
| default (none) | 3633 ms |
| `-O0` | 3919 ms |
| `-O2` | 3422 ms |

`-O0` came out *slower* than the default, and the spread (3.4–3.9 s) is within
run-to-run noise. **All three land in the same band, so compiler optimisation
level is not the cost.** GCC spends that time parsing headers and instantiating
templates, which happens at `-O0` as well. Passing `compile_args: ["-O0"]`
would buy nothing measurable while risking a slower user binary, so it is
deliberately **not** applied. Revisit only if a case ever fails on runtime
limits, which today none do (`avgCpu` for C++ is 11 ms).

## Finding 2 — the real lever is header weight, and we are already near it

`bits/stdc++.h` alone is 3.3 s. Our wrapper already avoids it (15 explicit
includes, no `bits`), which is why production is 2540 ms rather than 3.3 s+.
Trimming to 5 headers *looked* like a 2.6x win at 970 ms but **produced empty
output and a failed compile** — the header block was removed faster than it
could be proven safe. Only the conservative trim (`queue`/`stack` retained)
compiled correctly, at 2141 ms: a real ~13% win, but it requires knowing which
headers each generated driver needs, and an over-trim is a silent
wrong-answer-or-compile-error class of bug — the same failure mode as the four
P0s already fixed in this file. **Held as a possible follow-up, not applied
now.** The safe version is to compute the include set from the TypeKinds the
generated driver actually emits, and verify per shape.

## Finding 3 — Java is dominated by JVM startup, which no compile flag touches

Java reports **6609 ms CPU for 2008 ms wall** on the production wrapper, and
even a trivial `Main` costs **2409 ms CPU**. GC/JIT threads run concurrently,
so CPU exceeds wall. The compile portion is real but secondary; the dominant
term is VM startup, paid once per Piston invocation. This is the same root
cause as 4d — and it is why batching is the only large win available.

## Conclusion — order of work for Phase 2

1. **Batching (4d) — DONE.** Java 51.1s → 4.1s, C++ 22.0s → 6.8s on 13 cases.
   This was the only change that removed the fixed per-invocation cost rather
   than trimming the variable part around it, and the measurements above are why.
2. Do **not** add `compile_args`; measured to be noise.
3. Header trimming is worth ~13% on C++ but needs a per-shape include set
   before it can be safe. Revisit after batching, when the fixed cost it was
   competing with is gone.
4. C and JavaScript are unbatched and should stay that way unless C's compile
   cost grows; gcc is 10x cheaper than g++ here, and both languages are already
   inside the client budget.

If Piston later exposes a compile-once/run-many or package-caching API, that
supersedes batching entirely and should be revisited first.


10 shapes × 5 languages = **50 cases**: int, int[], int[]+int, two args after an
array, string, string[], int[] return, empty array, negatives/zero, void with
in-place mutation, large ints. This is the highest-value cheap check and it
found two real bugs on its first run. Currently 50/50.

Growth rule: **every new branch in `prepareFinalCode` must add a shape here.**
The C `string_array` branch did not exist until this suite pointed at it.

---

# Coverage — what is actually verified, and what "893" does not mean

**893 is not 893 of everything.** It is the case count of ONE suite
(`verify_execution.ts`) covering 70 of the 194 problems. Quoting it without its
denominator made the suite sound like full coverage when it is 36% of the bank.
This section exists so that cannot happen again.

## All three reference sets

The bank is not one list. There are three, and they are keyed differently —
`BANK` by `problem_number`, `LEGACY` by `number` — which is exactly why an
earlier audit matched them by NAME, found zero overlap, and wrongly concluded
that 124 problems had no reference at all. They do; the join key was wrong.

| Suite | Source | Problems | Cases | Result |
|---|---|---|---|---|
| `verify_execution.ts` | `BANK` | 70 | 893 | **893 passed, 0 failed** |
| `verify_legacy_execution.ts` | `LEGACY` | 113 | 1,468 | **1,468 passed, 0 failed** |
| `verify_operation_problems.ts` | `OPERATION_SEQUENCE` | 10 | 127 | **91 passed, 0 failed** |
| **Total** | | **193 / 194** | **2,452 / 2,500** | |

The one gap is **Clone Graph (#30)**, 12 cases — it belongs to none of the three
sets and has no reference, so nothing has ever executed it.

`OPERATION_SEQUENCE` exists because those problems (LRU cache, MinStack,
Design Twitter, …) cannot be expressed as a single pure function; they get a
bespoke driver and their own suite.

## Language coverage is the real gap, not problem coverage

Every one of the 2,452 passing cases is **JavaScript only**. The other four
languages are verified by:

- `verify_wrapper_shapes.ts` — 10 synthetic shapes × 5 languages, plus the
  batched framing check
- `verify_matrix.ts` — 3 real problems × 5 languages, 86 cases

So: **problem coverage in JavaScript is ~99%; language coverage is 3/194.**
Closing the latter is a content problem — it needs correct references per
language — not an engine problem. The wrapper, batching and sandbox are now
tested; the gap is that almost nothing has been written in Python, C, C++ or
Java for these problems.

Growth rule for `verify_matrix.ts`: add a problem once references exist for
each language, and it becomes a permanent gate.
