# Arena design tokens and migration status

## Canonical source

Tokens are defined in `/home/devsharma08/code/BRACE_RCE/src/index.css`.
The `:root` variables support existing CSS; the Tailwind v4 `@theme` block
exposes the utilities below. Values currently appear in both blocks: keep them
synchronized until these definitions are consolidated.

| Role | Utility | Value |
| --- | --- | --- |
| Page background | `bg-void` | `#050811` |
| Card, panel, drawer, navigation | `bg-raised` | `#0b1021` |
| Sidebar | `bg-panel` | `#080d1a` |
| Avatar tile, chip, elevated fill | `bg-elevated` | `#131b35` |
| Brand accent | `text-accent`, `bg-accent` | `#00D4FF` |
| Ink on bright accent fills | `text-ink` | `#050811` |
| Primary / secondary text | `text-fg` / `text-subtle` | `#F0F4FF` / `#8892A4` |
| Decorative section label | `text-label` | cyan-500 at 50% |

**Border naming warning:** `border-accent` resolves to opaque `#00D4FF`
through `--color-accent`, NOT to the CSS variable `--border-accent`.
Use `border border-cyan-500/15` for structural frames. Use
`border-white/5` only for micro-dividers, and brighter cyan for hover/focus.
There is no `border-hairline` utility defined yet.

## Component conventions

- Flat card: `bg-raised border border-cyan-500/15 rounded-none`.
- Accented card: add `border-t-2 border-t-cyan-500/40`; no 4px directional edges.
- Section label: `text-[10px] font-mono text-label uppercase tracking-[0.2em]`.
- Heading: white, `font-black`, with plain `text-cyan-400` accent words.
  Do not apply `bg-clip-text` or gradients to heading text.
- Form input: `bg-raised border border-cyan-500/15 rounded-none
  focus:border-cyan-400 focus:outline-none`. Preserve a visible focus indicator.
- Use `gap-6` between app sections, `gap-4` between cards, `gap-3` inside cards.
  Full-height landing sections retain responsive vertical padding.
- Rose denotes failure, emerald success, amber warning/countdown. Do not
  replace meaningful semantic colors with cyan during a palette migration.
- Keep tiny badges and presence indicators distinct from sharp card frames.
- Image legibility overlays and carousel edge fades are not text gradients.
- Monospaced labels do not require changing readable body copy to monospace.
- Muted labels are a visual target, not an accessibility guarantee: check
  contrast at actual rendered opacity/size, and brighten essential text.

## Role-aware migration

Replace background utilities, not every occurrence of a hex string:
`text-[#050608]` is button ink, not a page background.

| Old role/class | Replacement |
| --- | --- |
| Page `bg-[#050608]`, `bg-[#02040a]`, `bg-[#050505]` | `bg-void` |
| Card `bg-[#06080e]`, `bg-[#0c0f18]`, `bg-[#0b0c0e]` | `bg-raised` |
| Sidebar fill | `bg-panel` |
| Small avatar/chip `bg-[#111520]` | `bg-elevated` |
| Secondary `text-[#8892A4]` | `text-subtle` |
| Dark ink on cyan button | `text-ink` |

Determine whether `bg-black/*` and old white borders are overlays, internal
dividers, or structural frames before replacing them. Do not flatten status,
focus, disabled, or selected states. Reserve row-border width at rest to avoid
layout movement on hover.

## Verified implementation checkpoint

These statuses describe source changes, not browser screenshot approval.
The working tree is mixed and uncommitted; a changed file does not imply every
item for that component is finished.

- **Implemented:** palette utilities and many surface substitutions; home
  heading accents (including HTML in content data), thin capability-card top
  borders, removal of review stars, textarea accessible name/focus styling,
  carousel duplicate-border cleanup.
- **Implemented:** analytics empty heatmap cells and legend (item 40), taller
  difficulty bars (41), larger square language markers (45); cyan ledger frame
  and table labels (49–50); leaderboard typography/surface refinements.
