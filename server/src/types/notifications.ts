export type NotificationTypeStr =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPT"
  | "DIRECT_MESSAGE"
  | "CHALLENGE_RECEIVED"
  | "CHALLENGE_RESULT"
  | "MATCH_RESULT"
  | "SYSTEM"
  | "WEEKLY_ANALYSIS"
  | "EVENT_REPORT"
  | "EVENT_RESULT";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationTypeStr;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ListNotificationsQuery {
  unreadOnly?: boolean;
  type?: NotificationTypeStr;
  cursor?: string;
  take?: number;
}

/** Queue retention window — no cloud storage, keep last 3 days only. */
export const NOTIFICATION_RETENTION_DAYS = 3;

export const retentionCutoff = (days = NOTIFICATION_RETENTION_DAYS): Date =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);
