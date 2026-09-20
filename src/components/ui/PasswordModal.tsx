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
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-md bg-raised border border-accent-primary/40 rounded-2xl shadow-[0_0_50px_rgba(0,212,255,0.25)] overflow-hidden">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-primary" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent-primary" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent-primary" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-primary" />

        {/* Top Glow Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent-primary to-transparent" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-subtle-line bg-accent-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary shadow-[0_0_15px_rgba(0,212,255,0.2)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg tracking-widest uppercase">
                SECURITY CLEARANCE REQUIRED
              </h3>
              <p className="text-[11px] text-accent-primary/70 tracking-wider">
                OPERATION // {roomCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-fg transition-colors p-1 rounded-md hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-bold tracking-widest text-subtle mb-2 uppercase">
              Target Operation: <span className="text-fg font-bold">{roomName}</span>
            </label>
            <p className="text-xs text-subtle mb-4 leading-relaxed">
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
                className="w-full bg-black/60 border border-accent-primary/30 focus:border-accent-primary rounded-xl px-4 py-3 pl-11 text-sm text-accent-primary placeholder:text-accent-primary/40 outline-none transition-all shadow-inner tracking-widest"
              />
              <KeyRound className="w-4 h-4 text-accent-primary/60 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {error && (
              <p className="text-xs text-accent-danger flex items-center gap-1.5 mt-2 tracking-wide font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-subtle-line hover:border-subtle-line bg-surface-hover hover:bg-surface-hover text-xs font-bold tracking-widest text-subtle transition-all"
            >
              ABORT
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl border border-accent-primary/50 bg-accent-primary/20 hover:bg-accent-primary text-accent-primary hover:text-black text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
            >
              AUTHENTICATE <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
