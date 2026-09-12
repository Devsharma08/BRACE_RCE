import { prisma } from "../lib/prisma.js";
import {
  type CreateNotificationInput,
  type NotificationTypeStr,
  retentionCutoff,
  NOTIFICATION_RETENTION_DAYS,
} from "../types/notifications.js";

const preview = (s: string, n = 120): string =>
  s.length > n ? `${s.slice(0, n)}…` : s;

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as never,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as never,
    },
  });
}

export const notifyFriendRequest = (receiverId: string, senderName: string) =>
  createNotification({
    userId: receiverId,
    type: "FRIEND_REQUEST",
    title: "New friend request",
    body: `${senderName} sent you a friend request.`,
    data: { senderName },
  });

export const notifyFriendAccept = (receiverId: string, accepterName: string) =>
  createNotification({
    userId: receiverId,
    type: "FRIEND_ACCEPT",
    title: "Friend request accepted",
    body: `${accepterName} accepted your friend request.`,
    data: { accepterName },
  });

export const notifyDirectMessage = (
  receiverId: string,
  senderName: string,
  senderId: string,
  content: string
) =>
  createNotification({
    userId: receiverId,
    type: "DIRECT_MESSAGE",
    title: `New message from ${senderName}`,
    body: preview(content),
    data: { senderId, senderName },
  });

export interface ChallengeNotifyPayload {
  challengerId: string;
  challengerName: string;
  mode: "RANDOM" | "CUSTOM";
  difficulty?: string;
  problemId?: string;
  problemName?: string;
}

export const notifyChallenge = (targetId: string, p: ChallengeNotifyPayload) =>
  createNotification({
    userId: targetId,
    type: "CHALLENGE_RECEIVED",
    title: `Battle challenge from ${p.challengerName}`,
    body:
      p.mode === "RANDOM"
        ? `${p.challengerName} challenged you — random ${p.difficulty ?? "ANY"} problem.`
        : `${p.challengerName} challenged you — custom problem ${p.problemName ?? p.problemId ?? ""}.`,
    data: { ...p },
  });

export const notifyChallengeResult = (
  userId: string,
  accepted: boolean,
  otherName: string
) =>
  createNotification({
    userId,
    type: "CHALLENGE_RESULT",
    title: accepted ? "Challenge accepted" : "Challenge declined",
    body: `${otherName} ${accepted ? "accepted" : "declined"} the battle challenge.`,
    data: { otherName, accepted },
  });

export const notifyMatchResult = (
  userId: string,
  result: string,
  eventId: string
) =>
  createNotification({
    userId,
    type: "MATCH_RESULT",
    title: "Battle finished",
    body: `Result: ${result}.`,
    data: { eventId, result },
  });

export const notifySystem = (userId: string, title: string, body: string, data?: Record<string, unknown>) =>
  createNotification({ userId, type: "SYSTEM", title, body, data });

export async function buildWeeklyAnalysis(userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [progress, performances] = await Promise.all([
    prisma.userProblemProgress.findMany({
      where: { userId, updatedAt: { gte: since } },
      select: { isSolved: true, attempts: true, solvedAt: true },
    }),
    prisma.userPersonalPerformance.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { status: true, score: true },
    }),
  ]);
  const solves = progress.filter((p) => p.isSolved).length;
  const attempts = progress.reduce((a, p) => a + (p.attempts || 0), 0);
  const wins = performances.filter((p) =>
    ["PASSED", "WON", "COMPLETED"].includes(String(p.status))
  ).length;
  return { solves, attempts, matches: performances.length, wins };
}

export async function notifyWeeklyAnalysis(userId: string, username: string) {
  const w = await buildWeeklyAnalysis(userId);
  return createNotification({
    userId,
    type: "WEEKLY_ANALYSIS",
    title: `Weekly coding analysis for ${username}`,
    body: `Solves: ${w.solves} · Attempts: ${w.attempts} · Matches: ${w.matches} · Wins: ${w.wins}.`,
    data: { ...w },
  });
}

export async function buildEventReport(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      performances: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });
  if (!event) return null;
  return {
    eventId,
    status: event.status,
    type: event.type,
    results: event.performances.map((p) => ({
      userId: p.userId,
      username: p.user.username,
      status: p.status,
      score: p.score,
    })),
  };
}

export async function notifyEventReport(eventId: string) {
  const report = await buildEventReport(eventId);
  if (!report) return [];
  const out = [];
  for (const r of report.results) {
    out.push(
      await createNotification({
        userId: r.userId,
        type: report.type === "ONE_VS_ONE" ? "EVENT_RESULT" : "EVENT_REPORT",
        title: "Event report",
        body: `Event ${eventId} finished — your status: ${r.status}, score: ${r.score ?? 0}.`,
        data: { eventId, status: r.status, score: r.score ?? 0 },
      })
    );
  }
  return out;
}

/** Delete queue items older than retention window. */
export async function pruneNotificationsOlderThan(days = NOTIFICATION_RETENTION_DAYS) {
  return prisma.notification.deleteMany({
    where: { createdAt: { lt: retentionCutoff(days) } },
  });
}

export type { NotificationTypeStr };
