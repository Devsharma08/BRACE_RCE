# Implementation Plan

## Overview
Implement 65+ UI/UX spec requirements across 14 files to achieve a cohesive futuristic arena aesthetic. All changes are purely visual. Every fix aligns to the design system tokens: --bg-void (#050811), --bg-base (#0b1021), --accent (#00D4FF/#00f3ff), --accent-glow (rgba(0,243,255,*)).

## Types

### Modified: SupportedLanguage in src/features/terminal/types.ts
Add "c11" to the union:


## Files

### 1. src/components/layout/Header.tsx
**Changes:**
- Logo <span>: add fontFamily: "Orbitron, sans-serif" (inline style), add drop-shadow-[0_0_8px_rgba(0,243,255,0.6)] to parent link
- Change h-[52px] to h-14 on <nav>; change mobile dropdown top-[52px] to top-14
- Change bg-[#050608]/92 to bg-[#0b1021]/90 backdrop-blur-xl
- Change border-b border-white/6 to border-b border-cyan-500/20
- Profile pill green dot: add animate-pulse to the <span className="w-1.5 h-1.5 bg-[#00FF87]" />
- Active desktop link: add bg-cyan-500/8 alongside existing border-b-2 border-[#00D4FF]
- Mobile drawer: change bg-[#080a10] to bg-[#0b1021]/98 backdrop-blur-xl
- Add center mode indicator: centered div with mode text (1v1 BATTLE ARENA) and PING: 14ms mono readout

### 2. src/components/layout/DashboardSidebar.tsx
**Changes:**
- Change bg-[#02040a] to bg-[#080d1a]
- Dot-grid: change #1e293b to rgba(0,243,255,0.04), change 16px to 48px
- Change border-r border-white/10 to border-r border-cyan-500/15
- Brand title: add fontFamily: "Orbitron, sans-serif" to <h1>, render BRACE // RCE
- Subtitle: change text-slate-500 to text-cyan-500/30
- Icon box glow: change rgba(6,182,212,0.25) to rgba(0,243,255,0.25) (both states)
- Active nav link: change bg-cyan-950/20 to bg-cyan-500/10, add shadow-[inset_0_0_8px_rgba(0,243,255,0.05)]
- User card rating: change to font-black font-mono text-sm text-cyan-400 drop-shadow-[0_0_6px_rgba(0,243,255,0.4)]
- Add profile card section: ELO tier badge, animated border glow, 3-stat grid

### 3. src/pages/Dashboard.tsx
**Changes:**
- Outer div: change bg-[#050608] to bg-[#050811]
- Dot-grid: change #1e293b to rgba(0,243,255,0.04), 16px to 48px
- Header h1: add fontFamily: "Orbitron, sans-serif", font-extrabold tracking-widest uppercase
- Username pill green dot: add animate-pulse
- Find Opponent banner: add shadow-[0_0_20px_rgba(0,212,255,0.1)]
- START MATCHMAKING button: add tracking-wider, change hover:opacity-85 to hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all
- Stats grid: remove gap-px bg-white/6 wrapper; give each card border border-cyan-500/20, grid gap-4
- Stat card icons: change text-[#3D4657] to text-cyan-500/40
- Recent Battles table: th to font-mono text-[10px] tracking-widest uppercase; data cells to text-[11px] font-mono
- SEARCHING modal timer: font-mono text-5xl font-black text-cyan-400 tracking-wider drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]
- FOUND_PENDING countdown: extract to text-4xl font-black font-mono text-amber-400 with progress bar

### 4. src/pages/Lobby.tsx
**Changes:**
- Page background: change bg-[#050608] to bg-[#050811]
- Dot-grid: change to rgba(0,243,255,0.04) and 48px
- Header h1: add fontFamily: "Orbitron, sans-serif", font-black tracking-widest uppercase, text OPERATIONS LOBBY
- Active tab: add bg-cyan-500/8
- Room card top accent: change /35 to /60 for both cyan and amber
- Host avatar box border: change border-white/8 to border-cyan-500/20
- Join Room button: change border-white/10 text-[#8892A4] to border-cyan-500/30 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/10
- Empty state icons: change text-[#3D4657] to text-slate-600
- Add radar visual: concentric circles with animate-ping center dot

### 5. src/pages/Battle.tsx
**Changes:**
- Countdown banner: cyan to amber (border-amber-500/40 bg-amber-950/40 text-amber-400, bg-amber-400 animate-ping, shadow-[0_0_20px_rgba(245,158,11,0.3)])
- Add OPPONENT TELEMETRY tab (third tab) with test pass ratio, focus blur alerts, progress bar
- Focus loss warning: add glitch CSS animation (@keyframes glitch), animate-[glitch_0.3s_infinite], amber styling
- Hard difficulty: change text-rose-400 to text-[#ff0055], bg-rose-500/10 to bg-[#ff0055]/10, border-rose-500/30 to border-[#ff0055]/30

### 6. src/features/terminal/components/EditorToolbar.tsx
**Changes:**
- Toolbar border: change border-white/5 to border-cyan-500/20
- RUN button: change bg-cyan-950/10 to bg-slate-800/60, add px-4 py-1.5 font-bold tracking-wider
- SUBMIT button: add shadow-[0_0_12px_rgba(0,255,102,0.3)], change hover to bg-emerald-500 text-slate-950 font-black
- Language selector: change bg-black/40 to bg-[#0b0c0e], border border-cyan-500/20
- Notes button inactive: change amber to cyan (border-cyan-500/20 bg-transparent text-cyan-400/60); keep active state amber
- Add { value: "c11", label: "C11", shortLabel: "C11" } to LANGUAGE_OPTIONS

### 7. src/features/terminal/components/OutputPanel.tsx
**Changes:**
- Panel background: change bg-[#08090a] to bg-[#070b16]
- Resizer: change to h-1 cursor-row-resize border-t border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-400/10 transition-all
- Diagnostic tabs: remove full border from inactive, use border-b-2 border-transparent inactive / border-b-2 border-cyan-400 active
- Executing banner: add font-mono font-bold tracking-widest, add shadow-[inset_0_0_10px_rgba(0,243,255,0.04)]
- Telemetry block border: change border-white/10 to border-cyan-500/20
- Add EXECUTION METRICS tab: Time: {avgDuration}ms, Memory: {(maxMemory/1024).toFixed(1)}MB

### 8. src/features/terminal/components/TestCaseCard.tsx
**Changes:**
- Neutral card: change border-white/5 bg-black/20 to border-cyan-500/10 bg-[#0b1021]/60
- RUN TEST button: change to border-cyan-500/40 bg-slate-800/60 text-cyan-400 font-bold tracking-wider
- PASSED badge: add shadow-[0_0_8px_rgba(0,255,102,0.2)]
- FAILED badge: add shadow-[0_0_8px_rgba(255,0,85,0.2)]
- CASE_METRICS: change border-white/5 bg-black/60 to border-cyan-500/15 bg-[#070b16]

### 9. src/components/ui/NotesPanel.tsx
**Changes:**
- Position: change fixed bottom-6 right-6 to fixed right-0 top-14 bottom-0, set w-80, remove style={{ height: ... }}
- Outer border: change border-amber-500/30 to border-l border-cyan-500/30, remove amber outer glow
- Textarea: change text-amber-100/90 to text-cyan-200, bg-transparent to bg-[#050811], add border border-cyan-500/20 rounded p-3 focus:border-cyan-400 focus:outline-none, placeholder text-cyan-500/20
- Header: change bg-amber-950/30 border-amber-500/20 to bg-[#090e1d] border-cyan-500/20, label text-cyan-400, keep StickyNote icon amber, X button text-slate-400

### 10. src/features/auth/Login.tsx (and Signup.tsx)
**Changes:**
- Brand statement (Battle./Ranked./Code.): add fontFamily: "Orbitron, sans-serif", tracking-wider, font-black
- Stat values: change to text-base font-black text-cyan-400 font-mono, sublabels text-[9px] text-[#3D4657] uppercase tracking-widest
- Input borders: change border-white/8 to border-cyan-500/15, focus adds focus:shadow-[0_0_0_1px_rgba(0,243,255,0.2)]
- Submit button: change hover:opacity-85 to hover:bg-cyan-300 shadow-[0_0_16px_rgba(0,243,255,0.3)] hover:shadow-[0_0_24px_rgba(0,243,255,0.5)] transition-all

### 11. src/components/features/ProfileScoreCard.tsx
**Changes:**
- Card background: remove gradient, use flat bg-[#0b1021]
- XP bar: remove gradient, use flat bg-cyan-400 with shadow-sm shadow-cyan-400/50
- Rank badge: add fontFamily: "Orbitron, sans-serif", font-black text-[9px] letter-spacing: 0.15em
- Win rate fill: add shadow-sm shadow-emerald-400/40

### 12. src/components/ui/Skeleton.tsx
**Changes:**
- PageSkeleton: change bg-[#050505] to bg-[#050811]
- SkeletonBox: change bg-slate-900/80 border-white/5 to bg-[#0b1021] border-cyan-500/10
- SkeletonSurface: change bg-[#02040a] to bg-[#050811]
- Dot-grid: change to rgba(0,243,255,0.04) and 48px

### 13. src/components/features/LeaderboardTable.tsx
**Changes:**
- Rank colors: rank 1 text-amber-400, rank 2 text-slate-300, rank 3 text-orange-600
- Medal icon: match rank colors (not always amber)
- Row grid: change to grid-cols-[2.5rem_1fr_6rem_5rem]
- Row background: change bg-black/40 to bg-[#0b1021], hover adds hover:bg-cyan-500/10
- ELO number: add drop-shadow-[0_0_6px_rgba(0,243,255,0.4)]
- Section header: change to text-cyan-500/50 tracking-[0.2em], Trophy icon text-amber-400/70
- Add avatar/initials column: w-7 h-7 rounded-full bg-[#131b35] border border-cyan-500/20 with 2-letter initials

### 14. src/components/features/AnalyticsPanels.tsx
**Changes:**
- Card background: change bg-[#06080e] to bg-[#0b1021], border border-white/8 to border-cyan-500/15
- SectionLabel: change text-slate-500 to text-cyan-500/50, tracking 0.2em
- ActivityHeatmap: highest cells bg-cyan-400 solid with border-cyan-400/60, lowest bg-cyan-900/30
- DifficultyBreakdown: add gap-4 to outer grid, change bar height h-16 to h-24
- BattleTrendChart win rate: text-3xl font-black font-mono text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.4)]
- StreakPanel: add drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] on active streak number, animate-pulse on fire box when active
- RuntimeStats: change values to text-xl font-black font-mono, separator divide-cyan-500/15
- LanguageBars: dot w-2 h-2 rounded-full flex-shrink-0, language name text-white/80, count text-slate-400 font-bold

### 15. src/pages/Profile.tsx
**Changes:**
- Identity avatar: change w-18 to w-16 h-16 (or size-[72px])
- Identity card: change border-t-[#00D4FF]/40 to border-t-cyan-400/50, add shadow-[0_-4px_20px_rgba(0,243,255,0.1)]
- Mini-stats values: text-base font-black font-mono text-cyan-400, labels text-[9px] text-[#3D4657] uppercase tracking-widest
- Section headers: text-[11px] text-[#8892A4] font-mono font-bold uppercase tracking-widest with icon in text-cyan-500/50
- Analytics summary cards: change border-white/6 to border-cyan-500/15

## Functions
No function signatures change. All modifications are to JSX classNames, inline styles, and CSS.

## Classes
No class modifications.

## Dependencies
No new dependencies. Orbitron font must be added to Google Fonts import in index.css.

## Testing
- npx tsc --noEmit -- verify zero type errors
- npm run build -- verify production build succeeds
- Manual QA: verify each spec item renders correctly

## Implementation Order
1. types.ts -- add c11 to SupportedLanguage union
2. Header.tsx -- logo font+glow, nav height, bg, border, dot pulse, active link bg, mobile drawer, center indicator
3. DashboardSidebar.tsx -- bg, dot-grid, border, brand font, nav link active, rating glow, profile card
4. Dashboard.tsx -- bg, dot-grid, header font, pill dot, banner glow, button glow+tracking, stat borders, table mono, modal timers
5. Lobby.tsx -- bg, dot-grid, header font, tab bg, card accents, avatar border, join button, empty icons, radar
6. Battle.tsx -- amber banner, telemetry tab, glitch animation, hard difficulty
7. EditorToolbar.tsx -- border, run button, submit glow, select bg, notes button, c11 option
8. OutputPanel.tsx -- bg, resizer, tab borders, executing banner, metrics tab
9. TestCaseCard.tsx -- neutral card, run button, status glows, metrics block
10. NotesPanel.tsx -- position, border, textarea, header colors
11. Login.tsx / Signup.tsx -- brand font, stat sizing, input borders, submit hover
12. ProfileScoreCard.tsx -- flat bg, xp bar, rank font, win rate glow
13. Skeleton.tsx -- bg colors, box colors, dot-grid
14. LeaderboardTable.tsx -- rank colors, grid cols, row bg, elo glow, header, avatar column
15. AnalyticsPanels.tsx -- card bg, labels, heatmap, breakdown, trend chart, streak, runtime, language bars
16. Profile.tsx -- avatar size, card glow, mini-stats, section headers, card borders
