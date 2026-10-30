# ⚡ BRACE // RCE — Competitive Cyber-Battle & Polyglot Execution Platform

> **BRACE RCE** is a high-performance, real-time competitive coding platform featuring multi-language Remote Code Execution (RCE), interactive 1v1 cyberpunk duels, automated data-structure marshalling, DB-driven verification suites, and a modern **Firebase-powered authentication system** (email/password, email OTP login, password reset, Google OAuth).

---

## 📐 Architecture & System Overview

BRACE RCE combines a real-time WebSocket matchmaking engine, a polyglot code-execution wrapper synthesizer, a Monaco-based cyberpunk editor, and Firebase Authentication with Gmail-SMTP OTP delivery.

```
                           ┌─────────────────────────────────────────┐
                           │           React 19 + Vite + TS          │
                           │  (Monaco Editor + Socket Client + Auth) │
                           └────────────────────┬────────────────────┘
                                                │
                                        REST / WebSocket
                                                │
          ┌─────────────────────────────────────┬────────────────────────────────────┐
          │                         Express + TypeScript API                         │
          │               (Socket.io · Prisma · Firebase · Gmail SMTP)               │
          └──────────┬─────────────────────────┬──────────────────────────┬──────────┘
                     │                         │                          │
          ┌──────────┬───────────┐  ┌──────────┬───────────┐  ┌───────────┬──────────┐
          │ PostgreSQL Database  │  │External Auth & Email │  │ Polyglot RCE Engine  │
          │  via Prisma ORM      │  │  • Firebase Auth     │  │  (Piston runtime)    │
          │  (seeded bank)       │  │  • Gmail SMTP OTP    │  │  JS PY JAVA CPP C    │
          │                      │  │  • Google OAuth      │  │                      │
          └──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---
 
## 🛠️ Technology Stack
 
| Domain | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite, TailwindCSS v4, `@monaco-editor/react`, Lucide React icons, TanStack Query |
| **Real-time Comms** | Socket.io (client & server) with binary heartbeat sync & match state events |
| **Backend API** | Node.js, Express 5, TypeScript, Zod validation, Swagger UI (`/api-docs`, dev-only) |
| **Database** | PostgreSQL via Prisma ORM 7 (Users, Rooms, Events, Problems, Test Cases, Friends, Notifications, Learning Paths …) |
| **Authentication** | Firebase Authentication (email/password, email action codes) + Gmail SMTP via Nodemailer (OTP delivery) + Google OAuth + JWT httpOnly-cookie sessions |
| **RCE Sandbox Engine** | Piston execution API behind a custom Polyglot Wrapper Synthesizer (Node.js, Python 3, Java 21, GCC / G++) |
| **Hardening** | Helmet, CORS allow-list, CSRF protection, per-IP rate limits, daily execution quotas |
| **Observability** | pino logging, Sentry, OpenTelemetry + Prometheus metrics |
| **Testing** | Jest (server, ESM), Vitest (frontend), supertest, DB-driven problem verification suites |
 
---
 
## 🚀 Current Production Status (v2026.10)
 
### ✅ Deployed & Operational
 
| Component | Status | Details |
|-----------|--------|---------|
| **Backend API** | ✅ Live | `https://bracerce.server.devsharma.dev` (EC2: 16.192.126.74) |
| **Frontend (Vercel)** | ✅ Auto-deploys | Vercel domain linked, SSL handled by Vercel |
| **WebSocket** | ✅ Live | `wss://bracerce.server.devsharma.dev/socket.io/` |
| **SSL/TLS** | ✅ Let's Encrypt | Auto-renewing cert for `bracerce.server.devsharma.dev` (valid to Jan 27, 2027) |
| **Database** | ✅ Neon PostgreSQL | Prisma ORM, schema in sync |
| **Cache/Redis** | ✅ Upstash/Docker | Socket.IO adapter + rate limiting |
| **RCE Engine (Piston)** | ✅ 3 runtimes | Python 3.12, Node 20.11, Java 15 (GCC install pending) |
| **Authentication** | ✅ Firebase + Gmail OTP | OTP via Gmail App Password, Google OAuth, JWT sessions |
| **Health Check** | ✅ Passing | `GET https://bracerce.server.devsharma.dev/health` |
 
