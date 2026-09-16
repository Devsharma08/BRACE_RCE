# Implementation Plan — Unified Design Language Overhaul

## Overview

Replace the app's three competing visual identities with one coherent language: sharp-edged, dark (`#050811` void / `#0b1021` surface), cyan-accented, monospaced labels, no text gradients, consistent spacing. Apply the arena aesthetic universally.

**Scope:** ~20 files, 92 design points across 9 phases.

## Phase 0 — Shared Primitives
- Skeleton shimmer: `via-white/5` → `via-cyan-500/5`
- Extract reusable `SectionLabel` and `Card` primitives

## Phase 1 — Layout Shell
- Header.tsx: logo typography, notification separator
- DashboardSidebar.tsx: link borders, active state, user card separator, collapse toggle

## Phase 2 — Landing Page
- Remove gap-10, pixel art wrapper, CTA radius
- Eliminate text gradients from all section headings
- BentoGrid: vignette color, card borders, card bg
- CommunitySupportSection: star variety, focus, gap

## Phase 3 — App Shell Pages
- Dashboard: greeting, stats cards, find opponent banner, searching/accept states, recent battles header, problem badges
- Problems: search, filters, rows, badges, pagination
- Lobby: h1, tabs, cards, host avatar, JOIN button, empty state
- CreateRoom: inputs, dividers, submit button

## Phase 4 — Profile + History
- ProfileScoreCard: flat bg, XP bar, rank badge
- HistoryLedgerSection: emerald→cyan, table header, outcome badges

## Phase 5 — Leaderboard + Analytics
- Leaderboard: rank colors, medal colors, card bg
- AnalyticsPanels: heatmap cells, bar height, battle trend hero, streak pulse, dividers, language dots

## Phase 6 — Social + Notifications
- FriendDashboard: divider, presence label, message bubbles, requests badge, tooltip
- NotificationCenter: bell container, dropdown bg, icons, unread rows
- ChallengeModal: backdrop blur, toggles, search input

## Phase 7 — Auth Pages
- Login/Signup: stat values, form card, inputs, submit button, error banner rose

## Phase 8 — Output + Notes + About + Admin
- OutputPanel tabs, TestCaseCard, status badges
- NotesPanel: position, header, textarea
- About: directional borders, roadmap badges
- Admin pages: border-r-4/border-b-4 → border-t accent
