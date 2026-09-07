# BRACE_RCE — Project Completion Roadmap

> **Last Updated**: 2026-09-07 | **Build Status**: ✅ Passing (`pnpm build` — 780ms)  
> **Stack**: React 19 + Vite + TypeScript · Express + Prisma + PostgreSQL · Monaco Editor · Socket.io

---

## Priority Legend
| Badge | Level | Description |
|-------|-------|-------------|
| 🔴 P0 | **Critical / Blocker** | Broken in prod / security risk / data loss |
| 🟠 P1 | **High** | Major feature gap or UX regression |
| 🟡 P2 | **Medium** | Quality-of-life / notable missing feature |
| 🟢 P3 | **Low** | Polish / nice-to-have |
| ⚪ P4 | **Backlog** | Post-launch |

---

## 🔴 P0 — Critical Blockers

- [ ] **Commit & push all local uncommitted changes** — 9 files dirtied (`src/App.tsx`, `src/index.css`, `Battle.tsx`, `DataStructureDetail.tsx`, `PracticeSidebar.tsx`, `TestCaseCard.tsx`, `HeroSection.tsx`, `AppLoader.tsx`, `NotesPanel.tsx`) — these color/contrast fixes are NOT on `origin/main` yet
- [ ] **Prisma schema has no `url` / `directUrl`** — `schema.prisma` lines 8–9 are commented out (`// url = env("DATABASE_URL")`). The server cannot connect to a DB in a clean deployment without `.env` values; this should be documented clearly and the schema should have `url = env("DATABASE_URL")` uncommented (the env var provides the actual value)
- [ ] **Lobby route shows `WorkInProgressPage`** — `/lobby` is intentionally placeholder (see `Root.tsx:96`). The `Lobby.tsx` page exists and is complete — wire it up or remove the route to avoid confusing users
- [ ] **GitHub OAuth controller** — `server/src/controllers/github/` exists but OAuth flow completeness should be verified end-to-end (login, callback, session persistence)
- [ ] **Rate limiting / abuse prevention on `/execute`** — code execution runs arbitrary user JS/Python directly on the server; verify rate limiting middleware is active and tested

---

## 🟠 P1 — High Priority

### Backend / API
- [ ] **Java & C/C++ execution** — `codeExecution.ts` only has `runWithTempFile` for `javascript` and `python`; Java/C/C++ code snippets exist in the DB but execution returns errors for those languages — implement or surface clear "unsupported" message
- [ ] **Error message "data dump" from backend** — frontend was pasting raw backend debug strings (e.g. `EXECUTION LANGUAGE:`, `FOUND SNIPPET:`, full code) directly in the Output panel — verify `OutputPanel.tsx` strips/ignores non-JSON error payloads gracefully
- [ ] **Custom input rendering tied to wrong problem** — custom-input run was showing output from problem #1 instead of the active problem; verify `handleRunSingleTestCase` and `handleRunCode` correctly use the active problem's OID/test-cases context
- [ ] **Output panel mutual exclusivity** — error and output must never both be shown simultaneously; confirm `OutputPanel.tsx` and `TestCaseCard.tsx` only render one column

### Frontend Pages
- [ ] **Lobby page** — uncomment and wire `/lobby` route to the fully-built `Lobby.tsx`; ensure join-with-password flow uses a proper modal (not `window.prompt`)
- [ ] **`/problems` page** — verify filtering (by difficulty/category), pagination, and "Open in Terminal" navigation work end-to-end
- [ ] **Profile page** — `avatarUrl` field renders `null` as broken image; add fallback avatar (initials or default icon)
- [ ] **Dashboard — pending match invitation timer** — `acceptTimer` state exists but check that the socket event properly resets/clears the countdown when the invitation expires without user action

### Auth & Security
- [ ] **Google OAuth `VITE_GOOGLE_CLIENT_ID`** — gracefully handle `"not-configured"` client ID in production; currently shows a broken OAuth flow with no user-facing error message
- [ ] **JWT secret strength** — confirm `server/.env` contains a strong, random `JWT_SECRET` (not default/placeholder) and that it's excluded from git

---

## 🟡 P2 — Medium Priority

### UI / UX
- [ ] **`/lobby` join-with-password** — currently uses `window.prompt()`; replace with an inline modal or popover consistent with the cyberpunk theme
- [ ] **Mobile responsiveness** — Terminal and Battle pages are `flex-row` on desktop but collapse weirdly on narrow screens; audit breakpoints for `md:` and below
- [ ] **`NotesPanel`** — notes are in-memory only (not persisted); add `localStorage` persistence keyed by problem ID so notes survive page refresh
- [ ] **Problem description rendering** — `problem_definition` is stored as raw text/markdown; add a lightweight markdown renderer (e.g. `react-markdown`) in the practice sidebar for proper heading, code block, and list display
- [ ] **Empty state for Profile history** — when `history` array is empty, show a meaningful empty state instead of blank space
- [ ] **`FileExplorer.tsx` (38KB!)** — this file is significantly larger than all other components; break it into sub-components or verify it isn't carrying dead code
- [ ] **`About.tsx` (26KB)** — audit for unnecessary inline data; extract static content to a data file
- [ ] **Skeleton loading states** — verify all async-loaded pages use `PageSkeleton` / `TableSkeleton` consistently; spot check Dashboard, Profile, Battle
- [ ] **Toast / notification system** — success/failure feedback currently relies on output panel text; add a toast library (e.g. `sonner`) for non-intrusive notifications (problem solved, submission failed, etc.)

