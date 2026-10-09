import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, X, Activity } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAllRead } from "../../hooks/useNotifications";
import { api } from "../../config/api";
import { toast } from "sonner";

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const formatTimeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Flat queue: every row carries a category badge so social, battle
// and system events are distinguishable at a glance.
const categoryFor = (type: string): { label: string; tone: string } => {
  switch (type) {
    case "FRIEND_REQUEST":
    case "FRIEND_ACCEPT":
    case "DIRECT_MESSAGE":
    case "CHALLENGE_RECEIVED":
    case "CHALLENGE_RESULT":
      return {
        label: "SOCIAL",
        tone: "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
      };
    case "MATCH_RESULT":
    case "EVENT_REPORT":
    case "EVENT_RESULT":
    case "WEEKLY_ANALYSIS":
      return {
        label: "BATTLE",
        tone: "border-accent-warning/30 bg-accent-warning/10 text-accent-warning",
      };
    default:
      return {
        label: "SYSTEM",
        tone: "border-subtle-line bg-surface-hover text-subtle",
      };
  }
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen: controlledOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { data: notificationsData } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markAllRead = useMarkAllRead();

  // Uncontrolled by default (Header mounts it bare): closed bell,
  // popover opens on click.
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open);
    }
    if (!open && onClose) onClose();
  };

  const rootRef = useRef<HTMLDivElement>(null);

  // Dismiss the popover on outside press / Escape (uncontrolled mode only).
  useEffect(() => {
    if (controlledOpen !== undefined || !isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setInternalOpen(false);
        if (onClose) onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInternalOpen(false);
        if (onClose) onClose();
      }
    };
    // Small delay so the toggle click itself doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 10);
    document.addEventListener("keydown", handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, controlledOpen, onClose]);

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.unreadCount || 0;

  // Acting on a request consumes the queue row: accept/reject the
  // friend request, then delete the notification so it disappears.
  const clearRow = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Failed to clear notification:", error);
    } finally {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  const handleAccept = async (notif: any) => {
    try {
      await api.post("/friends/accept", {
        requestId: notif.data?.requestId,
        senderId: notif.data?.senderId,
      });
      await clearRow(notif.id);
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const handleReject = async (notif: any) => {
    try {
      await api.post("/friends/reject", { requestId: notif.data?.requestId });
      await clearRow(notif.id);
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      toast.error("Failed to reject friend request");
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      {/* Bell trigger — the only element carrying title="Notifications" */}
      <button
        onClick={() => setOpen(!isOpen)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-hover text-subtle transition hover:border-accent-primary/40 hover:text-accent-primary"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-danger px-1 font-mono text-[9px] font-bold text-ink">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-subtle-line bg-raised shadow-2xl md:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-subtle-line px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs font-bold tracking-widest text-fg">
                NOTIFICATIONS
              </h2>
              {unreadCount > 0 && (
                <span className="rounded bg-accent-danger px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  title="Mark all read"
                  className="rounded p-1.5 text-faint transition hover:text-accent-primary"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Close notifications"
                className="rounded p-1.5 text-faint transition hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Event list */}
          <div className="max-h-[60vh] overflow-y-auto p-2 themed-scroll">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BellOff className="mb-2 h-8 w-8 text-faint/50" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                  No notifications
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {notifications.map((notif: any) => {
                  const category = categoryFor(notif.type);
                  const actionable =
                    notif.type === "FRIEND_REQUEST" && notif.status === "UNREAD";
                  return (
                    <li
                      key={notif.id}
                      className={`rounded-lg border p-3 ${
                        notif.status === "READ"
                          ? "border-subtle-line bg-base/50"
                          : "border-accent-primary/25 bg-accent-primary/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest ${category.tone}`}
                        >
                          {category.label}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] text-faint">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate font-mono text-xs font-bold text-fg">
                        {notif.title}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${
                          notif.status === "READ" ? "text-subtle" : "text-fg"
                        }`}
                      >
                        {notif.body}
                      </p>
                      {actionable && (
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => handleAccept(notif)}
                            title="Accept friend request"
                            className="flex-1 rounded border border-accent-success/40 bg-accent-success/10 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-success transition hover:bg-accent-success/20"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(notif)}
                            title="Reject friend request"
                            className="flex-1 rounded border border-accent-danger/40 bg-accent-danger/10 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-danger transition hover:bg-accent-danger/20"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-subtle-line bg-base/50 px-4 py-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] text-faint">
              <Activity className="h-3 w-3" />
              {notifications.length} event{notifications.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export { useNotifications, NotificationCenter };
