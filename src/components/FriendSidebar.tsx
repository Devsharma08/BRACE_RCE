import { useState, useEffect } from "react";
import { api } from "../config/api";
import { Users, UserPlus, X, Trash2 } from "lucide-react";

interface Friend {
  id: string;
  username: string;
}

export default function FriendsSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriend, setNewFriend] = useState("");
  const [error, setError] = useState("");

  const fetchFriends = async () => {
    try {
      const res = await api.get("/friends");
      setFriends(res.data.friends);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) fetchFriends();
  }, [isOpen]);

  const addFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/friends/add", { targetUsername: newFriend }, { withCredentials: true });
      setNewFriend("");
      fetchFriends();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add friend");
    }
  };

  const removeFriend = async (id: string) => {
    try {
      await api.delete(`/friends/remove/${id}`);
      fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-24 right-4 z-40 bg-violet-950/40 border border-violet-500/50 hover:bg-violet-900 text-violet-400 p-3 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.3)] backdrop-blur-md transition-all"
      >
        <Users className="w-5 h-5" />
      </button>

      {/* Sidebar Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#060709] border-l border-violet-500/30 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-violet-500/20 flex justify-between items-center bg-violet-950/20">
            <h2 className="font-mono font-bold tracking-widest text-violet-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> FRIENDS
            </h2>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-violet-500/20">
            <form onSubmit={addFriend} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newFriend}
                  onChange={(e) => setNewFriend(e.target.value)}
                  placeholder="Enter Username..." 
                  className="bg-black/50 border border-slate-700 p-2 text-sm rounded flex-1 text-white font-mono focus:border-violet-500 outline-none"
                />
                <button type="submit" className="bg-violet-900/50 border border-violet-500/50 hover:bg-violet-800 text-violet-300 p-2 rounded">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
              {error && <p className="text-rose-400 text-xs font-mono">{error}</p>}
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {friends.length === 0 ? (
              <p className="text-slate-500 text-xs font-mono text-center mt-4">NO FRIENDS FOUND</p>
            ) : (
              friends.map(f => (
                <div key={f.id} className="flex justify-between items-center bg-black/40 border border-slate-800 p-3 rounded-lg group hover:border-violet-500/30 transition-all">
                  <span className="font-mono text-sm text-slate-300">{f.username}</span>
                  <button onClick={() => removeFriend(f.id)} className="text-slate-600 group-hover:text-rose-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
