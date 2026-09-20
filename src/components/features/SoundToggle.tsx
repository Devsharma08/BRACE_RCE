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
      className="p-1.5 border border-subtle-line text-subtle hover:text-accent-primary hover:border-accent-primary/40 transition-colors"
    >
      {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
});
