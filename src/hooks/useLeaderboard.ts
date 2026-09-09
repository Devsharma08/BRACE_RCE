import { useQuery } from "@tanstack/react-query";
import { api } from "../config/api";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  rating: number;
  tier: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface MyRating {
  userId: string;
  rating: number;
  tier: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

/** Global ELO leaderboard (ROADMAP §1). */
export function useLeaderboard(limit = 25, enabled = true) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", limit],
    enabled,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const res = await api.get("/leaderboard", { params: { limit } });
      return res.data.leaderboard as LeaderboardEntry[];
    },
  });
}

export function useMyRating(enabled = true) {
  return useQuery<MyRating>({
    queryKey: ["my-rating"],
    enabled,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const res = await api.get("/leaderboard/me");
      return res.data.rating as MyRating;
    },
  });
}

export const TIER_COLORS: Record<string, string> = {
  Bronze: "text-amber-600",
  Silver: "text-slate-300",
  Gold: "text-amber-400",
  Platinum: "text-cyan-300",
  "Cyber-Master": "text-fuchsia-400",
};
