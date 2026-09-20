import { memo, useMemo, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useMarkAllRead, useMarkRead } from "../../hooks/useNotifications";
import { useNotifications, useUnreadCount } from "../../hooks/useNotifications";
import type { NotificationItem } from "../../hooks/useNotifications";
import { api } from "../../config/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

const typeColor = (t: string): string => {
  if (t.startsWith("FRIEND") || t.startsWith("CHALLENGE")) return "text-accent-danger border-accent-danger/40 bg-accent-danger/10";
  if (t === "DIRECT_MESSAGE") return "text-accent-primary border-accent-primary/40 bg-accent-primary/10";
  if (t.includes("ANALYSIS") || t.includes("REPORT") || t.includes("RESULT")) return "text-accent-warning border-accent-warning/40 bg-accent-warning/10";
  return "text-subtle border-subtle-line bg-surface-hover";
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

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Notifications"
        className="relative p-2 text-subtle hover:text-accent-primary transition-colors border border-subtle-line hover:border-accent-primary/40 bg-raised cursor-pointer">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-accent-danger text-black text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-[90vw] border border-accent-primary/30 bg-raised shadow-[0_0_40px_rgba(6,182,212,0.25)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-subtle-line">
              <span className="text-xs font-bold tracking-[0.2em] text-fg uppercase">Comms // Queue</span>
              <div className="flex items-center gap-2">
                <button onClick={() => markAll.mutate()} title="Mark all read"
                  className="p-1.5 text-subtle hover:text-accent-success border border-transparent hover:border-accent-success/40 cursor-pointer">
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} title="Close"
                  className="p-1.5 text-subtle hover:text-accent-danger cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-subtle-line">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-2 py-1 text-[10px] font-bold tracking-widest border cursor-pointer transition-all ${tab === t.id ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-subtle-line text-faint hover:text-accent-primary hover:border-accent-primary/30"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto themed-scroll">
              {isLoading && <p className="px-4 py-8 text-center text-[11px] tracking-widest text-faint">LOADING QUEUE…</p>}
              {!isLoading && items.length === 0 && <p className="px-4 py-8 text-center text-[11px] tracking-widest text-faint">QUEUE CLEAR — NOTHING IN THE LAST 3 DAYS</p>}
              {items.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-subtle-line hover:bg-white/[0.02] ${n.status === "UNREAD" ? "bg-accent-primary/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 border ${typeColor(n.type)}`}>{n.type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-faint font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-fg">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-subtle leading-relaxed">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {n.status === "UNREAD" && (
                      <button onClick={() => markRead.mutate(n.id)}
                        className="text-[10px] font-bold tracking-widest text-accent-primary hover:text-accent-primary cursor-pointer">[ MARK READ ]</button>
                    )}
                    <button onClick={() => handleDelete(n.id)} title="Delete"
                      className="p-1 text-faint hover:text-accent-danger cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="px-4 py-2 text-[10px] tracking-widest text-faint border-t border-subtle-line">RETENTION // LAST 3 DAYS ONLY — NO CLOUD STORAGE</p>
          </div>
        </>
      )}
    </div>
  );
});