### 📡 API Endpoints (Production)
 
| Service | URL |
|---------|-----|
| REST API | `https://bracerce.server.devsharma.dev/api` |
| WebSocket | `wss://bracerce.server.devsharma.dev/socket.io/` |
| Health Check | `https://bracerce.server.devsharma.dev/health` |
| Swagger (dev only) | `http://localhost:3000/api-docs` |
 
### 🐳 Deployment Architecture (EC2)
 
```bash
EC2 Instance (16.192.126.74)
├── nginx:80/443          # TLS termination, reverse proxy, rate limiting
├── app:5000              # Node.js (PM2 cluster x2 + worker x1)
├── redis:6379            # Cache + Socket.IO Redis adapter
├── piston:2000           # Polyglot RCE (3 runtimes installed)
└── certbot               # Let's Encrypt auto-renewal
```
 
### 🔐 Environment Configuration (Production)
 
All secrets managed via `.env` on EC2 and Vercel Dashboard:
 
| Variable | Where |
|----------|-------|
| `VITE_BACKEND_URL` | Vercel: `https://bracerce.server.devsharma.dev/api` |
| `VITE_API_URL` | Vercel: `https://bracerce.server.devsharma.dev/api` |
| `VITE_SOCKET_URL` | Vercel: `wss://bracerce.server.devsharma.dev` |
| `VITE_GOOGLE_CLIENT_ID` | Vercel + EC2 |
| `DATABASE_URL` / `DIRECT_URL` | EC2 `.env` (Neon) |
| `REDIS_URL` | EC2 `.env` (Upstash/Docker) |
| `JWT_SECRET` | EC2 `.env` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | EC2 `.env` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | EC2 `.env` + Vercel |
| `FIREBASE_*` | EC2 `.env` |
| `ALLOWED_ORIGINS` | EC2 `.env` (Vercel + EC2 domains) |
| `FRONTEND_URL` | EC2 `.env` (frontend origin used for local-account password reset links) |
| `SENTRY_DSN` | EC2 `.env` (optional) |
| `PISTON_URL` | EC2 `.env` (internal `http://piston:2000`) |
 
---
 
## ✅ WHAT HAS BEEN IMPLEMENTED

### 1. 🚀 Polyglot Remote Code Execution (RCE) Engine
- **Multi-Language Support**: Fully automated code execution for **JavaScript (Node.js)**, **Python 3**, **Java 21**, **C++ (G++)**, and **C (GCC)** via the Piston execution API (`PISTON_URL`).
- **Polyglot Code Synthesizer**: Generates standard-I/O parsing, function invocation, class initialization, and output-serialization wrappers without requiring user boilerplate (`server/src/services/codeExecution.ts`).

### 2. 🧠 Complex Data Structure Marshalling System
- **Linked Lists (`ListNode`)**: Level-order serialization and list reconstruction across all 5 languages.
- **Interwoven Random Linked Lists (`_Node`)**: Full support for LeetCode-style linked lists with `.next` and `.random` pointers (e.g. `Copy List with Random Pointer`).
- **Binary Trees (`TreeNode`)**: Level-order BFS array-to-tree & tree-to-array serialization supporting `null` / `None` node values.
- **In-Place Array / Matrix Mutations (`VOID_RETURN`)**: Automated mutation tracking and diffing for `void` return functions (e.g., `Rotate Array`, `Next Permutation`, `Set Matrix Zeroes`).
- **2D Arrays & Matrices**: Multi-dimensional array parsing and JSON bracketed formatting.
- **Design Class & Multi-Method Invocation**: Constructor argument parsing, method dispatchers, and state sequence executions (e.g., `Design Front Middle Back Queue`, `Detect Squares`).
- **Primitives & Strings**: Int, Float, Double, Boolean (`true`/`false`), and escaped string parameters.

