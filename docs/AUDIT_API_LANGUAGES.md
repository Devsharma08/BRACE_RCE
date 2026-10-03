# API & Multi-Language Execution Audit

Date: 2026-10-03 · Commit under test: `f5866b0` (+ uncommitted execution fixes)
Environment: local server on `:3000`, Piston on `:2000`, DB on remote Neon.

Reproduce:

```
# 1. start the API (uses .env; PISTON_URL defaults to 127.0.0.1:2000)
cd server && npx tsx src/index.ts

# 2. response stats for every endpoint
python3 server/scripts/api_audit.py

# 3. cross-language execution + cost
cd server && NODE_MODE=development npx tsx src/scripts/verify_languages.ts
```

---

## 1. Findings, ranked

### P0 — Java never ran at all: CPU limit + wrong entry-point class (FIXED, needs a Piston env change to deploy)

Java failed for **two independent reasons**. Neither was in the problem bank, which
only ever verifies JavaScript.

**(a) Piston killed it on CPU time, not wall time.** Piston launches each job with
`systemd-run --wall-time=<run_timeout> --time=<run_cpu_time>` (`piston/api/src/job.js`).
`--time` is total CPU across *all threads*. A JVM spawns GC and JIT threads, so a
bare `System.out.println` measured:

| | Wall | CPU |
|---|---|---|
| trivial Java | ~1.1 s | **2502–2670 ms** |
| with our 19.7 KB wrapper | ~1.3 s | **3024–3342 ms** (killed) |

`run_cpu_time` **also defaults to 3000 ms** and the app never sends it, so Java was
always ~300 ms over. Verified in-container: the identical wrapper file runs in
**87–110 ms wall** and prints the correct answer — it was never slow, it was being
killed for burning CPU in parallel with its own wall clock.

The app *can* send `run_cpu_time`, but Piston rejects it:
`{"message":"run_cpu_time cannot exceed the configured limit of 3000"}`. The cap is
server-side, so this is a **deployment change, not an app change**:

```
docker run -e PISTON_RUN_CPU_TIME=20000 -e PISTON_RUN_TIMEOUT=10000 ...
# or per-language, without touching the global default:
docker run -e PISTON_LIMIT_OVERRIDES='{"java":{"run_cpu_time":20000,"run_timeout":10000}}' ...
```

Verified locally by patching both defaults and restarting: Java then ran.

**(b) Our wrapper declared `ListNode` before `Main`.** Piston runs Java in
source-launcher mode, which executes the **first** top-level class in the file.
Generated order was `ListNode` (line 6), `TreeNode` (14), `Main` (23), so the
launcher picked `ListNode` and reported:

```
error: can't find main(String[]) method in class: ListNode
```

Fixed by emitting `Main` first and the node classes after it — legal in Java since
forward references between top-level classes are permitted.

With both fixed, **5/5 languages pass**. Note Java's memory is ~150 MB against a
268 MB limit, so it is the tightest resource in the sandbox.


### P0 — C wrapper read every argument from the wrong stdin line (FIXED)

`int* twoSum(int* nums, int numsSize, int target, int* returnSize)` read `target`
from `lines[2]` instead of `lines[1]`, so **every** C program with an array plus a
following argument saw `target = 0` and returned an empty answer.

Cause: the wrapper used the *parameter index* as the *stdin line index*. C carries a
synthetic `numsSize` parameter for every array — it occupies a parameter slot but
consumes no line, shifting everything after it.

Proof: inserting a throwaway line at index 1 made the same program print `[0,1]`.

Fixed by tracking `lineIdx` separately and only incrementing it for parameters that
actually read a line (see `codeExecution.ts`, `params.forEach`). `out_size_ptr` is
output-only and likewise consumes no line.

### P0 — Java wrapper emitted invalid Java: every submission failed to compile (FIXED)

Two escaping bugs inside the Java template literal:

| Generated | Valid Java? | Source had |
|---|---|---|
| `l=='''` (line 842) | no — empty char literal | `l=='\''` — one backslash short |
| `c=='\'` (line 846) | no — dangling escape | `c=='\\'` — one backslash short |

