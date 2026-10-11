import { useQuery } from "@tanstack/react-query";
import { api } from "../config/api";

export interface EventParticipantAnalytics {
  userId: string;
  username: string;
  avatarUrl: string | null;
  status: string;
  score: number;
  questionsSolved: number;
  timeTakenMs: number | null;
  submissionCount: number;
  bestRuntimeMs: number | null;
}

export interface EventRuntimeStats {
  best: number;
  avg: number;
  worst: number;
}

export interface EventAnalyticsSummary {
  totalParticipants: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  passRate: number;
}

export interface EventAnalyticsData {
  eventId: string;
  roomCode: string | null;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  totalTimeLimitMs: number | null;
  isHost: boolean;
  summary: EventAnalyticsSummary;
  runtimeStats: EventRuntimeStats;
  perParticipant: EventParticipantAnalytics[];
}

export function useEventAnalytics(eventId: string | undefined, enabled = true) {
  return useQuery<EventAnalyticsData>({
    queryKey: ["analytics", "event", eventId],
    enabled: Boolean(eventId) && enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await api.get(`/rooms/${eventId}/analytics`);
      return res.data.analytics as EventAnalyticsData;
    },
  });
}
