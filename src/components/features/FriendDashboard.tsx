import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import {
  Swords,
  Send,
  UserPlus,
  Search,
  Check,
  Trash2,
  X,
  Ban,
  MessageSquare,
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
import MobileBottomNav from "../layout/MobileBottomNav";
import { useMyRating } from "../../hooks/useLeaderboard";
import { FriendsWorkspaceHeader } from "./FriendsWorkspaceHeader";

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

export default function FriendsDashboard() {
  const { sendDirectMessage, socket, requestPresence } = useSocket();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

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
        // Also append into the query cache: the message currently lives only in
        // local state, so navigating away and back would lose it (the REST cache
        // is fetched before the DB-side message list refreshes).
        queryClient.setQueryData<Message[]>(
          ["direct-messages", activeTab.id],
          (old) => [...(old ?? []), { ...data, receiverId: "ME" }],
        );
      }
    };
    socket.on("direct_message", handleMessage);
    return () => { socket.off("direct_message", handleMessage); };
  }, [socket, activeTab, queryClient]);

  // A friend request being accepted (or a new request arriving) must update the
  // lists live — otherwise they only refresh on manual navigation.
  useEffect(() => {
    if (!socket) return;
    const onNotification = (n: { type?: string }) => {
      if (n?.type === "FRIEND_ACCEPT" || n?.type === "FRIEND_REQUEST") {
        queryClient.invalidateQueries({ queryKey: ["friends-list"] });
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      }
    };
    socket.on("notification:new", onNotification);
    return () => { socket.off("notification:new", onNotification); };
  }, [socket, queryClient]);

  // Invariant: switching chats never carries the previous friend's optimistic
  // messages (the chat-list click clears them too; this covers every path).
  useEffect(() => {
    setMessages([]);
  }, [activeTab?.id]);

  useEffect(() => {
    if (!socket) return;
    const handlePresence = (data: { userId: string; status: string }) => {
      setOnlineIds((prev) =>
        data.status === "ONLINE" ? [...new Set([...prev, data.userId])] : prev.filter((id) => id !== data.userId)
      );
    };
    // Batch answer to requestPresence() below — without this the server's reply
    // was dropped and friends never showed as online.
    const handleSnapshot = (snapshot: { userId: string; status: string }[]) => {
      if (!Array.isArray(snapshot) || snapshot.length === 0) return;
      setOnlineIds((prev) => {
        const next = new Set(prev);
        for (const entry of snapshot) {
          if (entry.status === "ONLINE") next.add(entry.userId);
          else next.delete(entry.userId);
        }
        return [...next];
      });
    };
    socket.on("user_online_status", handlePresence);
    socket.on("presence_snapshot", handleSnapshot);
    return () => {
      socket.off("user_online_status", handlePresence);
      socket.off("presence_snapshot", handleSnapshot);
    };
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

  const { data: myRating } = useMyRating(true);

  return (
    <div className="flex min-h-screen bg-base text-fg font-mono">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL DASHBOARD SIDEBAR */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3-COLUMN FRIENDS LAYOUT                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex h-[calc(100vh-var(--header-height))] min-w-0 flex-1 overflow-hidden pb-14 pt-[var(--header-height)] md:ml-[60px] md:pb-0 lg:ml-[245px]">

        {/* ── LEFT COLUMN: NAVIGATION + CHAT LIST ─────────────────────────── */}
        <aside
          className={`flex w-full shrink-0 min-w-0 flex-col border-r border-subtle-line bg-panel md:w-64 ${
            activeTab ? "hidden md:flex" : "flex"
          }`}
        >
          <FriendsWorkspaceHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            friendCount={friends.length}
            requestCount={pendingRequests.length}
            pendingRequests={pendingRequests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {friendsLoading ? (
              <div className="p-4 text-xs text-subtle">Loading...</div>
            ) : friends.length === 0 ? (
              <div className="p-4 text-xs text-subtle">No friends yet</div>
            ) : (
              friends
                .filter((f) => f.username.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => { setActiveTab(friend); setMessages([]); }}
                    className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 transition-all hover:bg-surface-hover ${
                      activeTab?.id === friend.id ? "border-l-accent-primary bg-accent-primary/10" : "border-l-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-btn border border-accent-primary/20 bg-elevated">
                        <span className="text-[9px] font-bold text-accent-primary">{friend.username.slice(0, 2).toUpperCase()}</span>
                      </div>
                      {onlineIds.includes(friend.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel bg-accent-success" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="truncate text-xs font-bold text-fg">{friend.username}</div>
                      <div className="truncate text-[9px] text-subtle">{onlineIds.includes(friend.id) ? "Online now" : "Offline"}</div>
                    </div>
                  </button>
                ))
            )}
          </div>
        </aside>

        {/* ── MIDDLE COLUMN: CONVERSATION ─────────────────────────────────── */}
        <section
          className={`flex min-w-0 flex-1 flex-col bg-base ${
            !activeTab ? "hidden md:flex" : "flex"
          }`}
        >
          {activeTab ? (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between border-b border-subtle-line bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    aria-label="Back to friend list"
                    className="md:hidden p-1 -ml-1 text-subtle hover:text-fg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-btn border border-accent-primary/20 bg-elevated">
                    <span className="text-[9px] font-bold text-accent-primary">{activeTab.username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="text-sm text-fg font-bold">{activeTab.username}</div>
                    <div className="text-[9px] flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 ${onlineIds.includes(activeTab.id) ? "bg-accent-success" : "bg-faint"}`} />
                      <span className={onlineIds.includes(activeTab.id) ? "text-accent-success" : "text-faint"}>
                        {onlineIds.includes(activeTab.id) ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setChallengeFriend(activeTab)}
                  title="Challenge to a Battle"
                    className="flex items-center gap-1.5 rounded-btn border border-accent-danger/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-accent-danger transition-all hover:bg-accent-danger/10"
                >
                  <Swords className="w-3 h-3" />
                  Battle
                </button>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                {displayedMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-subtle">No messages yet. Say hello!</div>
                ) : (
                  displayedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === "ME" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`px-4 py-2 max-w-[70%] text-sm ${
                          msg.senderId === "ME"
                            ? "rounded-card border border-accent-primary/20 bg-accent-primary/10 text-fg"
                            : "rounded-card border border-subtle-line bg-surface text-fg"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Composer */}
              <div className="border-t border-subtle-line bg-surface p-3">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-btn border border-subtle-line bg-base px-4 py-2.5 text-sm text-fg focus:border-accent-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-btn bg-accent-primary px-4 text-ink transition-all hover:opacity-90"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-faint mx-auto mb-3" />
                <p className="text-sm text-subtle">Select a friend to start chatting</p>
              </div>
            </div>
          )}
        </section>

        {/* ── RIGHT COLUMN: FRIEND PROFILE + BATTLE HISTORY ───────────────── */}
        <aside className="hidden w-72 min-w-0 shrink-0 flex-col overflow-y-auto border-l border-subtle-line bg-panel xl:flex">
          {activeTab ? (
            <>
              {/* Friend Profile Card */}
              <div className="p-4 border-b border-line-low">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-elevated border border-subtle-line flex items-center justify-center mb-3">
                    <span className="text-lg font-bold text-accent-primary">{activeTab.username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <h3 className="text-sm font-bold text-fg">{activeTab.username}</h3>
                  <p className="text-[10px] text-subtle mt-1">
                    {onlineIds.includes(activeTab.id) ? "● Online" : "○ Offline"}
                  </p>
                  {activeTab.bio && (
                    <p className="text-[10px] text-subtle mt-3 leading-relaxed">{activeTab.bio}</p>
                  )}
                </div>
              </div>

              {/* Battle Stats / History */}
              <div className="p-4 border-b border-line-low">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-label" />
                  <span className="text-[10px] text-subtle font-bold uppercase tracking-widest">Battle History</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Wins</span>
                    <span className="text-accent-success font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Losses</span>
                    <span className="text-accent-danger font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Win Rate</span>
                    <span className="text-accent-primary font-bold">--</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => setChallengeFriend(activeTab)}
                  title="Challenge to a Battle"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-danger/10 border border-accent-danger/40 text-accent-danger hover:bg-accent-danger/20 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Swords className="w-4 h-4" />
                  Challenge to Battle
                </button>
                <button
                  onClick={() => handleBlockUser(activeTab.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-line text-subtle hover:text-accent-danger hover:border-accent-danger/30 text-[10px] uppercase tracking-widest transition-all"
                >
                  <Ban className="w-3 h-3" />
                  Block User
                </button>
                <button
                  onClick={() => handleRemoveFriend(activeTab.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-line text-subtle hover:text-accent-danger hover:border-accent-danger/30 text-[10px] uppercase tracking-widest transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Friend
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <User className="w-10 h-10 text-faint mx-auto mb-2" />
                <p className="text-[10px] text-subtle">Select a friend to view profile</p>
              </div>
            </div>
          )}
        </aside>
      </main>

      <ChallengeModal friend={challengeFriend} open={Boolean(challengeFriend)} onClose={() => setChallengeFriend(null)} />
    </div>
  );
}
