import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { BASE_RATING, computeRatingFromHistory, getTierForRating, outcomeFromStatus } from "../utils/elo.js";

/**
 * Leaderboard controller (ROADMAP §1 — Global Leaderboards).
 * Ratings are derived on the fly from UserPersonalPerformance rows
 * (no schema migration): rating = fold of finished matches.
 */
class Leaderboard {
  private ratingForPerformances = (perfs: { status: string; timeTakenMs?: number | null }[]): number => {
    return computeRatingFromHistory(
      perfs.map((p) => ({ status: p.status, timeTakenMs: p.timeTakenMs ?? null })),
    );
  };

  // GET /api/leaderboard — top users sorted by derived ELO rating
  getGlobalLeaderboard = async (req: AuthRequest, res: Response) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "25"), 10) || 25, 1), 100);

      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          performances: {
            select: { status: true, timeTakenMs: true, score: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      const ranked = (users as any[])
        .map((u) => {
          const perfs = u.performances ?? [];
          const finished = perfs.filter((p: any) => outcomeFromStatus(p.status) !== null);
          const rating = finished.length > 0 ? this.ratingForPerformances(finished) : BASE_RATING;
          const wins = finished.filter((p: any) => outcomeFromStatus(p.status) === "WIN").length;
          return {
            userId: u.id,
            username: u.username,
            avatarUrl: u.avatarUrl ?? null,
            rating,
            tier: getTierForRating(rating),
            totalMatches: finished.length,
            wins,
            losses: finished.length - wins,
            winRate: finished.length > 0 ? Math.round((wins / finished.length) * 100) : 0,
          };
        })
        .sort((a, b) => b.rating - a.rating || b.winRate - a.winRate)
        .slice(0, limit)
        .map((entry, idx) => ({ rank: idx + 1, ...entry }));

      return res.status(200).json({ status: "success", leaderboard: ranked });
    } catch (error) {
      console.error("Leaderboard error:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch leaderboard" });
    }
  };

  // GET /api/leaderboard/me — current user's derived rating + rank
  getMyRating = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId as string;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          performances: {
            select: { status: true, timeTakenMs: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!user) return res.status(404).json({ status: "error", message: "User not found" });

      const finished = ((user as any).performances ?? []).filter(
        (p: any) => outcomeFromStatus(p.status) !== null,
      );
      const wins = finished.filter((p: any) => outcomeFromStatus(p.status) === "WIN").length;
      const rating = finished.length > 0 ? this.ratingForPerformances(finished) : BASE_RATING;

      return res.status(200).json({
        status: "success",
        rating: {
          userId: (user as any).id,
          rating,
          tier: getTierForRating(rating),
          totalMatches: finished.length,
          wins,
          losses: finished.length - wins,
          winRate: finished.length > 0 ? Math.round((wins / finished.length) * 100) : 0,
        },
      });
    } catch (error) {
      console.error("My-rating error:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch rating" });
    }
  };
}

export const leaderboardController = new Leaderboard();
