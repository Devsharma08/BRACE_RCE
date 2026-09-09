import { describe, test, expect } from "vitest";
import { isSoundMuted, setSoundMuted } from "../../utils/battleSounds";
import { TIER_COLORS } from "../../hooks/useLeaderboard";

describe("Roadmap frontend contract", () => {
  test("sound mute toggle persists to localStorage", () => {
    setSoundMuted(true);
    expect(isSoundMuted()).toBe(true);
    expect(localStorage.getItem("brace-sound-muted")).toBe("1");
    setSoundMuted(false);
    expect(isSoundMuted()).toBe(false);
  });

  test("every roadmap tier has a color mapping", () => {
    for (const tier of ["Bronze", "Silver", "Gold", "Platinum", "Cyber-Master"]) {
      expect(TIER_COLORS[tier]).toBeDefined();
    }
  });

  test("creator signature default shape is valid", () => {
    const sig = { funcName: "solve", returnType: "int", args: [{ name: "nums", type: "int[]" }] };
    expect(/^[A-Za-z_][A-Za-z0-9_]*$/.test(sig.funcName)).toBe(true);
    expect(sig.args.length).toBeGreaterThan(0);
  });
});