- **Implemented:** Problems filter/search/pagination styling (items 52–56),
  search accessible name, filter `aria-pressed`, reserved hover-border width,
  and the table surface regression-tested red/green (`bg-slate-950/40` →
  `bg-raised`); Lobby surface/text/spacing refinements (57, 59, 61).
- **Implemented:** profile score-card flattening, flat XP bar, and monospaced
  rank badge (46–48); auth form surfaces, input borders/focus rings, submit
  hover-brighten, rose error banners, stat-number hierarchy, and inline cyan
  normalization (78–82 + Login left panel); NotesPanel header/textarea
  (91–92); Skeleton tokenized and the previously unstyled
  `RouteLoadingSkeleton` fallback (`" loading"`) replaced with a real loading
  state — it is the visible Suspense fallback in `Root.tsx`.
- **Implemented (leftover pass):** sidebar nav states (9–10: no border at
  rest, single `border-l-2` active accent, old-cyan glow removed); unread
  notification rows (74); chat bubbles (68) and challenge-button titles (70);
  About (19×) and admin (8×) 4px directional borders → `border-t-2` top
  accents with colour coding kept and intensity standardized at /40 (items
  5, 19, 85, 86); opaque `#00D4FF`/ink vocabulary migrated to
  `text-accent`/`bg-accent`/`border-accent`/`text-ink` and `#8892A4` →
  `text-subtle` across the app — the cyan double-definition is resolved for
  class usage.
- **Functional fix (full stack):** the home feedback form now POSTs to a new
  authenticated `POST /api/feedback` endpoint (controller, route, mount,
  jest coverage: 401 anonymous / 400 empty / 400 >5000 chars / 201 persisted).
  The Prisma client was regenerated and the `Feedback` table exists in the
  database (0 rows). Success is shown only on 2xx; 401/403 surfaces a
  "Please sign in" message; other failures surface the server message.
  Restart the dev server to pick up the regenerated client.
- **Not applicable:** item 67 (presence dot already had an ONLINE/OFFLINE
  label) and item 69 (no REQUESTS tab exists in the UI — `leftPaneMode` state
  is currently dead code; adding that tab would be new feature work, not a
  styling refactor).
- **Implemented, not full-page sign-off:** Problems filter/search/pagination
  styling, search accessible name, filter `aria-pressed`, reserved hover-border
  width, and Lobby surface/text/spacing refinements.
- **Already present or not applicable:** Home had no outer `gap-10` to remove;
  capability screenshots were full-card backgrounds, not `aspect-video` images;
  no new custom image-height behavior was introduced. Do not blindly apply the
  original audit's descriptions where the actual implementation differs.
- **Partial:** shared shell/mobile polish is substantially done; remaining
  are editor-area details (NotesPanel actually reserving editor space) and
  legacy `#3D4657` decorative-ink contrast, which has no approved token yet.
- **Remaining:** browser-level visual verification, and staging/committing
  the mixed working tree in reviewable slices. No assertion that all 92 items
  are complete is warranted.
- **Separate functional issue:** home feedback success is local UI state, not
  confirmation of an API submission. A styling refactor does not fix delivery.

## Validation and next steps

At the checkpoint preceding this document, frontend Vitest passed 11 files /
42 tests; `pnpm build` (TypeScript plus Vite) and `git diff --check` exited 0.
Those are frontend results, not the earlier server-suite counts.

After the auth/profile/notes/skeleton batch: **12 files / 46 tests passed
(exit 0)**, `pnpm build` exit 0, `git diff --check` clean, and the token
utilities are present in the compiled CSS bundle.

Run from `/home/devsharma08/code/BRACE_RCE`:

```sh
pnpm test
pnpm build
git diff --check
```

Next: finish one component batch at a time, retain behavior coverage, then
review desktop and mobile layouts (320/375/768/1440px), keyboard focus, menus,
long labels, loading/error/empty states, and NotesPanel/editor overlap. Browser
visual verification is still outstanding; builds and jsdom tests cannot prove
there are no overlaps or contrast problems.
