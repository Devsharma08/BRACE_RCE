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
    const onNew = (n: NotificationItem) => {
      toast.info(n.title, { description: n.body });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
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
    refetchInterval: 30_000,
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