In a TS template literal `\\` → `\`, so these collapsed to malformed Java. Every
Java program failed with `empty character literal`. Fixed by doubling the backslashes.

### P1 — Sandbox failures were reported to users as a silent FAILED (FIXED)

A timeout kills the process with SIGKILL and leaves `stderr` **empty**. The code only
set `runtimeError` when stderr was non-empty, so the user saw `status: FAILED` with
no message at all. Piston does report a reason in `run.message`
("Time limit exceeded"), which was being discarded.

Now surfaces `run.message` / `run.status` / signal when stderr gives nothing.

### P1 — `runtimeMs` reported HTTP round-trip, not execution time (FIXED)

The code read `data.run.time`, but Piston returns `cpu_time` and `wall_time` (both
**milliseconds**) and no `time` field. The lookup never matched, so every submission's
reported runtime fell back to the HTTP round trip — network and sandbox startup
included. Now prefers `cpu_time`, then `wall_time`, then round trip.

### P1 — Three of five advertised languages have no starter snippets

```
snippet languages: [["java", 187], ["javascript", 194]]
```

Python, C and C++ have **zero** rows in `code_snippet`. `executeCode` looks the
snippet up with `.find(s => s.language === executionLanguage)` and passes `undefined`
to `prepareFinalCode`, which then infers the signature from whatever the user typed.
Execution still works (all three pass the audit) but users get an empty editor for
3 of the 5 languages the UI advertises.

### P2 — Prometheus port collision kills the whole server

---

## 2. Response statistics

### Unauthenticated / infrastructure

| Status | ms | Bytes | Path |
|---|---|---|---|
| 200 | 923 | 417 | `/health` |
| 200 | 19 | 72490 | `/metrics` |
| 200 | 5 | 6476 | `/api-docs.json` |
| 200 | 5 | 59 | `/api/csrf-token` |
| 200 | 5 | 81 | `/live` |
| 200 | 144 | 107 | `/ready` |
| 200 | 5 | 82 | `/startup` |
| 404 | 6 | 139 | `/` (API does not serve the UI — expected) |

All 13 auth-protected routes correctly return 401 with a 51-byte JSON body.
`problemsRouter.use(authentication)` gates the whole router; that is by design.

### Authenticated

| Status | ms | Bytes | Path |
|---|---|---|---|
| 200 | 818 | 169 | `/api/auth/me` |
| 200 | 155 | 151 | `/api/profile` |
| 200 | 1305 | 27040 | `/api/problems/system?limit=10` |
| 200 | 1415 | **287393** | `/api/problems/system?limit=100` |
| 400 | 5 | 133 | `/api/problems/system?limit=500` (cap enforced) |
| 200 | 803 | 12246 | `/api/analytics` |
| 200 | 864 | 45581 | `/api/learning-paths` |
| 200 | 708 | 13541 | `/api/learning-items` |
| 200 | 423 | 773 | `/api/leaderboard` |
| 200 | 395 | 109 | `/api/problems/custom` |
| 200 | 235 | 57 | `/api/notifications` |
| 200 | 2001 | 31 | `/api/rooms/lobby` |
| 200 | 320 | 32 | `/api/rooms/my-events` |
| 200 | 243 | 35 | `/api/rooms/templates` |
| 200 | 500 | 14 | `/api/friends` |
| 403 | 320 | 52 | `/api/admin/settings` (correctly refused) |
| 403 | 394 | 52 | `/api/admin/users` (correctly refused) |

`/api/rooms/lobby` at 2.0 s for a **31-byte** response is the worst ratio in the API
and should be looked at.

`/health` reports `degraded` with `database: 1151 ms` — the DB is remote Neon, so
every request pays real network latency. That is the floor under most numbers here.

---

## 3. Cross-language execution

Same problem (two-sum) implemented five ways, each pushed through the **real**
`prepareFinalCode` and the **exact** production payload, then run on Piston.

| Language | Verdict | Wall | Code | Request | Notes |
|---|---|---|---|---|---|
| javascript | PASS | 167 ms | 9325 B | 9798 B | |
| python | PASS | 134 ms | 2961 B | 3270 B | |
| java | PASS *(was FAIL)* | 2796 ms | 20147 B | 20883 B | fixed: entry-point class + CPU limit |
| cpp | PASS | 3063 ms | 5018 B | 5370 B | slowest; compile-dominated |
| c | PASS *(was FAIL)* | 385 ms | 2640 B | 2962 B | fixed: wrong stdin line |

Before the fixes: **3 passed, 2 failed**. After: **5 passed, 0 failed**.

Notes:
- Java's ~150 MB peak against the 268 MB cap makes it the tightest resource in the
  sandbox; CPP at ~3.0 s wall sits right on the 3 s run limit.
- C expects a **free function**, not a struct method — the wrapper generates a bare
  `twoSum(...)` call. A struct-method C submission will not link. Worth documenting.

---

## 4. Regression status after the fixes

| Check | Result |
|---|---|
| `tsc --noEmit` (production) | exit 0 |
| `verify_execution.ts` (JS problem bank, real Piston) | **893/893 passed** |
| `codeExecution.test.ts` (jest) | **11/11 passed** |
| `verify_languages.ts` (one problem, 5 languages) | **5/5 passed** |
| `verify_wrapper_shapes.ts` (10 shapes × 5 languages) | **50/50 passed** |

See `EXECUTION_VERIFICATION_PLAN.md` for the full coverage strategy.

## 4a. Fixed after the first pass

A dedicated wrapper conformance suite (`verify_wrapper_shapes.ts`) then found two
more defects, both invisible to the JavaScript-only bank:

- **`detectKind` ignored the `std::` namespace.** `std::vector<std::string>` does
  not contain the literal `vector<string`, so it fell through to the `string`
  fallback and the generated C++ declared `string arg0` where a vector was
  expected. Fully-qualified names are the idiomatic C++ style, so this broke the
  most common way a user would write it. `std::vector<std::vector<int>>` was also
  mis-detected as `int_array` rather than `int_array_2d`.
- **The C wrapper had no `string_array` branch.** A `char**` parameter fell
  through to the generic int branch, so the generated call was `solve(arg0)`
  with `arg0` an int, which failed to compile.

Both are fixed. Sandbox budgets are now per-language and adapt to whatever
ceiling the deployed Piston enforces, and the response carries full per-case and
aggregate telemetry (CPU, wall, round trip, compile time, peak memory, exit code,
signal, sandbox status, stdout/stderr).

---

## 5. Suggested order of work

1. **Deploy the Piston CPU/wall limit change** (`PISTON_RUN_CPU_TIME`, `PISTON_RUN_TIMEOUT`
   or `PISTON_LIMIT_OVERRIDES` for java only). Without it Java cannot run anywhere,
   regardless of app changes. This is the single blocking item.
2. **Generate python/c/cpp snippets** so all five advertised languages have starters.
3. **Make the Prometheus port configurable** and non-fatal on bind failure.
4. **Split the problems list response** into summaries vs. detail.
5. **Bound the metrics registry** or document that it is per-process.
6. Watch Java's ~150 MB peak against the 268 MB cap; it has the least headroom.

Item 1 is the only true blocker for the core feature. Items 2–5 are quality work.

`tracing.ts` binds a hard-coded `:9464`. A stale process holding the port makes the
server exit before it ever calls `listen` — the API simply never comes up, with an
EADDRINUSE buried in unrelated log noise. Observed twice during this audit. Make the
port configurable and treat bind failure as non-fatal.

### P2 — `/api/problems/system?limit=100` returns 287 KB

At the pagination cap (100, enforced correctly — 500 is rejected with 400) one page is
**287 KB in 1415 ms**. The response embeds full problem definitions and hints for
every problem. A list endpoint should return summaries; definitions belong on the
detail route.

### P3 — `/metrics` grows without bound

Measured 20.8 KB early in the audit and 72.5 KB later, on identical traffic shape. The
registry is never reset. Long-lived processes will accumulate label cardinality.
