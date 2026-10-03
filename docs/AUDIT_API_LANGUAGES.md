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

### P0 — Java is entirely non-functional (environment + wrapper size)

Every Java submission times out, on every problem.

| Language | Trivial-program CPU | Limit | Result |
|---|---|---|---|
| Java | **2502–2670 ms** | 3000 ms | 83–89% of budget spent before user code |
| JavaScript | 68–72 ms | 3000 ms | ok |
| Python | 33–34 ms | 3000 ms | ok |

A bare `System.out.println` costs ~2.6 s. Our wrapper adds ~500 ms (3115 ms total),
which tips it over. Two compounding causes:

1. **Piston caps `run_timeout` at 3000 ms** (`piston/api/src/config.js`). The app sends
   exactly 3000, i.e. the ceiling. Verified: requesting 8000 returns
   `{"message":"run_timeout cannot exceed the configured limit of 3000"}`.
2. **The Java wrapper is 19.7 KB** of reflection-based helpers regardless of the
   problem, which costs real JVM time to load.

Fix: raise Piston's `run_timeout` (config default, currently 3 s) *and* trim the
wrapper to only the helpers the detected signature needs. Raising the limit alone
buys headroom but leaves the JVM cost on every request.

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
| javascript | PASS | 120 ms | 9325 B | 9798 B | |
| python | PASS | 129 ms | 2961 B | 3270 B | |
| **java** | **FAIL** | 1251 ms | 19729 B | 20457 B | Time limit exceeded (SIGKILL) |
| cpp | PASS | 2701 ms | 5018 B | 5370 B | slowest; compile-dominated |
| **c** | PASS *(was FAIL)* | 325 ms | 2640 B | 2962 B | fixed: wrong stdin line |

Before the fixes: **3 passed, 2 failed**. After: **4 passed, 1 failed**, the remaining
failure being the P0 environment limit rather than a code defect.

Notes:
- `compile`/`run` are absent from Piston responses on success here, so the audit reads
  wall time; the app's new `cpu_time` path is exercised on the timeout case.
- C expects a **free function**, not a struct method — the wrapper generates a bare
  `twoSum(...)` call. A struct-method C submission will not link. Worth documenting.
- CPP at 2.7 s is close to the same 3 s ceiling; it passes, but with little margin.

---

## 4. Regression status after the fixes

| Check | Result |
|---|---|
| `tsc --noEmit` (production) | exit 0 |
| `verify_execution.ts` (JS problem bank, real Piston) | **893/893 passed** |
| `codeExecution.test.ts` (jest) | **11/11 passed** |
| `verify_languages.ts` | 4/5 (Java blocked by P0) |

---

## 5. Suggested order of work

1. **Raise Piston's `run_timeout`** (config default) — unblocks Java outright, one line.
2. **Trim the Java wrapper** to only the helpers the signature needs — cuts JVM load
   for every Java request and buys margin for CPP too.
3. **Generate python/c/cpp snippets** so all five advertised languages have starters.
4. **Make the Prometheus port configurable** and non-fatal on bind failure.
5. **Split the problems list response** into summaries vs. detail.
6. **Bound the metrics registry** or document that it is per-process.

Items 1 and 2 together are what stand between Java being advertised and Java working.

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
