# ⚡ BRACE // RCE — Competitive Cyber-Battle & Polyglot Execution Platform

> **BRACE RCE** is a high-performance, real-time competitive coding platform featuring multi-language Remote Code Execution (RCE), interactive 1v1 cyberpunk duels, automated data structure marshalling, and automated DB-driven verification suites.

---

## 📐 Architecture & System Overview

BRACE RCE combines a real-time WebSocket matchmaking engine, a polyglot code execution wrapper synthesizer, and a high-tech Monaco editor interface designed for instant feedback during competitive battles.

```
                  ┌─────────────────────────────────────────┐
                  │          React 19 + Vite + TS           │
                  │      (Monaco Editor + Socket Client)    │
                  └────────────────────┬────────────────────┘
                                       │
                                WebSocket / REST
                                       │
                  ┌────────────────────▼────────────────────┐
                  │         Express + TypeScript API        │
                  │         (Socket.io + Prisma ORM)        │
                  └────────────────────┬────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      ┌─────────▼──────────┐                       ┌──────────▼─────────┐
      │  PostgreSQL Database │                       │   Polyglot RCE    │
      │  (248 Problems DB) │                       │ Execution Engine  │
      └────────────────────┘                       │ (JS, PY, JAVA,    │
                                                   │  CPP, C)          │
                                                   └───────────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite, TailwindCSS v4, `@monaco-editor/react`, Lucide React Icons |
| **Real-time Comms** | Socket.io (client & server) with binary heartbeat sync & match state events |
| **Backend API** | Node.js, Express, TypeScript, Prisma ORM |
| **Database** | PostgreSQL database with relational schemas for Users, Rooms, Events, Problems, Test Cases |
| **RCE Sandbox Engine** | Custom Polyglot Wrapper Synthesizer supporting Node.js, Python 3, Java 21, GCC / G++ (C11 / C++17) |
| **Automated Testing** | Jest, TSX, DB-Driven End-to-End Problem Test Suite |

---

## ✅ WHAT HAS BEEN IMPLEMENTED

### 1. 🚀 Polyglot Remote Code Execution (RCE) Engine
- **Multi-Language Support**: Fully automated code execution for **JavaScript (Node.js)**, **Python 3**, **Java 21**, **C++ (G++)**, and **C (GCC)**.
- **Polyglot Code Synthesizer**: Generates standard I/O parsing, function invocation, class initialization, and output serialization wrappers without requiring user boilerplate.

### 2. 🧠 Complex Data Structure Marshalling System
- **Linked Lists (`ListNode`)**: Level-order serialization and list reconstruction across all 5 languages.
- **Interwoven Random Linked Lists (`_Node`)**: Full support for LeetCode-style linked lists with `.next` and `.random` pointers (e.g. `Copy List with Random Pointer`).
- **Binary Trees (`TreeNode`)**: Level-order BFS array-to-tree & tree-to-array serialization supporting `null` / `None` node values.
- **In-Place Array / Matrix Mutations (`VOID_RETURN`)**: Automated mutation tracking and diffing for `void` return functions (e.g., `Rotate Array`, `Next Permutation`, `Set Matrix Zeroes`).
- **2D Arrays & Matrices**: Multi-dimensional array parsing and JSON bracketed formatting.
- **Design Class & Multi-Method Invocation**: Constructor argument parsing, method dispatchers, and state sequence executions (e.g., `Design Front Middle Back Queue`, `Detect Squares`).
- **Primitives & Strings**: Int, Float, Double, Boolean (`true`/`false`), and Escaped String parameters.

### 3. 🧪 DB-Driven Automated Test Infrastructure
- **Full Database Coverage**: Direct integration with PostgreSQL via Prisma ORM querying all **248 stored problems**.
- **Automated Signature Suite (`pnpm test:db`)**: Pre-flight test runner verifying code wrapper synthesis for **1,240 problem signatures** (248 problems × 5 languages) with **100% pass rate**.
- **End-to-End Benchmark Execution Suite (`test_all_db_actual_responses.ts`)**: Runs actual problem solutions against real database test case inputs and expected outputs.

### 4. ⚔️ Real-Time Multiplayer Matchmaking & Battle Arena
- **1v1 Ranked Matchmaking Queue**: Automated queueing and instant socket room assignment.
- **Match Accept Flow**: Two-phase match confirmation (`match_found_pending` -> `match_starting`).
- **Live Battle Synchronization**: Real-time progress updates, opponent status tracking, and submission event broadcasts.
- **3-Second "Get Ready" Event Countdown**:
  - Full-screen dark glassmorphic overlay (`bg-black/90 backdrop-blur-xl`).
  - OPERATIVE ALERT banner with pulsing cyan glow.
  - Large animated countdown digits (`3` -> `2` -> `1` -> `BATTLE COMMENCING`).
  - Input editor lock preventing premature code editing until battle officially starts.

### 5. 💻 Monaco Editor & Integrated Terminal Toolbar
- **Monaco Code Editor**: Syntax highlighting, auto-formatting, error squigglies, and custom dark cyberpunk theme.
- **Editor Toolbar**: Language selector, Code Formatter, Code Reset, Run & Submit buttons, Exit to Dashboard, and Global Scratchpad Notes toggle.
- **Execution Output & Diagnostics Panel**:
  - Compilation logs, Execution Time & Memory Usage metrics.
  - Multi-test-case runner tabs with individual test case execution support.
  - Diagnostic warnings for output mismatches and tracebacks.

### 6. 📝 Persistent Global Scratchpad Notes Panel
- Side-drawer scratchpad notes panel (`NotesPanel`) accessible across all battle arenas and workspaces.

---

## 🔮 WHAT NEEDS TO BE IMPLEMENTED (ROADMAP)

### 1. 🏆 Skill-Based ELO & Rating Tier System
- [ ] **ELO Rating Algorithm**: Calculate post-match rating gains/losses based on opponent rating difference, match completion time, and submission attempts.
- [ ] **Ranked Tiers**: Division badges (`Bronze`, `Silver`, `Gold`, `Platinum`, `Cyber-Master`).
- [ ] **Global Leaderboards**: Real-time rankings table sorted by ELO rating and win rate.

### 2. 🎨 Custom Problem Creator Studio & GUI
- [ ] **Problem Creator Interface**: Web GUI allowing users to create custom problems with Markdown descriptions, parameter signatures, and reference code.
- [ ] **Automated Test Case Generator**: Input generator tool to synthesize randomized test cases automatically.

### 3. 🛡️ Anti-Cheat & Plagiarism Detection Engine
- [ ] **AST Structure Comparison**: Compare Abstract Syntax Trees of submitted code to detect copy-pasting or plagiarism.
- [ ] **Focus Loss Telemetry**: Track tab-switch events and window focus loss during ranked duels.

### 4. 👁️ Spectator Mode & Battle Replay Theater
- [ ] **Live Match Spectating**: Allow third-party users to join ongoing 1v1 duels as silent spectators.
- [ ] **Replay Theater**: Step-by-step move timeline replaying previous battles.

### 5. 🐳 Containerized Docker Sandbox Isolation
- [ ] **Docker Execution Containers**: Run submitted code inside isolated unprivileged Docker containers with Linux `cgroups` (CPU quotas, memory caps, network disablement).

### 6. 🎵 Audio & Cyberpunk Sound FX System
- [ ] **Battle Sound Effects**: Cyberpunk sound effects for 3-second countdown ticks, match start, test pass, submission success, and surrender.

---

## 📁 Project Structure

```
BRACE_RCE/
├── server/                           # Backend Node.js / Express / Socket.io App
│   ├── src/
│   │   ├── controllers/              # API Controllers (auth, profile, room, etc.)
│   │   ├── services/
│   │   │   ├── codeExecution.ts      # Multi-Language RCE Synthesizer & Execution Engine
│   │   │   └── socket.ts             # Real-time WebSocket Matchmaking & Battle Handler
│   │   ├── scripts/
│   │   │   ├── test_db_problems.ts               # Pre-flight DB signature test runner
│   │   │   └── test_all_db_actual_responses.ts   # E2E DB problem response validation
│   │   └── Lib/
│   │       └── prisma.ts             # Prisma Database Client
│   └── package.json
├── src/                              # Frontend React 19 / Vite App
│   ├── components/
│   │   └── ui/                       # Reusable Cyberpunk UI Components (NotesPanel, etc.)
│   ├── features/
│   │   └── terminal/                 # EditorToolbar, OutputPanel, Monaco Terminal Layout
│   ├── pages/
│   │   ├── Battle.tsx                # Main 1v1 Battle Arena & Countdown Overlay
│   │   ├── Dashboard.tsx             # Operative Dashboard
│   │   └── Lobby.tsx                 # Matchmaking Lobby
│   └── context/
│       └── socketContext.tsx         # WebSocket Context Provider
├── problems_seed.json                # Seed database problem dataset
└── README.md
```

---

## 🚀 Quickstart & Local Setup Guide

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher
- **PostgreSQL**: Running instance on port `5432`
- **Compiler Runtimes**: Node.js, Python 3, JDK (javac/java), GCC, G++

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Devsharma08/BRACE_RCE.git
cd BRACE_RCE

# Install frontend & root dependencies
pnpm install

# Install server dependencies
cd server && pnpm install && cd ..
```

### 2. Environment Variables
Create `.env` inside `server/`:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/brace_db"
JWT_SECRET="your-cyber-secret-key"
```

### 3. Database Setup & Seeding
```bash
cd server
npx prisma db push
npx tsx src/scripts/seed_problems.ts
cd ..
```

### 4. Run Automated Test Suites
```bash
# Run Jest unit test suite
cd server && pnpm test

# Run DB-Driven 248 Problem Signature Verification
pnpm test:db

# Run End-to-End Data Structure Response Validation
npx tsx src/scripts/test_all_db_actual_responses.ts
```

### 5. Launch Development Servers
```bash
# In terminal 1 (Backend Server):
cd server && pnpm run dev

# In terminal 2 (Frontend Client):
pnpm run dev
```

Open `http://localhost:5173` in your browser to start competitive cyber-battles!

---

## 📄 License

MIT License. Designed and built for high-performance competitive coding and multi-language execution.
