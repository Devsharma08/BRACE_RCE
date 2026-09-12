# Implementation Plan

## Overview
Restore unused Friends/User-Search/DM/Challenge flows, replace alerts with toasts, build a workable 3-day Notification Center queue, and fix streak plus monthly activity so solo practice SUBMITs count alongside battle submissions.

## Types
- Prisma enums NotificationType (FRIEND_REQUEST, FRIEND_ACCEPT, DIRECT_MESSAGE, CHALLENGE_RECEIVED, CHALLENGE_RESULT, MATCH_RESULT, SYSTEM, WEEKLY_ANALYSIS, EVENT_REPORT, EVENT_RESULT) and NotificationStatus (UNREAD, READ, ARCHIVED).
- Prisma model Notification: id uuid, userId FK User cascade, type, title, body Text, data Json nullable, status default UNREAD, createdAt default now, readAt nullable; indexes (userId,status,createdAt) and (createdAt). Add User.notifications relation.
- server/src/types/notifications.ts: CreateNotificationInput {userId,type,title,body,data?}, ListQuery {unreadOnly?,type?,cursor?,take?}.
- Frontend hooks/useNotifications.ts: NotificationItem {id,type,title,body,data?,status,createdAt,readAt?}.
- Toast types: ToastKind success|error|info; ToastOptions {durationMs?}.
- Challenge types: ChallengeMode RANDOM|CUSTOM; ChallengePayload {targetUserId,mode,difficulty?,problemId?}.
- Analytics: ActivityPoint {date YYYY-MM-DD,count}; streak = consecutive active days ending today or yesterday over 365-day window.

## Files
- New backend: server/src/types/notifications.ts, server/src/controllers/notifications.ts, server/src/routes/notifications.ts (GET /, GET /unread-count, PATCH /:id/read, PATCH /read-all, DELETE /:id), server/src/services/notificationService.ts (create, broadcast via socket, prune 3-day, weekly analysis builder, event report builder), server/src/scripts/pruneNotifications.ts.
- New frontend: src/components/ui/Toast.tsx plus Toaster mount, src/hooks/useNotifications.ts, src/components/features/NotificationCenter.tsx (tabs All/Unread/Friends/Messages/System/Reports), src/components/features/ChallengeModal.tsx (RANDOM difficulty select vs CUSTOM problem picker from GET /problems/system and GET /problems/custom), optional src/hooks/useChallenge.ts.
- Modify backend: server/prisma/schema.prisma (Notification model), server/src/app.ts (mount /api/notifications), server/src/controllers/friends.ts (searchUsers return users alias plus take 20, side-effect notifications on request/accept/reject), server/src/controllers/analytics.ts (activity/streak/monthly rewrite), server/src/services/codeExecution.ts (fix submissionTimes push with ISO string, review local- guard, invalidate analytics cache), server/src/services/socket.ts (persist plus emit notification:new on DM/challenge/match/lobby events, carry mode/difficulty/problemId), server/src/services/submissionEvaluator.ts (battle save also upserts UserProblemProgress), server/src/index.ts (daily prune interval plus weekly cron trigger).
- Modify frontend: src/Root.tsx (mount Toaster), src/components/layout/Header.tsx + src/pages/Dashboard.tsx (bell placeholder currently navigates to /profile) + src/components/layout/DashboardSidebar.tsx (add Friends /friends link), src/components/features/FriendDashboard.tsx (replace 4 alerts, open ChallengeModal instead of bare sendChallenge, presence via user_online_status), src/context/SocketContext.tsx (replace 3 alerts lobby_error/lobby_ended/timeout with toast, extend sendChallenge opts and incomingChallenge type, listen notification:new), src/components/features/GlobalModals.tsx (show mode/difficulty/problem name).
- Alert sweep (~32 hits): SocketContext, FriendDashboard, EditorToolbar.tsx, FileExplorer.tsx, Battle.tsx, CreateRoom.tsx, Lobby.tsx, AdminFeedback/Questions/Reports/Settings/Users.
- Delete/move: none. Update public/todo.md checkboxes after.

