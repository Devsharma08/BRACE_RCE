import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import {
  Swords,
  Send,
  UserPlus,
  Search,
  Users,
  Bell,
  Check,
  Trash2,
  X,
  Ban,
  MessageSquare,
  RefreshCw,
  Wifi,
  ChevronLeft,
  User,
  Shield,
  Trophy,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../config/api";
import { ChallengeModal } from "./ChallengeModal";
import DashboardSidebar from "../layout/DashboardSidebar";
import { useMyRating } from "../../hooks/useLeaderboard";

interface Friend {
  id: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  requestSent?: boolean;
}
interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
}
interface FriendRequest {
  id: string;
  senderId: string;
  sender: Friend;
}

type LeftNavTab = "INBOX" | "TEAMS" | "GROUPS" | "SETTINGS";

export default function FriendsDashboard() {
  const { sendDirectMessage, socket, requestPresence } = useSocket();
  const [activeTab, setActiveTab] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [leftNavTab, setLeftNavTab] = useState<LeftNavTab>("INBOX");
  const [leftPaneMode, setLeftPaneMode] = useState<"FRIENDS" | "SEARCH" | "REQUESTS" | "BLOCK">("FRIENDS");
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  const { data: friends = [], isLoading: friendsLoading, refetch: fetchFriends } = useQuery<Friend[]>({
    queryKey: ["friends-list"],
    queryFn: async () => {
      const res = await api.get("/friends");
      return res.data.friends || [];
    },
  });

  const { data: pendingRequests = [], refetch: fetchRequests } = useQuery<FriendRequest[]>({
    queryKey: ["friend-requests"],
    queryFn: async () => {
      const res = await api.get("/friends/requests");
      return res.data.requests || [];
    },
  });

  const { data: blockedUsers = [], refetch: getBlockedUsers } = useQuery<Friend[]>({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const res = await api.get("/friends/blocked");
      return ((res.data.users || []) as { receiver: Friend }[]).map((entry) => entry.receiver);
    },
  });

  const { data: directMessages = [] } = useQuery({
    queryKey: ["direct-messages", activeTab?.id],
    enabled: Boolean(activeTab?.id),
    queryFn: async () => {
      const res = await api.get(`/friends/messages/${activeTab?.id}`);
      return res.data.messages || [];
    },
  });

  const displayedMessages: Message[] =
    messages.length > 0 ? messages : (directMessages as Message[]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [displayedMessages]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (data: { senderId: string; content: string; createdAt: string; id: string }) => {
      if (activeTab && data.senderId === activeTab.id) {
        setMessages((prev) => [...prev, { ...data, receiverId: "ME" }]);
      }
    };
    socket.on("direct_message", handleMessage);
    return () => { socket.off("direct_message", handleMessage); };
  }, [socket, activeTab]);

  useEffect(() => {
    if (!socket) return;
    const handlePresence = (data: { userId: string; status: string }) => {
      setOnlineIds((prev) =>
        data.status === "ONLINE" ? [...new Set([...prev, data.userId])] : prev.filter((id) => id !== data.userId)
      );
    };
    socket.on("user_online_status", handlePresence);
    return () => { socket.off("user_online_status", handlePresence); };
  }, [socket]);

  useEffect(() => {
    if (!socket || friends.length === 0) return;
    requestPresence(friends.map((f) => f.id));
  }, [socket, friends, requestPresence]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab && newMessage.trim()) {
      sendDirectMessage(activeTab.id, newMessage.trim());
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, content: newMessage.trim(), senderId: "ME", receiverId: activeTab.id, createdAt: new Date().toISOString() },
      ]);
      setNewMessage("");
    }
  };

  const handleAddFriend = async (username: string) => {
    try {
      await api.post("/friends/request", { username });
      toast.success(`Friend request sent to ${username}`);
      fetchFriends();
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/accept/${requestId}`);
      toast.success("Friend request accepted");
      fetchFriends();
      fetchRequests();
    } catch {
      toast.error("Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/reject/${requestId}`);
      toast.success("Friend request rejected");
      fetchRequests();
    } catch {
      toast.error("Failed to reject request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await api.delete(`/friends/${friendId}`);
      toast.success("Friend removed");
      if (activeTab?.id === friendId) setActiveTab(null);
      fetchFriends();
    } catch {
      toast.error("Failed to remove friend");
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await api.post("/friends/block", { userId });
      toast.success("User blocked");
      fetchFriends();
      getBlockedUsers();
    } catch {
      toast.error("Failed to block user");
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.post("/friends/unblock", { userId });
      toast.success("User unblocked");
      getBlockedUsers();
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  const queryClient = useQueryClient();
  const { data: myRating } = useMyRating(true);

  // ── LEFT NAV ITEMS ──
  const leftNavItems: { id: LeftNavTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "INBOX", label: "Inbox", icon: MessageSquare, count: friends.length },
    { id: "TEAMS", label: "Teams", icon: Users, count: 0 },
    { id: "GROUPS", label: "Groups", icon: Shield, count: 0 },
    { id: "SETTINGS", label: "Settings", icon: User, count: 0 },
  ];

  return (
    <div className="flex min-h-screen bg-[#050811] text-slate-100 font-mono">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL DASHBOARD SIDEBAR                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3-COLUMN FRIENDS LAYOUT                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] flex h-screen overflow-hidden">

        {/* ── LEFT COLUMN: NAVIGATION + CHAT LIST ─────────────────────────── */}
        <aside className="w-64 border-r border-white/6 bg-[#080a10] flex flex-col shrink-0">
          {/* Nav Tabs */}
          <div className="flex border-b border-white/6">
            {leftNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setLeftNavTab(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9px] uppercase tracking-widest transition-all ${
                  leftNavTab === item.id
                    ? "text-cyan-400 border-b-2 border-cyan-400"
                    : "text-[#8892A4] hover:text-white border-b-2 border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.count ? <span className="text-[8px] text-cyan-400/60">{item.count}</span> : null}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3D4657]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 bg-[#0c0f18] border border-white/6 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {friendsLoading ? (
              <div className="p-4 text-xs text-[#8892A4]">Loading...</div>
            ) : friends.length === 0 ? (
              <div className="p-4 text-xs text-[#8892A4]">No friends yet</div>
            ) : (
              friends
                .filter((f) => f.username.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => { setActiveTab(friend); setMessages([]); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 transition-all hover:bg-white/5 ${
                      activeTab?.id === friend.id ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 bg-[#111520] border border-white/8 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-cyan-400">{friend.username.slice(0, 2).toUpperCase()}</span>
                      </div>
                      {onlineIds.includes(friend.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#080a10]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs text-white truncate">{friend.username}</div>
                      <div className="text-[9px] text-[#8892A4] truncate">Click to chat</div>
                    </div>
                  </button>
                ))
            )}
          </div>
        </aside>

        {/* ── MIDDLE COLUMN: CONVERSATION ─────────────────────────────────── */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#050811]">
          {activeTab ? (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 bg-[#080a10]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#111520] border border-white/8 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-cyan-400">{activeTab.username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="text-sm text-white font-bold">{activeTab.username}</div>
                    <div className="text-[9px] flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 ${onlineIds.includes(activeTab.id) ? "bg-emerald-400" : "bg-slate-500"}`} />
                      <span className={onlineIds.includes(activeTab.id) ? "text-emerald-400" : "text-slate-500"}>
                        {onlineIds.includes(activeTab.id) ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setChallengeFriend(activeTab)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-[10px] uppercase tracking-widest transition-all"
                >
                  <Swords className="w-3 h-3" />
                  Battle
                </button>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {displayedMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-[#8892A4]">No messages yet. Say hello!</div>
                ) : (
                  displayedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === "ME" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`px-4 py-2 max-w-[70%] text-sm ${
                          msg.senderId === "ME"
                            ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-100"
                            : "bg-white/5 border border-white/10 text-slate-300"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-white/6 bg-[#080a10]">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#0c0f18] border border-white/6 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-cyan-500 text-[#050608] hover:bg-cyan-400 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-[#3D4657] mx-auto mb-3" />
                <p className="text-sm text-[#8892A4]">Select a friend to start chatting</p>
              </div>
            </div>
          )}
        </section>

        {/* ── RIGHT COLUMN: FRIEND PROFILE + BATTLE HISTORY ───────────────── */}
        <aside className="w-72 border-l border-white/6 bg-[#080a10] flex flex-col shrink-0 overflow-y-auto">
          {activeTab ? (
            <>
              {/* Friend Profile Card */}
              <div className="p-4 border-b border-white/6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#111520] border border-white/8 flex items-center justify-center mb-3">
                    <span className="text-lg font-bold text-cyan-400">{activeTab.username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{activeTab.username}</h3>
                  <p className="text-[10px] text-[#8892A4] mt-1">
                    {onlineIds.includes(activeTab.id) ? "● Online" : "○ Offline"}
                  </p>
                  {activeTab.bio && (
                    <p className="text-[10px] text-[#8892A4] mt-3 leading-relaxed">{activeTab.bio}</p>
                  )}
                </div>
              </div>

              {/* Battle Stats / History */}
              <div className="p-4 border-b border-white/6">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-cyan-500/50" />
                  <span className="text-[10px] text-[#8892A4] font-bold uppercase tracking-widest">Battle History</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8892A4]">Wins</span>
                    <span className="text-emerald-400 font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8892A4]">Losses</span>
                    <span className="text-rose-400 font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8892A4]">Win Rate</span>
                    <span className="text-cyan-400 font-bold">--</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => setChallengeFriend(activeTab)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Swords className="w-4 h-4" />
                  Challenge to Battle
                </button>
                <button
                  onClick={() => handleBlockUser(activeTab.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-[#8892A4] hover:text-rose-400 hover:border-rose-500/30 text-[10px] uppercase tracking-widest transition-all"
                >
                  <Ban className="w-3 h-3" />
                  Block User
                </button>
                <button
                  onClick={() => handleRemoveFriend(activeTab.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-[#8892A4] hover:text-rose-400 hover:border-rose-500/30 text-[10px] uppercase tracking-widest transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Friend
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <User className="w-10 h-10 text-[#3D4657] mx-auto mb-2" />
                <p className="text-[10px] text-[#8892A4]">Select a friend to view profile</p>
              </div>
            </div>
          )}
        </aside>
      </main>

      <ChallengeModal friend={challengeFriend} open={Boolean(challengeFriend)} onClose={() => setChallengeFriend(null)} />
    </div>
  );
}
