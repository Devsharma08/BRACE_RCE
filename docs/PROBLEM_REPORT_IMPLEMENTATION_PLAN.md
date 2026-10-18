# Problem Report Feature — Implementation Plan & Technical Checklist

> Status: **PLANNING** · Last updated: 2026-10-18

## 1. UI/UX Enhancement — Problem Report Module

### Current State
File: `src/features/terminal/components/ProblemReport.tsx` (197 lines)

**Issues identified:**
- Uses `amber-500`/`amber-600` Tailwind classes that don't match the codebase's cyberpunk theme (which uses `accent-primary`, `accent-success`, `accent-danger`, `accent-warning` tokens)
- Category selection is a horizontal flex row of 4 buttons with no visual hierarchy or grouping
- The `detail` textarea only appears for the "other" category — should be available for all categories
- No category-specific guidance text
- The modal has no keyboard handling (Escape to close, Tab trapping)
- Sends lowercase category strings (`"question"`, `"testcase"`) that don't match the server's `ReportCategory` enum (`"QUESTION"`, `"DOUBT"`, `"TESTCASE"`, `"OTHER"`)

### Design Improvements

#### 1.1 Theme Alignment
| Current (broken) | Target (matches codebase) |
|---|---|
| `bg-amber-500/10` | `bg-accent-warning/10` |
| `text-amber-600` | `text-accent-warning` |
| `border-amber-500/30` | `border-accent-warning/30` |
| `hover:bg-amber-500/20` | `hover:bg-accent-warning/20` |

Reference: `src/pages/admin/AdminReports.tsx` uses `accent-primary`, `accent-success`, `accent-danger`.

#### 1.2 Selection Component — Refined Category Picker
Replace the flat button row with a card-based, icon-led selector:

```
┌──────────────────────────────────────────┐
│  Report a problem                        │
│                                          │
│  What's wrong with this problem?         │
│                                          │
│  [ ⚠️  Wrong test case     ]             │  ← card with icon, label, short desc
│  [ 💡  Question unclear    ]             │
│  [ 🐛  System error         ]             │
│  [ ➕  Other                ]             │
└──────────────────────────────────────────┘
```

- Each category: rounded-lg card with border, icon (32px), title (12px), short description (10px muted)
- Selected state: `border-accent-primary bg-accent-primary/10`
- Unselected: `border-subtle-line hover:border-accent-primary/50 hover:bg-surface-hover`
- Icon from Lucide (already imported: `Bug`, `Lightbulb`, `AlertTriangle`, `MessageSquare`)

