import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "../config/api";
import { useSocket } from "../context/SocketContext";

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

export interface NotificationItem {
  id: string;
  type: NotificationTypeStr;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: "UNREAD" | "READ" | "ARCHIVED";
  createdAt: string;
  readAt?: string | null;
}

export function useNotifications(unreadOnly = false) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const query = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: ["notifications", unreadOnly ? "unread" : "all"],
    queryFn: async () => {
      const res = await api.get("/notifications", {
        params: { ...(unreadOnly ? { unreadOnly: "true" } : {}), take: 30 },
      });
      return res.data;
    },
  });

  useEffect(() => {
    if (!socket) return;

    /**
     * Prepend a notification without allowing duplicates. Socket re-delivery
     * (reconnects, room re-joins) must not clone rows in the cache.
     */
    const prepend = (
      n: NotificationItem,
      old: { notifications: NotificationItem[] } | undefined,
    ): { notifications: NotificationItem[] } => {
      const existing = old?.notifications ?? [];
      if (existing.some((item) => item.id === n.id)) {
        return old ?? { notifications: existing };
      }
      return { notifications: [n, ...existing] };
    };

    const onNew = (n: NotificationItem) => {
      toast.info(n.title, { description: n.body });

      // Deduplicate before touching any cache: a socket re-delivery (reconnect,
      // room re-join) must not clone the row or double-count the badge.
      const knownIds = new Set(
        (
          queryClient.getQueryData<{ notifications: NotificationItem[] }>([
            "notifications",
            "all",
          ])?.notifications ?? []
        ).map((item) => item.id),
      );

      // The socket payload IS the complete, authoritative notification, so patch
      // the cache directly instead of triggering a network refetch.
      queryClient.setQueryData<{ notifications: NotificationItem[] }>(
        ["notifications", "all"],
        (old) => prepend(n, old),
      );
      // The unread-only list gains the new row too — it always arrives UNREAD.
      queryClient.setQueryData<{ notifications: NotificationItem[] }>(
        ["notifications", "unread"],
        (old) => prepend(n, old),
      );

      if (!knownIds.has(n.id)) {
        // Bump the badge locally; no refetch of the count endpoint.
        queryClient.setQueryData<{ unreadCount: number }>(
          ["notifications-unread-count"],
          (old) => ({ unreadCount: (old?.unreadCount ?? 0) + 1 }),
        );
      }
    };

    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket, queryClient]);

  return query;
}

export function useUnreadCount() {
  return useQuery<{ unreadCount: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => (await api.get("/notifications/unread-count")).data,
    // The badge is kept accurate by the `notification:new` socket handler and by
    // mark-read mutations, so this is only a slow safety-net re-sync (e.g. after
    // a dropped socket) — not a source of truth.
    refetchInterval: 5 * 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      toast.success("All notifications marked as read");
    },
  });
}
