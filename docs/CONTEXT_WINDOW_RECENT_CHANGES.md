# CONTEXT WINDOW — Recent Commits & Deep Inference (as of 2026-10-10)

> Persistent notes for follow-up work. Covers last ~15 commits, the in-progress
> working-tree refactor, and inferred risks. Validated with `tsc -b` (client)
> and `server tsc --noEmit` (server).

## 0. HEADLINE (validated with tools)
- **Client build is currently BROKEN** in the working tree (uncommitted).
  `tsc -b` fails: `error TS1128` @ Battle.tsx lines 156 & 703, `TS1005` @ 156 & 1315.
- **Server type-check is CLEAN** (`server tsc --noEmit` → exit 0).
- Working tree: uncommitted edits to `src/pages/Battle.tsx` (+87/-568) and
  `src/context/AuthContext.tsx`, PLUS ~150 untracked `.js` files = compiled
  output sitting beside `.tsx` sources (build pollution, NOT gitignored — see §4).

## 1. Commit map (newest → oldest)
1. `26db6c5` (HEAD) **feat: room scheduling, host-as-moderator, NotificationCenter fix** — big feature (24 files, +1800/-449).
2. `5d8f8c6` ci: fix Docker build + piston service (`--ignore-scripts`, `--runtimes`).
3. `ef54b25` ci: fix all CI/CD (vitest `singleFork`, drop `--poolOptions`, piston services, Dockerfile prisma copy).
4. `3aaf17a`,`4c099e8`,`cf63769`,`f05729a`,`17e60d8`,`b7068b9`,`b0fc884`,`675ff1f`,`b973027`,`de93777` — long tail of **CI/CD churn** (piston service vs docker-run, prisma command paths, jsdom 24, vitest config, pnpm-lock eslint deps). Mostly `.github/workflows/ci.yml`, `Dockerfile`, `vitest.config.ts`, `pnpm-lock.yaml`.

Themes: (a) scheduled rooms, (b) host-as-moderator telemetry, (c) admin spectate, (d) CI stability, (e) a **live Battle.tsx decomposition** in the working tree.

## 2. The `26db6c5` feature commit — what changed

### 2.1 Room scheduling (server + client)
- **Schema** (`server/prisma/schema.prisma`): `Event.opensAt DateTime?`, `Event.closesAt DateTime?`. Comment: `closesAt` authoritative end when set; else ends at `startedAt + totalTimeLimitMs`.
- **New** `server/src/jobs/roomScheduler.ts` (116 ln): `setInterval` 30s, 3 transitions:
  1. `WAITING` + `opensAt<=now` → `IN_PROGRESS`, `startedAt=now`, emit `room_opening`.
  2. `IN_PROGRESS` within 5min of `closesAt` → emit `room_closing` ONCE (in-mem `warnedRoomIds`).
  3. `IN_PROGRESS` + `closesAt<=now` → `finishEventWithVerdicts()`, emit `room_closed` (reason `SCHEDULE`), then `notifyEventReport()`.
  - `emitToRoom` emits to BOTH `roomCode` and `room-<id>`.
- **New** `server/src/services/battleFinish.ts` (70 ln): `finishEventWithVerdicts(eventRef)` shared by REST expire + scheduler. Per-perf `COMPLETED` (has PASSED sub) else `TIMEOUT`; event → `FINISHED`+`finishedAt`. Accepts id or roomCode.
- **`controllers/room.ts`**: `createRoom` persists `opensAt`/`closesAt`, emits `room_scheduled` to host. `expireBattle` delegates to `finishEventWithVerdicts` (host/MODERATOR/ADMIN/group-admin).
- **`server/src/index.ts`**: wires `startRoomScheduler(io)`.
- **`src/pages/CreateRoom.tsx`**: `opensAt`/`closesAt` datetime-local; validation (open<close, password ≥4); `getErrorMessage()`; `await fetchCsrfToken()` before every mutating POST; sends ISO when set.

### 2.2 Client scheduling UI (Battle.tsx @ commit)
- Socket `room_opening`/`room_closing`/`room_closed` (+`off` cleanup).
- `closingWarning` + 1s `closingSeconds`; minimizable fixed-top banner + restore pill.
- `room_closed` → FINISHED, open menu, invalidate problems.

### 2.3 Host-as-moderator + MODERATOR tab
- `getLiveRoom`: host gets NO auto-performance; `maxUsers` caps participants only.
- `ModeratorView` (telemetry grid, START OPERATION when WAITING, TERMINATE, scheduled-close info).
- `HostCommandPanel` (floating host CMD: progress %, lines, per-user kick, terminate).
- `host.ts`: `host_kick_user` (perf→FAILED, `you_were_kicked`,`player_kicked`,`participants_updated`), `host_end_match`, `terminate_group` (host/ADMIN).
- `participantVerdict.ts`: COMPLETED iff any PASSED sub else TIMEOUT.

### 2.4 NotificationCenter fix
- Rewritten to compact bell + popover (uncontrolled default; Header mounts bare). Category badges SOCIAL/BATTLE/SYSTEM. Fixes 3 tests. New `SpectateNotificationCenter.tsx` (+243).

### 2.5 Admin (build-blocker fixes)
- `admin.ts` +102: `listActiveBattles`, `getBattleForSpectate` (room-<id> or roomCode; incl test_cases/code_snippets/submissions). `db = prisma as any` for Feedback/QuestionReport/Setting (not in client — throw at runtime if invoked).
- New `src/pages/admin/AdminSpectateView.tsx` (+426).