## Functions
- New service server/src/services/notificationService.ts: createNotification(input), notifyFriendRequest(receiverId,sender), notifyDirectMessage(receiverId,senderId,preview), notifyChallenge(targetId,payload), notifyMatchResult(userId,eventId), notifySystem(userId,title,body), buildWeeklyAnalysis(userId), buildEventReport(eventId), pruneNotificationsOlderThan(days=3).
- New controller server/src/controllers/notifications.ts class Notifications: listNotifications, getUnreadCount, markRead, markAllRead, deleteNotification.
- New script server/src/scripts/pruneNotifications.ts: runPrune().
- New frontend: Toast.tsx exports toast.success/error/info plus Toaster component; useNotifications.ts exports useNotifications/useUnreadCount/useMarkRead/useMarkAllRead; NotificationCenter.tsx exports NotificationCenter and NotificationItemRow; ChallengeModal.tsx exports ChallengeModal({friend,open,onClose}) plus helpers fetchRandomProblem(difficulty) and fetchCustomProblems and handleSendChallenge.
- Modified friends.ts searchUsers: return {users} keep {user} alias, add take 20 orderBy username; sendFriendRequest/acceptFriendRequest/rejectFriendRequest: add notification side-effects; getMessages: add cursor/take pagination.
- Modified analytics.ts getUserAnalytics sections 3/7/8: new helpers buildActivityDayMap(progressRecords,performances) unioning submissionTimes plus solvedAt plus performances.createdAt plus submissions.createdAt over 365 days with UTC YYYY-MM-DD keys; computeCurrentStreak(dayMap) starting today-or-yesterday then consecutive; solvesByMonth from same union.
- Modified codeExecution.ts executeCode: replace submissionTimes timeTaken?push with nowIso ISO string, keep attempts increment and solvedAt set on allPassed, never unset isSolved, add invalidateUserAnalyticsCache(userId); review githubOid local- guard for solo saves.
- Modified socket.ts handlers send_direct_message/send_challenge/accept_challenge/decline_challenge/battle_action/battle_finished/custom_match_started: persist Notification row plus io.to(targetSocket).emit(notification:new) alongside existing emits.
- Modified SocketContext sendChallenge(targetUserId,opts?) and incomingChallenge type extension; lobby_error/lobby_ended/timeout handlers switch alert to toast.
- Modified FriendDashboard handleBlockRequest/unblockUser/sendRequest/handleSearch: toast mapping; new openChallengeModal(friend).
- Removed: all alert() calls 1:1 to toast; no other deletions.

## Classes
- New class Notifications in server/src/controllers/notifications.ts (list, unreadCount, markRead, markAllRead, remove; export notificationsController). NotificationService as function module, not ORM class.
- Modified class Friends in server/src/controllers/friends.ts: add notification side-effects, compatible signatures.
- Modified class Analytics in server/src/controllers/analytics.ts: extract buildActivityDayMap and computeCurrentStreak helpers for testability.
- Modified SocketContext provider value: additive challengeOpts and notification:new passthrough; no breaking shape change.
- Removed classes: none.

## Dependencies
- Default Option A zero-dep custom Toast (Tailwind plus React context, matches cyber-arena style): no package.json change.
- Alternative Option B sonner v2: pnpm/npm add sonner, add Toaster theme dark position bottom-right in Root.tsx, update lockfile, check Vite compat. Needs user decision; plan defaults to A.
- Backend: no version changes; after schema edit run prisma generate plus prisma migrate dev --name add_notifications.
- Retention without cloud: deleteMany Notifications where createdAt less than now minus 3 days; DMs keep last-50 query plus optional prune flag PRUNE_DMS_3D.

## Testing
- Server Jest: extend friends.test.ts (search users key compat, mocked notification side-effect), new notifications.test.ts (list filter createdAt >=3d, unread count, mark read/all, delete), new notificationService.test.ts (create/prune/weekly builder), analytics streak/monthly tests (today active, yesterday active, gap breaks, solo-only counts, solvesByMonth includes practice), submissionEvaluator.test.ts (battle save upserts UserProblemProgress).
- Client Vitest: new NotificationCenter.test.tsx (tabs, mark-read, empty 3-day state), ChallengeModal.test.tsx (RANDOM/CUSTOM toggle, difficulty, problem pick, payload), Toast.test.tsx (no window.alert), update FriendDashboard tests (search plus modal open).
- Validation: server npx tsc --noEmit, client npx tsc -b, server npx jest --forceExit (baseline 19 suites 94 tests), client npx vitest run (baseline 9 files 34 tests), npm run build; manual QA search/request/bell/accept/DM/RANDOM EASY/CUSTOM/retention/streak/monthly.

## Implementation Order
1. Schema plus migration plus notifications router/service skeleton plus app.ts mount.
2. Retention prune plus interval/cron plus weekly-analysis and event-report builders with tests.
3. Friends backend: searchUsers fix plus notification side-effects plus getMessages pagination.
4. Socket realtime: extended challenge payload plus notification:new persistence/emits.
5. Analytics fix: activity/streak/monthly union plus codeExecution submissionTimes fix plus battle-to-progress upsert plus cache invalidation with Jest cover.
6. Toast foundation plus useNotifications hook plus NotificationCenter bell replacing Dashboard header placeholder.
7. Friends UI restore: /friends nav in Header/Sidebar, FriendDashboard fixes, ChallengeModal RANDOM-by-difficulty and CUSTOM picker, GlobalModals display.
8. Alert sweep across SocketContext, FriendDashboard, EditorToolbar, FileExplorer, Battle, CreateRoom, Lobby, Admin pages.
9. Polish plus verification: todo.md checkboxes, type-checks, tests, build, manual end-to-end loop, handoff.