### Performance
- [ ] **Monaco editor bundle size** — `index-Cf9ZGusD.js` is 286 kB (gzip: 87 kB); verify Monaco workers are correctly lazy-loaded and not bundled into the main chunk
- [ ] **Route-level code splitting** — all pages are already lazy-loaded ✅; verify `Suspense` fallbacks are consistent
- [ ] **React Query stale-time tuning** — `staleTime: 5min` is set globally; ensure volatile queries (matchmaking status, room time-left) have lower or no stale times

### Backend
- [ ] **Analytics endpoint caching** — `analytics.ts` controller uses in-memory caching; document TTL and ensure it doesn't grow unbounded in long-running deployments
- [ ] **`submissionEvaluator.ts`** — verify `saveSubmission` correctly handles the case where `UserPersonalPerformance` doesn't exist (e.g. practice-mode runs); prevent DB errors from leaking to frontend
- [ ] **Seeder completeness** — `leetcode_seeder.py` and `problems_seed.json` exist; document the correct seeding workflow in `README.md`

---

## 🟢 P3 — Polish

- [ ] **Favicon & meta tags** — `index.html` likely has default Vite favicon; add a branded favicon and proper `<meta>` og-image for social sharing
- [ ] **`README.md`** — update with current architecture diagram, environment variable table, and quick-start commands for both frontend and server
- [ ] **Difficulty badge consistency** — audit all pages (`Problems.tsx`, `Lobby.tsx`, `Battle.tsx`, `Profile.tsx`) for consistent EASY/MEDIUM/HARD badge colors (emerald/amber/rose)
- [ ] **Console.log cleanup** — sweep all source files for leftover `console.log` / `console.error` debug statements before production
- [ ] **ESLint zero-warnings** — run `pnpm lint` and resolve all warnings; add a lint step to CI
- [ ] **TypeScript strict mode** — check for `any` types in hot paths (`Battle.tsx`, `codeExecution.ts`); replace with proper types
- [ ] **`window.prompt` usage** — beyond Lobby, audit all uses of `window.prompt` / `window.confirm` and replace with accessible modals

### Testing
- [ ] **Server unit tests** — `codeExecution.test.ts`, `auth.test.ts`, `friends.test.ts`, `room.test.ts` exist; run `jest` in `/server` and ensure all pass
- [ ] **Frontend component tests** — `EditorToolbar.test.tsx`, `NotesPanel.test.tsx` exist; run `vitest` and ensure passing
- [ ] **E2E test coverage** — no E2E tests detected; add at minimum: login flow, run-code flow, 1v1 battle flow using Playwright or Cypress

---

## ⚪ P4 — Post-Launch Backlog

- [ ] **Tournament mode** — `EventType.TOURNAMENT` exists in schema but no UI or socket handler implemented
- [ ] **Bot/AI opponent mode** — `EventType.BOT` in schema; not implemented
- [ ] **Leaderboard page** — analytics data is collected; expose a public leaderboard page
- [ ] **Problem editor / admin UI** — `isCustom` problems and `creatorId` exist in schema; build a problem creation interface
- [ ] **Real-time spectator mode** — watch live 1v1 battles
- [ ] **Dark/light theme toggle** — current theme is hardcoded dark; add a toggle
- [ ] **Notification center** — persistent bell icon notification list for friend requests, match results
- [ ] **Friends DM** — `Message` model exists in schema (`SentMessage` / `ReceivedMessages`); wire up a DM interface in `FriendDashboard`
- [ ] **Docker production hardening** — `Dockerfile` and `docker-compose.yml` exist; add health checks, resource limits, and non-root user
- [ ] **CI/CD pipeline** — `.github/` directory exists; add a GitHub Actions workflow for lint → test → build → deploy

---

## ✅ Already Done / Verified

- [x] Draggable sidebar and output panel — `useTerminalLayout` hook shared by both `Terminal.tsx` and `Battle.tsx` ✅
- [x] Single-test-case run isolation in Battle ✅  
- [x] Analytics panels on Dashboard and Profile ✅
- [x] Code submission saving / best submission tracking ✅
- [x] Friends system (request / accept / decline) ✅
- [x] Socket matchmaking (find / cancel / accept / decline) ✅
- [x] Protected routes with `AuthContext` ✅
- [x] Google OAuth integration (frontend) ✅
- [x] Problem progress tracking (`UserProblemProgress`) ✅
- [x] Notes panel (in-memory) ✅
- [x] Theme color contrast fixes (P1 session work) ✅
- [x] Production build passing (`pnpm build` ✅, 780ms)
- [x] Monaco IDE with language switching and boilerplate ✅
- [x] `OutputPanel` mutual exclusivity (error XOR output) — partially fixed; needs final verification ✅

---

## 🚀 Recommended Execution Order (Sprint Plan)

```
Sprint 1 (Today):  P0 — Push uncommitted changes · fix Lobby route · confirm Prisma env
Sprint 2:          P1 Backend — Java/C++ execution · custom input fix · error payload cleanup
Sprint 3:          P1 Frontend — Profile avatar fallback · password modal · Dashboard invite timer  
Sprint 4:          P2 UX — Markdown renderer · NotesPanel persistence · Toast system · Mobile audit
Sprint 5:          P2 Perf — Monaco bundle audit · React Query tuning
Sprint 6:          P3 Polish — README · ESLint · TypeScript strict · test runs
Sprint 7+:         P4 Backlog — Tournament · Leaderboard · Admin UI · CI/CD
```