### 3. 🧪 DB-Driven Automated Test Infrastructure
- **Full Database Coverage**: Direct integration with PostgreSQL via Prisma querying the complete seeded problem bank (`problems_seed.json` → `pnpm --prefix server run seed`).
- **Automated Signature Suite (`pnpm --prefix server run test:db`)**: Pre-flight runner verifying code-wrapper synthesis per problem (problems × 5 languages).
- **End-to-End Benchmark Suites**: `verify_execution.ts`, `verify_matrix.ts`, `verify_operation_problems.ts` and friends run real solutions against DB test-case inputs and expected outputs.

### 4. ⚔️ Real-Time Multiplayer Matchmaking & Battle Arena
- **1v1 Ranked Matchmaking Queue**: Automated queueing and instant socket room assignment.
- **Match Accept Flow**: Two-phase match confirmation (`match_found_pending` → `match_starting`).
- **Live Battle Synchronization**: Real-time progress updates, opponent status tracking, and submission event broadcasts.
- **3-Second "Get Ready" Countdown**: Full-screen dark glassmorphic overlay with pulsing cyan OPERATIVE ALERT banner, animated countdown digits, and editor input lock until battle start.

### 5. 💻 Monaco Editor & Integrated Terminal Toolbar
- **Monaco Code Editor**: Syntax highlighting, auto-formatting, error squigglies, and a custom dark cyberpunk theme.
- **Editor Toolbar**: Language selector, Code Formatter, Code Reset, Run & Submit, Exit to Dashboard, and Global Scratchpad Notes toggle.
- **Execution Output & Diagnostics Panel**: Compilation logs, execution time & memory metrics, multi-test-case tabs, and mismatch/traceback diagnostics.
- **Terminal Loader**: `SYNCING PROBLEM DATABANK…` overlay on initial fetch with skeleton tabs/rows while room problems load.

### 6. 📝 Persistent Global Scratchpad Notes Panel
- Side-drawer scratchpad (`NotesPanel`) accessible across battle arenas and workspaces.

### 7. ✅ Session UX Hardening (Live)
- **One-Shot Boots**: Hero boot and leaderboard stagger reveal animate once per browser-tab session (`src/utils/sessionBoot.ts`); hover glow effects stay live on return visits.
- **Guarded Auth Routes**: Logged-in users visiting `/signin` / `/signup` are redirected to `/dashboard` (with skeleton while auth resolves).

### 8. 🔐 Authentication
- **Email/Password Signup and Sign-in**: Signup uses Firebase Auth when configured and falls back to local bcrypt accounts otherwise. New accounts remain unverified until their emailed OTP is confirmed; password sign-in is blocked until then.
- **Email OTP**: `POST /auth/otp/send` emails a **6-digit code** (10-minute TTL, single-use, resend supported) using Redis-backed storage, queued Gmail delivery, and direct-SMTP fallback. `POST /auth/otp/verify` verifies the address and starts the session. OTP also supports passwordless sign-in.
- **Password Reset**: Firebase-backed accounts use Firebase reset emails; local bcrypt accounts use a hashed, 15-minute reset token delivered by Gmail. Both complete in the `/reset-password` UI.
- **Session Model**: JWT is stored in an **httpOnly cookie**; `GET /auth/me` restores the session.
- **Hardening**: All auth endpoints are Zod-validated and rate-limited (`AUTH_RATE_MAX`, default 25 requests / IP / 15 min).
- **UI**: Three-view login card — password sign-in, one-time email code, and forgot-password — plus dedicated `/signup` and `/reset-password` pages (`src/features/auth/`).

### 9. 👥 Real-time Friend List Updates
- [x] **Instant Friend Removal**: Deleting a friend removes them instantly from the UI without requiring a page refresh.
- [x] **Instant Friend Acceptance**: Accepting a friend request adds them immediately to the friend list without needing to refresh.
- [x] **Socket-driven Graph Sync**: Server emits `friends:update` on every friend graph mutation; clients invalidate React Query caches and update the UI instantly.

