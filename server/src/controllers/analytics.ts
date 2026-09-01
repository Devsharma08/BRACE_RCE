import type { AuthRequest } from "../middleware/authentication";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";

// ── In-memory cache for analytics (5-minute TTL) ──────────────────────────────
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const analyticsCache = new Map<string, CacheEntry<any>>();

class Analytics {
  private getCacheKey(userId: string): string {
    return `analytics:${userId}`;
  }

  private getCachedAnalytics(userId: string) {
    const key = this.getCacheKey(userId);
    const entry = analyticsCache.get(key);

    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }

    if (entry) analyticsCache.delete(key);
    return null;
  }

  private setCachedAnalytics(userId: string, data: any) {
    const key = this.getCacheKey(userId);
    analyticsCache.set(key, { data, timestamp: Date.now() });
  }

  async getUserAnalytics(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;

      // Check cache first
      const cached = this.getCachedAnalytics(userId);
      if (cached) {
        return res.status(200).json({
          status: "success",
          analytics: cached,
          cached: true,
        });
      }

      // Fetch data in parallel (optimized queries)
      const [progressRecords, performances] = await Promise.all([
        // Practice progress with related problem info (sorted for streak calculation)
        prisma.userProblemProgress.findMany({
          where: { userId },
          include: {
            problem: { select: { difficulty_level: true, name: true, id: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        // Battle performances with submissions (sorted for trend analysis)
        prisma.userPersonalPerformance.findMany({
          where: { userId },
          include: {
            submissions: {
              select: {
                language: true,
                runtimeMs: true,
                memoryKb: true,
                passedCase: true,
                totalCases: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      // ── 1. SUMMARY ────────────────────────────────────────────────────
      const totalSolved = progressRecords.filter((p) => p.isSolved).length;
      const totalMatches = performances.length;
      const wins = performances.filter(
        (p) => p.status === "WON" || p.status === "PASSED"
      ).length;
      const winRate =
        totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      const totalTimeMs = performances.reduce(
        (acc, p) => acc + (p.timeTakenMs || 0),
        0
      );
      const avgSolveTimeMs =
        totalMatches > 0 ? Math.round(totalTimeMs / totalMatches) : 0;
      const totalAttempts = progressRecords.reduce(
        (acc, p) => acc + (p.attempts || 0),
        0
      );

      // ── 2. DIFFICULTY BREAKDOWN ────────────────────────────────────────
      const difficultyBreakdown = { EASY: 0, MEDIUM: 0, HARD: 0 };
      progressRecords
        .filter((p) => p.isSolved)
        .forEach((p) => {
          const level = p.problem.difficulty_level as "EASY" | "MEDIUM" | "HARD";
          if (level in difficultyBreakdown) difficultyBreakdown[level]++;
        });

      // ── 3. ACTIVITY HEATMAP (current month only) ──────────────────────
      const now2 = new Date();
      const year = now2.getFullYear();
      const month = now2.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dayMap = new Map<string, number>();

      // Seed every day of current month with 0
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        dayMap.set(dateStr, 0);
      }

      // Count submission timestamps from practice
      progressRecords.forEach((p) => {
        (p.submissionTimes || []).forEach((ts) => {
          const day = new Date(ts).toISOString().slice(0, 10);
          if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });
      });

      // Count battle performances
      performances.forEach((p) => {
        const day = new Date(p.createdAt).toISOString().slice(0, 10);
        if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });

      const activityData = Array.from(dayMap.entries()).map(([date, count]) => ({
        date,
        count,
      }));

      // ── 4. BATTLE TREND (last 20 battles) ─────────────────────────────
      const battleTrend = performances.slice(-20).map((p, idx) => ({
        index: idx + 1,
        result:
          p.status === "WON" || p.status === "PASSED"
            ? "WIN"
            : p.status === "SURRENDER"
            ? "SURRENDER"
            : "LOSS",
        score: p.score,
        questionsSolved: p.questionsSolved,
      }));

      // ── 5. LANGUAGE USAGE ─────────────────────────────────────────────
      const langMap = new Map<string, number>();
      performances.forEach((perf) => {
        perf.submissions.forEach((sub) => {
          const lang = sub.language || "unknown";
          langMap.set(lang, (langMap.get(lang) || 0) + 1);
        });
      });
      // Also factor in practice language preference
      progressRecords.forEach((p) => {
        if (p.lastLanguage) {
          langMap.set(
            p.lastLanguage,
            (langMap.get(p.lastLanguage) || 0) + (p.attempts || 0)
          );
        }
      });
      const languageUsage = Array.from(langMap.entries())
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count);

      // ── 6. RUNTIME STATS ──────────────────────────────────────────────
      const allRuntimes = performances
        .flatMap((p) => p.submissions)
        .filter((s) => s.runtimeMs !== null && s.runtimeMs !== undefined)
        .map((s) => s.runtimeMs as number);

      const runtimeStats =
        allRuntimes.length > 0
          ? {
              best: Math.min(...allRuntimes),
              avg: Math.round(
                allRuntimes.reduce((a, b) => a + b, 0) / allRuntimes.length
              ),
              worst: Math.max(...allRuntimes),
            }
          : { best: 0, avg: 0, worst: 0 };

      // ── 7. SOLVE VELOCITY (cumulative solves by month) ─────────────────
      const monthMap = new Map<string, number>();
      progressRecords
        .filter((p) => p.isSolved && p.solvedAt)
        .forEach((p) => {
          const month = new Date(p.solvedAt!).toISOString().slice(0, 7); // "2025-01"
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
        });
      const solvesByMonth = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      // ── 8. CURRENT STREAK ───────────────────────────────────────────────
      let currentStreak = 0;
      let lastActive = new Date();
      for (let d = 1; d <= 365; d++) {
        const checkDate = new Date(lastActive);
        checkDate.setDate(checkDate.getDate() - d);
        const dateStr = checkDate.toISOString().slice(0, 10);

        const hasActivity = activityData.some((a) => a.date === dateStr && a.count > 0);
        if (hasActivity) {
          currentStreak++;
        } else if (currentStreak > 0) {
          break;
        }
      }

      // ── 9. WEAK AREAS (difficulty levels with lowest solve rate) ────────
      const difficultyStats = { EASY: { count: 0, solved: 0 }, MEDIUM: { count: 0, solved: 0 }, HARD: { count: 0, solved: 0 } };
      progressRecords.forEach((p) => {
        const level = p.problem.difficulty_level as "EASY" | "MEDIUM" | "HARD";
        if (level in difficultyStats) {
          difficultyStats[level].count++;
          if (p.isSolved) difficultyStats[level].solved++;
        }
      });

      const weakAreas = Object.entries(difficultyStats)
        .map(([difficulty, stats]) => ({
          difficulty,
          solved: stats.solved,
          attempted: stats.count,
          successRate:
            stats.count > 0 ? Math.round((stats.solved / stats.count) * 100) : 0,
        }))
        .sort((a, b) => a.successRate - b.successRate);

      // ── 10. GROWTH RATE (solves this month vs last month) ────────────────
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const lastMonth = (() => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })();

      const solvesThisMonth =
        solvesByMonth.find((s) => s.month === thisMonth)?.count || 0;
      const solvesLastMonth =
        solvesByMonth.find((s) => s.month === lastMonth)?.count || 1;

      const growthRate =
        solvesLastMonth > 0
          ? Math.round(((solvesThisMonth - solvesLastMonth) / solvesLastMonth) * 100)
          : solvesThisMonth > 0
            ? 100
            : 0;

      // ── 11. COMPLETION RATE (solved problems / total attempted) ────────
      const totalAttempted = progressRecords.length;
      const completionRate =
        totalAttempted > 0
          ? Math.round((totalSolved / totalAttempted) * 100)
          : 0;

      const analyticsData = {
        summary: {
          totalSolved,
          totalMatches,
          wins,
          winRate,
          avgSolveTimeMs,
          totalAttempts,
          currentStreak,
          completionRate,
          growthRate,
        },
        difficultyBreakdown,
        activityData,
        battleTrend,
        languageUsage,
        runtimeStats,
        solvesByMonth,
        weakAreas,
      };

      // Cache the result
      this.setCachedAnalytics(userId, analyticsData);

      return res.status(200).json({
        status: "success",
        analytics: analyticsData,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch analytics",
      });
    }
  }

  // Clear cache for a user (call after data updates)
  invalidateCache(userId: string) {
    const key = this.getCacheKey(userId);
    analyticsCache.delete(key);
  }

  // Clear all analytics cache (for admin/maintenance)
  clearAllCache() {
    analyticsCache.clear();
  }
}

export const analyticsController = new Analytics();

// Export cache management for use in other controllers
export const invalidateUserAnalyticsCache = (userId: string) => {
  analyticsController.invalidateCache(userId);
};
