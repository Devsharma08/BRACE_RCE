# Implementation Plan

## Overview
Fix multiple UI/UX bugs and optimize the BRACE_RCE dashboard layout: resolve top padding issues for page content below the fixed header, prevent unnecessary full-page re-renders when switching sidebar tabs, fix notification API 500 errors, correct the FriendDashboard chat rendering bug on non-friends tabs, and restore proper online/offline presence indicators.

## Types
- No new types required. Existing Friend, Message, FriendRequest interfaces in FriendDashboard.tsx are sufficient.
- Socket event `user_online_status` payload: `{ userId: string; status: "ONLINE" | "OFFLINE" }`.

## Files

### 1. src/components/layout/DashboardSidebar.tsx
**Purpose:** The sidebar collapse feature still exists but the user reported it was removed — likely a visual/UX issue where the toggle is hard to see or the collapsed state doesn't properly shift content.

**Changes:**
- Keep the collapse toggle but make it more visible: increase button size, add hover tooltip, ensure the chevron icons are clearly visible
- The collapsed state already exists — verify the w-[60px] vs w-[245px] transition works with the main content ml-[60px] / ml-[245px] margins
- Add aria-label to the toggle button for accessibility
- No structural changes needed — the feature is intact

### 2. src/pages/Dashboard.tsx
**Purpose:** Add proper top padding to prevent content from hiding behind the fixed header.

**Changes:**
- Already has pt-16 — verify it's sufficient (header is h-[52px], so pt-16 = 64px should be enough)
- If still insufficient, increase to pt-20 or pt-[72px]
- The overflow-x-hidden is correct

### 3. src/pages/Lobby.tsx
**Purpose:** Same top padding fix as Dashboard.

**Changes:**
- Already has pt-16 — verify and adjust if needed

### 4. src/pages/Profile.tsx
**Purpose:** Same top padding fix as Dashboard.

**Changes:**
- Currently missing pt-16 — add it to the <main> element
- Change p-4 md:p-8 to pt-16 p-4 md:p-8

### 5. src/components/features/FriendDashboard.tsx
**Purpose:** Fix chat auto-rendering on non-friends tabs (SEARCH, REQUESTS, BLOCK).

**Bug:** Line 553: `{leftPaneMode === "FRIENDS" && !activeTab ? (<empty>) : (<chat>)}` — when leftPaneMode is SEARCH/REQUESTS/BLOCK, the right pane shows the chat UI even though no friend is selected.

**Changes:**
- Change the right pane condition to only show chat when activeTab is set AND leftPaneMode === "FRIENDS"
- When on SEARCH/REQUESTS/BLOCK tabs and no friend is selected, show the empty state (same as FRIENDS empty state)
- Condition should be: `!activeTab || leftPaneMode !== "FRIENDS"` → show empty state
- Only show chat when: `activeTab && leftPaneMode === "FRIENDS"`

**Online/Offline Status Fix:**
- The socket listener for user_online_status is correct (line 135)
- The issue is likely that the server emits the event but the client doesn't receive it properly
- Add a useEffect on mount to request current online status from the server via a new socket event get_online_status
- Alternatively, fetch initial online friends list via API on component mount
- Add socket.emit("get_presence") on connect and handle presence_snapshot response

### 6. src/components/features/NotificationCenter.tsx
**Purpose:** Fix 500 errors on notification API calls.

**Changes:**
- Add error boundary around notification queries
- Add retry logic with useQuery retry: 2 option
- Add fallback UI when notifications fail to load instead of showing nothing
- Check that the useNotifications and useUnreadCount hooks have proper error handling

### 7. src/hooks/useNotifications.ts
**Purpose:** Add error handling and retry logic for notification API calls.

**Changes:**
- Add retry: 2 and retryDelay: 1000 to both useNotifications and useUnreadCount queries
- Add onError callback to log errors gracefully
- Return empty array / zero count on error instead of undefined

### 8. src/context/SocketContext.tsx
**Purpose:** Fix online status and add presence snapshot request.

**Changes:**
- Add requestPresence() method that emits get_presence socket event
- Handle presence_snapshot event to populate initial online users list
- Ensure user_online_status events are properly forwarded

### 9. src/Root.tsx (or equivalent layout)
**Purpose:** Optimize rendering to prevent full page reloads when switching sidebar tabs.

**Changes:**
- The current architecture uses separate routes (/dashboard, /lobby, /profile, /friends) which causes full page re-renders
- To prevent this, implement a layout-based approach where the sidebar persists and only the main content area updates using React Router's <Outlet />
- Create a MainLayout component that includes the sidebar and renders child routes via <Outlet />
- Update routes to use this layout for dashboard, lobby, profile, and friends pages

## Functions

### Modified: FriendDashboard.tsx
- handleSwitchPane — already clears nothing; should also clear activeTab when switching away from FRIENDS mode to prevent chat from showing
- Add useEffect on mount to request presence snapshot

### Modified: useNotifications.ts
- Add error handling to both hooks
- Add retry configuration

### Modified: SocketContext.tsx
- Add requestPresence method
- Add onPresenceSnapshot handler

## Classes
No class modifications required.

## Dependencies
No new dependencies required.

## Testing
- Manual QA: verify all pages have proper top padding below the fixed header
- Manual QA: click sidebar links and confirm only content area updates (no full page flash)
- Manual QA: open FriendDashboard on SEARCH tab — right pane should show empty state, not chat
- Manual QA: check browser console for notification 500 errors
- Manual QA: verify online/offline indicators update in real-time
- Run npx tsc --noEmit to verify no type errors
- Run npm run build to verify production build succeeds

## Implementation Order
1. Fix top padding on Profile.tsx (add pt-16)
2. Fix FriendDashboard chat rendering bug (right pane should show empty state on non-friends tabs)
3. Fix FriendDashboard online status (add presence snapshot request on mount)
4. Fix notification 500 errors (add error handling and retry logic)
5. Verify sidebar collapse feature is working and visible
6. Implement layout-based routing to prevent full page re-renders
7. Final verification: type-check, build, manual QA
