import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  Swords,
  Send,
  Trash2,
  Ban,
  MessageSquare,
  ChevronLeft,
  User,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../config/api";
import { ChallengeModal } from "./ChallengeModal";
import { TIER_COLORS, useLeaderboard } from "../../hooks/useLeaderboard";
import { FriendsWorkspaceHeader } from "./FriendsWorkspaceHeader";
import { useSocketInvalidation } from "../../hooks/useSocketInvalidation";

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

// Axios errors arrive as `unknown`; pull the server's message out without
// falling back to `any` (which the lint config rejects).
const apiErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "response" in err) {
    const message = (err as { response?: { data?: { message?: string } } }).response
      ?.data?.message;
    if (message) return message;
  }
  return fallback;
};

export default function FriendsDashboard() {
  const { sendDirectMessage, socket, requestPresence, friends: socketFriends } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Derived presence set — no local mirror state, so socket presence can never
  // go stale between renders.
  const onlineIds = useMemo(
    () => socketFriends.filter((f) => f.isOnline).map((f) => f.id),
    [socketFriends],
  );
  // ── NEW-FRIEND DISCOVERY ──────────────────────────────────────────────
  // The workspace had no way to search *new* users at all: `searchQuery` only
  // filtered the already-friends list, and the send-request handler was never
  // rendered. `handleSendFriendRequest` existed but nothing called it, so the
  // "search + send request" flow simply did not exist in the UI.
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  // Ids requested during this session — overlaid as `requestSent` on the
  // directory results so a row flips to "Requested" without a refetch.
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // In-flight accept/reject so rows can disable their buttons ("proper checks"
  // on the client too — double-submits used to race the ownership checks).
  const [actingRequest, setActingRequest] = useState<string | null>(null);

  // The server emits `friends:update` after every graph mutation (send /
  // accept / reject / remove / block / unblock) — refetch in one wave instead
  // of waiting for a manual navigation.
  useSocketInvalidation("friends:update", [
    ["friends-list"],
    ["friend-requests"],
    ["blocked-users"],
  ]);

  // Debounce the directory search: the query only commits 300ms after the user
  // stops typing, and the react-query key below is the committed value.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(discoverQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [discoverQuery]);

  // Directory search is a keyed query: loading/results/error are owned by
  // react-query instead of an effect that synchronously set three state values
  // (which also double-fetched under StrictMode).
  const {
    data: discoverResults = [],
    isFetching: discoverLoading,
    error: discoverQueryError,
  } = useQuery<Friend[]>({
    queryKey: ["friend-discover", debouncedQuery],
    enabled: discoverOpen && debouncedQuery.length >= 2,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const res = await api.get("/friends/search", { params: { q: debouncedQuery } });
      return (res.data.users || []) as Friend[];
    },
  });

  const discoverError = discoverQueryError
    ? apiErrorMessage(discoverQueryError, "Could not reach the operatives directory")
    : null;

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

  // No blocked-list UI yet; the query exists so the `blocked-users` cache that
  // socket invalidations target is a real query, and blocking can refresh it.
  const { refetch: getBlockedUsers } = useQuery<Friend[]>({
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

  // Session messages (optimistic sends + socket deliveries) are merged ONTO the
  // DB history instead of replacing it — previously the first sent message made
  // displayedMessages prefer the session array, hiding the whole conversation.
  // Deduped by id: socket deliveries carry the DB id, so a message that arrives
  // live and again via refetch renders once.
  const displayedMessages = useMemo<Message[]>(() => {
    const history = directMessages as Message[];
    if (messages.length === 0) return history;
    const historyIds = new Set(history.map((m) => m.id));
    return [...history, ...messages.filter((m) => !historyIds.has(m.id))];
  }, [directMessages, messages]);

  // Ownership: DB history carries real user ids for both directions, while
  // optimistic sends use the "ME" sentinel — so a literal === "ME" check made
  // every reloaded conversation render as received. Compare against the
  // signed-in user's id instead.
  const isOwnMessage = (msg: Message) =>
    msg.senderId === "ME" || (user?.id != null && msg.senderId === user.id);

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
    socket.on("receive_direct_message", handleMessage);
    return () => { socket.off("receive_direct_message", handleMessage); };
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

  // Single transition point for opening/switching/closing a conversation: the
  // previous friend's optimistic messages can never leak across (this replaced
  // a setState-in-effect reset that lint flags as a cascading render).
  const selectFriend = (friend: Friend | null) => {
    setActiveTab(friend);
    setMessages([]);
  };

  // Presence is owned by SocketContext: it binds `user_online_status` and
  // `presence_snapshot` and folds both into `friends[].isOnline`, which
  // `onlineIds` above derives from. This only fires the batch question.
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

  const handleSendFriendRequest = async (targetUserId: string, username: string) => {
    setSendingTo(targetUserId);
    try {
      // The server validates { targetUserId } — the old { username } body was
      // rejected by zod, so no request was ever created.
      await api.post("/friends/request", { targetUserId });
      toast.success(`Friend request sent to ${username}`);
      setSentRequestIds((prev) =>
        prev.includes(targetUserId) ? prev : [...prev, targetUserId],
      );
      fetchFriends();
      fetchRequests();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to send request"));
    } finally {
      setSendingTo(null);
    }
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    if (actingRequest) return;
    setActingRequest(requestId);
    try {
      // Route is POST /friends/accept with a body — the old /accept/:id call
      // never matched a handler, so accepts silently failed.
      await api.post("/friends/accept", { requestId, senderId });
      toast.success("Friend request accepted");
      fetchFriends();
      fetchRequests();
    } catch (err: unknown) {
      // Surface the server's ownership/state message (404/403/400) verbatim.
      toast.error(apiErrorMessage(err, "Failed to accept request"));
      fetchRequests();
    } finally {
      setActingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (actingRequest) return;
    setActingRequest(requestId);
    try {
      // Route is POST /friends/reject with { requestId } in the body.
      await api.post("/friends/reject", { requestId });
      toast.success("Friend request rejected");
      fetchRequests();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to reject request"));
      fetchRequests();
    } finally {
      setActingRequest(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      // Route is DELETE /friends/remove/:id — /friends/:id 404'd.
      await api.delete(`/friends/remove/${friendId}`);
      toast.success("Friend removed");
      if (activeTab?.id === friendId) selectFriend(null);
      fetchFriends();
    } catch {
      toast.error("Failed to remove friend");
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await api.post("/friends/block", { targetUserId: userId });
      toast.success("User blocked");
      fetchFriends();
      getBlockedUsers();
    } catch {
      toast.error("Failed to block user");
    }
  };


  // A friend's ranked record lives only on the leaderboard — /friends returns
  // identity, not stats. One cached fetch (10 min staleTime) serves every
  // profile panel instead of a request per friend.
  const { data: leaderboardRows = [] } = useLeaderboard(100);
  const activeFriendRecord = activeTab
    ? leaderboardRows.find((row) => row.userId === activeTab.id)
    : undefined;

  return (
    <div className="flex w-full text-fg font-mono">
      {/* ══════════════════════════════════════════════════════════════════════ */}


      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3-COLUMN FRIENDS LAYOUT                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Layout.tsx already renders a sticky <Header /> in normal document
          flow, so this main must NOT add its own pt-[var(--header-height)] —
          that double-spaced the whole friends workspace. The calc() below only
          compensates for the header's height in the scroll budget.
          pb-16 (not pb-14) clears the 56px MobileBottomNav on <768px. */}
      <main className="flex h-[calc(100vh-var(--header-height))] min-w-0 flex-1 overflow-hidden pb-16 md:pb-0">

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
            actingRequestId={actingRequest}
            discoverOpen={discoverOpen}
            onToggleDiscover={() => setDiscoverOpen((open) => !open)}
            discoverResults={discoverResults.map((candidate) =>
              candidate.requestSent || sentRequestIds.includes(candidate.id)
                ? { ...candidate, requestSent: true }
                : candidate,
            )}
            discoverQuery={discoverQuery}
            onDiscoverQueryChange={setDiscoverQuery}
            discoverLoading={discoverLoading}
            discoverError={discoverError}
            onSendRequest={handleSendFriendRequest}
            sendingTo={sendingTo}
            existingFriendIds={friends.map((f) => f.id)}
          />

          {/* Chat List */}
          <div className="themed-scroll flex-1 overflow-y-auto">
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
                    onClick={() => selectFriend(friend)}
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
                    onClick={() => selectFriend(null)}
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
              <div ref={chatScrollRef} className="themed-scroll flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                {displayedMessages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-xs text-subtle">No messages yet. Say hello!</div>
                ) : (
                  displayedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex min-w-0 ${isOwnMessage(msg) ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`w-fit max-w-[75%] min-w-0 px-4 py-2 text-sm leading-5 [overflow-wrap:anywhere] whitespace-pre-wrap break-words ${
                          isOwnMessage(msg)
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
                    className="min-w-0 flex-1 rounded-btn border border-subtle-line bg-base px-4 py-2.5 text-sm text-fg focus:border-accent-primary focus:outline-none"
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
        <aside
          aria-label="Selected operative record"
          className="themed-scroll hidden w-72 min-w-0 shrink-0 flex-col overflow-y-auto border-l border-subtle-line bg-panel xl:flex"
        >
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

              {/* Battle record — real leaderboard data. This block previously
                  rendered hardcoded 0 / 0 / "--" for every friend, which read
                  as a genuine losing record rather than absent data. */}
              <div className="p-4 border-b border-line-low">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-label" />
                  <span className="text-[10px] text-subtle font-bold uppercase tracking-widest">
                    Battle record
                  </span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-subtle-line border-y border-subtle-line">
                  {[
                    { label: "matches", value: activeFriendRecord?.totalMatches, tone: "text-fg" },
                    { label: "wins", value: activeFriendRecord?.wins, tone: "text-accent-success" },
                    {
                      label: "rate",
                      value: activeFriendRecord
                        ? `${Math.round(activeFriendRecord.winRate)}%`
                        : undefined,
                      tone: "text-accent-primary",
                    },
                  ].map((metric) => (
                    <div key={metric.label} className="px-1 py-3 text-center">
                      <b
                        className={`block font-mono text-sm font-bold tabular-nums ${metric.tone}`}
                      >
                        {metric.value ?? "—"}
                      </b>
                      <span className="mt-1 block text-[8px] uppercase tracking-widest text-muted">
                        {metric.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Division</span>
                    <span
                      className={`font-bold ${
                        activeFriendRecord
                          ? TIER_COLORS[activeFriendRecord.tier] ?? "text-fg"
                          : "text-muted"
                      }`}
                    >
                      {activeFriendRecord?.tier ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Rating</span>
                    <span className="font-mono font-bold tabular-nums text-accent-primary">
                      {activeFriendRecord?.rating ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Global rank</span>
                    <span className="font-mono font-bold tabular-nums text-fg">
                      {activeFriendRecord ? `#${activeFriendRecord.rank}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-subtle">Losses</span>
                    <span className="font-mono font-bold tabular-nums text-accent-danger">
                      {activeFriendRecord?.losses ?? "—"}
                    </span>
                  </div>
                </div>

                {!activeFriendRecord && (
                  <p className="mt-3 text-[10px] leading-relaxed text-muted">
                    No ranked record — this operative has not completed a ranked
                    battle yet.
                  </p>
                )}
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
