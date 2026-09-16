import { useQuery } from "@tanstack/react-query";
import { api } from "../config/api";
import { useSocketInvalidation } from "./useSocketInvalidation";

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

/**
 * Keep ratings live: when a battle finishes the server drops its cached
 * leaderboard and emits `leaderboard:invalidate`.
 *
 * `invalidateQueries` (never `setQueryData`) is the right tool here — the new
 * rating is a server-side fold over match history, so the client cannot derive
 * the fresh rows, it can only ask for them again.
 */
function useLeaderboardSocketSync() {
  // Socket event is the authoritative freshness signal; staleTime below is
  // only a fallback ceiling for mounts that happen with no battle in between.
  useSocketInvalidation("leaderboard:invalidate", [["leaderboard"], ["my-rating"]]);
}

/** Global ELO leaderboard (ROADMAP §1). */
export function useLeaderboard(limit = 25, enabled = true) {
  useLeaderboardSocketSync();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", limit],
    enabled,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const res = await api.get("/leaderboard", { params: { limit } });
      return res.data.leaderboard as LeaderboardEntry[];
    },
  });
}

export function useMyRating(enabled = true) {
  useLeaderboardSocketSync();

  return useQuery<MyRating>({
    queryKey: ["my-rating"],
    enabled,
    staleTime: 1000 * 60 * 10,
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