#### 1.3 Detail Textarea — Always Visible
- Move the textarea above the action buttons
- Show category-specific placeholder based on selected category
- Add character counter (1200 char limit matches server's `slice(0, 2000)`)
- Enable for all categories, not just "other"

#### 1.4 Keyboard Navigation
- `Escape` closes the modal
- `Tab` cycles through focusable elements (first/last trapping)
- `Enter` submits (when not typing in textarea)

### Checklist
- [ ] Replace all `amber-*` classes with theme tokens
- [ ] Redesign category selector as card-based grid
- [ ] Add category-specific placeholder text
- [ ] Make textarea visible for all categories
- [ ] Add keyboard handlers (Escape, Tab trap)
- [ ] Add character counter
- [ ] Map frontend categories to server enum values
- [ ] Add unit tests for the component

---

## 2. Functional Verification — End-to-End Testing Protocol

### 2.1 Unit Tests
File: `src/features/terminal/components/ProblemReport.test.tsx` (create new)

| Test | Description |
|---|---|
| Renders all 4 categories | Verify category buttons render with correct labels/icons |
| Selects category on click | Clicking a category calls `setCategory` with the right value |
| Shows textarea for all categories | Detail textarea visible regardless of selected category |
| Maps category to server format | `'testcase'` → `'TESTCASE'` in the POST body |
| Submits to `/admin/reports` | POST called with `{ questionId, reason, detail }` |
| Shows success state on 200 | `status === "success"` renders confirmation message |
| Shows error state on 500 | `status === "error"` renders error message |
| Disabled when no active problem | Submit button disabled when `activeProblem` is null |
| Escape closes modal | `keydown(Escape)` calls `close()` |

### 2.2 Integration Tests (Server)
File: `server/src/controllers/admin.test.ts` (update existing)

| Test | Description |
|---|---|
| `POST /admin/reports` creates report with detail | Verify `detail` is stored, not just `reason` |
| `POST /admin/reports` validates required fields | Missing `questionId` → 400 |
| `POST /admin/reports` requires auth | Unauthenticated → 401 |
| `GET /admin/reports` includes detail field | Admin response includes `detail` |
| `PATCH /admin/reports/:id` updates status | Status transitions correctly |

### 2.3 E2E Protocol (Manual Verification)
```
1. Sign in to the platform
2. Navigate to Terminal → select any problem
3. Click "Report problem" button
4. Verify 4 category cards render with icons
5. Click each category → verify placeholder text changes
6. Type in the detail textarea → verify character counter updates
7. Click "File report" → verify success toast/snackbar
8. As admin: navigate to /admin/reports → verify report appears with detail
9. Verify category column shows the mapped value (TESTCASE, not testcase)
10. Test Escape key closes modal
11. Test Tab key cycles through focusable elements
12. Hard refresh → verify no stale state
```

### 2.4 Regression Checks
- [ ] Opening/closing report modal doesn't affect code editor state
- [ ] Report modal doesn't interfere with language switching
- [ ] Submitting a report doesn't clear test cases or code
- [ ] Report modal renders correctly on mobile breakpoints
- [ ] No new TypeScript errors (`tsc --noEmit`)
- [ ] No new ESLint warnings (`eslint .`)

---

## 3. Documentation Updates

### 3.1 README.md Updates
**Section: "✅ WHAT HAS BEEN IMPLEMENTED"**

Add new section after item 7 (Persistent Global Scratchpad Notes):

```markdown
### 8. 🐞 Problem Report & Feedback System
- **Problem Reporting**: One-click "Report problem" button in the terminal header opens a modal to file reports against specific problems. Four report categories (Wrong Test Case, Question Unclear, System Error, Other) with category-specific guidance.
- **Admin Review Queue**: Reports appear in `/admin/reports` with status tracking (Flagged → Reviewed/Dismissed/Approved). Admins can approve (and auto-delete the problem) or dismiss.
- **Real-time Notifications**: Room-scoped 1:1 report threads over WebSocket for battle participants to signal issues to the room moderator.
```

**Section: Authentication API Reference** — Add row:
```markdown
| `POST` | `/api/admin/reports` | File a problem report (category + detail) |
```

### 3.2 About.tsx Updates
**File:** `src/pages/About.tsx`

Add a new item to the `GROUPS` array under "Problems and grading":
```typescript
"Problem reports: flag issues with a specific problem (wrong test case, unclear question, system error) and track them through the admin review queue.",
```

Or add a new group:
```typescript
{
    title: "Problem reporting",
    items: [
        "Flag issues with a specific problem through the Report button in the terminal header.",
        "Four categories (wrong test case, unclear question, system error, other) with category-specific guidance.",
        "Admins review reports in a dedicated queue with status tracking (Flagged → Dismissed/Approved).",
        "In-room reports go to the room moderator over WebSocket for fast resolution.",
    ],
},
```

### Checklist
- [ ] Add Problem Report section to README "WHAT HAS BEEN IMPLEMENTED"
- [ ] Add `/api/admin/reports` to API reference table
- [ ] Add reporting to About.tsx feature groups
- [ ] Update `verified` count if new problems were added
- [ ] Run spell-check on documentation changes

---

## 4. Data and Database Maintenance

### 4.1 Statistics & Metrics for Reported Problems

**Current state:**
- `AdminDashboard.tsx:103-109` shows "Open Reports" count (filtered by `status === 'FLAGGED'`)
- `AdminReports.tsx` shows a table with `reports.slice(0, visibleCount)` (cap at 100)
- No aggregated statistics endpoint exists

**Required updates:**

#### 4.1.1 Add `/api/admin/reports/stats` endpoint
File: `server/src/controllers/admin.ts`

```typescript
export const getReportStats = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const [total, open, approved, dismissed, byCategory] = await Promise.all([
    db.questionReport.count(),
    db.questionReport.count({ where: { status: 'FLAGGED' } }),
    db.questionReport.count({ where: { status: 'APPROVED' } }),
    db.questionReport.count({ where: { status: 'DISMISSED' } }),
    db.questionReport.groupBy({
      by: ['reason'],
      where: { status: 'FLAGGED' },
      _count: { _all: true },
    }),
  ]);

  return res.json({
    stats: {
      total, open, approved, dismissed,
      byCategory: byCategory.map(b => ({ category: b.reason, count: b._count._all })),
    },
  });
};
```

File: `server/src/routes/admin.ts`
```typescript
router.get("/reports/stats", getReportStats);
```

#### 4.1.2 Wire stats into AdminDashboard
File: `src/pages/admin/AdminDashboard.tsx`

Add a `useReportStats` query and a `StatCard` for "Report Resolution Rate" and "Category Breakdown".

#### 4.1.3 Auto-invalidate cache on report filing
File: `src/pages/Terminal.tsx` — after `ProblemReport` submits successfully, the cache doesn't need invalidation (reports don't affect problem payloads). But the admin dashboard's `reportsData` React Query cache should be invalidated. File this in the client-side mutation hooks.

