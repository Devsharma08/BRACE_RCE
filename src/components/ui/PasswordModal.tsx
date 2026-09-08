import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, ArrowRight, X } from "lucide-react";

interface PasswordModalProps {
  isOpen: boolean;
  roomName: string;
  roomCode: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  roomName,
  roomCode,
  onClose,
  onSubmit,
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Authorization key cannot be empty");
      return;
    }
    setError("");
    onSubmit(password.trim());
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-md bg-[#090b10] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

        {/* Top Glow Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/10 bg-cyan-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                SECURITY CLEARANCE REQUIRED
              </h3>
              <p className="text-[11px] text-cyan-400/70 tracking-wider">
                OPERATION // {roomCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-bold tracking-widest text-slate-400 mb-2 uppercase">
              Target Operation: <span className="text-white font-bold">{roomName}</span>
            </label>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              This cyber arena match is encrypted with a private security passkey. Provide the authorization password to gain operative entry.
            </p>

            <div className="relative">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="ENTER ACCESS KEY..."
                className="w-full bg-black/70 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 pl-11 text-sm text-cyan-200 placeholder:text-cyan-600/40 outline-none transition-all shadow-inner tracking-widest"
              />
              <KeyRound className="w-4 h-4 text-cyan-400/60 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-2 tracking-wide font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-bold tracking-widest text-slate-300 transition-all"
            >
              ABORT
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              AUTHENTICATE <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
