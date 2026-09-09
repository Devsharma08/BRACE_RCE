/**
 * Cyberpunk Battle Sound FX System (ROADMAP §6).
 * Zero-dependency WebAudio synth — no audio assets required.
 * Sounds: countdown ticks, match start, test pass, submission success, surrender.
 */

export type BattleSoundKind = "tick" | "match-start" | "test-pass" | "submit-success" | "surrender";

let audioCtx: AudioContext | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem("brace-sound-muted") === "1";

function ctx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(freq: number, atMs: number, durMs: number, type: OscillatorType = "square", gain = 0.06): void {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + atMs / 1000;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(ac.destination);
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
  switch (kind) {
    case "tick":
      beep(880, 0, 90, "square", 0.05);
      break;
    case "match-start":
      beep(440, 0, 120, "sawtooth", 0.06);
      beep(660, 110, 120, "sawtooth", 0.06);
      beep(880, 220, 220, "sawtooth", 0.07);
      break;
    case "test-pass":
      beep(660, 0, 80, "sine", 0.06);
      beep(990, 70, 120, "sine", 0.06);
      break;
    case "submit-success":
      beep(523, 0, 100, "triangle", 0.07);
      beep(659, 90, 100, "triangle", 0.07);
      beep(784, 180, 160, "triangle", 0.08);
      break;
    case "surrender":
      beep(330, 0, 180, "sawtooth", 0.06);
      beep(220, 160, 260, "sawtooth", 0.06);
      break;
  }
}
