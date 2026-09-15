import { Level } from "../generated/prisma/client.js";

// quick helper function to generate a 6-digit code
export function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// The Progressive Expansion Logic
export function getAllowedDifficulties(preferred: Level, waitingSeconds: number): Level[] {
    if (waitingSeconds < 10) return [preferred];
    if (waitingSeconds < 20) {
        if (preferred === "EASY") return ["EASY", "MEDIUM"];
        if (preferred === "MEDIUM") return ["EASY", "MEDIUM"];
        if (preferred === "HARD") return ["MEDIUM", "HARD"];
    }
    return ["EASY", "MEDIUM", "HARD"];
}
