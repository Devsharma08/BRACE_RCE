import { useState, useEffect } from "react";
import { X, Bell, BellOff, Activity, Clock, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";

interface NotificationEvent {
  id: string;
  type: "battle_update" | "battle_finished" | "battle_started" | "focus_loss" | "match_completed";
  roomId: string;
  roomName: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

const STORAGE_KEY = "spectate-notification-center-events";
const MAX_EVENTS = 50;

function useSpectateNotificationCenter() {
  const [events, setEvents] = useState<NotificationEvent[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const addEvent = (event: Omit<NotificationEvent, "id" | "timestamp" | "read">) => {
    const newEvent: NotificationEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    setEvents(prev => [newEvent, ...prev.slice(0, MAX_EVENTS - 1)]);
  };

  const markRead = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const markAllRead = () => {
    setEvents(prev => prev.map(e => ({ ...e, read: true })));
  };

  const clearAll = () => {
    setEvents([]);
  };

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
  }, [events]);

  const unreadCount = events.filter(e => !e.read).length;

  return {
    events,
    unreadCount,
    addEvent,
    markRead,
    markAllRead,
    clearAll,
    removeEvent,
  };
}

const getEventIcon = (type: NotificationEvent["type"]) => {
  switch (type) {
    case "battle_update":
      return <Activity className="w-4 h-4 text-accent-primary" />;
    case "battle_finished":
      return <CheckCircle className="w-4 h-4 text-accent-success" />;
    case "battle_started":
      return <AlertTriangle className="w-4 h-4 text-accent-warning" />;
    case "focus_loss":
      return <AlertTriangle className="w-4 h-4 text-accent-danger" />;
    case "match_completed":
      return <CheckCircle className="w-4 h-4 text-accent-primary" />;
    default:
      return <Bell className="w-4 h-4 text-subtle" />;
  }
};

const getEventColor = (type: NotificationEvent["type"]) => {
  switch (type) {
    case "battle_update":
      return "text-accent-primary";
    case "battle_finished":
      return "text-accent-success";
    case "battle_started":
      return "text-accent-warning";
    case "focus_loss":
      return "text-accent-danger";
    case "match_completed":
      return "text-accent-primary";
    default:
      return "text-subtle";
  }
};

const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

interface SpectateNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const SpectateNotificationCenter: React.FC<SpectateNotificationCenterProps> = ({ isOpen, onClose }) => {
  const { events, unreadCount, markRead, markAllRead, clearAll, removeEvent } = useSpectateNotificationCenter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4 pointer-events-none">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-raised border border-subtle-line rounded-2xl shadow-2xl pointer-events-auto overflow-hidden themed-scroll"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle-line">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-accent-primary" />
            <h2 className="font-mono text-lg font-bold text-fg tracking-widest">NOTIFICATIONS</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-accent-danger text-fg rounded">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-accent-primary/30 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors rounded"
              >
                MARK ALL READ
              </button>
            )}
            <button
              onClick={clearAll}
              className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-subtle-line bg-surface-hover text-subtle hover:text-fg transition-colors rounded"
            >
              CLEAR ALL
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-raised transition-colors"
            >
              <X className="w-5 h-5 text-subtle" />
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[60vh]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <BellOff className="w-12 h-12 text-faint/50 mb-4" />
              <p className="font-mono text-sm text-faint uppercase tracking-widest">NO NOTIFICATIONS</p>
              <p className="text-xs text-faint/50 mt-1">Muted events will appear here</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded border transition-colors ${
                  event.read ? "border-subtle-line bg-base/50" : "border-accent-primary/30 bg-accent-primary/5"
                }`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-fg truncate">{event.roomName}</span>
                    <span className="text-[9px] text-faint font-mono shrink-0">{formatTimeAgo(event.timestamp)}</span>
                  </div>
                  <p className={`text-sm ${event.read ? "text-subtle" : "text-fg"} font-sans mt-1`}>
                    {event.message}
                  </p>
                  {event.data && (
                    <div className="mt-2 text-[9px] text-faint font-mono">
                      {JSON.stringify(event.data).slice(0, 200)}{JSON.stringify(event.data).length > 200 ? "..." : ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!event.read && (
                    <button
                      onClick={() => markRead(event.id)}
                      className="p-1 rounded hover:bg-accent-primary/20 text-[9px] font-bold text-accent-primary transition-colors"
                    >
                      MARK READ
                    </button>
                  )}
                  <button
                    onClick={() => removeEvent(event.id)}
                    className="p-1 rounded hover:bg-accent-danger/20 text-[9px] font-bold text-accent-danger transition-colors"
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle-line bg-base/50">
          <div className="flex items-center justify-between text-xs text-faint">
            <span>{events.length} total event{events.length !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Real-time updates from muted battles
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { useSpectateNotificationCenter, SpectateNotificationCenter };