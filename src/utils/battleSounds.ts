/**
 * Cyberpunk Battle Sound FX System (ROADMAP §6).
 * Zero-dependency WebAudio synth — no audio assets required.
 * Sounds: countdown ticks, match start, test pass, submission success, surrender.
 * 
 * FIXED: Now uses per-sound AudioContext to avoid leaks on SPA navigation.
 * Each play creates a fresh context that auto-closes when the sound finishes.
 */

export type BattleSoundKind = "tick" | "match-start" | "test-pass" | "submit-success" | "surrender";

let muted = typeof localStorage !== "undefined" && localStorage.getItem("brace-sound-muted") === "1";

function createAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(ctx: AudioContext, freq: number, atMs: number, durMs: number, type: OscillatorType = "square", gain = 0.06): void {
  const t0 = ctx.currentTime + atMs / 1000;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("brace-sound-muted", value ? "1" : "0");
  } catch { /* ignore */ }
}

export function playBattleSound(kind: BattleSoundKind): void {
  if (muted) return;
  
  // Create fresh AudioContext per sound (auto-closes after sound finishes)
  const ctx = createAudioContext();
  if (!ctx) return;

  const play = (freq: number, atMs: number, durMs: number, type: OscillatorType, gain: number) => {
    beep(ctx, freq, atMs, durMs, type, gain);
  };

  // Auto-close context when all sounds finish (max duration + buffer)
  const maxEndTime = Math.max(
    kind === "tick" ? 90 :
    kind === "match-start" ? 440 :
    kind === "test-pass" ? 190 :
    kind === "submit-success" ? 340 :
    kind === "surrender" ? 420 : 500
  );
  
  setTimeout(() => {
    ctx.close().catch(() => {});
  }, maxEndTime + 50);

  switch (kind) {
    case "tick":
      play(880, 0, 90, "square", 0.05);
      break;
    case "match-start":
      play(440, 0, 120, "sawtooth", 0.06);
      play(660, 110, 120, "sawtooth", 0.06);
      play(880, 220, 220, "sawtooth", 0.07);
      break;
    case "test-pass":
      play(660, 0, 80, "sine", 0.06);
      play(990, 70, 120, "sine", 0.06);
      break;
    case "submit-success":
      play(523, 0, 100, "triangle", 0.07);
      play(659, 90, 100, "triangle", 0.07);
      play(784, 180, 160, "triangle", 0.08);
      break;
    case "surrender":
      play(330, 0, 180, "sawtooth", 0.06);
      play(220, 160, 260, "sawtooth", 0.06);
      break;
  }
}