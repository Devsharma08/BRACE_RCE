import { memo } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundMuted, setSoundMuted } from "../../utils/battleSounds";
import { useState } from "react";

/** Mute toggle for Battle Sound FX (ROADMAP §6). */
export const SoundToggle = memo(() => {
  const [muted, setMuted] = useState(isSoundMuted());
  return (
    <button
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setSoundMuted(next);
      }}
      title={muted ? "Unmute battle sounds" : "Mute battle sounds"}
      className="p-1.5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
    >
      {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
});
