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
  if (t.startsWith("FRIEND") || t.startsWith("CHALLENGE")) return "text-rose-400 border-rose-500/40 bg-rose-950/30";
  if (t === "DIRECT_MESSAGE") return "text-cyan-400 border-cyan-500/40 bg-cyan-950/30";
  if (t.includes("ANALYSIS") || t.includes("REPORT") || t.includes("RESULT")) return "text-amber-400 border-amber-500/40 bg-amber-950/30";
  return "text-slate-300 border-white/15 bg-white/5";
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
    try {
      await api.delete(`/notifications/${id}`);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    } catch { toast.error("Failed to delete notification"); }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Notifications"
        className="relative p-2 text-slate-400 hover:text-cyan-400 transition-colors border border-white/10 hover:border-cyan-500/40 bg-[#06080e] cursor-pointer">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-rose-500 text-black text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-[90vw] border border-cyan-500/30 bg-[#06080e] shadow-[0_0_40px_rgba(6,182,212,0.25)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">Comms // Queue</span>
              <div className="flex items-center gap-2">
                <button onClick={() => markAll.mutate()} title="Mark all read"
                  className="p-1.5 text-slate-400 hover:text-emerald-400 border border-transparent hover:border-emerald-500/40 cursor-pointer">
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} title="Close"
                  className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-white/10">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-2 py-1 text-[10px] font-bold tracking-widest border cursor-pointer transition-all ${tab === t.id ? "border-cyan-400 bg-cyan-950/40 text-cyan-300" : "border-white/10 text-slate-500 hover:text-cyan-300 hover:border-cyan-500/30"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto themed-scroll">
              {isLoading && <p className="px-4 py-8 text-center text-[11px] tracking-widest text-slate-500">LOADING QUEUE…</p>}
              {!isLoading && items.length === 0 && <p className="px-4 py-8 text-center text-[11px] tracking-widest text-slate-500">QUEUE CLEAR — NOTHING IN THE LAST 3 DAYS</p>}
              {items.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] ${n.status === "UNREAD" ? "bg-cyan-950/10" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 border ${typeColor(n.type)}`}>{n.type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-white">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {n.status === "UNREAD" && (
                      <button onClick={() => markRead.mutate(n.id)}
                        className="text-[10px] font-bold tracking-widest text-cyan-400 hover:text-cyan-300 cursor-pointer">[ MARK READ ]</button>
                    )}
                    <button onClick={() => handleDelete(n.id)} title="Delete"
                      className="p-1 text-slate-600 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="px-4 py-2 text-[10px] tracking-widest text-slate-600 border-t border-white/10">RETENTION // LAST 3 DAYS ONLY — NO CLOUD STORAGE</p>
          </div>
        </>
      )}
    </div>
  );
});