### Checklist
- [ ] Add `getReportStats` controller method
- [ ] Add `GET /admin/reports/stats` route
- [ ] Add `useReportStats` hook to hooks/useAdmin.ts
- [ ] Wire stats into AdminDashboard StatCards
- [ ] Ensure report filing invalidates admin reports cache
- [ ] Add `detail` column to the `AdminReport` interface

### 4.2 Persist `detail` Field

**Current state:**
- `ProblemReport.tsx:57` sends `detail` in the POST body
- `createQuestionReport` in `server/src/controllers/admin.ts:150` extracts `detail` but **never stores it** — the `QuestionReport` model (schema.prisma:347-358) has no `detail` column

**Schema change required:**

```prisma
model QuestionReport {
  id         String       @id @default(uuid())
  questionId String
  reportedBy String
  reporter   User         @relation("ReportsFiled", fields: [reportedBy], references: [id])
  reason     String       @db.Text
  detail     String?      @db.Text    // NEW: the reporter's free-text description
  status     ReportStatus @default(FLAGGED)
  category   ReportCategory @default(OTHER) // NEW: structured category enum
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@index([questionId, status])
}

enum ReportCategory {
  QUESTION
  TESTCASE
  SYSTEM
  OTHER
}
```

**Migration (Neon):**
```sql
-- Add columns
ALTER TABLE "QuestionReport" ADD COLUMN "detail" TEXT;
ALTER TABLE "QuestionReport" ADD COLUMN "category" TEXT DEFAULT 'OTHER';
ALTER TABLE "QuestionReport" ADD COLUMN "resolvedAt" TIMESTAMP;

-- Backfill category from existing reason values
UPDATE "QuestionReport" SET "category" = 
  CASE 
    WHEN LOWER(reason) LIKE '%test%' THEN 'TESTCASE'
    WHEN LOWER(reason) LIKE '%system%' OR LOWER(reason) LIKE '%error%' THEN 'SYSTEM'
    WHEN LOWER(reason) LIKE '%question%' THEN 'QUESTION'
    ELSE 'OTHER'
  END;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS "QuestionReport_category_status" ON "QuestionReport"("category", "status");
```

**Backend changes:**
1. `createQuestionReport` — store `detail` and `category` (mapped from `reason`)
2. `listReports` — include `detail` and `category` in response
3. `actOnReport` — optionally set `resolvedAt` on DISMISSED/APPROVED

**Frontend changes:**
1. `ProblemReport.tsx` — send `category` (uppercase) instead of `reason` (lowercase)
2. `AdminReports.tsx` — add columns for Category and Detail
3. `useAdmin.ts` — add `category` and `detail` to `AdminReport` interface

### Checklist
- [ ] Add `detail`, `category`, `resolvedAt` to QuestionReport model in schema.prisma
- [ ] Run `prisma db push` or `prisma migrate dev` for Neon
- [ ] Backfill existing reports' category from reason text
- [ ] Update `createQuestionReport` to store detail + category
- [ ] Update `listReports` to return detail + category
- [ ] Update `actOnReport` to set `resolvedAt`
- [ ] Update `AdminReport` TypeScript interface
- [ ] Update `AdminReports.tsx` table columns
- [ ] Update `ProblemReport.tsx` to send category enum + detail always