## 3. WORKING-TREE (uncommitted) — the live Battle.tsx decomposition
Goal: split the 1300-line `Battle.tsx` into `src/pages/battle/components/`.
- New dir `src/pages/battle/{components,hooks}` (hooks/ EMPTY).
- Extracted (`.tsx`): `BattleHeader`, `CompetitorView`, `HostCommandPanel`,
  `ModeratorView`, `ScheduledCloseBanner`, `SpectateView`, `TabContent`, `BattleSidebar`.
- `Battle.tsx` imports the 7 usable ones (NOT `BattleSidebar`).
- `AuthContext.tsx`: wrapped `useSocket()` in try/catch (fallback `{current:null}`).

### Concrete defects spotted (file-backed + tsc-confirmed)
1. **`Battle.tsx` syntactically broken**: stray `};` at **line 703** closes the
   component early; the real JSX `return (…)` begins ~706 and the file ends with
   a dangling `</div>` (1314) + `};` (1315). The big JSX body is currently OUTSIDE
   the component. This is the mid-refactor seam and the root build failure.
2. **`TabContent.tsx` MODERATOR branch uses undeclared props** (line 105:
   roomParticipants/playerProgress/myUserId/battleState/room/onStartOperation/
   onHandleHostEndMatch/onHandleKickUser) — not in `TabContentProps` (lines 7-18).
3. **`BattleHeader.tsx`**: uses `<SoundToggle/>` (L50, not imported) and
   `onExpire={handleTimerExpire}` (L54, neither prop nor defined).
4. **`BattleSidebar.tsx`**: `BattleSidebarProps` has ~5x duplicated props; body
   `return null` (deliberate stub, not imported) → dead code.
5. **`SpectateView.tsx`**: `Flag` imported but unused (minor).

## 4. Build pollution risk (inferred, NOT gitignored)
- ~150 untracked `.js` mirror every `.tsx`/`.ts` under `src/` (Battle.js, api.js,
  App.js, main.js, *.test.js …). Emitted JS beside sources. `.gitignore` ignores
  only dist/dist-ssr/node_modules/logs/env/piston/.kilo — NOT these.
- `git add -A` would commit compiled artifacts + duplicate `.js` next to `.tsx`
  (module-resolution ambiguity for Vite/tsc/vitest, duplicated tests).
- Fix: find the emitter (a `tsc` w/o `outDir`/`noEmit:false`, esbuild, or babel)
  and scope a gitignore rule for emitted `src/**/*.js` (avoid legit config
  `vite.config.js`, `index.html`). DO NOT commit until cleaned.

## 5. Cross-cutting inference / consistency notes
- **Two "finish" paths**: socket `host_end_match`/`terminate_group` (host.ts,
  inline) vs `finishEventWithVerdicts` (scheduler + REST). host.ts does its own
  `PENDING→TIMEOUT` and does NOT call the shared fn → a player with a PASSED sub
  but PENDING perf would be wrongly marked TIMEOUT. Unify host_end_match onto it.
- **Scheduler `warnedRoomIds` is in-memory** → re-warns/misses across
  instances/serverless. OK single-instance; note for horizontal scale.
- **`startEvent` (lobby.ts)** sets `finishedAt = startedAt + totalTimeLimitMs`;
  scheduler uses `closesAt`. Ambiguous precedence if both set (schema says
  `closesAt` authoritative; code paths don't all honor it).
- **`getBattleTimeLeft`** + client `GlobalTimer` use `totalTimeLimitMs ||
  problems[0].timeLimitMs`, ignore `closesAt` → visible countdown may not match
  real scheduled close. UX/logic mismatch.
- **CSRF**: CreateRoom `await fetchCsrfToken()` before POST; `api.ts` interceptor
  only attaches `x-csrf-token` if token already fetched → any NEW mutating call
  must fetch CSRF first or it 403s.
- **Roles inconsistency**: REST `expireBattle` allows MODERATOR; socket
  `terminate_group` allows host/ADMIN only (MODERATOR denied). Align the surface.

## 6. Commands that matter
- Client build/type: `npx tsc -b` (currently FAILS); tests `pnpm test` (vitest).
- Server: `cd server && npx tsc --noEmit` (CLEAN); `cd server && pnpm test` (jest).
- Dev: `pnpm dev` + `cd server && pnpm dev`. Prisma: `cd server && npx prisma db push`.

## 7. Suggested next actions (follow-up)
1. Fix `Battle.tsx` structure (line-703 premature close; re-nest JSX or finish
   delegating to extracted components). HIGHEST priority — blocks all client build.
2. Add missing props to `TabContentProps`; fix `BattleHeader` imports/handlers.
3. Delete stub `BattleSidebar.tsx` (+ `.js`) or complete it.
4. Gitignore emitted `src/**/*.js` pollution before any commit.
5. Unify `host_end_match` onto `finishEventWithVerdicts` for verdict parity.
6. Reconcile `closesAt` vs `totalTimeLimitMs` in countdown / `getBattleTimeLeft`.
7. Align MODERATOR permissions (REST expireBattle vs socket terminate_group).

### 2.6 Misc
- `api.ts`: `wireAuthInvalidation` (any 401 → `["auth-me"]=null`, once, skips signin/google). `Root.tsx` wires it. `useFocusTelemetry`, `PracticeSidebar`, `Dashboard`, `Terminal` minor. Deleted `Dockerfile.piston`.