---
 
## 🗺️ Roadmap & Completed Milestones

### 1. 🏆 Skill-Based ELO & Rating Tier System
- [x] **ELO Rating Algorithm**: `server/src/utils/elo.ts` — K=32 ELO with speed-bonus and attempt-penalty; `GET /api/leaderboard` + `GET /api/leaderboard/me` derive ratings from existing performance rows (no migration).
- [x] **Ranked Tiers**: Division badges (`Bronze` <1100, `Silver` 1100+, `Gold` 1300+, `Platinum` 1500+, `Cyber-Master` 1800+) via `getTierForRating()`.
- [x] **Global Leaderboards**: Rankings table sorted by ELO rating and win rate (`LeaderboardTable.tsx`, `useLeaderboard.ts`).

### 2. 🎨 Custom Problem Creator Studio & GUI
- [x] **Problem Creator Interface**: Signature builder panel (`TestCaseGeneratorPanel.tsx`) embedded in `CreateRoom.tsx` — function name, return type, parameter list with one-click generation.
- [x] **Automated Test Case Generator**: Seeded deterministic generator (`server/src/utils/testCaseGenerator.ts`, `POST /api/roadmap/generate-tests`) — public edge cases + hidden randomized cases; `POST /api/roadmap/generate-wrappers` emits 5-language snippets.

### 3. 🛡️ Anti-Cheat & Plagiarism Detection Engine
- [x] **AST Structure Comparison**: Structure-normalized bigram-Jaccard comparison (`server/src/utils/antiCheat.ts`, threshold 0.85) at `POST /api/roadmap/plagiarism-check`.
- [x] **Focus Loss Telemetry**: `useFocusTelemetry.ts` records blur/tab-hidden events during battles; evaluated at `POST /api/roadmap/focus-report`.

### 4. 👁️ Spectator Mode & Battle Replay Theater
- [x] **Live Match Spectating**: Reuses socket relay (`request_player_code`/`live_code_update`); `SpectatorReplayPanel` in `Battle.tsx` adds WATCH buttons per participant; join via `/battle/:roomCode?state=spectate`.
- [x] **Replay Theater**: Chronological submission timeline with click-to-step replay in the same panel.

### 5. 🐳 Containerized Docker Sandbox Isolation
- **Guarded Execution Runners**: Local dev runs guarded temp-dir runners (timeout + 10MB caps, sanitized errors); production deploys via root `Dockerfile` + `docker-compose.yml` (`app` + `postgres:16-alpine` + execution services).

### 6. 🎵 Audio & Cyberpunk Sound FX System
- [x] **Battle Sound Effects**: Zero-asset WebAudio synth (`src/utils/battleSounds.ts` — tick, match-start, test-pass, submit-success, surrender) wired into `Battle.tsx` with persisted mute toggle (`SoundToggle`).

### 7. 🔧 Production Hardening & Fixes (2026-10)
- [x] **Socket.IO Reliability**: Exponential backoff reconnection (30 attempts), transport fallback (WS → polling), connection state recovery (2-min buffer), offline event queue with flush on reconnect, `emitWithAck` for critical operations, toast deduplication.
- [x] **1v1 Matchmaking Fixes**: `withDbRetry` for transient DB errors (EAI_AGAIN, ETIMEDOUT, ECONNRESET), cross-PM2-worker `emitToUser` delivery via Redis, restored `cancel_matchmaking` handler.
- [x] **Battle Timer by Difficulty**: EASY=15min, MEDIUM=20min, HARD=25min (was 30min); backend-driven timer consumed by `GlobalTimer` component.
- [x] **Chat Persistence**: Global `battleMessageStore` survives navigation; history fetched on Battle mount via `GET /api/rooms/:eventId/messages`.
- [x] **Friends Page**: Avatar fallback (`getInitialsAvatar`), mobile stats overlay (`StatsOverlay`), online status fixed.
- [x] **Lobby Analytics**: Per-participant avatars, progress bars, detailed metrics grid, color-coded status badges.
- [x] **Hydration Fixes**: Removed nested `<button>` in `FriendDashboard`, replaced with accessible `<span role="button">`.
- [x] **Win Rate Trend Fix**: Fixed NaN display in `BattleTrendChart` — server now computes cumulative `winRate` per battle in `battleTrend` data; frontend falls back to `0` via `?? 0` for missing/undefined values. Also guards `DifficultyBreakdown` totals with `|| 0` coalescing.
- [x] **Profile ScoreCard NaN Guards**: `ProfileScoreCard.tsx` now safely handles undefined/null `stats` with `|| 0` defaults on `wins`, `losses`, `totalMatches`, `totalScore`; `winRate` computed via guarded ternary; XP bar percentage clamped via `Math.min(100, ...)` with `nextThreshold`/`prevThreshold` fallback.

