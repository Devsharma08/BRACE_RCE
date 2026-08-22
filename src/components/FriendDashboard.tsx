import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/socketContext";
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
} from "lucide-react";
import { api } from "../config/api";

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
  const {
    sendDirectMessage,
    sendChallenge,
    socket,
    incomingChallenge,
    acceptChallenge,
    declineChallenge,
  } = useSocket();
  const [activeTab, setActiveTab] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New States for Search & Requests
  const [leftPaneMode, setLeftPaneMode] = useState<
    "FRIENDS" | "SEARCH" | "REQUESTS" | "BLOCK"
  >("FRIENDS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);

  const fetchFriends = () =>
    api
      .get("/friends")
      .then((res) => setFriends(res.data.friends))
      .catch(console.error);

  const fetchRequests = () =>
    api
      .get("/friends/requests")
      .then((res) => setPendingRequests(res.data.requests))
      .catch(console.error);

  const getBlockedUsers = async () => {
    try {
      const res = await api.get("/friends/blocked");
      console.log("blocked users: ", res.data);
      setBlockedUsers(res.data.users.map((req: any) => req.receiver));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    getBlockedUsers();
  }, []);

  useEffect(() => {
    if (activeTab) {
      api
        .get(`/friends/messages/${activeTab.id}`)
        .then((res) => setMessages(res.data.messages))
        .catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (msg: Message) => {
      if (
        activeTab &&
        (msg.senderId === activeTab.id || msg.receiverId === activeTab.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_direct_message", handleReceiveMessage);
    return () => {
      socket.off("receive_direct_message", handleReceiveMessage);
    };
  }, [socket, activeTab]);

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

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.post("/friends/reject", { requestId });
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const handleBlockRequest = async (targetUserId: string) => {
    try {
      await api.post("/friends/block", { targetUserId });
      fetchRequests();
      getBlockedUsers();
      alert("User has been blocked.");
    } catch (e) {
      console.error(e);
    }
  };

  const unblockUser = async (targetUserId: string) => {
    try {
      await api.post("/friends/unblock", { targetUserId });
      fetchRequests(); // Refresh requests list
      getBlockedUsers(); // Refresh the blocked users list so they disappear from UI
      alert("User has been unblocked.");
    } catch (e) {
      console.error(e);
    }
  };

  // --- NEW ACTIONS ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`/friends/search?q=${searchQuery}`);
      setSearchResults(res.data.user);
    } catch (e) {
      console.error(e);
    }
  };

  const sendRequest = async (targetUserId: string) => {
    try {
      await api.post("/friends/request", { targetUserId });
      alert("Request Sent!");
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    try {
      await api.post("/friends/accept", { requestId, senderId });
      fetchRequests();
      fetchFriends();
      setLeftPaneMode("FRIENDS");
    } catch (e) {
      console.error(e);
    }
  };

  const removeFriend = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/friends/remove/${targetId}`);
      if (activeTab?.id === targetId) setActiveTab(null);
      fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-full pt-20 px-4 pb-4 gap-4 bg-[#030406] relative">


      {/* LEFT COLUMN: NAVIGATION & LISTS */}
      <div className="w-1/3 max-w-sm flex flex-col bg-[#0b0c0e] border border-cyan-500/20 rounded-2xl overflow-hidden">
        {/* TOP NAV BAR */}
        <div className="flex border-b border-cyan-500/20 bg-cyan-950/20">
          <button
            onClick={() => setLeftPaneMode("FRIENDS")}
            className={`flex-1 p-4 font-mono text-xs tracking-widest transition-all ${leftPaneMode === "FRIENDS" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
          >
            <Users className="w-4 h-4 mx-auto mb-1" /> FRIENDS
          </button>
          <button
            onClick={() => setLeftPaneMode("SEARCH")}
            className={`flex-1 p-4 font-mono text-xs tracking-widest transition-all ${leftPaneMode === "SEARCH" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
          >
            <Search className="w-4 h-4 mx-auto mb-1" /> SEARCH
          </button>
          <button
            onClick={() => setLeftPaneMode("REQUESTS")}
            className={`flex-1 p-4 font-mono text-xs tracking-widest transition-all relative ${leftPaneMode === "REQUESTS" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
          >
            <Bell className="w-4 h-4 mx-auto mb-1" /> REQUESTS
            {pendingRequests.length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setLeftPaneMode("BLOCK")}
            className={`flex-1 p-4 font-mono text-xs tracking-widest transition-all relative ${leftPaneMode === "BLOCK" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
          >
            <Ban className="w-4 h-4 mx-auto mb-1" /> BLOCK
            {pendingRequests.length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {/* FRIENDS MODE */}
          {leftPaneMode === "FRIENDS" && (
            <>
              {friends.length === 0 && (
                <p className="text-slate-500 font-mono text-xs text-center mt-4">
                  NO FRIENDS FOUND
                </p>
              )}
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => setActiveTab(friend)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all group ${activeTab?.id === friend.id ? "bg-cyan-950/40 border-cyan-500/50" : "hover:bg-cyan-950/20 border-transparent hover:border-cyan-500/30"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-900 flex items-center justify-center font-mono text-cyan-300 font-bold uppercase">
                      {friend.username.charAt(0)}
                    </div>
                    <span className="font-mono text-sm text-white font-bold">
                      {friend.username}
                    </span>
                  </div>
                  <button
                    onClick={(e) => removeFriend(e, friend.id)}
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* SEARCH MODE */}
          {leftPaneMode === "SEARCH" && (
            <>
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 bg-black/50 border border-slate-700 p-2 rounded text-white font-mono text-sm focus:border-cyan-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
              {searchResults?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-black/40"
                >
                  <span className="font-mono text-sm text-slate-300">
                    {user.username}
                  </span>
                  <button
                    onClick={() => {
                      if (!user.requestSent) {
                        sendRequest(user.id);
                        // Optimistically update UI so it changes immediately
                        setSearchResults((prev) =>
                          prev.map((u) =>
                            u.id === user.id ? { ...u, requestSent: true } : u,
                          ),
                        );
                      }
                    }}
                    className={`transition-colors ${user.requestSent ? "text-slate-500 cursor-not-allowed" : "text-cyan-400 hover:text-cyan-300"}`}
                    disabled={user.requestSent}
                  >
                    {user.requestSent ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </>
          )}

          {/* REQUESTS MODE */}
          {leftPaneMode === "REQUESTS" && (
            <>
              {pendingRequests?.length === 0 && (
                <p className="text-slate-500 font-mono text-xs text-center mt-4">
                  NO PENDING REQUESTS
                </p>
              )}
              {pendingRequests?.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-black/40"
                >
                  <span className="font-mono text-sm text-slate-300">
                    {req.sender.username}
                  </span>
                  <div className="flex gap-2">
                    {/* ACCEPT FRIEND REQUEST */}
                    <button
                      onClick={() => handleAcceptRequest(req.id, req.senderId)}
                      className="p-2 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900 rounded"
                      title="Accept Request"
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* REJECT BUTTON */}
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="p-2 bg-rose-950/40 text-rose-400 hover:bg-rose-900 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* BLOCK BUTTON */}
                    <button
                      onClick={() => handleBlockRequest(req.senderId)}
                      className="p-2 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white rounded transition-colors"
                      title="Block User"
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
                <p className="text-slate-500 font-mono text-xs text-center mt-4">
                  NO BLOCKED USERS
                </p>
              ) : (
                blockedUsers &&
                blockedUsers?.map((user: Friend) => (
                  <div
                    key={user?.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-black/40"
                  >
                    <span className="font-mono text-sm text-slate-300">
                      {user?.username}
                    </span>
                    <div className="flex gap-2">
                      {/* UNBLOCK BUTTON */}
                      <button
                        onClick={() => unblockUser(user.id)}
                        className="p-2 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900 rounded"
                        title="Unblock User"
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
      <div className="flex-1 flex flex-col bg-[#0b0c0e] border border-cyan-500/20 rounded-2xl overflow-hidden relative">
        {leftPaneMode === "FRIENDS" && !activeTab ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono tracking-widest">
            <Swords className="w-16 h-16 mb-4 opacity-20" />
            SELECT A FRIEND TO INITIATE UPLINK
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-cyan-500/20 bg-cyan-950/10 flex justify-between items-center">
              <h3 className="font-mono text-xl font-bold text-white tracking-widest uppercase">
                {activeTab?.username}
              </h3>
              <button
                onClick={() => activeTab && sendChallenge(activeTab.id)}
                className="group flex items-center gap-2 px-6 py-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]"
              >
                <Swords className="w-4 h-4" /> [ INITIATE BATTLE ]
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.senderId === "ME" || (activeTab && msg.senderId !== activeTab.id) ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-[70%] font-mono text-sm ${msg.senderId === "ME" || (activeTab && msg.senderId !== activeTab.id) ? "bg-cyan-900/40 border border-cyan-500/30 text-cyan-100" : "bg-slate-800/50 border border-slate-700 text-slate-300"}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-cyan-500/20 bg-[#060709]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="TRANSMIT MESSAGE..."
                  className="flex-1 bg-black/50 border border-slate-700 p-4 rounded-xl text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-6 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-xl transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
