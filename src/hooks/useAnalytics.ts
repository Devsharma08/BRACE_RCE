import { useQuery } from "@tanstack/react-query";
import { api } from "../config/api";

export interface AnalyticsSummary {
  totalSolved: number;
  totalMatches: number;
  wins: number;
  winRate: number;
  avgSolveTimeMs: number;
  totalAttempts: number;
  currentStreak: number;
  completionRate: number;
  growthRate: number;
}

export interface DifficultyBreakdown {
  EASY: number;
  MEDIUM: number;
  HARD: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface BattleTrendPoint {
  index: number;
  result: "WIN" | "LOSS" | "SURRENDER";
  score: number;
  questionsSolved: number;
}

export interface LanguageUsage {
  language: string;
  count: number;
}

export interface RuntimeStats {
  best: number;
  avg: number;
  worst: number;
}

export interface SolveByMonth {
  month: string;
  count: number;
}

export interface WeakArea {
  difficulty: string;
  solved: number;
  attempted: number;
  successRate: number;
}

export interface UserAnalytics {
  summary: AnalyticsSummary;
  difficultyBreakdown: DifficultyBreakdown;
  activityData: ActivityPoint[];
  battleTrend: BattleTrendPoint[];
  languageUsage: LanguageUsage[];
  runtimeStats: RuntimeStats;
  solvesByMonth: SolveByMonth[];
  weakAreas: WeakArea[];
}

export function useAnalytics(enabled = true) {
  return useQuery<UserAnalytics>({
    queryKey: ["user-analytics"],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const res = await api.get("/analytics");
      return res.data.analytics as UserAnalytics;
    },
  });
}