---
 
## 🔑 Authentication API Reference

All routes are mounted under both the versioned prefix **`/api/v1`** and the legacy **`/api`** prefix.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Sign up — Firebase-first, legacy bcrypt fallback when Firebase is unconfigured |
| `POST` | `/api/auth/signin` | Sign in — same dual-path behaviour as signup |
| `POST` | `/api/auth/firebase/signup` | Firebase-native email/password account creation (503 if Firebase env missing) |
| `POST` | `/api/auth/firebase/signin` | Firebase-native email/password sign-in (bcrypt fallback for pre-Firebase accounts) |
| `POST` | `/api/auth/otp/send` | Email a 6-digit signup-verification or passwordless-login OTP |
| `POST` | `/api/auth/otp/verify` | Verify the OTP (single-use, 10-min TTL) and start a session |
| `POST` | `/api/auth/password-reset/request` | Send an account-appropriate reset link (always generic response — no account enumeration) |
| `POST` | `/api/auth/password-reset/confirm` | Complete a reset using the emailed action code (`oobCode`) |
| `POST` | `/api/auth/google` | Start Google OAuth (ID-token flow) |
| `POST` | `/api/auth/google/callback` | Complete the PKCE redirect flow |
| `POST` | `/api/auth/signout` | Clear the session cookie |
| `GET`  | `/api/auth/me` | Restore the current session (auth middleware) |

