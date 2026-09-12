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
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../config/api";
import { ChallengeModal } from "./ChallengeModal";
import DashboardSidebar from "../layout/DashboardSidebar";
import { useMyRating } from "../../hooks/useLeaderboard";

interface Friend {
  id: string;
  username: string;
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

export default function FriendsDashboard() {
  const { sendDirectMessage, socket } = useSocket();
  const [activeTab, setActiveTab] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  // Scroll the chat pane itself (never the window — scrollIntoView on the
  // end-marker used to bubble up and yank the whole page to the bottom).
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // New States for Search & Requests
  const [leftPaneMode, setLeftPaneMode] = useState<
    "FRIENDS" | "SEARCH" | "REQUESTS" | "BLOCK"
  >("FRIENDS");
  // Friend challenge modal (RANDOM-by-difficulty vs CUSTOM problem)
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Friend presence (realtime online map)
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

  // Derive the displayed list instead of syncing query data into state:
  // local optimistic messages take priority, otherwise fall back to the
  // persisted history fetched for the active chat.
  const displayedMessages: Message[] =
    messages.length > 0 ? messages : (directMessages as Message[]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [displayedMessages]);

  const { data: myRating } = useMyRating(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (msg: Message) => {
      if (
        activeTab &&
        (msg.senderId === activeTab.id || msg.receiverId === activeTab.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      } else {
        toast.info("New message", { description: msg.content });
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    const handlePresence = (data: { userId: string; status: string }) => {
      setOnlineIds((prev) =>
        data.status === "ONLINE" || data.status === "online"
          ? Array.from(new Set([...prev, data.userId]))
          : prev.filter((id) => id !== data.userId)
      );
    };
    socket.on("receive_direct_message", handleReceiveMessage);
    socket.on("user_online_status", handlePresence);
    return () => {
      socket.off("receive_direct_message", handleReceiveMessage);
      socket.off("user_online_status", handlePresence);
    };
  }, [socket, activeTab, queryClient]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab && newMessage.trim()) {
      sendDirectMessage(activeTab.id, newMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: newMessage,
          senderId: "ME",
          receiverId: activeTab.id,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
    }
  };

  const { data: searchResults = [] } = useQuery<Friend[]>({
    queryKey: ["friend-search", searchQuery],
    enabled: Boolean(searchQuery.trim()),
    queryFn: async () => {
      const res = await api.get(`/friends/search?q=${encodeURIComponent(searchQuery)}`);
      return res.data.users ?? res.data.user ?? [];
    },
  });

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.post("/friends/reject", { requestId });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Request rejected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject request");
    }
  };

  const handleBlockRequest = async (targetUserId: string) => {
    try {
      await api.post("/friends/block", { targetUserId });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["friends-list"] });
      toast.success("User has been blocked.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to block user");
    }
  };

  const unblockUser = async (targetUserId: string) => {
    try {
      await api.post("/friends/unblock", { targetUserId });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast.success("User has been unblocked.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to unblock user");
    }
  };

  // --- NEW ACTIONS ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const sendRequest = async (targetUserId: string) => {
    try {
      await api.post("/friends/request", { targetUserId });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Request sent!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    try {
      await api.post("/friends/accept", { requestId, senderId });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setLeftPaneMode("FRIENDS");
      toast.success("Friend added!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to accept request");
    }
  };

  const removeFriend = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/friends/remove/${targetId}`);
      if (activeTab?.id === targetId) setActiveTab(null);
      queryClient.invalidateQueries({ queryKey: ["friends-list"] });
      toast.success("Friend removed");
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove friend");
    }
  };

  const leftPaneTabs = [
    { id: "FRIENDS", label: "FRIENDS", icon: Users, badge: 0 },
    { id: "SEARCH", label: "SEARCH", icon: Search, badge: 0 },
    { id: "REQUESTS", label: "REQUESTS", icon: Bell, badge: pendingRequests.length },
    { id: "BLOCK", label: "BLOCK", icon: Ban, badge: 0 },
  ] as const;

  // Switch panes; lazily refetch lists when entering REQUESTS / BLOCK
  const handleSwitchPane = (pane: (typeof leftPaneTabs)[number]["id"]) => {
    setLeftPaneMode(pane);
    if (pane === "REQUESTS") void fetchRequests();
    if (pane === "BLOCK") void getBlockedUsers();
  };

  // Opening a chat must clear the local optimistic buffer so the previous
  // friend's messages never leak into the new conversation.
  const handleSelectFriend = (friend: Friend) => {
    setActiveTab(friend);
    setMessages([]);
  };

  return (
    <div className="flex min-h-screen bg-[#02040a] text-slate-100 font-mono relative overflow-x-hidden select-none">
      {/* Global dot-grid texture + glows — same cyber-arena theme as dashboard */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] z-0" />
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/5 blur-3xl pointer-events-none z-0" />

      <DashboardSidebar rating={myRating?.rating} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-[1400px] z-10 relative">
        {/* HEADER BAR */}
        <header className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>SOCIAL UPLINK</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Friends, user search, direct messages and 1v1 battle challenges
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFriends()}
              title="Refresh"
              className="p-2 text-cyan-400 border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 rounded-none transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${friendsLoading ? "animate-spin" : ""}`} />
            </button>
            <div className="hidden sm:flex text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3.5 py-1.5 rounded-none shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              ONLINE: <strong className="text-white ml-1">{onlineIds.length}</strong>
            </div>
            <div className="text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 px-3.5 py-1.5 rounded-none shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              FRIENDS: <strong className="text-white">{friends.length}</strong>
            </div>
          </div>
        </header>

        {/* WORKSPACE GRID — fixed height, all scrolling happens inside panes */}
        <div className="flex-1 min-h-[560px] grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* LEFT COLUMN: NAVIGATION & LISTS */}
          <div className="flex flex-col h-full min-h-0 max-h-[480px] lg:max-h-none rounded-none border border-white/20 bg-[#06080e] overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* TOP NAV TABS */}
            <div className="flex border-b border-white/10 relative z-10">
              {leftPaneTabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSwitchPane(tab.id)}
                    className={`relative flex-1 p-3.5 font-mono text-xs tracking-widest transition-all ${
                      leftPaneMode === tab.id
                        ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300"
                        : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                    }`}
                  >
                    <TabIcon className="w-4 h-4 mx-auto mb-1" />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 relative z-10">
          {/* FRIENDS MODE */}
          {leftPaneMode === "FRIENDS" && (
            <>
              {friendsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-none border border-white/10 bg-black/40 animate-pulse"
                  />
                ))
              ) : friends.length === 0 ? (
                <p className="text-slate-500 font-mono text-xs text-center mt-6">
                  NO FRIENDS YET — USE SEARCH TO ADD SOME
                </p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleSelectFriend(friend)}
                    className={`group flex items-center justify-between p-3 rounded-none cursor-pointer border transition-all ${
                      activeTab?.id === friend.id
                        ? "bg-cyan-950/40 border-cyan-500/50"
                        : "border-white/10 bg-black/40 hover:border-cyan-500/30 hover:bg-cyan-950/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 shrink-0 rounded-none bg-cyan-900/50 border border-cyan-500/30 flex items-center justify-center font-mono text-cyan-300 font-bold uppercase">
                        {friend.username.charAt(0)}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#06080e] ${
                            onlineIds.includes(friend.id) ? "bg-emerald-400" : "bg-slate-600"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-mono text-sm text-white font-bold truncate">
                          {friend.username}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-[10px] ${
                            onlineIds.includes(friend.id) ? "text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          <Wifi className="w-3 h-3" />
                          {onlineIds.includes(friend.id) ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => removeFriend(e, friend.id)}
                      title="Remove friend"
                      className="p-2 text-slate-600 hover:text-rose-400 rounded-none opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* SEARCH MODE */}
          {leftPaneMode === "SEARCH" && (
            <>
              <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 bg-black/60 border border-white/10 p-2 rounded-none text-white font-mono text-xs focus:border-cyan-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-3 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-none transition-all active:scale-95"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
              {searchResults.length === 0 ? (
                <p className="text-slate-500 font-mono text-xs text-center mt-4">
                  {searchQuery.trim() ? "NO USERS FOUND" : "TYPE A USERNAME TO FIND PLAYERS"}
                </p>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-none border border-white/10 bg-black/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-none bg-slate-800/60 border border-white/10 flex items-center justify-center font-mono text-slate-300 font-bold uppercase">
                        {user.username.charAt(0)}
                      </div>
                      <span className="font-mono text-sm text-slate-200 truncate">
                        {user.username}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (!user.requestSent) {
                          sendRequest(user.id);
                        }
                      }}
                      title={user.requestSent ? "Request already sent" : "Send friend request"}
                      className={`p-2 rounded-none transition-colors ${
                        user.requestSent
                          ? "text-slate-500 cursor-not-allowed"
                          : "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                      }`}
                      disabled={user.requestSent}
                    >
                      {user.requestSent ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* REQUESTS MODE */}
          {leftPaneMode === "REQUESTS" && (
            <>
              {pendingRequests.length === 0 && (
                <p className="text-slate-500 font-mono text-xs text-center mt-6">
                  NO PENDING REQUESTS
                </p>
              )}
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-none border border-white/10 bg-black/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-none bg-amber-900/40 border border-amber-500/30 flex items-center justify-center font-mono text-amber-300 font-bold uppercase">
                      {req.sender.username.charAt(0)}
                    </div>
                    <span className="font-mono text-sm text-slate-200 truncate">
                      {req.sender.username}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {/* ACCEPT FRIEND REQUEST */}
                    <button
                      onClick={() => handleAcceptRequest(req.id, req.senderId)}
                      title="Accept Request"
                      className="p-2 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900 rounded-none transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* REJECT BUTTON */}
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      title="Reject Request"
                      className="p-2 bg-rose-950/40 text-rose-400 hover:bg-rose-900 rounded-none transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* BLOCK BUTTON */}
                    <button
                      onClick={() => handleBlockRequest(req.senderId)}
                      title="Block User"
                      className="p-2 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white rounded-none transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* BLOCK TAB */}
          {leftPaneMode === "BLOCK" && (
            <>
              {blockedUsers && blockedUsers.length === 0 ? (
                <p className="text-slate-500 font-mono text-xs text-center mt-6">
                  NO BLOCKED USERS
                </p>
              ) : (
                blockedUsers?.map((user: Friend) => (
                  <div
                    key={user?.id}
                    className="flex items-center justify-between p-3 rounded-none border border-white/10 bg-black/40"
                  >
                    <span className="font-mono text-sm text-slate-300 truncate">
                      {user?.username}
                    </span>
                    <div className="flex gap-2">
                      {/* UNBLOCK BUTTON */}
                      <button
                        onClick={() => unblockUser(user.id)}
                        title="Unblock User"
                        className="p-2 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900 rounded-none transition-all"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

          {/* RIGHT COLUMN: ACTION HUB / CHAT */}
          <div className="flex flex-col h-full min-h-0 rounded-none border border-white/20 bg-[#06080e] overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
            {leftPaneMode === "FRIENDS" && !activeTab ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono tracking-widest relative z-10">
                <Swords className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xs">SELECT A FRIEND TO INITIATE UPLINK</p>
              </div>
            ) : (
              <>
                {/* CHAT HEADER */}
                <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setActiveTab(null)}
                      title="Back to friends"
                      className="lg:hidden p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 shrink-0 rounded-none bg-cyan-900/50 border border-cyan-500/30 flex items-center justify-center font-mono text-cyan-300 font-bold uppercase">
                      {activeTab ? (
                        activeTab.username.charAt(0)
                      ) : (
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-mono text-sm font-bold text-white tracking-widest uppercase truncate">
                        {activeTab?.username ?? "CHAT"}
                      </h3>
                      <span
                        className={`text-[10px] flex items-center gap-1 ${
                          activeTab && onlineIds.includes(activeTab.id)
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        <Wifi className="w-3 h-3" />
                        {activeTab && onlineIds.includes(activeTab.id) ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => activeTab && setChallengeFriend(activeTab)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold tracking-widest rounded-none transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_25px_rgba(244,63,94,0.3)] active:scale-95"
                  >
                    <Swords className="w-4 h-4" />
                    <span className="hidden sm:inline">[ BATTLE ]</span>
                  </button>
                </div>

                {/* MESSAGES — scrolls internally, window never moves */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 min-h-0 p-4 overflow-y-auto flex flex-col gap-3 relative z-10"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.senderId === "ME" || (activeTab && msg.senderId !== activeTab.id)
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg max-w-[70%] font-mono text-sm ${
                          msg.senderId === "ME" || (activeTab && msg.senderId !== activeTab.id)
                            ? "bg-cyan-900/40 border border-cyan-500/30 text-cyan-100"
                            : "bg-slate-800/50 border border-white/10 text-slate-300"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* MESSAGE COMPOSER */}
                <div className="p-3 border-t border-white/10 bg-[#04060b] relative z-10">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="TRANSMIT MESSAGE..."
                      className="flex-1 bg-black/60 border border-white/10 p-3 rounded-none text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-none transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <ChallengeModal friend={challengeFriend} open={Boolean(challengeFriend)} onClose={() => setChallengeFriend(null)} />
    </div>
  );
}
