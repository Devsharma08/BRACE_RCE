import { Level } from "../generated/prisma/client.js";

// Progressive difficulty expansion logic mirroring socket server
function getAllowedDifficulties(preferred: Level, waitingSeconds: number): Level[] {
  if (waitingSeconds < 10) return [preferred];
  if (waitingSeconds < 20) {
    if (preferred === "EASY") return ["EASY", "MEDIUM"];
    if (preferred === "MEDIUM") return ["EASY", "MEDIUM"];
    if (preferred === "HARD") return ["MEDIUM", "HARD"];
  }
  return ["EASY", "MEDIUM", "HARD"];
}

describe("Socket Matchmaking Logic", () => {
  test("should search strictly for preferred difficulty during first 10 seconds", () => {
    expect(getAllowedDifficulties("EASY", 5)).toEqual(["EASY"]);
    expect(getAllowedDifficulties("HARD", 8)).toEqual(["HARD"]);
  });

  test("should expand difficulty pool after 10 seconds of waiting", () => {
    expect(getAllowedDifficulties("EASY", 12)).toEqual(["EASY", "MEDIUM"]);
    expect(getAllowedDifficulties("HARD", 15)).toEqual(["MEDIUM", "HARD"]);
  });

  test("should expand to all difficulties after 20 seconds of waiting", () => {
    expect(getAllowedDifficulties("MEDIUM", 25)).toEqual(["EASY", "MEDIUM", "HARD"]);
  });
});