**Swagger UI**: run the server in dev mode and open [`http://localhost:3000/api-docs`](http://localhost:3000/api-docs).

---

## 📁 Project Structure

```
BRACE_RCE/
├── server/                            # Backend Node.js / Express / Socket.io app
│   ├── src/
│   │   ├── controllers/               # API controllers (auth, profile, room, …) + tests
│   │   ├── middleware/                # auth, validation (Zod), rate limits, CSRF
│   │   ├── routes/                    # auth, execute, problems, room, friends, admin, …
│   │   ├── lib/                       # firebase.ts, gmail.ts, otp.ts, prisma.ts, sentry, swagger
│   │   ├── services/
│   │   │   ├── codeExecution.ts       # Polyglot RCE synthesizer & Piston client
│   │   │   └── socket.ts              # Real-time matchmaking & battle handler
│   │   ├── scripts/                   # problem bank verification & audit suites
│   │   └── env.ts                     # mode-aware env loader (.env.development/.env.production)
│   ├── prisma/                        # schema + seed.ts + seed-learning-paths.ts
│   ├── .env.example                   # documented template (copy to .env.development/.env.production)
│   └── package.json
├── src/                               # Frontend React 19 / Vite app
│   ├── components/                    # ui/ primitives, layout/ (Header, Sidebar), shared/, features/
│   ├── features/
│   │   ├── auth/                      # Login.tsx, Signup.tsx, ResetPassword.tsx
│   │   ├── terminal/                  # Monaco terminal layout, toolbars, hooks
│   │   ├── problems/ …
│   ├── pages/                         # Battle, Dashboard, Lobby, CreateRoom, Terminal, admin/, …
│   ├── context/                       # AuthContext, SocketContext
│   ├── config/                        # api.ts (Axios), features.tsx (feature flags)
│   └── utils/, hooks/                 # sessionBoot, battleSounds, telemetry, …
├── piston/                            # Self-hosted Piston execution engine (optional local runtime)
├── problems_seed.json                 # Seed problem dataset
├── Dockerfile / docker-compose.yml    # Containerized deployment (app + postgres + execution)
├── .env.example                       # Frontend VITE_* template
└── README.md
```

---

## 🚀 Quickstart & Local Setup Guide

### Prerequisites
- **Node.js** ≥ 20 and **pnpm** ≥ 9 (the repo is a pnpm workspace — root install also installs `server/`)
- **PostgreSQL** (Docker compose service, local install, or Neon for production)
- **Piston** (optional, for code execution) — `piston/` ships a self-hosted instance; point `PISTON_URL` at it
- **Compilers** for the Piston runtimes you enable: Node.js, Python 3, JDK, GCC, G++
- A **Gmail App Password** for OTP delivery and local-account password resets. Firebase is optional; when configured it backs email/password credentials and password resets.

### 1. Clone & Install
```bash
git clone https://github.com/Devsharma08/BRACE_RCE.git
cd BRACE_RCE
pnpm install          # installs root + server workspace projects
```

### 2. Environment Variables

The server loads env files by mode via `server/src/env.ts`:

| Mode (set by npm scripts) | Env file loaded |
| :--- | :--- |
| `NODE_MODE=development` (default `pnpm dev`) | `server/.env.development` |
| `NODE_MODE=test` (`pnpm test`) | `server/.env.development` |
| `NODE_MODE=production` (`pnpm build` / `start`) | `server/.env.production` |

If the mode file is missing it falls back to `server/.env` (which the **Prisma CLI** also reads). Copy the template and fill in your values:

```bash
cp server/.env.example server/.env.development
cp server/.env.example server/.env.production
cp .env.example .env        # frontend
```

**Server — core variables** (`server/.env.example` has the full commented list)

The server loads `server/.env` as defaults, then overlays `server/.env.development` or `server/.env.production` according to `NODE_MODE`. Put shared credentials in `.env`, or provide them in the mode-specific file to override the defaults.

| Variable | Purpose |
| :--- | :--- |
| `PORT` | API port (dev default `3000`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allow-list (Vite dev origin + production domains) |
| `DATABASE_URL` / `DIRECT_URL` | Postgres connection strings (pooled / direct — Neon pattern) |
| `JWT_SECRET` | Signs session JWTs issued in the httpOnly cookie |
| `GITHUB_KEY` | GitHub PAT used by the GitHub integration routes |
| `PISTON_URL` | Piston execution API used by the RCE engine |
| `SENTRY_DSN` | Sentry error reporting (optional) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (ID-token flow needs only the ID; PKCE redirect flow needs the secret) |

**Server — Firebase Authentication** (Firebase-backed email/password signup, sign-in, and password reset)

| Variable | Purpose |
| :--- | :--- |
| `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` | Web-app config from Firebase Console → Project settings → Your apps. If any is missing, signup/sign-in use local bcrypt accounts and password reset uses the app's Gmail-delivered link |
| `FIREBASE_DATABASE_URL`, `FIREBASE_MEASUREMENT_ID` | Optional (Realtime DB / Analytics only) |

Setup: create a project at [console.firebase.google.com](https://console.firebase.google.com) → Project settings → **Your apps (Web)** → copy the config values above → **Authentication → Sign-in method → enable Email/Password**. Optionally, to use the in-app reset page, set **Authentication → Templates → Password reset → Action URL** to your `/reset-password` route (e.g. `http://localhost:5173/reset-password`).

**Server — Gmail SMTP (OTP and local password-reset email delivery)**

| Variable | Purpose |
| :--- | :--- |
| `GMAIL_USER` | Gmail address used as SMTP login and the `From:` header |
| `GMAIL_APP_PASSWORD` | 16-character **App Password** — enable 2-Step Verification on the Google account, then create one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Never use your normal Gmail password |
| `FRONTEND_URL` | Frontend origin for local password-reset links (also set this when the frontend origin is not in `ALLOWED_ORIGINS`) |

**Server — abuse controls**

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `AUTH_RATE_MAX` | 25 | Auth-endpoint burst ceiling per IP per 15 minutes |
| `EXECUTE_RATE_MAX` | 15 | `/execute` burst ceiling per IP per minute |
| `EXEC_DAILY_QUOTA` | 600 | Executions per user (or IP) per UTC day |

**Frontend** (root `.env` — see `.env.example`)

| Variable | Purpose |
| :--- | :--- |
| `VITE_BACKEND_URL` | Axios base URL (e.g. `http://localhost:3000/api`) |
| `VITE_API_URL` | Terminal-feature API base (falls back to `VITE_BACKEND_URL`) |
| `VITE_SOCKET_URL` | Socket.io URL (falls back to `VITE_API_URL` → `VITE_BACKEND_URL`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client for the Google login button |

### 3. Database Setup & Seeding
```bash
# Start local Postgres (docker-compose.yml) or use your own instance

cd server
npx prisma db push          # sync schema
pnpm seed                   # seed the problem bank (prisma/seed.ts)
pnpm seed:learning-paths    # seed learning paths
cd ..
```

For an existing database with no Prisma migration history, see the safe
`P3005` baseline procedure in [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md) before
running `prisma migrate deploy`.

### 4. Launch Development Servers
```bash
pnpm dev     # runs Vite (http://localhost:5173) and the API (http://localhost:3000) together
```

Open `http://localhost:5173` — sign up, battle, and climb the leaderboard. API docs at `http://localhost:3000/api-docs` (dev only).

### 5. Run the Test Suites
```bash
# Server — Jest (ESM): controllers, middleware, utils (~200 tests)
cd server && pnpm test

# Frontend — Vitest (~170 tests)
pnpm test

# Type checks
pnpm --prefix server run typecheck    # tsc --noEmit
pnpm build                            # tsc -b + vite build

# DB-driven problem verification (requires seeded DB + Piston)
cd server
pnpm test:db                          # wrapper-signature suite across all problems × 5 languages
pnpm problem:verify-exec              # end-to-end execution validation
```

---
 
## 🐳 Deployment
 
### Production (Current — EC2 + Vercel)

- **Backend**: EC2 instance running Docker Compose stack
  - `docker-compose.yml` defines: `app` (Node.js + PM2), `redis`, `piston`, `nginx`, `certbot`
  - Let's Encrypt SSL via certbot (auto-renewal) for `bracerce.server.devsharma.dev`
  - Health: `GET https://bracerce.server.devsharma.dev/health`
 
- **Frontend**: Vercel (auto-deploys on push to `main`)
  - Domain linked to Vercel, SSL handled by Vercel
  - Env vars set in Vercel Dashboard
 
### Local / Self-Hosted
 
- `Dockerfile` + `docker-compose.yml` define the production stack (`app`, `postgres:16-alpine`, execution services).
- Production runs the compiled server (`pnpm --prefix server build` → `pnpm --prefix server start`) with `NODE_MODE=production`, which loads `server/.env.production`.
- Set `ALLOWED_ORIGINS` and `FRONTEND_URL` to your frontend origin, use managed Postgres (e.g. Neon) `DATABASE_URL`/`DIRECT_URL`, apply Prisma migrations, and point the Firebase password-reset template Action URL at your deployed `/reset-password` route.
 
### Deploy Script (New EC2 Instance)
 
A complete deployment script is available at `deploy/new-instance.sh`:
 
```bash
# On fresh Amazon Linux 2023 instance:
scp -i key.pem deploy/new-instance.sh ec2-user@<IP>:/home/ec2-user/
ssh -i key.pem ec2-user@<IP> "chmod +x new-instance.sh && sudo ./new-instance.sh"
```
 
This script handles: swap, Docker/Compose, git clone, `.env` with correct Gmail creds, build, Prisma migrate, PM2, Piston runtime installs, and health checks.
