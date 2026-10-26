import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../config/api";

// ─── Moderator Events Listing Types ──────────────────────────────────────────

export interface ModeratorEventHost {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ModeratorEventSummary {
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  passRate: number;
}

export interface ModeratorEventRuntimeStats {
  best: number;
  avg: number;
  worst: number;
}

export interface ModeratorEventListItem {
  id: string;
  roomCode: string;
  name: string | null;
  description: string | null;
  type: string;
  status: string;
  isPublic: boolean;
  isTemplate: boolean;
  host: ModeratorEventHost;
  maxUsers: number;
  totalTimeLimitMs: number | null;
  openedAt: string | null;
  closesAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  problemCount: number;
  summary: ModeratorEventSummary;
  runtimeStats: ModeratorEventRuntimeStats;
  blockedCount: number;
}

export interface ModeratorEventsResponse {
  status: string;
  events: ModeratorEventListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status: string | undefined;
    type: string | undefined;
    isPublic: boolean | undefined;
    hostId: string | undefined;
    search: string | undefined;
  };
}

export interface ModeratorEventsQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: "WAITING" | "IN_PROGRESS" | "FINISHED" | "EXPIRED";
  type?:
    "PUBLIC" | "PRIVATE" | "FRIENDS" | "ONE_VS_ONE" | "CUSTOM" | "TOURNAMENT";
  isPublic?: boolean;
  hostId?: string;
  search?: string;
}

// ─── Event Detail Analytics Types (moderator view) ───────────────────────────

export interface EventParticipantDetail {
  userId: string;
  username: string;
  avatarUrl: string | null;
  status: string;
  score: number;
  questionsSolved: number;
  timeTakenMs: number | null;
  submissionCount: number;
  bestRuntimeMs: number | null;
  submissions: {
    id: string;
    problemId: string;
    status: string;
    passedCase: number;
    totalCases: number;
    runtimeMs: number | null;
    memoryKb: number | null;
    language: string;
    attemptNumber: number;
    isBestSubmission: boolean;
    createdAt: string;
  }[];
}

export interface EventProblemDetail {
  id: string;
  name: string;
  problemNumber: number | null;
  difficultyLevel: string;
  attemptCount: number;
  solveCount: number;
  passRate: number;
  avgAttempts: number;
}

export interface EventTimelineEntry {
  id: string;
  type:
    | "started"
    | "finished"
    | "blocked"
    | "unblocked"
    | "expired"
    | "password_set"
    | "password_removed";
  actorId: string | null;
  actorUsername: string | null;
  targetId: string | null;
  targetUsername: string | null;
  reason: string | null;
  createdAt: string;
}

export interface EventAnalyticsDetail {
  eventId: string;
  roomCode: string;
  name: string | null;
  description: string | null;
  type: string;
  status: string;
  isPublic: boolean;
  isTemplate: boolean;
  host: ModeratorEventHost;
  maxUsers: number;
  totalTimeLimitMs: number | null;
  openedAt: string | null;
  closesAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  summary: {
    totalParticipants: number;
    passedCount: number;
    failedCount: number;
    pendingCount: number;
    passRate: number;
  };
  runtimeStats: ModeratorEventRuntimeStats;
  perParticipant: EventParticipantDetail[];
  perProblem: EventProblemDetail[];
  timeline: EventTimelineEntry[];
  blockedUsers: {
    id: string;
    blockedUserId: string;
    blockedUserUsername: string;
    blockedById: string;
    blockedByUsername: string;
    reason: string | null;
    createdAt: string;
  }[];
}

// ─── Hook: useModeratorEvents ────────────────────────────────────────────────

export function useModeratorEvents(query: ModeratorEventsQuery = {}) {
  return useQuery<ModeratorEventsResponse>({
    queryKey: ["moderator-events", query],
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        ...(query.status && { status: query.status }),
        ...(query.type && { type: query.type }),
        ...(query.isPublic !== undefined && { isPublic: query.isPublic }),
        ...(query.hostId && { hostId: query.hostId }),
        ...(query.search && { search: query.search }),
      };
      const res = await api.get("/rooms/moderator/events", { params });
      return res.data as ModeratorEventsResponse;
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// ─── Hook: useEventAnalyticsDetail ───────────────────────────────────────────

export function useEventAnalyticsDetail(eventId: string, enabled = true) {
  return useQuery<EventAnalyticsDetail>({
    queryKey: ["event-analytics-detail", eventId],
    enabled: enabled && Boolean(eventId),
    queryFn: async () => {
      const res = await api.get(`/rooms/${eventId}/analytics`);
      return res.data.analytics as EventAnalyticsDetail;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ─── Invalidation helper ─────────────────────────────────────────────────────

export function invalidateModeratorEvents(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["moderator-events"] });
}

export function invalidateEventAnalytics(
  queryClient: QueryClient,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["event-analytics-detail", eventId],
  });
}