### 4.3 Neon Database Schema — Categories ↔ Data Structures

**Current state:**
- The `Problem` table has a `data_structure` column added via raw SQL in `server/prisma/updateCategories.ts` — it's NOT in the Prisma schema
- `data_structure` stores lowercase strings like `"array"`, `"linked list"`, `"tree"`, etc.
- The `DsCategory` type in `server/src/scripts/problemBank/types.ts` defines the canonical list: `'Arrays'`, `'Stack'`, `'Queue'`, `'Linked List'`, etc.

**Schema change required:**

Add `data_structure` to the Prisma schema's `Problem` model and align the values:

```prisma
model Problem {
  id                 String     @id @default(uuid())
  name               String
  problem_number     Int?        @unique
  github_oid         String?     @unique
  problem_definition String     @db.Text
  problem_hints      String[]
  difficulty_level   Level
  data_structure     String?    @db.Text  // NEW: e.g. "Arrays", "Dynamic Programming"
  // ... rest unchanged
}
```

**Neon migration SQL:**
```sql
-- Add the column if it doesn't exist (idempotent)
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "data_structure" TEXT;

-- Normalize existing values to match DsCategory enum (title case)
UPDATE "Problem" SET "data_structure" = 
  CASE 
    WHEN "data_structure" = 'array' THEN 'Arrays'
    WHEN "data_structure" = 'linked list' THEN 'Linked List'
    WHEN "data_structure" = 'dynamic prog' THEN 'Dynamic Programming'
    WHEN "data_structure" = 'searching' THEN 'Searching'
    WHEN "data_structure" = 'interval problems' THEN 'Interval Problems'
    WHEN "data_structure" = 'recursion' THEN 'Recursion'
    ELSE INITCAP("data_structure")
  END
WHERE "data_structure" IS NOT NULL;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS "Problem_data_structure_idx" ON "Problem"("data_structure");

-- Update the schema.prisma to include the field
-- (ensures client regenerates with the field)
```

**Backend changes:**
1. Update `Problem` model in `schema.prisma` to include `data_structure`
2. Update `withDisplayProblemName` utility to include `data_structure` in the response
3. Ensure `getSystemProblems` and `getProblemById` select/include `data_structure`
4. Create a migration script for existing NeDB data

**Frontend changes:**
1. Add `data_structure` to `PracticeProblem` interface
2. Display data structure category in problem list/card UI
3. Use `data_structure` for filtering in the sidebar

### Checklist
- [ ] Add `data_structure` field to `Problem` model in schema.prisma
- [ ] Create Neon migration SQL script (in `server/prisma/migrations/`)
- [ ] Run migration: `npx prisma db push` or `npx prisma migrate dev`
- [ ] Run `updateCategories.ts` to backfill missing values
- [ ] Verify `data_structure` is included in API responses
- [ ] Verify `DsCategory` enum matches DB values
- [ ] Add `data_structure` to `withDisplayProblemName` utility
- [ ] Ensure `is_public` flag is consistent with `data_structure` for all 209 problems

---

## 5. Verification Matrix

| Component | Test Command | Pass Criteria |
|---|---|---|
| Frontend type check | `npx tsc --noEmit` | 0 errors |
| Frontend tests | `npx vitest run src/features/terminal` | All pass |
| Server type check | `cd server && npx tsc --noEmit` | 0 errors |
| Server tests | `cd server && npx cross-env NODE_OPTIONS="--experimental-vm-modules" NODE_MODE=test npx jest` | All pass |
| Schema migration | `npx prisma studio` | `data_structure` column visible on Problem model |
| DB constraint | `SELECT COUNT(*) FROM "Problem" WHERE "data_structure" IS NULL` | 0 (all problems categorized) |
| API smoke test | `GET /api/v1/problems/system?page=1&limit=1` | Response includes `data_structure` |
| Report filing | `POST /api/v1/admin/reports` | 200 with stored `detail` + `category` |
| Report stats | `GET /api/v1/admin/reports/stats` | Returns aggregate counts |
