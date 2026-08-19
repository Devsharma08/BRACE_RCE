import React, { useState } from "react";
import DashboardSidebar from "../components/DashboardSidebar";
import { useAuth } from "../context/authContext";
import { api } from "../config/api";
import {
  Settings as SettingsIcon,
  User,
  Save,
  CheckCircle2,
  Lock,
} from "lucide-react";

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      await api.post("/profile/update", { username, avatarUrl });
      setSuccessMsg("Profile settings updated successfully!");
    } catch (err: any) {
      console.error("Failed to update settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-100 font-mono relative overflow-x-hidden select-none">
      <DashboardSidebar rating={1248} />

      <main className="flex-1 ml-[245px] p-6 lg:p-8 flex flex-col gap-6 max-w-[900px] z-10 relative">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
              <span>OPERATIVE SETTINGS</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your cyber identity, avatar, and system preferences
            </p>
          </div>
        </header>

        {successMsg && (
          <div className="p-3 rounded border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SETTINGS FORM */}
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-500/10 pb-2">
              PROFILE IDENTIFIER
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/60 border border-white/10 text-xs text-white px-3 py-2 rounded font-mono focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400">Avatar Image URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="bg-black/60 border border-white/10 text-xs text-white px-3 py-2 rounded font-mono focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 border border-cyan-400 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs tracking-[0.2em] uppercase rounded transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "SAVING..." : "[ SAVE CHANGES ]"}</span>
          </button>
        </form>
      </main>
    </div>
  );
};
