import { memo, useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  UserPlus,
  UserCheck,
  Swords,
  MessageSquare,
  ServerCog,
  BarChart3,
  Inbox,
  Loader2,
} from "lucide-react";
import type React from "react";
import { useMarkAllRead, useMarkRead } from "../../hooks/useNotifications";
import { useNotifications, useUnreadCount } from "../../hooks/useNotifications";
import type { NotificationItem } from "../../hooks/useNotifications";
import { api } from "../../config/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocketInvalidation } from "../../hooks/useSocketInvalidation";

const TABS = [
  { id: "ALL", label: "ALL" },
  { id: "UNREAD", label: "UNREAD" },
  { id: "FRIENDS", label: "FRIENDS" },
  { id: "MESSAGES", label: "MESSAGES" },
  { id: "SYSTEM", label: "SYSTEM" },
  { id: "REPORTS", label: "REPORTS" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const tabMatch = (tab: TabId, n: NotificationItem): boolean => {
  switch (tab) {
    case "ALL": return true;
    case "UNREAD": return n.status === "UNREAD";
    case "FRIENDS": return ["FRIEND_REQUEST","FRIEND_ACCEPT","CHALLENGE_RECEIVED","CHALLENGE_RESULT"].includes(n.type);
    case "MESSAGES": return n.type === "DIRECT_MESSAGE";
    case "SYSTEM": return ["SYSTEM","MATCH_RESULT"].includes(n.type);
    case "REPORTS": return ["WEEKLY_ANALYSIS","EVENT_REPORT","EVENT_RESULT"].includes(n.type);
  }
};

/** Icon + palette per notification type — a bare text badge gave no quick scan cue. */
const typeStyle = (t: string): { Icon: React.ElementType; chip: string; row: string } => {
  if (t === "FRIEND_REQUEST") {
    return {
      Icon: UserPlus,
      chip: "text-accent-primary border-accent-primary/40 bg-accent-primary/10",
      row: "border-l-accent-primary",
    };
  }
  if (t === "FRIEND_ACCEPT") {
    return {
      Icon: UserCheck,
      chip: "text-accent-success border-accent-success/40 bg-accent-success/10",
      row: "border-l-accent-success",
    };
  }
  if (t.startsWith("CHALLENGE")) {
    return {
      Icon: Swords,
      chip: "text-accent-danger border-accent-danger/40 bg-accent-danger/10",
      row: "border-l-accent-danger",
    };
  }
  if (t === "DIRECT_MESSAGE") {
    return {
      Icon: MessageSquare,
      chip: "text-accent-violet border-accent-violet/40 bg-accent-violet/10",
      row: "border-l-accent-violet",
    };
  }
  if (t === "SYSTEM" || t === "MATCH_RESULT") {
    return {
      Icon: ServerCog,
      chip: "text-accent-warning border-accent-warning/40 bg-accent-warning/10",
      row: "border-l-accent-warning",
    };
  }
  if (t.includes("ANALYSIS") || t.includes("REPORT") || t.includes("RESULT")) {
    return {
      Icon: BarChart3,
      chip: "text-accent-pink border-accent-pink/40 bg-accent-pink/10",
      row: "border-l-accent-pink",
    };
  }
  return { Icon: Bell, chip: "text-subtle border-subtle-line bg-surface-hover", row: "border-l-transparent" };
};

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "NOW";
  if (mins < 60) return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}D` : new Date(iso).toLocaleDateString();
};

export const NotificationCenter = memo(function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("ALL");
  const { data, isLoading } = useNotifications();
  const { data: unread } = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const queryClient = useQueryClient();
  const items = useMemo(() => (data?.notifications ?? []).filter((n) => tabMatch(tab, n)), [data, tab]);
  const unreadCount = unread?.unreadCount ?? 0;

  // Request acted on from another surface (friends page / other tab) → refresh
  // the queue so a resolved friend request doesn't linger as a stale action.
  useSocketInvalidation("friends:update", [
    ["friend-requests"],
    ["friends-list"],
    ["notifications"],
    ["notifications-unread-count"],
  ]);

  // Row-level in-flight guard: one accept/reject at a time, buttons disabled.
  const [actingOn, setActingOn] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const snapshotAll = queryClient.getQueryData<{
      notifications: NotificationItem[];
    }>(["notifications", "all"]);
    const wasUnread =
      snapshotAll?.notifications.find((n) => n.id === id)?.status === "UNREAD";

    const removeItem = (
      old?: { notifications: NotificationItem[] },
    ): { notifications: NotificationItem[] } | undefined =>
      old
        ? { notifications: old.notifications.filter((n) => n.id !== id) }
        : old;

    // Optimistic removal — the row disappears instantly.
    queryClient.setQueryData(["notifications", "all"], removeItem);
    queryClient.setQueryData(["notifications", "unread"], removeItem);
    if (wasUnread) {
      queryClient.setQueryData<{ unreadCount: number }>(
        ["notifications-unread-count"],
        (old) => ({ unreadCount: Math.max(0, (old?.unreadCount ?? 1) - 1) }),
      );
    }

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      toast.error("Failed to delete notification");
      // Rollback by refetching the authoritative state.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    }
  };

  /**
   * Resolve the pending request behind a FRIEND_REQUEST row. Rows created
   * after the socket work carry `data.requestId` + `data.senderId`; older rows
   * fall back to matching the live pending-requests list by sender name.
   */
  const resolveFriendRequest = async (
    n: NotificationItem,
  ): Promise<{ requestId: string; senderId: string } | null> => {
    const payload = n.data ?? {};
    const directId = typeof payload.requestId === "string" ? payload.requestId : "";
    const directSender = typeof payload.senderId === "string" ? payload.senderId : "";
    if (directId && directSender) return { requestId: directId, senderId: directSender };

    const res = await api.get("/friends/requests");
    const requests = (res.data.requests ?? []) as {
      id: string;
      senderId: string;
      sender?: { id?: string; username?: string };
    }[];
    const senderName = typeof payload.senderName === "string" ? payload.senderName : "";
    const match = requests.find(
      (r) =>
        (directSender && r.senderId === directSender) ||
        (senderName && r.sender?.username === senderName),
    );
    if (!match) return null;
    return { requestId: match.id, senderId: match.senderId };
  };

  /** Accept or reject a friend request straight from the notification row. */
  const handleFriendRequestAction = async (
    n: NotificationItem,
    action: "accept" | "reject",
  ) => {
    if (actingOn) return;
    setActingOn(n.id);
    try {
      const target = await resolveFriendRequest(n);
      if (!target) {
        toast.info("This friend request is no longer available");
        await handleDelete(n.id); // stale row — clear it
        return;
      }
      if (action === "accept") {
        await api.post("/friends/accept", {
          requestId: target.requestId,
          senderId: target.senderId,
        });
        toast.success("Friend request accepted");
      } else {
        await api.post("/friends/reject", { requestId: target.requestId });
        toast.success("Friend request rejected");
      }

      // The request is resolved — the notification row is no longer actionable.
      await handleDelete(n.id);
      queryClient.invalidateQueries({ queryKey: ["friends-list"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    } catch (err: unknown) {
      const message =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || `Failed to ${action} request`);
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Notifications"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={`relative cursor-pointer rounded-btn border p-2 transition-colors ${
          open
            ? "border-accent-primary/50 bg-accent-primary/10 text-accent-primary"
            : "border-subtle-line bg-surface text-subtle hover:border-accent-primary/40 hover:bg-accent-primary/10 hover:text-accent-primary"
        }`}>
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-danger px-1 text-[10px] font-bold leading-none text-ink">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 flex max-h-[70vh] w-[22rem] max-w-[90vw] flex-col overflow-hidden rounded-card border border-subtle-line bg-surface shadow-panel">
            <div className="flex shrink-0 items-center justify-between border-b border-subtle-line px-4 py-3">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-fg">
                <Bell className="h-3.5 w-3.5 text-accent-primary" />
                Comms // Queue
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent-primary/15 px-1.5 py-0.5 text-[9px] text-accent-primary">
                    {unreadCount} new
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => markAll.mutate()} title="Mark all read" aria-label="Mark all read"
                  className="cursor-pointer rounded-btn p-1.5 text-subtle transition-colors hover:bg-accent-success/10 hover:text-accent-success">
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} title="Close" aria-label="Close notifications"
                  className="cursor-pointer rounded-btn p-1.5 text-subtle transition-colors hover:bg-accent-danger/10 hover:text-accent-danger">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-subtle-line px-3 py-2">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`cursor-pointer rounded-btn border px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${
                    tab === t.id
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-subtle-line text-faint hover:border-accent-primary/30 hover:text-accent-primary"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="themed-scroll min-h-0 flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex flex-col items-center gap-2 px-4 py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
                  <p className="text-[10px] uppercase tracking-widest text-faint">Loading queue…</p>
                </div>
              )}
              {!isLoading && items.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Inbox className="h-5 w-5 text-faint" />
                  <p className="text-[10px] uppercase tracking-widest text-faint">Queue clear</p>
                  <p className="font-sans text-[11px] text-subtle">Nothing in the last 3 days</p>
                </div>
              )}
              {items.map((n) => {
                const { Icon, chip, row } = typeStyle(n.type);
                const unread = n.status === "UNREAD";
                return (
                  <div
                    key={n.id}
                    className={`border-b border-l-2 border-subtle-line px-4 py-3 transition-colors hover:bg-surface-hover/50 ${row} ${
                      unread ? "bg-accent-primary/[0.04]" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`flex items-center gap-1.5 rounded-btn border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${chip}`}>
                        <Icon className="h-3 w-3" />
                        {n.type.replace(/_/g, " ")}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-faint" title={new Date(n.createdAt).toLocaleString()}>
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-fg">{n.title}</p>
                    <p className="mt-0.5 font-sans text-[11px] leading-relaxed text-subtle">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {n.type === "FRIEND_REQUEST" && (
                        <span className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleFriendRequestAction(n, "accept")}
                            disabled={actingOn !== null}
                            title="Accept friend request"
                            className="cursor-pointer rounded-btn border border-accent-success/40 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-success transition-colors hover:bg-accent-success/10 disabled:cursor-wait disabled:opacity-60"
                          >
                            {actingOn === n.id ? (
                              <Loader2 className="mx-2.5 h-3 w-3 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Accept
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleFriendRequestAction(n, "reject")}
                            disabled={actingOn !== null}
                            title="Reject friend request"
                            className="cursor-pointer rounded-btn border border-accent-danger/40 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-danger transition-colors hover:bg-accent-danger/10 disabled:cursor-wait disabled:opacity-60"
                          >
                            {actingOn === n.id ? (
                              <Loader2 className="mx-2.5 h-3 w-3 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1">
                                <X className="h-3 w-3" />
                                Reject
                              </span>
                            )}
                          </button>
                        </span>
                      )}
                      {unread && (
                        <button onClick={() => markRead.mutate(n.id)}
                          className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-accent-primary transition-colors hover:text-fg">
                          Mark read
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} title="Delete" aria-label={`Delete notification: ${n.title}`}
                        className="ml-auto cursor-pointer rounded-btn p-1 text-faint transition-colors hover:bg-accent-danger/10 hover:text-accent-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="shrink-0 border-t border-subtle-line px-4 py-2 text-[9px] uppercase tracking-widest text-faint">
              Retention // last 3 days only — no cloud storage
            </p>
          </div>
        </>
      )}
    </div>
  );
});
